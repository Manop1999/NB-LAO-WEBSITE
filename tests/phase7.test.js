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

// Pick a product with sufficient stock for order-creation tests.
// Order creation validates stock server-side; stale/out-of-stock
// products must not break deterministic order tests.
function pickInStock(prods, qty) {
  for (var i = 0; i < prods.length; i++) {
    if (prods[i].stock >= qty) return prods[i];
  }
  return prods[0];
}

async function cleanupTestData() {
  var PC = require('@prisma/client').PrismaClient;
  var p = new PC();
  try {
    // Clean up test customer orders/quotations/carts
    var emails = [TEST_EMAIL, 'order-admin-test@nblao.la', 'quote-admin-test@nblao.la'];
    for (var i = 0; i < emails.length; i++) {
      var e = emails[i];
      await p.orderItem.deleteMany({ where: { order: { customer: { email: e } } } }).catch(function () {});
      await p.order.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.quotationItem.deleteMany({ where: { quotation: { customer: { email: e } } } }).catch(function () {});
      await p.quotation.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.cartItem.deleteMany({ where: { cart: { customer: { email: e } } } }).catch(function () {});
      await p.cart.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
    }
    // Delete test customers
    for (var j = 0; j < emails.length; j++) {
      if (emails[j] !== TEST_EMAIL) {
        await p.customer.deleteMany({ where: { email: emails[j] } }).catch(function () {});
      }
    }
  } finally {
    await p.$disconnect();
  }
}

// ═══════════════════════════════════════════════
// SCHEMA CHECKS (2)
// ═══════════════════════════════════════════════
describe('Phase 7: Schema Changes', function () {
  it('Order model has notes field', function () {
    var schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    // Find the Order model block and check for notes
    var orderMatch = schema.match(/model Order \{[\s\S]*?\n\}/);
    assert.ok(orderMatch, 'Order model not found');
    assert.ok(orderMatch[0].includes('notes'), 'Order model missing notes field');
  });

  it('Quotation model has notes field', function () {
    var schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    var quoteMatch = schema.match(/model Quotation \{[\s\S]*?\n\}/);
    assert.ok(quoteMatch, 'Quotation model not found');
    assert.ok(quoteMatch[0].includes('notes'), 'Quotation model missing notes field');
  });
});

// ═══════════════════════════════════════════════
// ADMIN ORDERS (5)
// ═══════════════════════════════════════════════
describe('Phase 7: Admin Orders', function () {
  var adminToken;
  var customerToken;
  var testOrderId;

  it('setup: create test data', async function () {
    await cleanupTestData();
    // Ensure test customer exists
    await request('POST', '/api/auth/register', {
      email: TEST_EMAIL, password: TEST_PASS, name: 'Test User',
      phone: '+856 20 1234 5678', company: 'NB Lao Trading Co.',
    }).catch(function () {});
    // Login admin
    var adminLogin = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = adminLogin.json.token;

    // Login customer and create an order
    var custLogin = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    customerToken = custLogin.json.token;

    // Add items to cart and create order
    var prods = await request('GET', '/api/products');
    await request('DELETE', '/api/cart', null, auth(customerToken));
    await request('POST', '/api/cart/items', { productId: pickInStock(prods.json, 2).id, quantity: 2 }, auth(customerToken));
    var orderRes = await request('POST', '/api/orders', {}, auth(customerToken));
    assert.equal(orderRes.status, 201);
    testOrderId = orderRes.json.id;
  });

  it('GET /api/admin/orders lists all orders with customer info', async function () {
    var res = await request('GET', '/api/admin/orders', null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 1, 'should have at least 1 order');
    var order = res.json[0];
    assert.ok(order.order_number, 'order_number missing');
    assert.ok(order.status, 'status missing');
    assert.ok(order.customer, 'customer info missing');
    assert.ok(order.customer.name, 'customer name missing');
    assert.ok(order.customer.email, 'customer email missing');
    assert.equal(typeof order.items_count, 'number');
    assert.equal(typeof order.total, 'number');
  });

  it('GET /api/admin/orders/:id returns single order with items', async function () {
    var res = await request('GET', '/api/admin/orders/' + testOrderId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.id, testOrderId);
    assert.ok(res.json.order_number);
    assert.ok(res.json.customer, 'customer missing');
    assert.ok(res.json.customer.email, 'customer email missing');
    assert.ok(Array.isArray(res.json.items), 'items missing');
    assert.ok(res.json.items.length >= 1, 'should have at least 1 item');
    assert.equal(typeof res.json.total, 'number');
  });

  it('PUT /api/admin/orders/:id updates status and notes', async function () {
    var res = await request('PUT', '/api/admin/orders/' + testOrderId, {
      status: 'confirmed',
      notes: 'Payment verified, ready for dispatch',
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'confirmed');
    assert.equal(res.json.notes, 'Payment verified, ready for dispatch');
  });

  it('PUT /api/admin/orders/:id rejects invalid status', async function () {
    var res = await request('PUT', '/api/admin/orders/' + testOrderId, {
      status: 'invalid_status',
    }, auth(adminToken));
    assert.equal(res.status, 400);
    assert.ok(res.json.error);
  });

  it('GET /api/admin/orders/:id returns 404 for non-existent', async function () {
    var res = await request('GET', '/api/admin/orders/999999', null, auth(adminToken));
    assert.equal(res.status, 404);
  });

  it('non-admin cannot access admin orders', async function () {
    var res = await request('GET', '/api/admin/orders', null, auth(customerToken));
    assert.equal(res.status, 403);
  });
});

// ═══════════════════════════════════════════════
// ADMIN QUOTATIONS (5)
// ═══════════════════════════════════════════════
describe('Phase 7: Admin Quotations', function () {
  var adminToken;
  var customerToken;
  var testQuotationId;

  it('setup: create test quotation', async function () {
    await cleanupTestData();
    // Ensure test customer exists
    await request('POST', '/api/auth/register', {
      email: TEST_EMAIL, password: TEST_PASS, name: 'Test User',
      phone: '+856 20 1234 5678', company: 'NB Lao Trading Co.',
    }).catch(function () {});
    // Login admin
    var adminLogin = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = adminLogin.json.token;

    // Login customer and create quotation from cart
    var custLogin = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    customerToken = custLogin.json.token;

    var prods = await request('GET', '/api/products');
    await request('DELETE', '/api/cart', null, auth(customerToken));
    await request('POST', '/api/cart/items', { productId: prods.json[0].id, quantity: 3 }, auth(customerToken));
    await request('POST', '/api/cart/items', { productId: prods.json[1].id, quantity: 1 }, auth(customerToken));
    var quoteRes = await request('POST', '/api/quotations', {}, auth(customerToken));
    assert.equal(quoteRes.status, 201);
    testQuotationId = quoteRes.json.id;
  });

  it('GET /api/admin/quotations lists all quotations with customer info', async function () {
    var res = await request('GET', '/api/admin/quotations', null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 1, 'should have at least 1 quotation');
    var q = res.json[0];
    assert.ok(q.quotation_number, 'quotation_number missing');
    assert.ok(q.status, 'status missing');
    assert.ok(q.customer, 'customer info missing');
    assert.ok(q.customer.name, 'customer name missing');
    assert.ok(q.customer.email, 'customer email missing');
    assert.equal(typeof q.items_count, 'number');
    assert.equal(typeof q.total, 'number');
  });

  it('GET /api/admin/quotations/:id returns single quotation with items', async function () {
    var res = await request('GET', '/api/admin/quotations/' + testQuotationId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.id, testQuotationId);
    assert.ok(res.json.quotation_number);
    assert.ok(res.json.customer, 'customer missing');
    assert.ok(res.json.customer.email, 'customer email missing');
    assert.ok(Array.isArray(res.json.items), 'items missing');
    assert.ok(res.json.items.length >= 2, 'should have at least 2 items');
    assert.equal(typeof res.json.total, 'number');
    // Check subtotal is calculated
    assert.equal(typeof res.json.items[0].subtotal, 'number');
  });

  it('PUT /api/admin/quotations/:id updates status and notes', async function () {
    var res = await request('PUT', '/api/admin/quotations/' + testQuotationId, {
      status: 'reviewed',
      notes: 'Reviewed by admin, preparing quote',
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'reviewed');
    assert.equal(res.json.notes, 'Reviewed by admin, preparing quote');
  });

  it('PUT /api/admin/quotations/:id rejects invalid status', async function () {
    var res = await request('PUT', '/api/admin/quotations/' + testQuotationId, {
      status: 'bogus',
    }, auth(adminToken));
    assert.equal(res.status, 400);
    assert.ok(res.json.error);
  });

  it('PUT /api/admin/quotations/:id can transition to quoted', async function () {
    var res = await request('PUT', '/api/admin/quotations/' + testQuotationId, {
      status: 'quoted',
      notes: 'Quote sent: 150,000 KIP total',
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'quoted');
    assert.equal(res.json.notes, 'Quote sent: 150,000 KIP total');
  });

  it('GET /api/admin/quotations/:id returns 404 for non-existent', async function () {
    var res = await request('GET', '/api/admin/quotations/999999', null, auth(adminToken));
    assert.equal(res.status, 404);
  });

  it('non-admin cannot access admin quotations', async function () {
    var res = await request('GET', '/api/admin/quotations', null, auth(customerToken));
    assert.equal(res.status, 403);
  });
});

// ═══════════════════════════════════════════════
// FRONTEND PRESERVATION (1)
// ═══════════════════════════════════════════════
describe('Phase 7: Frontend Preservation', function () {
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
