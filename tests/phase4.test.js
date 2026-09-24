const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE = 'http://localhost:3001';

// --- HTTP helpers ---

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${urlPath}`);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: data, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function md5(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function lineCount(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

// Fixed Phase 1 baselines (never recomputed)
const BASELINES = {
  backup: { md5: '69b1396610c1d27917d16cc193c00103', lines: 1265, file: 'nb_lao_wireframes_v2_original_backup.html' },
  html:   { md5: 'aebe02f72a5852289b1a7ad27c7dd657', lines: 611, file: 'nb_lao_wireframes_v2_updated.html' },
  css:    { md5: 'ad86eea2c740140705b8c06b2419d1a4', lines: 3828, file: 'styles/nblao.css' },
  js:     { md5: 'b53a5966017bdd3fb7794e58822aeb98', lines: 370, file: 'js/nblao.js' },
};

const TEST_EMAIL = 'test@nblao.la';
const TEST_PASS = 'TestPass123!';
const TEST_NAME = 'Test User';
const TEST_PHONE = '+856 20 1234 5678';
const TEST_COMPANY = 'NB Lao Trading Co.';

// ═══════════════════════════════════════════════
// Phase 4: Auth API Tests (10)
// ═══════════════════════════════════════════════

describe('Phase 4: Registration', () => {
  const { PrismaClient } = require('@prisma/client');

  it('clean up test customer', async () => {
    const p = new PrismaClient();
    try {
    await p.emailNotification.deleteMany({ where: { recipientEmail: TEST_EMAIL } });
    await p.orderItem.deleteMany({ where: { order: { customer: { email: TEST_EMAIL } } } });
    await p.order.deleteMany({ where: { customer: { email: TEST_EMAIL } } });
    await p.quotationItem.deleteMany({ where: { quotation: { customer: { email: TEST_EMAIL } } } });
    await p.quotation.deleteMany({ where: { customer: { email: TEST_EMAIL } } });
    await p.cartItem.deleteMany({ where: { cart: { customer: { email: TEST_EMAIL } } } });
    await p.cart.deleteMany({ where: { customer: { email: TEST_EMAIL } } });
    await p.pointsLedger.deleteMany({ where: { customer: { email: TEST_EMAIL } } });
    await p.customer.deleteMany({ where: { email: TEST_EMAIL } });
  }
    finally { await p.$disconnect(); }
  });
  it('POST /api/auth/register returns 201 with token', async () => {
    const res = await request('POST', '/api/auth/register', {
      email: TEST_EMAIL, password: TEST_PASS, name: TEST_NAME,
      phone: TEST_PHONE, company: TEST_COMPANY,
    });
    assert.equal(res.status, 201);
    assert.ok(res.json.token, 'token missing');
    assert.ok(res.json.customer, 'customer missing');
    assert.equal(res.json.customer.email, TEST_EMAIL);
    assert.equal(res.json.customer.name, TEST_NAME);
  });

  it('POST /api/auth/register rejects duplicate email', async () => {
    const res = await request('POST', '/api/auth/register', {
      email: TEST_EMAIL, password: TEST_PASS, name: 'Another',
    });
    assert.equal(res.status, 409);
    assert.ok(res.json.error);
  });

  it('POST /api/auth/register rejects missing fields', async () => {
    const res = await request('POST', '/api/auth/register', { email: 'x@y.com' });
    assert.equal(res.status, 400);
  });
});

describe('Phase 4: Login', () => {
  it('POST /api/auth/login returns token with valid credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL, password: TEST_PASS,
    });
    assert.equal(res.status, 200);
    assert.ok(res.json.token, 'token missing');
    assert.equal(res.json.customer.email, TEST_EMAIL);
  });

  it('POST /api/auth/login rejects wrong password', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL, password: 'wrong',
    });
    assert.equal(res.status, 401);
  });

  it('POST /api/auth/login rejects unknown email', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'nobody@nblao.la', password: 'anything',
    });
    assert.equal(res.status, 401);
  });
});

describe('Phase 4: Authenticated Profile', () => {
  let token;

  it('GET /api/auth/me requires auth header', async () => {
    const res = await request('GET', '/api/auth/me');
    assert.equal(res.status, 401);
  });

  it('GET /api/auth/me returns profile with valid token', async () => {
    // Login to get token
    const login = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL, password: TEST_PASS,
    });
    token = login.json.token;

    const res = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${token}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.email, TEST_EMAIL);
    assert.equal(res.json.name, TEST_NAME);
    assert.equal(res.json.phone, TEST_PHONE);
    assert.equal(res.json.company, TEST_COMPANY);
    assert.equal(res.json.role, 'customer');
  });

  it('PUT /api/auth/me updates profile', async () => {
    if (!token) {
      const login = await request('POST', '/api/auth/login', {
        email: TEST_EMAIL, password: TEST_PASS,
      });
      token = login.json.token;
    }

    const res = await request('PUT', '/api/auth/me', {
      name: 'Updated Name', company: 'New Company',
    }, {
      Authorization: `Bearer ${token}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.name, 'Updated Name');
    assert.equal(res.json.company, 'New Company');
  });
});

// ═══════════════════════════════════════════════
// Frontend Preservation Tests (4)
// ═══════════════════════════════════════════════
describe('Phase 4: Frontend Preservation', () => {
  it('backup HTML matches Phase 1 baseline', () => {
    assert.equal(md5(BASELINES.backup.file), BASELINES.backup.md5);
    assert.equal(lineCount(BASELINES.backup.file), BASELINES.backup.lines);
  });

  it('Phase 1 HTML matches baseline', () => {
    assert.equal(md5(BASELINES.html.file), BASELINES.html.md5);
    assert.equal(lineCount(BASELINES.html.file), BASELINES.html.lines);
  });

  it('Phase 1 CSS matches baseline', () => {
    assert.equal(md5(BASELINES.css.file), BASELINES.css.md5);
    assert.equal(lineCount(BASELINES.css.file), BASELINES.css.lines);
  });

  it('Phase 1 JS matches baseline', () => {
    assert.equal(md5(BASELINES.js.file), BASELINES.js.md5);
    assert.equal(lineCount(BASELINES.js.file), BASELINES.js.lines);
  });
});
