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
      res.on('data', function (d) { data += d; });
      res.on('end', function () {
        var json = null;
        try { json = JSON.parse(data); } catch (e) {}
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

function auth(token) { return { Authorization: 'Bearer ' + token }; }

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
    // Clean only Phase 9-specific test data (NOT the base test customer's orders/carts)
    var phase9Emails = ['email-test@nblao.la', 'email-admin-test@nblao.la'];
    for (var i = 0; i < phase9Emails.length; i++) {
      var e = phase9Emails[i];
      await p.emailNotification.deleteMany({ where: { recipientEmail: e } }).catch(function () {});
      await p.orderItem.deleteMany({ where: { order: { customer: { email: e } } } }).catch(function () {});
      await p.order.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.quotationItem.deleteMany({ where: { quotation: { customer: { email: e } } } }).catch(function () {});
      await p.quotation.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.cartItem.deleteMany({ where: { cart: { customer: { email: e } } } }).catch(function () {});
      await p.cart.deleteMany({ where: { customer: { email: e } } }).catch(function () {});
      await p.customer.deleteMany({ where: { email: e } }).catch(function () {});
    }
    // Clean email notifications for test customer (but NOT orders/carts)
    await p.emailNotification.deleteMany({ where: { recipientEmail: TEST_EMAIL } }).catch(function () {});
    // Ensure test customer is active
    await p.customer.updateMany({ where: { email: TEST_EMAIL }, data: { active: true, role: 'customer' } }).catch(function () {});
  } finally { await p.$disconnect(); }
}

// ═══════════════════════════════════════════════
// EMAIL SERVICE (3)
// ═══════════════════════════════════════════════
describe('Phase 9: Email Service', function () {
  it('email service module loads and exports correctly', function () {
    var email = require('../backend/services/email');
    assert.equal(typeof email.sendEmail, 'function');
    assert.equal(typeof email.logNotification, 'function');
    assert.equal(typeof email.isValidEmail, 'function');
  });

  it('isValidEmail validates correctly', function () {
    var { isValidEmail } = require('../backend/services/email');
    assert.equal(isValidEmail('test@example.com'), true);
    assert.equal(isValidEmail('admin@nblao.la'), true);
    assert.equal(isValidEmail(''), false);
    assert.equal(isValidEmail(null), false);
    assert.equal(isValidEmail('notanemail'), false);
    assert.equal(isValidEmail('missing@'), false);
  });

  it('sendEmail in dev mode succeeds without SMTP', async function () {
    var { sendEmail, isDevMode } = require('../backend/services/email');
    assert.equal(isDevMode, true, 'should be in dev mode when no SMTP configured');
    var result = await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>', text: 'Hi' });
    assert.equal(result.success, true);
  });
});

// ═══════════════════════════════════════════════
// ORDER EMAIL TRIGGERS (3)
// ═══════════════════════════════════════════════
describe('Phase 9: Order Email Triggers', function () {
  var adminToken, customerToken, testOrderId;

  it('setup: clean and create order', async function () {
    await cleanupTestData();
    await request('POST', '/api/auth/register', {
      email: TEST_EMAIL, password: TEST_PASS, name: 'Test User',
    }).catch(function () {});
    var adminLogin = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = adminLogin.json.token;
    var custLogin = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    customerToken = custLogin.json.token;
    var prods = await request('GET', '/api/products');
    await request('DELETE', '/api/cart', null, auth(customerToken));
    await request('POST', '/api/cart/items', { productId: pickInStock(prods.json, 2).id, quantity: 2 }, auth(customerToken));
    var orderRes = await request('POST', '/api/orders', {}, auth(customerToken));
    assert.equal(orderRes.status, 201);
    testOrderId = orderRes.json.id;
  });

  it('order creation triggers email notification', async function () {
    // Wait a moment for async notification
    await new Promise(r => setTimeout(r, 200));
    var emails = await request('GET', '/api/admin/emails', null, auth(adminToken));
    assert.equal(emails.status, 200);
    var orderEmail = emails.json.find(e => e.type === 'order_created' && e.customer_id !== null);
    assert.ok(orderEmail, 'order_created notification should exist');
    assert.equal(orderEmail.status, 'sent');
    assert.ok(orderEmail.subject.includes(testOrderId.toString()) || orderEmail.subject.includes('Order'));
  });

  it('admin order status change triggers email notification', async function () {
    // Verify order still exists before updating
    var check = await request('GET', '/api/admin/orders/' + testOrderId, null, auth(adminToken));
    if (check.status === 404) {
      // Order was cleaned up — recreate it
      var prods = await request('GET', '/api/products');
      await request('DELETE', '/api/cart', null, auth(customerToken));
      await request('POST', '/api/cart/items', { productId: pickInStock(prods.json, 1).id, quantity: 1 }, auth(customerToken));
      var newOrder = await request('POST', '/api/orders', {}, auth(customerToken));
      testOrderId = newOrder.json.id;
    }
    var res = await request('PUT', '/api/admin/orders/' + testOrderId, {
      status: 'confirmed',
    }, auth(adminToken));
    assert.equal(res.status, 200);
    await new Promise(r => setTimeout(r, 200));
    var emails = await request('GET', '/api/admin/emails', null, auth(adminToken));
    var statusEmail = emails.json.find(e => e.type === 'order_status_changed' && e.order_id === testOrderId);
    assert.ok(statusEmail, 'order_status_changed notification should exist');
    assert.equal(statusEmail.status, 'sent');
  });
});

// ═══════════════════════════════════════════════
// QUOTATION EMAIL TRIGGERS (3)
// ═══════════════════════════════════════════════
describe('Phase 9: Quotation Email Triggers', function () {
  var adminToken, customerToken, testQuotationId;

  it('setup: clean and create quotation', async function () {
    await cleanupTestData();
    await request('POST', '/api/auth/register', {
      email: TEST_EMAIL, password: TEST_PASS, name: 'Test User',
    }).catch(function () {});
    var adminLogin = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = adminLogin.json.token;
    var custLogin = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    customerToken = custLogin.json.token;
    var prods = await request('GET', '/api/products');
    await request('DELETE', '/api/cart', null, auth(customerToken));
    await request('POST', '/api/cart/items', { productId: pickInStock(prods.json, 1).id, quantity: 1 }, auth(customerToken));
    var quoteRes = await request('POST', '/api/quotations', {}, auth(customerToken));
    assert.equal(quoteRes.status, 201);
    testQuotationId = quoteRes.json.id;
  });

  it('quotation creation triggers email notification', async function () {
    await new Promise(r => setTimeout(r, 200));
    var emails = await request('GET', '/api/admin/emails', null, auth(adminToken));
    var quoteEmail = emails.json.find(e => e.type === 'quotation_created' && e.quotation_id !== null);
    assert.ok(quoteEmail, 'quotation_created notification should exist');
    assert.equal(quoteEmail.status, 'sent');
  });

  it('admin quotation status change triggers email notification', async function () {
    var check = await request('GET', '/api/admin/quotations/' + testQuotationId, null, auth(adminToken));
    if (check.status === 404) {
      var prods = await request('GET', '/api/products');
      await request('DELETE', '/api/cart', null, auth(customerToken));
      await request('POST', '/api/cart/items', { productId: pickInStock(prods.json, 1).id, quantity: 1 }, auth(customerToken));
      var newQuote = await request('POST', '/api/quotations', {}, auth(customerToken));
      testQuotationId = newQuote.json.id;
    }
    var res = await request('PUT', '/api/admin/quotations/' + testQuotationId, {
      status: 'reviewed',
    }, auth(adminToken));
    assert.equal(res.status, 200);
    await new Promise(r => setTimeout(r, 200));
    var emails = await request('GET', '/api/admin/emails', null, auth(adminToken));
    var statusEmail = emails.json.find(e => e.type === 'quotation_status_changed' && e.quotation_id === testQuotationId);
    assert.ok(statusEmail, 'quotation_status_changed notification should exist');
    assert.equal(statusEmail.status, 'sent');
  });
});

// ═══════════════════════════════════════════════
// ACCOUNT EMAIL TRIGGERS (3)
// ═══════════════════════════════════════════════
describe('Phase 9: Account Email Triggers', function () {
  var adminToken, testCustId;

  it('setup: create test customer', async function () {
    await cleanupTestData();
    var adminLogin = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = adminLogin.json.token;
    var reg = await request('POST', '/api/auth/register', {
      email: 'email-test@nblao.la', password: 'Test1234!', name: 'Email Test User',
    });
    assert.equal(reg.status, 201);
    testCustId = reg.json.customer.id;
  });

  it('admin deactivating customer triggers email notification', async function () {
    var res = await request('PUT', '/api/admin/customers/' + testCustId, {
      active: false,
    }, auth(adminToken));
    assert.equal(res.status, 200);
    await new Promise(r => setTimeout(r, 200));
    var emails = await request('GET', '/api/admin/emails', null, auth(adminToken));
    var deactEmail = emails.json.find(e => e.type === 'account_deactivated' && e.customer_id === testCustId);
    assert.ok(deactEmail, 'account_deactivated notification should exist');
    assert.equal(deactEmail.status, 'sent');
  });

  it('admin activating customer triggers email notification', async function () {
    var res = await request('PUT', '/api/admin/customers/' + testCustId, {
      active: true,
    }, auth(adminToken));
    assert.equal(res.status, 200);
    await new Promise(r => setTimeout(r, 200));
    var emails = await request('GET', '/api/admin/emails', null, auth(adminToken));
    var actEmail = emails.json.find(e => e.type === 'account_activated' && e.customer_id === testCustId);
    assert.ok(actEmail, 'account_activated notification should exist');
    assert.equal(actEmail.status, 'sent');
  });
});

// ═══════════════════════════════════════════════
// EMAIL LOG & RELIABILITY (3)
// ═══════════════════════════════════════════════
describe('Phase 9: Email Logging & Reliability', function () {
  it('GET /api/admin/emails returns email notification log', async function () {
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    var res = await request('GET', '/api/admin/emails', null, auth(login.json.token));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length > 0, 'should have email notifications logged');
    var email = res.json[0];
    assert.ok(email.recipient, 'recipient missing');
    assert.ok(email.subject, 'subject missing');
    assert.ok(email.type, 'type missing');
    assert.ok(email.status, 'status missing');
  });

  it('non-admin cannot access email log', async function () {
    var login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    var res = await request('GET', '/api/admin/emails', null, auth(login.json.token));
    assert.equal(res.status, 403);
  });

  it('email notification records have correct structure', async function () {
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    var res = await request('GET', '/api/admin/emails', null, auth(login.json.token));
    assert.equal(res.status, 200);
    // Find a sent email
    var sentEmail = res.json.find(e => e.status === 'sent');
    if (sentEmail) {
      assert.ok(sentEmail.sent_at, 'sent_at should be set for sent emails');
      assert.equal(sentEmail.error, null, 'error should be null for sent emails');
    }
  });
});

// ═══════════════════════════════════════════════
// FRONTEND PRESERVATION (1)
// ═══════════════════════════════════════════════
describe('Phase 9: Frontend Preservation', function () {
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
