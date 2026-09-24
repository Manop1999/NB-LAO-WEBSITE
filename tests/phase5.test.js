const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE = 'http://localhost:3001';

function request(method, urlPath, body, headers) {
  headers = headers || {};
  return new Promise(function(resolve, reject) {
    var url = new URL(BASE + urlPath);
    var hdrs = Object.assign({ 'Content-Type': 'application/json' }, headers);
    var opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: method, headers: hdrs };
    var req = http.request(opts, function(res) {
      var data = '';
      res.on('data', function(d) { data += d; });
      res.on('end', function() {
        var json = null;
        try { json = JSON.parse(data); } catch(e) {}
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
  html:   { md5: 'aebe02f72a5852289b1a7ad27c7dd657', lines: 611, file: 'nb_lao_wireframes_v2_updated.html' },
  css:    { md5: 'ad86eea2c740140705b8c06b2419d1a4', lines: 3828, file: 'styles/nblao.css' },
  js:     { md5: 'b53a5966017bdd3fb7794e58822aeb98', lines: 370, file: 'js/nblao.js' },
};

var TEST_EMAIL = 'test@nblao.la';
var TEST_PASS = 'TestPass123!';

var CLEANUP = ['cart-test@nblao.la','other@nblao.la','empty-q@nblao.la','q-other@nblao.la','empty-o@nblao.la'];

async function cleanupTestData() {
  var PC = require('@prisma/client').PrismaClient;
  var p = new PC();
  try {
    var emails = [TEST_EMAIL].concat(CLEANUP);
    for (var i = 0; i < emails.length; i++) {
      var e = emails[i];
      await p.orderItem.deleteMany({ where: { order: { customer: { email: e } } } });
      await p.order.deleteMany({ where: { customer: { email: e } } });
      await p.quotationItem.deleteMany({ where: { quotation: { customer: { email: e } } } });
      await p.quotation.deleteMany({ where: { customer: { email: e } } });
      await p.cartItem.deleteMany({ where: { cart: { customer: { email: e } } } });
      await p.cart.deleteMany({ where: { customer: { email: e } } });
      if (e !== TEST_EMAIL) await p.customer.deleteMany({ where: { email: e } });
    }
  } finally { await p.$disconnect(); }
}

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

// ===== CART TESTS (11) =====
describe('Phase 5: Cart', function() {
  var token, productId;

  it('get auth token', async function() {
    await cleanupTestData();
    var res = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    token = res.json.token;
  });

  it('GET /api/cart returns empty cart for new customer', async function() {
    await request('POST', '/api/auth/register', { email: 'cart-test@nblao.la', password: 'Test1234!', name: 'Cart Tester' }).catch(function() {});
    var login = await request('POST', '/api/auth/login', { email: 'cart-test@nblao.la', password: 'Test1234!' });
    token = login.json.token;
    var res = await request('GET', '/api/cart', null, auth(token));
    assert.equal(res.status, 200);
    assert.ok(res.json.items, 'items missing');
    assert.equal(res.json.items.length, 0);
  });

  it('GET /api/cart requires authentication', async function() {
    var res = await request('GET', '/api/cart');
    assert.equal(res.status, 401);
  });

  it('POST /api/cart/items adds a product to cart', async function() {
    var prods = await request('GET', '/api/products');
    productId = prods.json[0].id;
    var res = await request('POST', '/api/cart/items', { productId: productId, quantity: 2 }, auth(token));
    assert.equal(res.status, 201);
    assert.equal(res.json.items.length, 1);
    assert.equal(res.json.items[0].quantity, 2);
    assert.equal(res.json.items[0].product_id, productId);
  });

  it('POST /api/cart/items returns 400 for invalid product', async function() {
    var res = await request('POST', '/api/cart/items', { productId: 999999, quantity: 1 }, auth(token));
    assert.equal(res.status, 400);
    assert.ok(res.json.error);
  });

  it('POST /api/cart/items returns 200 when adding same product again', async function() {
    var res = await request('POST', '/api/cart/items', { productId: productId, quantity: 3 }, auth(token));
    assert.equal(res.status, 200);
    assert.equal(res.json.items.length, 1, 'should still be 1 item');
    assert.equal(res.json.items[0].quantity, 5, 'quantity should be 2 + 3 = 5');
  });

  it('PUT /api/cart/items/:id updates quantity', async function() {
    var cart = await request('GET', '/api/cart', null, auth(token));
    var itemId = cart.json.items[0].id;
    var res = await request('PUT', '/api/cart/items/' + itemId, { quantity: 1 }, auth(token));
    assert.equal(res.status, 200);
    assert.equal(res.json.items[0].quantity, 1);
  });

  it('DELETE /api/cart/items/:id removes item', async function() {
    var cart = await request('GET', '/api/cart', null, auth(token));
    var itemId = cart.json.items[0].id;
    var res = await request('DELETE', '/api/cart/items/' + itemId, null, auth(token));
    assert.equal(res.status, 200);
    assert.equal(res.json.items.length, 0);
  });

  it('DELETE /api/cart clears entire cart', async function() {
    var prods = await request('GET', '/api/products');
    await request('POST', '/api/cart/items', { productId: prods.json[0].id, quantity: 1 }, auth(token));
    await request('POST', '/api/cart/items', { productId: prods.json[1].id, quantity: 1 }, auth(token));
    var res = await request('DELETE', '/api/cart', null, auth(token));
    assert.equal(res.status, 200);
    assert.equal(res.json.items.length, 0);
  });

  it('cart reflects live product price not stale', async function() {
    var prods = await request('GET', '/api/products');
    var product = prods.json[0];
    await request('POST', '/api/cart/items', { productId: product.id, quantity: 1 }, auth(token));
    var cart = await request('GET', '/api/cart', null, auth(token));
    var cartItem = cart.json.items[0];
    assert.equal(cartItem.price, product.price, 'cart price should match catalog price');
    assert.equal(cartItem.name, product.name, 'cart name should match catalog name');
  });

  it('cart item belongs to authenticated customer only', async function() {
    await request('POST', '/api/auth/register', { email: 'other@nblao.la', password: 'Test1234!', name: 'Other User' });
    var login = await request('POST', '/api/auth/login', { email: 'other@nblao.la', password: 'Test1234!' });
    var res = await request('GET', '/api/cart', null, auth(login.json.token));
    assert.equal(res.status, 200);
    assert.equal(res.json.items.length, 0, 'other customer should have empty cart');
  });
});

// ===== QUOTATION TESTS (10) =====
describe('Phase 5: Quotations', function() {
  var token;

  it('clean up and setup cart', async function() {
    await cleanupTestData();
    var login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    token = login.json.token;
    var prods = await request('GET', '/api/products');
    await request('DELETE', '/api/cart', null, auth(token));
    await request('POST', '/api/cart/items', { productId: prods.json[0].id, quantity: 2 }, auth(token));
    await request('POST', '/api/cart/items', { productId: prods.json[1].id, quantity: 1 }, auth(token));
  });

  it('GET /api/quotations returns empty list initially', async function() {
    var res = await request('GET', '/api/quotations', null, auth(token));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.equal(res.json.length, 0);
  });

  it('GET /api/quotations requires authentication', async function() {
    var res = await request('GET', '/api/quotations');
    assert.equal(res.status, 401);
  });

  it('POST /api/quotations creates quotation from cart', async function() {
    var res = await request('POST', '/api/quotations', {}, auth(token));
    assert.equal(res.status, 201);
    assert.ok(res.json.id, 'quotation id missing');
    assert.ok(res.json.quotation_number, 'quotation_number missing');
    assert.ok(Array.isArray(res.json.items), 'items missing');
    assert.equal(res.json.items.length, 2);
    assert.equal(res.json.status, 'pending');
  });

  it('quotation items have price snapshot from products', async function() {
    var list = await request('GET', '/api/quotations', null, auth(token));
    var qId = list.json[0].id;
    var res = await request('GET', '/api/quotations/' + qId, null, auth(token));
    assert.equal(res.status, 200);
    var item = res.json.items[0];
    assert.ok(item.unit_price !== undefined, 'unit_price missing');
    assert.ok(item.product_name, 'product_name missing');
  });

  it('GET /api/quotations/:id returns single quotation', async function() {
    var list = await request('GET', '/api/quotations', null, auth(token));
    var res = await request('GET', '/api/quotations/' + list.json[0].id, null, auth(token));
    assert.equal(res.status, 200);
    assert.ok(res.json.quotation_number);
    assert.equal(res.json.items.length, 2);
  });

  it('GET /api/quotations/:id returns 404 for non-existent', async function() {
    var res = await request('GET', '/api/quotations/999999', null, auth(token));
    assert.equal(res.status, 404);
  });

  it('POST /api/quotations returns 400 when cart is empty', async function() {
    await request('POST', '/api/auth/register', { email: 'empty-q@nblao.la', password: 'Test1234!', name: 'Empty Quote' }).catch(function() {});
    var login = await request('POST', '/api/auth/login', { email: 'empty-q@nblao.la', password: 'Test1234!' });
    var res = await request('POST', '/api/quotations', {}, auth(login.json.token));
    assert.equal(res.status, 400);
    assert.ok(res.json.error);
  });

  it('creating quotation does not clear the cart', async function() {
    var cart = await request('GET', '/api/cart', null, auth(token));
    assert.ok(cart.json.items.length > 0, 'cart should still have items after quotation');
  });

  it('quotation belongs to authenticated customer only', async function() {
    await request('POST', '/api/auth/register', { email: 'q-other@nblao.la', password: 'Test1234!', name: 'Q Other' }).catch(function() {});
    var login = await request('POST', '/api/auth/login', { email: 'q-other@nblao.la', password: 'Test1234!' });
    var res = await request('GET', '/api/quotations', null, auth(login.json.token));
    assert.equal(res.status, 200);
    assert.equal(res.json.length, 0);
  });
});

// ===== ORDER TESTS (8) =====
describe('Phase 5: Orders', function() {
  var token;

  it('clean up and setup cart', async function() {
    await cleanupTestData();
    var login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    token = login.json.token;
    var prods = await request('GET', '/api/products');
    await request('DELETE', '/api/cart', null, auth(token));
    await request('POST', '/api/cart/items', { productId: pickInStock(prods.json, 2).id, quantity: 2 }, auth(token));
  });

  it('POST /api/orders creates order from cart', async function() {
    var res = await request('POST', '/api/orders', {}, auth(token));
    assert.equal(res.status, 201);
    assert.ok(res.json.id, 'order id missing');
    assert.ok(res.json.order_number, 'order_number missing');
    assert.ok(Array.isArray(res.json.items), 'items missing');
    assert.equal(res.json.items.length, 1);
    assert.equal(res.json.status, 'pending');
  });

  it('order items have price snapshot from products', async function() {
    var list = await request('GET', '/api/orders', null, auth(token));
    var orderId = (list.json.orders || list.json)[0].id;
    var res = await request('GET', '/api/orders/' + orderId, null, auth(token));
    assert.equal(res.status, 200);
    var item = res.json.items[0];
    assert.ok(item.unit_price !== undefined, 'unit_price missing');
    assert.ok(item.product_name, 'product_name missing');
    assert.ok(item.quantity, 'quantity missing');
  });

  it('GET /api/orders returns list', async function() {
    var res = await request('GET', '/api/orders', null, auth(token));
    assert.equal(res.status, 200);
    var orders = res.json.orders || res.json;
    assert.ok(Array.isArray(orders));
    assert.ok(orders.length > 0);
  });

  it('GET /api/orders/:id returns single order', async function() {
    var list = await request('GET', '/api/orders', null, auth(token));
    var res = await request('GET', '/api/orders/' + (list.json.orders || list.json)[0].id, null, auth(token));
    assert.equal(res.status, 200);
    assert.ok(res.json.order_number);
    assert.ok(Array.isArray(res.json.items));
  });

  it('GET /api/orders/:id returns 404 for non-existent', async function() {
    var res = await request('GET', '/api/orders/999999', null, auth(token));
    assert.equal(res.status, 404);
  });

  it('POST /api/orders returns 400 when cart is empty', async function() {
    await request('POST', '/api/auth/register', { email: 'empty-o@nblao.la', password: 'Test1234!', name: 'Empty Order' }).catch(function() {});
    var login = await request('POST', '/api/auth/login', { email: 'empty-o@nblao.la', password: 'Test1234!' });
    var res = await request('POST', '/api/orders', {}, auth(login.json.token));
    assert.equal(res.status, 400);
    assert.ok(res.json.error);
  });

  it('POST /api/orders clears the cart after checkout', async function() {
    var prods = await request('GET', '/api/products');
    await request('DELETE', '/api/cart', null, auth(token));
    await request('POST', '/api/cart/items', { productId: pickInStock(prods.json, 1).id, quantity: 1 }, auth(token));
    await request('POST', '/api/orders', {}, auth(token));
    var cart = await request('GET', '/api/cart', null, auth(token));
    assert.equal(cart.json.items.length, 0, 'cart should be empty after checkout');
  });
});

// ===== FRONTEND PRESERVATION (1) =====
describe('Phase 5: Frontend Preservation', function() {
  it('all 4 frontend files match Phase 1 baselines', function() {
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
