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

async function cleanupAdminTestData() {
  var PC = require('@prisma/client').PrismaClient;
  var p = new PC();
  try {
    // Delete test products created by admin tests
    var testSkus = ['TEST-SKU-001', 'TEST-SKU-002', 'TEST-UPD-001'];
    for (var i = 0; i < testSkus.length; i++) {
      await p.orderItem.deleteMany({ where: { product: { sku: testSkus[i] } } }).catch(function () {});
      await p.quotationItem.deleteMany({ where: { product: { sku: testSkus[i] } } }).catch(function () {});
      await p.cartItem.deleteMany({ where: { product: { sku: testSkus[i] } } }).catch(function () {});
      await p.productImage.deleteMany({ where: { product: { sku: testSkus[i] } } }).catch(function () {});
      await p.productSpecification.deleteMany({ where: { product: { sku: testSkus[i] } } }).catch(function () {});
      await p.productLocalization.deleteMany({ where: { product: { sku: testSkus[i] } } }).catch(function () {});
      await p.product.deleteMany({ where: { sku: testSkus[i] } }).catch(function () {});
    }
    // Delete test categories
    var testCatSlugs = ['test-cat-001', 'test-sub-cat-001', 'test-cat-upd'];
    for (var j = 0; j < testCatSlugs.length; j++) {
      await p.product.deleteMany({ where: { category: { slug: testCatSlugs[j] } } }).catch(function () {});
      await p.categoryLocalization.deleteMany({ where: { category: { slug: testCatSlugs[j] } } }).catch(function () {});
      await p.category.deleteMany({ where: { slug: testCatSlugs[j] } }).catch(function () {});
    }
    // Delete test brands
    var testBrandSlugs = ['test-brand-001', 'test-brand-upd'];
    for (var k = 0; k < testBrandSlugs.length; k++) {
      await p.product.deleteMany({ where: { brand: { slug: testBrandSlugs[k] } } }).catch(function () {});
      await p.brandLocalization.deleteMany({ where: { brand: { slug: testBrandSlugs[k] } } }).catch(function () {});
      await p.brand.deleteMany({ where: { slug: testBrandSlugs[k] } }).catch(function () {});
    }
  } finally {
    await p.$disconnect();
  }
}

// ═══════════════════════════════════════════════
// ADMIN MIDDLEWARE TESTS (3)
// ═══════════════════════════════════════════════
describe('Phase 6: Admin Middleware', function () {
  it('returns 401 without auth token', async function () {
    var res = await request('GET', '/api/admin/dashboard');
    assert.equal(res.status, 401);
    assert.ok(res.json.error);
  });

  it('returns 403 for non-admin user', async function () {
    // Ensure test customer exists
    await request('POST', '/api/auth/register', {
      email: TEST_EMAIL, password: TEST_PASS, name: 'Test User',
    }).catch(function () {});
    var login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    var res = await request('GET', '/api/admin/dashboard', null, auth(login.json.token));
    assert.equal(res.status, 403);
    assert.ok(res.json.error);
  });

  it('allows admin user through', async function () {
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    var res = await request('GET', '/api/admin/dashboard', null, auth(login.json.token));
    assert.equal(res.status, 200);
  });
});

// ═══════════════════════════════════════════════
// DASHBOARD TESTS (2)
// ═══════════════════════════════════════════════
describe('Phase 6: Dashboard', function () {
  var adminToken;

  it('returns summary counts', async function () {
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = login.json.token;
    var res = await request('GET', '/api/admin/dashboard', null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(typeof res.json.products, 'number');
    assert.equal(typeof res.json.categories, 'number');
    assert.equal(typeof res.json.brands, 'number');
    assert.equal(typeof res.json.customers, 'number');
    assert.equal(typeof res.json.orders, 'number');
    assert.equal(typeof res.json.quotations, 'number');
  });
});

// ═══════════════════════════════════════════════
// ADMIN PRODUCTS CRUD (6)
// ═══════════════════════════════════════════════
describe('Phase 6: Admin Products', function () {
  var adminToken;
  var createdProductId;

  it('setup: login as admin', async function () {
    await cleanupAdminTestData();
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = login.json.token;
  });

  it('GET /api/admin/products lists all products', async function () {
    var res = await request('GET', '/api/admin/products', null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 8, 'should have at least 8 seeded products');
    assert.ok(res.json[0].sku, 'products should have sku');
    assert.ok(res.json[0].name_lo !== undefined, 'products should have name_lo');
  });

  it('POST /api/admin/products creates a product', async function () {
    // Find a valid category and brand
    var cats = await request('GET', '/api/admin/categories', null, auth(adminToken));
    var brands = await request('GET', '/api/admin/brands', null, auth(adminToken));
    var catId = cats.json[0].id;
    var brandId = brands.json[0].id;

    var res = await request('POST', '/api/admin/products', {
      sku: 'TEST-SKU-001',
      slug: 'test-product-001',
      category_id: catId,
      brand_id: brandId,
      price: 50000,
      price_unit: 'KIP',
      stock: 100,
      status: 'active',
      localizations: [
        { locale: 'lo', name: 'ສິນຄ້າທົດສອບ 001' },
        { locale: 'en', name: 'Test Product 001' },
      ],
    }, auth(adminToken));
    assert.equal(res.status, 201);
    assert.ok(res.json.id);
    assert.equal(res.json.sku, 'TEST-SKU-001');
    assert.equal(res.json.name_lo, 'ສິນຄ້າທົດສອບ 001');
    assert.equal(res.json.name_en, 'Test Product 001');
    createdProductId = res.json.id;
  });

  it('GET /api/admin/products/:id returns single product', async function () {
    var res = await request('GET', '/api/admin/products/' + createdProductId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.sku, 'TEST-SKU-001');
    assert.equal(res.json.price, 50000);
    assert.ok(Array.isArray(res.json.localizations));
    assert.equal(res.json.localizations.length, 2);
  });

  it('PUT /api/admin/products/:id updates product', async function () {
    var res = await request('PUT', '/api/admin/products/' + createdProductId, {
      price: 60000,
      stock: 200,
      status: 'inactive',
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.id, createdProductId);
    assert.equal(res.json.status, 'inactive');
  });

  it('DELETE /api/admin/products/:id deletes product', async function () {
    var res = await request('DELETE', '/api/admin/products/' + createdProductId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(res.json.message);
    // Verify it's gone
    var check = await request('GET', '/api/admin/products/' + createdProductId, null, auth(adminToken));
    assert.equal(check.status, 404);
  });

  it('GET /api/admin/products/:id returns 404 for non-existent', async function () {
    var res = await request('GET', '/api/admin/products/999999', null, auth(adminToken));
    assert.equal(res.status, 404);
  });
});

// ═══════════════════════════════════════════════
// ADMIN CATEGORIES CRUD (6)
// ═══════════════════════════════════════════════
describe('Phase 6: Admin Categories', function () {
  var adminToken;
  var createdCategoryId;

  it('setup: login as admin', async function () {
    await cleanupAdminTestData();
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = login.json.token;
  });

  it('GET /api/admin/categories lists all categories', async function () {
    var res = await request('GET', '/api/admin/categories', null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 9, 'should have at least 9 top-level categories');
    assert.ok(res.json[0].slug, 'categories should have slug');
    assert.ok(res.json[0].products_count !== undefined, 'categories should have products_count');
  });

  it('POST /api/admin/categories creates a category', async function () {
    var res = await request('POST', '/api/admin/categories', {
      slug: 'test-cat-001',
      icon: '🧪',
      sort_order: 99,
      localizations: [
        { locale: 'lo', name: 'ໝວດທົດສອບ' },
        { locale: 'en', name: 'Test Category' },
      ],
    }, auth(adminToken));
    assert.equal(res.status, 201);
    assert.ok(res.json.id);
    assert.equal(res.json.slug, 'test-cat-001');
    assert.equal(res.json.name_lo, 'ໝວດທົດສອບ');
    assert.equal(res.json.name_en, 'Test Category');
    createdCategoryId = res.json.id;
  });

  it('GET /api/admin/categories/:id returns single category', async function () {
    var res = await request('GET', '/api/admin/categories/' + createdCategoryId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.slug, 'test-cat-001');
    assert.ok(Array.isArray(res.json.localizations));
    assert.equal(res.json.localizations.length, 2);
  });

  it('PUT /api/admin/categories/:id updates category', async function () {
    var res = await request('PUT', '/api/admin/categories/' + createdCategoryId, {
      icon: '🔧',
      sort_order: 100,
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.id, createdCategoryId);
  });

  it('DELETE /api/admin/categories/:id deletes category', async function () {
    var res = await request('DELETE', '/api/admin/categories/' + createdCategoryId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(res.json.message);
    // Verify it's gone
    var check = await request('GET', '/api/admin/categories/' + createdCategoryId, null, auth(adminToken));
    assert.equal(check.status, 404);
  });

  it('GET /api/admin/categories/:id returns 404 for non-existent', async function () {
    var res = await request('GET', '/api/admin/categories/999999', null, auth(adminToken));
    assert.equal(res.status, 404);
  });
});

// ═══════════════════════════════════════════════
// ADMIN BRANDS CRUD (6)
// ═══════════════════════════════════════════════
describe('Phase 6: Admin Brands', function () {
  var adminToken;
  var createdBrandId;

  it('setup: login as admin', async function () {
    await cleanupAdminTestData();
    var login = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    adminToken = login.json.token;
  });

  it('GET /api/admin/brands lists all brands', async function () {
    var res = await request('GET', '/api/admin/brands', null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 12, 'should have at least 12 seeded brands');
    assert.ok(res.json[0].slug, 'brands should have slug');
    assert.ok(res.json[0].products_count !== undefined, 'brands should have products_count');
  });

  it('POST /api/admin/brands creates a brand', async function () {
    var res = await request('POST', '/api/admin/brands', {
      slug: 'test-brand-001',
      logo_url: '/images/brands/test-brand-001.png',
      sort_order: 99,
      localizations: [
        { locale: 'lo', name: 'ຍີ່ຫໍ້ທົດສອບ' },
        { locale: 'en', name: 'Test Brand' },
      ],
    }, auth(adminToken));
    assert.equal(res.status, 201);
    assert.ok(res.json.id);
    assert.equal(res.json.slug, 'test-brand-001');
    assert.equal(res.json.name_lo, 'ຍີ່ຫໍ້ທົດສອບ');
    assert.equal(res.json.name_en, 'Test Brand');
    createdBrandId = res.json.id;
  });

  it('GET /api/admin/brands/:id returns single brand', async function () {
    var res = await request('GET', '/api/admin/brands/' + createdBrandId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.slug, 'test-brand-001');
    assert.ok(Array.isArray(res.json.localizations));
    assert.equal(res.json.localizations.length, 2);
  });

  it('PUT /api/admin/brands/:id updates brand', async function () {
    var res = await request('PUT', '/api/admin/brands/' + createdBrandId, {
      logo_url: '/images/brands/test-brand-001-v2.png',
      sort_order: 100,
    }, auth(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.json.id, createdBrandId);
  });

  it('DELETE /api/admin/brands/:id deletes brand', async function () {
    var res = await request('DELETE', '/api/admin/brands/' + createdBrandId, null, auth(adminToken));
    assert.equal(res.status, 200);
    assert.ok(res.json.message);
    // Verify it's gone
    var check = await request('GET', '/api/admin/brands/' + createdBrandId, null, auth(adminToken));
    assert.equal(check.status, 404);
  });

  it('GET /api/admin/brands/:id returns 404 for non-existent', async function () {
    var res = await request('GET', '/api/admin/brands/999999', null, auth(adminToken));
    assert.equal(res.status, 404);
  });
});

// ═══════════════════════════════════════════════
// FRONTEND PRESERVATION (1)
// ═══════════════════════════════════════════════
describe('Phase 6: Frontend Preservation', function () {
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
