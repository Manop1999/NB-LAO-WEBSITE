const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE = 'http://localhost:3001';

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
      res.on('data', function (d) {
        data += d;
      });
      res.on('end', function () {
        var json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({ status: res.statusCode, body: data, json: json });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
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
  html: { md5: 'aebe02f72a5852289b1a7ad27c7dd657', lines: 611, file: 'nb_lao_wireframes_v2_updated.html' },
  css:    { md5: 'ad86eea2c740140705b8c06b2419d1a4', lines: 3828, file: 'styles/nblao.css' },
  js: { md5: 'b53a5966017bdd3fb7794e58822aeb98', lines: 370, file: 'js/nblao.js' },
};

var ADMIN_EMAIL = 'admin@nblao.la';
var ADMIN_PASS = 'Admin123!';
var TEST_EMAIL = 'test@nblao.la';
var TEST_PASS = 'TestPass123!';

function auth(token) {
  return { Authorization: 'Bearer ' + token };
}

async function cleanupTestData() {
  var PC = require('@prisma/client').PrismaClient;
  var p = new PC();
  try {
    // Ensure test customer is active and not admin
    await p.customer.updateMany({
      where: { email: TEST_EMAIL },
      data: { active: true, role: 'customer' },
    }).catch(function () {});
    // Delete test customers
    var testEmails = ['cust-admin-001@nblao.la', 'cust-admin-002@nblao.la', 'cust-deact@nblao.la'];
    for (var i = 0; i < testEmails.length; i++) {
      var e = testEmails[i];
      await p.orderItem.deleteMany({ where: { order: { customer: { email: e } } } }).catch(function () {});
      await p.order.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.quotationItem.deleteMany({ where: { quotation: { customer: { email: e } } } }).catch(function () {});
      await p.quotation.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.cartItem.deleteMany({ where: { cart: { customer: { email: e } } } }).catch(function () {});
      await p.cart.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.customer.deleteMany({ where: { email: e } }).catch(function () {});
    }
  } finally {
    await p.$disconnect();
  }
}

// ═══════════════════════════════════════════════
// SCHEMA CHECK (1)
// ═══════════════════════════════════════════════
describe('Phase 8: Schema Changes', function () {
  it('Customer model has active field', function () {
    var schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    var match = schema.match(/model Customer \{[\s\S]*?\n\}/);
    assert.ok(match, 'Customer model not found');
    assert.ok(match[0].includes('active'), 'Customer model missing active field');
  });
});

// ═══════════════════════════════════════════════
// ADMIN CUSTOMERS (7)
// ═══════════════════════════════════════════════
describe('Phase 8: Admin Customers', function () {
  var adminToken;
  var testCustomerId;

  it('setup: clean data and login admin', async function () {
    await cleanupTestData();
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = login.json.token;

    // Register a test customer to manage
    var reg = await request('POST', '/api/auth/register', {
      email: 'cust-admin-001@nblao.la', password: 'Test1234!', name: 'Cust Admin Test',
      phone: '+856 20 9999 0000', company: 'Test Corp',
    });
    assert.equal(reg.status, 201);
    testCustomerId = reg.json.customer.id;
  });

  it('GET /api/admin/customers lists all customers', async function () {
    var res = await request('GET', '/api/admin/customers', null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 2, 'should have at least 2 customers');
    var cust = res.json.find(c => c.id === testCustomerId);
    assert.ok(cust, 'test customer should be in list');
    assert.equal(cust.email, 'cust-admin-001@nblao.la');
    assert.equal(cust.name, 'Cust Admin Test');
    assert.equal(cust.active, true);
    assert.equal(typeof cust.orders_count, 'number');
    assert.equal(typeof cust.quotations_count, 'number');
  });

  it('GET /api/admin/customers/:id returns customer detail', async function () {
    var res = await request('GET', '/api/admin/customers/' + testCustomerId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.id, testCustomerId);
    assert.equal(res.json.email, 'cust-admin-001@nblao.la');
    assert.equal(res.json.active, true);
    assert.ok(Array.isArray(res.json.orders), 'orders missing');
    assert.ok(Array.isArray(res.json.quotations), 'quotations missing');
  });

  it('PUT /api/admin/customers/:id updates role', async function () {
    var res = await request('PUT', '/api/admin/customers/' + testCustomerId, {
      role: 'staff',
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.role, 'staff');
  });

  it('PUT /api/admin/customers/:id rejects invalid role', async function () {
    var res = await request('PUT', '/api/admin/customers/' + testCustomerId, {
      role: 'superadmin',
    }, auth(adminToken));
    assert.equal(res.status, 400);
    assert.ok(res.json.error);
  });

  it('PUT /api/admin/customers/:id deactivates customer', async function () {
    var res = await request('PUT', '/api/admin/customers/' + testCustomerId, {
      active: false,
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.active, false);
  });

  it('deactivated customer cannot login', async function () {
    var res = await request('POST', '/api/auth/login', {
      email: 'cust-admin-001@nblao.la', password: 'Test1234!',
    });
    assert.equal(res.status, 403);
    assert.ok(res.json.error.includes('deactivated'));
  });

  it('reactivated customer can login again', async function () {
    // Reactivate
    await request('PUT', '/api/admin/customers/' + testCustomerId, {
      active: true,
    }, auth(adminToken));
    // Try login
    var res = await request('POST', '/api/auth/login', {
      email: 'cust-admin-001@nblao.la', password: 'Test1234!',
    });
    assert.equal(res.status, 200);
    assert.ok(res.json.token);
  });

  it('GET /api/admin/customers/:id returns 404 for non-existent', async function () {
    var res = await request('GET', '/api/admin/customers/999999', null, auth(adminToken));
    assert.equal(res.status, 404);
  });

  it('non-admin cannot access admin customers', async function () {
    var login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    var res = await request('GET', '/api/admin/customers', null, auth(login.json.token));
    assert.equal(res.status, 403);
  });
});

// ═══════════════════════════════════════════════
// ADMIN SAFETY: Cannot deactivate last admin (1)
// ═══════════════════════════════════════════════
describe('Phase 8: Admin Safety', function () {
  var adminToken;

  it('cannot deactivate the last active admin', async function () {
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = login.json.token;

    // Find admin customer ID
    var customers = await request('GET', '/api/admin/customers', null, auth(adminToken));
    var adminCust = customers.json.find(c => c.email === ADMIN_EMAIL);
    assert.ok(adminCust, 'admin customer not found');

    // Try to deactivate
    var res = await request('PUT', '/api/admin/customers/' + adminCust.id, {
      active: false,
    }, auth(adminToken));
    assert.equal(res.status, 400);
    assert.ok(res.json.error.includes('last active admin'));
  });
});

// ═══════════════════════════════════════════════
// FRONTEND PRESERVATION (1)
// ═══════════════════════════════════════════════
describe('Phase 8: Frontend Preservation', function () {
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
