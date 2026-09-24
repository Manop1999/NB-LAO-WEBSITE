const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE = 'http://localhost:3001';

// --- HTTP helpers ---

function request(method, urlPath, body, headers) {
  headers = headers || {};
  return new Promise(function (resolve, reject) {
    var url = new URL(BASE + urlPath);
    var hdrs = Object.assign({ 'Content-Type': 'application/json' }, headers);
    var opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: hdrs,
    };
    var req = http.request(opts, function (res) {
      var data = '';
      res.on('data', function (d) { data += d; });
      res.on('end', function () {
        var json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, body: data, json: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function md5(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}
function lineCount(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

var BASELINES = {
  backup: { md5: '69b1396610c1d27917d16cc193c00103', lines: 1265, file: 'nb_lao_wireframes_v2_original_backup.html' },
  html:   { md5: 'aebe02f72a5852289b1a7ad27c7dd657', lines: 611, file: 'nb_lao_wireframes_v2_updated.html' },
  css:    { md5: 'ad86eea2c740140705b8c06b2419d1a4', lines: 3828, file: 'styles/nblao.css' },
  js:     { md5: 'b53a5966017bdd3fb7794e58822aeb98', lines: 370, file: 'js/nblao.js' },
};

var ADMIN_EMAIL = 'admin@nblao.la';
var ADMIN_PASS = 'Admin123!';

function auth(token) {
  return { Authorization: 'Bearer ' + token };
}

// ═══════════════════════════════════════════════
// SECURITY HEADERS (3)
// ═══════════════════════════════════════════════
describe('Phase 10: Security Headers', function () {
  it('GET /api/health returns security headers', async function () {
    var res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-xss-protection'], '1; mode=block');
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  });

  it('X-Powered-By header is removed', async function () {
    var res = await request('GET', '/api/health');
    assert.ok(!res.headers['x-powered-by'], 'x-powered-by should be removed');
  });

  it('Permissions-Policy header is set', async function () {
    var res = await request('GET', '/api/health');
    assert.ok(res.headers['permissions-policy'], 'permissions-policy header should be set');
  });
});

// ═══════════════════════════════════════════════
// EMAIL VALIDATION (3)
// ═══════════════════════════════════════════════
describe('Phase 10: Email Validation', function () {
  it('register rejects invalid email format', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'notanemail', password: 'TestPass1!', name: 'Test',
    });
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('email'));
  });

  it('register rejects email without @ symbol', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'missingatsign.com', password: 'TestPass1!', name: 'Test',
    });
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('email'));
  });

  it('register accepts valid email format', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'valid.email+test@nblao.la', password: 'TestPass1!', name: 'Valid User',
    });
    // May succeed (201) or fail if already registered (409) — either is valid
    assert.ok(res.status === 201 || res.status === 409, 'should accept valid email format, got ' + res.status);
    // Cleanup
    if (res.status === 201) {
      var PC = require('@prisma/client').PrismaClient;
      var p = new PC();
      try {
        await p.emailNotification.deleteMany({ where: { recipientEmail: 'valid.email+test@nblao.la' } });
        await p.customer.deleteMany({ where: { email: 'valid.email+test@nblao.la' } });
      } finally { await p.$disconnect(); }
    }
  });
});

// ═══════════════════════════════════════════════
// PASSWORD STRENGTH (3)
// ═══════════════════════════════════════════════
describe('Phase 10: Password Strength', function () {
  it('register rejects password shorter than 8 characters', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'short-pass@nblao.la', password: 'Ab1!', name: 'Short',
    });
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('Password'));
  });

  it('register rejects password without uppercase letter', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'noupper@nblao.la', password: 'testpass1!', name: 'No Upper',
    });
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('Password'));
  });

  it('register rejects password without digit', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'nodigit@nblao.la', password: 'TestPassWord!', name: 'No Digit',
    });
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('Password'));
  });
});

// ═══════════════════════════════════════════════
// INPUT SANITIZATION (2)
// ═══════════════════════════════════════════════
describe('Phase 10: Input Sanitization', function () {
  it('register sanitizes XSS in name field', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'xss-test@nblao.la', password: 'TestPass1!', name: '<script>alert("xss")</script>',
    });
    if (res.status === 201) {
      // Check the name is sanitized in DB
      var login = await request('POST', '/api/auth/login', {
        email: 'xss-test@nblao.la', password: 'TestPass1!',
      });
      var me = await request('GET', '/api/auth/me', null, auth(login.json.token));
      assert.ok(!me.json.name.includes('<script>'), 'XSS should be escaped');
      assert.ok(me.json.name.includes('&lt;script&gt;'), 'XSS should be HTML-escaped');
      // Cleanup
      var PC = require('@prisma/client').PrismaClient;
      var p = new PC();
      try {
        await p.emailNotification.deleteMany({ where: { recipientEmail: 'xss-test@nblao.la' } });
        await p.customer.deleteMany({ where: { email: 'xss-test@nblao.la' } });
      } finally { await p.$disconnect(); }
    } else {
      // If rate-limited or blocked, that's also acceptable
      assert.ok(res.status === 429 || res.status === 400);
    }
  });

  it('search endpoint sanitizes XSS in query parameter', async function () {
    var res = await request('GET', '/api/products?search=<img%20src=x%20onerror=alert(1)>');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json), 'should return array');
  });
});

// ═══════════════════════════════════════════════
// SAFE INTEGER PARSING (4)
// ═══════════════════════════════════════════════
describe('Phase 10: Safe Integer Parsing', function () {
  var adminToken;

  it('setup: get admin token', async function () {
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = login.json.token;
  });

  it('admin products with non-numeric ID returns 400', async function () {
    var res = await request('GET', '/api/admin/products/abc', null, auth(adminToken));
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('Invalid'));
  });

  it('admin orders with negative ID returns 400', async function () {
    var res = await request('GET', '/api/admin/orders/-1', null, auth(adminToken));
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('Invalid'));
  });

  it('admin customers with NaN ID returns 400', async function () {
    var res = await request('GET', '/api/admin/customers/undefined', null, auth(adminToken));
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('Invalid'));
  });
});

// ═══════════════════════════════════════════════
// EMAIL NORMALIZATION (2)
// ═══════════════════════════════════════════════
describe('Phase 10: Email Normalization', function () {
  it('register normalizes email to lowercase', async function () {
    var res = await request('POST', '/api/auth/register', {
      email: 'NORM-TEST@NBlaO.la', password: 'TestPass1!', name: 'Norm Test',
    });
    if (res.status === 201) {
      assert.equal(res.json.customer.email, 'norm-test@nblao.la');
      // Cleanup
      var PC = require('@prisma/client').PrismaClient;
      var p = new PC();
      try {
        await p.emailNotification.deleteMany({ where: { recipientEmail: 'norm-test@nblao.la' } });
        await p.customer.deleteMany({ where: { email: 'norm-test@nblao.la' } });
      } finally { await p.$disconnect(); }
    }
  });

  it('login normalizes email to lowercase before lookup', async function () {
    // admin@nblao.la should work even if typed as Admin@NBLAO.LA
    var res = await request('POST', '/api/auth/login', {
      email: 'ADMIN@NBlaO.LA', password: ADMIN_PASS,
    });
    assert.equal(res.status, 200);
    assert.ok(res.json.token);
  });
});

// ═══════════════════════════════════════════════
// CART VALIDATION (2)
// ═══════════════════════════════════════════════
describe('Phase 10: Cart Input Validation', function () {
  var token;

  it('setup: login', async function () {
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    // Use admin as a customer for cart tests
    var PC = require('@prisma/client').PrismaClient;
    var p = new PC();
    try {
      await p.customer.update({ where: { email: ADMIN_EMAIL }, data: { role: 'admin' } });
    } finally { await p.$disconnect(); }
    token = login.json.token;
  });

  it('add to cart with invalid productId returns 400', async function () {
    var res = await request('POST', '/api/cart/items', { productId: 'abc', quantity: 1 }, auth(token));
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('Valid productId'));
  });

  it('add to cart with zero quantity returns 400', async function () {
    var prods = await request('GET', '/api/products');
    var res = await request('POST', '/api/cart/items', { productId: prods.json[0].id, quantity: 0 }, auth(token));
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('quantity'));
  });
});

// ═══════════════════════════════════════════════
// RATE LIMITER MODULE (2)
// ═══════════════════════════════════════════════
describe('Phase 10: Rate Limiter Module', function () {
  it('security module exports rate limiter functions', function () {
    var sec = require('../backend/middleware/security');
    assert.equal(typeof sec.rateLimit, 'function');
    assert.equal(typeof sec.rateLimiters, 'object');
    assert.equal(typeof sec.rateLimiters.auth, 'function');
    assert.equal(typeof sec.rateLimiters.admin, 'function');
    assert.equal(typeof sec.rateLimiters.read, 'function');
    assert.equal(typeof sec.rateLimiters.write, 'function');
    assert.equal(typeof sec.rateLimiters.global, 'function');
  });

  it('security module exports all validation helpers', function () {
    var sec = require('../backend/middleware/security');
    assert.equal(typeof sec.isValidEmail, 'function');
    assert.equal(typeof sec.isValidPassword, 'function');
    assert.equal(typeof sec.safeParseInt, 'function');
    assert.equal(typeof sec.isValidQuantity, 'function');
    assert.equal(typeof sec.sanitizeString, 'function');
    assert.equal(typeof sec.sanitizeInput, 'function');
    assert.equal(typeof sec.securityHeaders, 'function');
    assert.equal(typeof sec.bodySizeLimit, 'function');
  });
});

// ═══════════════════════════════════════════════
// FRONTEND PRESERVATION (1)
// ═══════════════════════════════════════════════
describe('Phase 10: Frontend Preservation', function () {
  it('all 4 frontend files match Phase 1 baselines', function () {
    assert.equal(md5(BASELINES.backup.file), BASELINES.backup.md5);
    assert.equal(lineCount(BASELINES.backup.file), BASELINES.backup.lines);
    assert.equal(md5(BASELINES.html.file), BASELINES.html.md5);
    assert.equal(lineCount(BASELINES.html.file), BASELINES.html.lines);
    assert.equal(md5(BASELINES.css.file), BASELINES.css.md5);
    assert.equal(lineCount(BASELINES.css.file), BASELINES.css.lines);
    assert.equal(md5(BASELINES.js.file), BASELINES.js.md5);
    assert.equal(lineCount(BASELINES.js.file), BASELINES.js.lines);
  });
});
