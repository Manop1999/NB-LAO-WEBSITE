const express = require('express');
const crypto = require('crypto');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const prisma = require('./lib/prisma');
const { securityHeaders, sanitizeInput, rateLimiters, bodySizeLimit } = require('./middleware/security');

// --- Phase 27: Startup Environment Validation ---
(function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !process.env.DATABASE_URL) {
    console.error('[FATAL] DATABASE_URL is required in production.');
    process.exit(1);
  }
  if (isProd && !process.env.APP_URL) {
    console.warn('[WARN] APP_URL not set. Password reset links will use the request host header.');
  }
  if (process.env.NODE_ENV !== 'test') {
    if (!process.env.CORS_ORIGINS) {
      console.warn('[WARN] CORS_ORIGINS not set. All origins are allowed. Restrict in production.');
    }
    try {
      var emailSvc = require('./services/email');
      var smtpStatus = emailSvc.validateSmtpConfig();
      if (!smtpStatus.valid) {
        smtpStatus.warnings.forEach(function(w) { console.warn('[WARN] ' + w); });
      } else if (smtpStatus.mode === 'smtp') {
        console.log('[INFO] SMTP configured: ' + (process.env.SMTP_HOST || 'unknown') + ':' + (process.env.SMTP_PORT || '587'));
      } else {
        console.log('[INFO] SMTP_HOST not set. Emails will be logged to console (dev mode).');
      }
    } catch(e) {
      console.log('[INFO] Email service not available.');
    }
  }
})();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;
const ROOT = path.resolve(__dirname, '..');

// --- Phase 27: Request ID ---
app.use(function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = (incoming && typeof incoming === 'string' && incoming.length <= 128)
    ? incoming
    : crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// --- Security middleware (Phase 10) ---
app.set('trust proxy', 1);             // trust first proxy for rate-limit IP
app.disable('x-powered-by');

// --- Phase 26: CORS ---
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (same-origin, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0) return callback(null, true); // dev mode: allow all
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// --- Phase 26: Compression ---
app.use(compression({ threshold: 1024, level: 6 }));

// --- Phase 26: Request Logging ---
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev', { skip: function(req) { return req.url === '/api/health'; } }));
}

app.use(securityHeaders);              // security response headers
app.use(bodySizeLimit(100));           // 100 KB max request body
app.use(rateLimiters.global);          // global rate limit
app.use(sanitizeInput);               // sanitize all input strings

// Parse JSON bodies
app.use(express.json({ limit: '100kb' }));

// --- API routes ---

app.get('/api/health', async (req, res) => {
  try {
    await prisma.category.count();
    const fs = require('fs');
    const uploadsDir = path.join(ROOT, 'uploads');
    let uploadsOk = true;
    try { fs.accessSync(uploadsDir); } catch (e) { uploadsOk = false; }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      node: process.version,
      uptime: Math.floor(process.uptime()),
      memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      uploads: uploadsOk,
      email: (function() {
        try {
          var emailService = require('./services/email');
          return emailService.getSmtpConfig();
        } catch(e) { return { mode: 'unknown' }; }
      })(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Phase 3 catalog routes (rate-limited reads)
app.use('/api/categories', rateLimiters.read, require('./routes/categories'));
app.use('/api/brands', rateLimiters.read, require('./routes/brands'));
app.use('/api/products', rateLimiters.read, require('./routes/products'));

// Phase 4 auth routes (strict rate limit to prevent brute-force)
app.use('/api/auth', rateLimiters.auth, require('./routes/auth'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/coupons', rateLimiters.write, require('./routes/coupons'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/payment', require('./routes/payment'));

// Phase 6 admin routes (admin-specific rate limit)
app.use('/api/admin', rateLimiters.admin, require('./routes/admin'));

// Phase 26: File upload
app.use('/api/admin/upload', require('./routes/upload'));  // admin rate limiter already applied by /api/admin router above

// Phase 26: Serve uploaded files
app.use('/uploads', express.static(path.join(ROOT, 'uploads'), { maxAge: '7d', immutable: true }));
app.use('/image', express.static(path.join(ROOT, 'image'), { maxAge: '30d', immutable: true }));

// --- Static file serving (Phase 1 frontend) ---

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

app.get('/admin', (req, res) => res.redirect('/admin.html'));
app.get('/customer', (req, res) => res.redirect('/customer.html'));

app.use((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? 'nb_lao_wireframes_v2_updated.html' : req.url);
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  require('fs').readFile(filePath, (err, data) => {
    if (err) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.type(mime).send(data);
  });
});

// --- Phase 27: Global Error Handler ---
app.use(function errorHandler(err, req, res, _next) {
  console.error('[ERROR]', req.method, req.url, err.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Phase 27: Process-level Error Handlers ---
process.on('uncaughtException', function(err) {
  console.error('[FATAL] Uncaught exception:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', function(reason) {
  console.error('[ERROR] Unhandled rejection:', reason instanceof Error ? reason.message : reason);
  if (reason instanceof Error && reason.stack) console.error(reason.stack);
  // Do NOT exit on unhandled rejection — the request may still be recoverable.
  // Log it and continue. This prevents silent crashes from background tasks.
});

// --- Start ---

let server = null;

if (require.main === module) {
  server = app.listen(PORT, function() {
    console.log('NB LAO server running on http://localhost:' + PORT);
  });

  // --- Phase 27: Graceful Shutdown ---
  function shutdown(signal) {
    console.log('\n[SHUTDOWN] Received ' + signal + '. Shutting down gracefully...');
    if (server) {
      server.close(function() {
        console.log('[SHUTDOWN] HTTP server closed.');
        prisma.$disconnect().then(function() {
          console.log('[SHUTDOWN] Database connections closed.');
          process.exit(0);
        }).catch(function(err) {
          console.error('[SHUTDOWN] Error disconnecting database:', err.message);
          process.exit(1);
        });
      });
      // Force shutdown after 10 seconds if graceful shutdown hangs
      setTimeout(function() {
        console.error('[SHUTDOWN] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  }

  process.on('SIGTERM', function() { shutdown('SIGTERM'); });
  process.on('SIGINT', function() { shutdown('SIGINT'); });
}

module.exports = app;
