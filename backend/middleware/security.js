/**
 * Security Middleware — NB LAO
 * 
 * Zero-dependency security hardening:
 * - In-memory rate limiter with sliding window
 * - Security response headers
 * - Input sanitization (XSS prevention)
 * - Validation helpers (email, password, parseInt, quantity)
 * - Request body size enforcement
 */

// ──────────────────────────────────────────────
// RATE LIMITER — in-memory sliding window
// ──────────────────────────────────────────────

const _buckets = new Map();

/**
 * Sliding-window rate limiter.
 * @param {object} opts
 * @param {number} opts.windowMs - time window in milliseconds (default 60000 = 1 min)
 * @param {number} opts.max - max requests per window (default 100)
 * @param {string} opts.message - error message when exceeded
 * @param {Function} opts.keyFn - function(req) => string key (default: IP)
 */
function rateLimit(opts) {
  const windowMs = opts.windowMs || 60000;
  const max = opts.max || 100;
  const message = opts.message || 'Too many requests, please try again later';
  const keyFn = opts.keyFn || ((req) => req.ip || req.connection.remoteAddress || 'unknown');
  const keyPrefix = opts.keyPrefix || '';

  return function rateLimitMiddleware(req, res, next) {
    // Skip rate limiting in test mode
    if (process.env.NODE_ENV === 'test') return next();
    const rawKey = keyFn(req);
    // Skip rate limiting if keyFn returns null (used to bypass for specific methods)
    if (rawKey === null || rawKey === undefined) return next();
    const key = keyPrefix + rawKey;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!_buckets.has(key)) {
      _buckets.set(key, []);
    }
    const hits = _buckets.get(key);

    // Remove expired entries
    while (hits.length > 0 && hits[0] <= windowStart) {
      hits.shift();
    }

    if (hits.length >= max) {
      const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }

    hits.push(now);
    next();
  };
}

// Pre-configured rate limiters for different endpoint groups
const rateLimiters = {
  // Auth endpoints: 10 POST requests per minute per IP (prevents brute force)
  // Only applies to POST (login/register/etc), not GET/PUT/DELETE (profile checks)
  auth: rateLimit({
    windowMs: 60000,
    max: 10,
    keyPrefix: 'auth:',
    message: 'Too many authentication attempts, please try again in 1 minute',
    keyFn: (req) => {
      // Only rate-limit POST requests (actual auth attempts)
      if (req.method !== 'POST') return null;
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
  }),

  // Admin endpoints: 60 requests per minute per admin user
  admin: rateLimit({
    windowMs: 60000,
    max: 60,
    keyPrefix: 'admin:',
    message: 'Admin rate limit exceeded, please try again in 1 minute',
    keyFn: (req) => {
      if (req.user && req.user.email) return 'u:' + req.user.email;
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
  }),

  // Write operations (POST/PUT/DELETE): 30 per minute
  write: rateLimit({
    windowMs: 60000,
    max: 30,
    keyPrefix: 'write:',
    message: 'Too many write requests, please try again later',
  }),

  // Read endpoints: 120 requests per minute
  read: rateLimit({
    windowMs: 60000,
    max: 120,
    keyPrefix: 'read:',
    message: 'Rate limit exceeded, please try again later',
  }),

  // Global fallback: 200 requests per minute
  global: rateLimit({
    windowMs: 60000,
    max: 200,
    keyPrefix: 'gl:',
    message: 'Rate limit exceeded, please try again later',
  }),
};

// Cleanup stale buckets every 5 minutes (unref so it doesn't block process exit)
const _cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - 300000; // 5 minutes
  for (const [key, hits] of _buckets) {
    if (hits.length === 0 || hits[hits.length - 1] < cutoff) {
      _buckets.delete(key);
    }
  }
}, 300000);
_cleanupInterval.unref();

// ──────────────────────────────────────────────
// SECURITY HEADERS
// ──────────────────────────────────────────────

function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');
  // XSS protection (legacy browsers)
  res.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy (disable unnecessary features)
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content Security Policy (Phase 33)
  if (process.env.NODE_ENV !== 'test') {
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  }
  // Remove X-Powered-By
  res.removeHeader('X-Powered-By');
  next();
}

// ──────────────────────────────────────────────
// INPUT SANITIZATION
// ──────────────────────────────────────────────

// Characters to escape in HTML context
const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

/**
 * Strip/sanitize a string: trim whitespace, remove null bytes,
 * escape HTML special chars to prevent XSS.
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\0/g, '')                    // Remove null bytes
    .trim()
    .replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c]); // Escape HTML
}

/**
 * Sanitize an entire object recursively (one level deep for body fields).
 */
function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      clean[key] = sanitizeString(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Express middleware that sanitizes req.body string fields.
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeBody(req.body);
  }
  // Also sanitize query string values
  if (req.query && typeof req.query === 'object') {
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string') {
        req.query[key] = sanitizeString(val);
      }
    }
  }
  next();
}

// ──────────────────────────────────────────────
// VALIDATION HELPERS
// ──────────────────────────────────────────────

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate email format.
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321
  return EMAIL_REGEX.test(email);
}

/**
 * Validate password strength:
 * - At least 8 characters
 * - Contains uppercase, lowercase, and digit
 */
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Safe parseInt that returns null instead of NaN.
 * Use for route params to prevent Prisma validation errors.
 */
function safeParseInt(val) {
  if (val === undefined || val === null) return null;
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Validate quantity: must be a positive integer between 1 and 10000.
 */
function isValidQuantity(qty) {
  const n = Number(qty);
  return Number.isInteger(n) && n >= 1 && n <= 10000;
}

/**
 * Validate slug format: lowercase alphanumeric with hyphens, 1-100 chars.
 */
function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  if (slug.length > 100) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Validate locale: must be 'lo' or 'en'.
 */
function isValidLocale(locale) {
  return locale === 'lo' || locale === 'en';
}

/**
 * Max length check for strings.
 */
function maxLength(str, max) {
  if (!str || typeof str !== 'string') return true;
  return str.length <= max;
}

// ──────────────────────────────────────────────
// REQUEST BODY SIZE LIMIT
// ──────────────────────────────────────────────

/**
 * Body size limiter middleware.
 * @param {number} kb - max size in kilobytes (default 100)
 */
function bodySizeLimit(kb) {
  const maxBytes = (kb || 100) * 1024;
  return function bodySizeLimitMiddleware(req, res, next) {
    // Skip for multipart uploads — multer enforces its own file size limit
    var ct = req.headers['content-type'] || '';
    if (ct.indexOf('multipart/') === 0) return next();
    var contentLength = parseInt(req.headers['content-length'], 10);
    if (!isNaN(contentLength) && contentLength > maxBytes) {
      return res.status(413).json({ error: 'Request body too large' });
    }
    next();
  };
}

// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// CACHE CONTROL MIDDLEWARE
// ──────────────────────────────────────────────

/**
 * Set Cache-Control headers for public read-only API endpoints.
 * @param {number} maxAge - Cache duration in seconds.
 * @param {boolean} [private=false] - If true, set private (user-specific).
 */
function cacheControl(maxAge, isPrivate) {
  return function cacheControlMiddleware(req, res, next) {
    var scope = isPrivate ? 'private' : 'public';
    res.setHeader('Cache-Control', scope + ', max-age=' + maxAge);
    next();
  };
}

// EXPORTS
// ──────────────────────────────────────────────

module.exports = {
  rateLimit,
  rateLimiters,
  securityHeaders,
  sanitizeString,
  sanitizeBody,
  sanitizeInput,
  isValidEmail,
  isValidPassword,
  safeParseInt,
  isValidQuantity,
  isValidSlug,
  isValidLocale,
  maxLength,
  bodySizeLimit,
  cacheControl,
};
