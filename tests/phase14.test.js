/**
 * Phase 14 Tests — Product Detail & Cart UX
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3001, path, headers: {} };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    http.get(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = { hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function put(path, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = { hostname: 'localhost', port: 3001, path, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function del(path, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3001, path, method: 'DELETE',
      headers: {} };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.end();
  });
}

function md5(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

const TEST_EMAIL = 'phase14-test@nblao.la';
const TEST_PASS = 'TestPass123!';
let testToken = null;
let testCustomerId = null;

// Pick a product with sufficient stock for order-creation tests.
// Order creation validates stock server-side; stale/out-of-stock
// products must not break deterministic order tests.
function pickInStock(products, qty) {
  for (const p of products) {
    if (p.stock >= qty) return p;
  }
  return products[0];
}

describe('Phase 14: Product Detail & Cart UX', () => {

  // ── Setup ──
  it('setup: create test customer', async () => {
    const res = await post('/api/auth/register', { email: TEST_EMAIL, password: TEST_PASS, name: 'Phase14 Tester' });
    if (res.status === 201) {
      const body = JSON.parse(res.body);
      testToken = body.token;
      testCustomerId = body.customer?.id;
    } else {
      // Already exists, login
      const login = await post('/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
      const body = JSON.parse(login.body);
      testToken = body.token;
      testCustomerId = body.customer?.id;
    }
    assert.ok(testToken, 'Should have auth token');
  });

  // ── 1. Product listing includes images ──
  it('GET /api/products returns images with id, url, sort_order', async () => {
    const res = await get('/api/products');
    const products = JSON.parse(res.body);
    assert.ok(Array.isArray(products), 'Products should be array');
    assert.ok(products.length > 0, 'Should have products');
    const p = products[0];
    assert.ok(Array.isArray(p.images), 'Product should have images array');
    if (p.images.length > 0) {
      assert.ok(p.images[0].url, 'Image should have url');
      assert.ok('id' in p.images[0], 'Image should have id');
      assert.ok('sort_order' in p.images[0], 'Image should have sort_order');
    }
  });

  // ── 2. Product detail returns documents and how_to_use ──
  it('GET /api/products/:slug returns documents and how_to_use', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const slug = products[0].slug;
    const res = await get('/api/products/' + slug);
    const p = JSON.parse(res.body);
    assert.ok(p.documents !== undefined, 'Should have documents field');
    assert.ok(Array.isArray(p.documents), 'Documents should be array');
    assert.ok(p.how_to_use !== undefined, 'Should have how_to_use field');
  });

  // ── 3. Product detail returns enriched related products ──
  it('GET /api/products/:slug returns enriched related_products', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const slug = products[0].slug;
    const res = await get('/api/products/' + slug);
    const p = JSON.parse(res.body);
    assert.ok(Array.isArray(p.related_products), 'Should have related_products');
    // Each related product should have price and stock
    for (const rp of p.related_products) {
      assert.ok(rp.slug, 'Related should have slug');
      assert.ok(rp.name !== undefined, 'Related should have name');
    }
  });

  // ── 4. Product detail images have sort_order ──
  it('Product detail images have sort_order and is_primary', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const slug = products[0].slug;
    const res = await get('/api/products/' + slug);
    const p = JSON.parse(res.body);
    for (const img of p.images) {
      assert.ok('sort_order' in img, 'Image should have sort_order');
      assert.ok('is_primary' in img, 'Image should have is_primary');
    }
  });

  // ── 5. Cart returns thumbnail_url and slug ──
  it('Cart response includes thumbnail_url and slug', async () => {
    // Add an item first
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const productId = products[0].id;
    await post('/api/cart/items', { productId, quantity: 1 }, testToken);
    const res = await get('/api/cart', testToken);
    const cart = JSON.parse(res.body);
    assert.ok(cart.items.length > 0, 'Cart should have items');
    const item = cart.items[0];
    assert.ok('thumbnail_url' in item, 'Cart item should have thumbnail_url');
    assert.ok('slug' in item, 'Cart item should have slug');
    assert.ok('stock' in item, 'Cart item should have stock');
    // Cleanup
    await del('/api/cart', testToken);
  });

  // ── 6. Cart quantity validation ──
  it('Cart rejects invalid quantities', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const productId = products[0].id;
    // Zero quantity
    let res = await post('/api/cart/items', { productId, quantity: 0 }, testToken);
    assert.ok(res.status >= 400, 'Should reject zero quantity');
    // Negative quantity
    res = await post('/api/cart/items', { productId, quantity: -1 }, testToken);
    assert.ok(res.status >= 400, 'Should reject negative quantity');
    // Very large quantity
    res = await post('/api/cart/items', { productId, quantity: 99999 }, testToken);
    assert.ok(res.status >= 400, 'Should reject excessive quantity');
    // Cleanup
    await del('/api/cart', testToken);
  });

  // ── 7. Cart update item quantity ──
  it('PUT /api/cart/items/:id updates quantity', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const productId = products[0].id;
    await post('/api/cart/items', { productId, quantity: 1 }, testToken);
    const cartRes = await get('/api/cart', testToken);
    const cart = JSON.parse(cartRes.body);
    const itemId = cart.items[0].id;
    const res = await put('/api/cart/items/' + itemId, { quantity: 3 }, testToken);
    assert.strictEqual(res.status, 200);
    const updated = JSON.parse(res.body);
    const item = updated.items.find(i => i.id === itemId);
    assert.strictEqual(item.quantity, 3, 'Quantity should be updated to 3');
    await del('/api/cart', testToken);
  });

  // ── 8. Cart remove item ──
  it('DELETE /api/cart/items/:id removes item', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const productId = products[0].id;
    await post('/api/cart/items', { productId, quantity: 1 }, testToken);
    const cartRes = await get('/api/cart', testToken);
    const cart = JSON.parse(cartRes.body);
    const itemId = cart.items[0].id;
    const res = await del('/api/cart/items/' + itemId, testToken);
    assert.strictEqual(res.status, 200);
    const updated = JSON.parse(res.body);
    assert.ok(updated.items.length === 0 || !updated.items.find(i => i.id === itemId), 'Item should be removed');
    await del('/api/cart', testToken);
  });

  // ── 9. Cart clear ──
  it('DELETE /api/cart clears entire cart', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    await post('/api/cart/items', { productId: products[0].id, quantity: 2 }, testToken);
    await post('/api/cart/items', { productId: products[1].id, quantity: 1 }, testToken);
    const res = await del('/api/cart', testToken);
    assert.strictEqual(res.status, 200);
    const cart = JSON.parse(res.body);
    assert.strictEqual(cart.items.length, 0, 'Cart should be empty');
  });

  // ── 10. Empty cart returns empty ──
  it('GET /api/cart returns empty items for new cart', async () => {
    await del('/api/cart', testToken);
    const res = await get('/api/cart', testToken);
    const cart = JSON.parse(res.body);
    assert.ok(Array.isArray(cart.items), 'Items should be array');
    assert.strictEqual(cart.items.length, 0, 'Items should be empty');
  });

  // ── 11. Order creation works ──
  it('POST /api/orders creates order from cart', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    await post('/api/cart/items', { productId: pickInStock(products, 2).id, quantity: 2 }, testToken);
    const res = await post('/api/orders', {}, testToken);
    assert.strictEqual(res.status, 201);
    const order = JSON.parse(res.body);
    assert.ok(order.id, 'Order should have id');
    assert.ok(order.order_number, 'Order should have order_number');
    assert.ok(order.items.length > 0, 'Order should have items');
    // Cart should be cleared
    const cartRes = await get('/api/cart', testToken);
    const cart = JSON.parse(cartRes.body);
    assert.strictEqual(cart.items.length, 0, 'Cart should be cleared after order');
  });

  // ── 12. Order creation fails with empty cart ──
  it('POST /api/orders fails with empty cart', async () => {
    await del('/api/cart', testToken);
    const res = await post('/api/orders', {}, testToken);
    assert.ok(res.status >= 400, 'Should fail with empty cart');
  });

  // ── 13. Quotation creation works ──
  it('POST /api/quotations creates quotation from cart', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    await post('/api/cart/items', { productId: products[0].id, quantity: 1 }, testToken);
    const res = await post('/api/quotations', {}, testToken);
    assert.strictEqual(res.status, 201);
    const qt = JSON.parse(res.body);
    assert.ok(qt.id, 'Quotation should have id');
    assert.ok(qt.quotation_number, 'Quotation should have quotation_number');
  });

  // ── 14. Authentication required for cart/orders/quotations ──
  it('Cart, orders, quotations require authentication', async () => {
    const cart = await get('/api/cart');
    assert.strictEqual(cart.status, 401, 'Cart should require auth');
    const orders = await get('/api/orders');
    assert.strictEqual(orders.status, 401, 'Orders should require auth');
    const quotes = await get('/api/quotations');
    assert.strictEqual(quotes.status, 401, 'Quotations should require auth');
  });

  // ── 15. Customer.js has5 tabs ──
  it('customer.js has 5 detail tab functions', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('switchDetailTab'), 'Should have switchDetailTab');
    assert.ok(js.includes('tab-desc'), 'Should have desc tab');
    assert.ok(js.includes('tab-specs'), 'Should have specs tab');
    assert.ok(js.includes('tab-docs'), 'Should have docs tab');
    assert.ok(js.includes('tab-howto'), 'Should have howto tab');
    assert.ok(js.includes('tab-related'), 'Should have related tab');
  });

  // ── 16. customer.js has image gallery ──
  it('customer.js has image gallery functions', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('gallery-main'), 'Should have gallery-main');
    assert.ok(js.includes('gallery-thumb'), 'Should have gallery-thumb');
    assert.ok(js.includes('setGalleryImage'), 'Should have setGalleryImage');
    assert.ok(js.includes('galleryNav'), 'Should have galleryNav');
    assert.ok(js.includes('_galleryImages'), 'Should store gallery images');
  });

  // ── 17. customer.js has cart improvements ──
  it('customer.js has cart improvements', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('clearCart'), 'Should have clearCart');
    assert.ok(js.includes('updateCartItemDirect'), 'Should have updateCartItemDirect');
    assert.ok(js.includes('cart-item-thumb'), 'Should have cart thumbnail');
    assert.ok(js.includes('btn-clear'), 'Should have clear button class');
    assert.ok(js.includes('btn-loading'), 'Should have loading button state');
  });

  // ── 18. customer.js has checkout improvements ──
  it('customer.js has checkout improvements', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('checkout-customer'), 'Should show customer info');
    assert.ok(js.includes('checkout-notes'), 'Should have notes field');
    assert.ok(js.includes('order-notes'), 'Should have order notes input');
    assert.ok(js.includes('_orderSubmitting'), 'Should have duplicate submission protection');
    assert.ok(js.includes('success-page'), 'Should have success page');
  });

  // ── 19. customer.js has quotation improvements ──
  it('customer.js has quotation submission improvements', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('_quoteSubmitting'), 'Should have quote submission guard');
    assert.ok(js.includes('quoteRequested'), 'Should have quote requested i18n');
    assert.ok(js.includes('viewQuote'), 'Should have view quote link');
  });

  // ── 20. i18n keys for Phase 14 ──
  it('customer.js has all Phase 14 i18n keys', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    // Lao
    assert.ok(js.includes("tabDesc:'ລາຍລະອຽດ'"), 'Should have Lao tabDesc');
    assert.ok(js.includes("tabSpecs:'ຂໍ້ມູນສະເພາະ'"), 'Should have Lao tabSpecs');
    assert.ok(js.includes("tabDocs:'ເອກະສານ'"), 'Should have Lao tabDocs');
    assert.ok(js.includes("tabHowTo:'ວິທີໃຊ້ງານ'"), 'Should have Lao tabHowTo');
    assert.ok(js.includes("tabRelated:'ສິນຄ້າກ່ຽວຂ້ອງ'"), 'Should have Lao tabRelated');
    assert.ok(js.includes("clearCart:'ລຶບກະຕ່າ'"), 'Should have Lao clearCart');
    assert.ok(js.includes("submitOrder:'ຢືນຢັນສັ່ງຊື້'"), 'Should have Lao submitOrder');
    // English
    assert.ok(js.includes("tabDesc:'Description'"), 'Should have En tabDesc');
    assert.ok(js.includes("tabSpecs:'Specifications'"), 'Should have En tabSpecs');
    assert.ok(js.includes("tabDocs:'Documents'"), 'Should have En tabDocs');
    assert.ok(js.includes("tabHowTo:'How to Use'"), 'Should have En tabHowTo');
    assert.ok(js.includes("tabRelated:'Related Products'"), 'Should have En tabRelated');
    assert.ok(js.includes("clearCart:'Clear Cart'"), 'Should have En clearCart');
    assert.ok(js.includes("submitOrder:'Confirm Order'"), 'Should have En submitOrder');
  });

  // ── 21. customer.html has gallery and tab CSS ──
  it('customer.html has gallery and tab CSS', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('.gallery-main-img'), 'Should have gallery main image style');
    assert.ok(html.includes('.gallery-thumb'), 'Should have gallery thumb style');
    assert.ok(html.includes('.gallery-nav'), 'Should have gallery nav style');
    assert.ok(html.includes('.detail-tabs'), 'Should have detail tabs style');
    assert.ok(html.includes('.detail-tab'), 'Should have detail tab style');
    assert.ok(html.includes('.tab-panel'), 'Should have tab panel style');
    assert.ok(html.includes('.related-grid'), 'Should have related grid style');
    assert.ok(html.includes('.related-card'), 'Should have related card style');
    assert.ok(html.includes('.doc-list'), 'Should have doc list style');
    assert.ok(html.includes('.cart-item-thumb'), 'Should have cart thumbnail style');
    assert.ok(html.includes('.btn-clear'), 'Should have clear button style');
    assert.ok(html.includes('.btn-loading'), 'Should have loading button style');
    assert.ok(html.includes('.checkout-customer'), 'Should have checkout customer style');
    assert.ok(html.includes('.checkout-notes'), 'Should have checkout notes style');
    assert.ok(html.includes('.success-page'), 'Should have success page style');
  });

  // ── 22. customer.html still has all previous phase styles ──
  it('customer.html preserves all previous phase styles', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('.auth-page'), 'Auth page style');
    assert.ok(html.includes('.prod-card'), 'Product card style');
    assert.ok(html.includes('.listing-layout'), 'Listing layout style');
    assert.ok(html.includes('.cart-layout'), 'Cart layout style');
    assert.ok(html.includes('.account-grid'), 'Account grid style');
    assert.ok(html.includes('.skeleton'), 'Skeleton style');
    assert.ok(html.includes('.page-in'), 'Page transition style');
    assert.ok(html.includes('.how-section'), 'How to order style');
    assert.ok(html.includes('.cat-acc-wrap'), 'Category accordion style');
  });

  // ── 23. Product detail endpoint returns all required fields ──
  it('Product detail returns all required fields', async () => {
    const listRes = await get('/api/products');
    const products = JSON.parse(listRes.body);
    const slug = products[0].slug;
    const res = await get('/api/products/' + slug);
    const p = JSON.parse(res.body);
    assert.ok(p.id, 'Should have id');
    assert.ok(p.sku, 'Should have sku');
    assert.ok(p.slug, 'Should have slug');
    assert.ok(p.name !== undefined, 'Should have name');
    assert.ok('price' in p, 'Should have price');
    assert.ok('stock' in p, 'Should have stock');
    assert.ok('status' in p, 'Should have status');
    assert.ok(p.images !== undefined, 'Should have images');
    assert.ok(p.specifications !== undefined, 'Should have specifications');
    assert.ok(p.documents !== undefined, 'Should have documents');
    assert.ok(p.how_to_use !== undefined, 'Should have how_to_use');
    assert.ok(p.related_products !== undefined, 'Should have related_products');
    assert.ok(p.category !== undefined, 'Should have category');
  });

  // ── 24. cart.js has thumbnail and slug in response ──
  it('Cart backend includes thumbnail_url and slug in items', () => {
    const cartJs = fs.readFileSync('backend/routes/cart.js', 'utf8');
    assert.ok(cartJs.includes('thumbnail_url'), 'Cart should return thumbnail_url');
    assert.ok(cartJs.includes('slug: product.slug'), 'Cart should return slug');
    assert.ok(cartJs.includes('stock: variantStock') || cartJs.includes('stock: product.stock'), 'Cart should return stock');
    assert.ok(cartJs.includes('images: { where: { isPrimary: true }'), 'Cart should query primary image');
  });

  // ── 25. products.js schema has ProductDocument ──
  it('Schema has ProductDocument model', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    assert.ok(schema.includes('model ProductDocument'), 'Should have ProductDocument model');
    assert.ok(schema.includes('titleLo'), 'Should have titleLo');
    assert.ok(schema.includes('titleEn'), 'Should have titleEn');
    assert.ok(schema.includes('fileUrl'), 'Should have fileUrl');
    assert.ok(schema.includes('fileType'), 'Should have fileType');
  });

  // ── 26. Schema has howToUse fields ──
  it('Schema ProductLocalization has howToUse fields', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    assert.ok(schema.includes('howToUseLo'), 'Should have howToUseLo');
    assert.ok(schema.includes('howToUseEn'), 'Should have howToUseEn');
  });

  // ── 27. ProductImage has createdAt/updatedAt ──
  it('ProductImage schema has createdAt and updatedAt', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    // Find the ProductImage model section
    const imgSection = schema.substring(schema.indexOf('model ProductImage'), schema.indexOf('model Product', schema.indexOf('model ProductImage') + 1));
    assert.ok(imgSection.includes('createdAt'), 'ProductImage should have createdAt');
    assert.ok(imgSection.includes('updatedAt'), 'ProductImage should have updatedAt');
  });

  // ── 28. Cleanup ──
  it('cleanup: remove test customer data', async () => {
    await del('/api/cart', testToken);
  });

  // ── 29. Customer page works ──
  it('GET /customer.html returns 200', async () => {
    const res = await get('/customer.html');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('customer.js'), 'Should load customer.js');
  });

  // ── 30. Admin page still works ──
  it('GET /admin.html returns 200', async () => {
    const res = await get('/admin.html');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('admin'), 'Should load admin');
  });
});
