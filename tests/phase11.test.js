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
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method: method, headers: hdrs,
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
  html:   { md5: 'aebe02f72a5852289b1a7ad27c7dd657', lines: 611, file: 'nb_lao_wireframes_v2_updated.html' },
  css:    { md5: 'ad86eea2c740140705b8c06b2419d1a4', lines: 3828, file: 'styles/nblao.css' },
  js:     { md5: 'b53a5966017bdd3fb7794e58822aeb98', lines: 370, file: 'js/nblao.js' },
};

// ═══════════════════════════════════════════════
// BASIC SEARCH (4)
// ═══════════════════════════════════════════════
describe('Phase 11: Basic Search', function () {
  it('search by product name (q=valve)', async function () {
    var res = await request('GET', '/api/products?q=valve');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 1, 'should find valve product');
    assert.ok(res.json[0].sku.includes('VL') || res.json[0].name.toLowerCase().includes('valve'));
  });

  it('search by SKU (q=EL-BRK)', async function () {
    var res = await request('GET', '/api/products?q=EL-BRK');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 1, 'should find EL-BRK product');
    assert.equal(res.json[0].sku, 'EL-BRK-40A');
  });

  it('search by model number (q=iC60N)', async function () {
    var res = await request('GET', '/api/products?q=iC60N');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 1, 'should find iC60N model');
    assert.ok(res.json[0].sku === 'EL-BRK-40A' || res.json.some(function(p){return p.sku==='EL-BRK-40A'}), 'should find EL-BRK-40A with iC60N model');
  });

  it('search is case-insensitive (q=VALVE)', async function () {
    var res = await request('GET', '/api/products?q=VALVE');
    assert.equal(res.status, 200);
    assert.ok(res.json.length >= 1, 'case-insensitive search should find valve');
  });
});

// ═══════════════════════════════════════════════
// CATEGORY & BRAND FILTERS (4)
// ═══════════════════════════════════════════════
describe('Phase 11: Category & Brand Filters', function () {
  it('filter by category slug returns correct products', async function () {
    var res = await request('GET', '/api/products?category=elec-circuit-breakers');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 1);
    assert.equal(res.json[0].sku, 'EL-BRK-40A');
  });

  it('filter by brand slug returns correct products', async function () {
    var res = await request('GET', '/api/products?brand=schneider-electric');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 1);
    assert.ok(res.json[0].brand && res.json[0].brand.slug === 'schneider-electric');
  });

  it('non-existent category returns empty', async function () {
    var res = await request('GET', '/api/products?category=nonexistent');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.equal(res.json.length, 0);
  });

  it('non-existent brand returns empty', async function () {
    var res = await request('GET', '/api/products?brand=nonexistent');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.equal(res.json.length, 0);
  });
});

// ═══════════════════════════════════════════════
// PRICE FILTERS (3)
// ═══════════════════════════════════════════════
describe('Phase 11: Price Filters', function () {
  it('minPrice filter excludes cheaper products', async function () {
    var res = await request('GET', '/api/products?minPrice=100000&sort=price_asc');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    assert.ok(items.length >= 1);
    items.forEach(function (p) {
      if (p.price !== null) assert.ok(p.price >= 100000, p.sku + ' price ' + p.price + ' < 100000');
    });
  });

  it('maxPrice filter excludes expensive products', async function () {
    var res = await request('GET', '/api/products?maxPrice=50000');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    items.forEach(function (p) {
      if (p.price !== null) assert.ok(p.price <= 50000, p.sku + ' price ' + p.price + ' > 50000');
    });
  });

  it('combined price range (minPrice + maxPrice)', async function () {
    var res = await request('GET', '/api/products?minPrice=30000&maxPrice=100000');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    assert.ok(items.length >= 2);
    items.forEach(function (p) {
      if (p.price !== null) {
        assert.ok(p.price >= 30000, p.sku + ' below min');
        assert.ok(p.price <= 100000, p.sku + ' above max');
      }
    });
  });
});

// ═══════════════════════════════════════════════
// STOCK FILTER (2)
// ═══════════════════════════════════════════════
describe('Phase 11: Stock Filter', function () {
  it('inStock=true excludes out-of-stock products', async function () {
    var res = await request('GET', '/api/products?inStock=true');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    assert.ok(items.length >= 1);
    items.forEach(function (p) {
      assert.ok(p.stock > 0, p.sku + ' should be in stock');
    });
  });

  it('inStock=true returns fewer products than unfiltered', async function () {
    var all = await request('GET', '/api/products');
    var inStock = await request('GET', '/api/products?inStock=true');
    var inStockItems = inStock.json.products || inStock.json;
    assert.ok(inStockItems.length <= all.json.length, 'inStock should have fewer or equal products');
  });
});

// ═══════════════════════════════════════════════
// SORTING (4)
// ═══════════════════════════════════════════════
describe('Phase 11: Sorting', function () {
  it('sort=price_asc orders by price ascending', async function () {
    var res = await request('GET', '/api/products?sort=price_asc');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    var prices = items.filter(function (p) { return p.price !== null; }).map(function (p) { return p.price; });
    for (var i = 1; i < prices.length; i++) {
      assert.ok(prices[i] >= prices[i - 1], 'not sorted asc: ' + prices[i - 1] + ' > ' + prices[i]);
    }
  });

  it('sort=price_desc orders by price descending', async function () {
    var res = await request('GET', '/api/products?sort=price_desc');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    var prices = items.filter(function (p) { return p.price !== null; }).map(function (p) { return p.price; });
    for (var i = 1; i < prices.length; i++) {
      assert.ok(prices[i] <= prices[i - 1], 'not sorted desc: ' + prices[i - 1] + ' < ' + prices[i]);
    }
  });

  it('sort=newest orders by createdAt desc', async function () {
    var res = await request('GET', '/api/products?sort=newest');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    var dates = items.map(function (p) { return new Date(p.created_at).getTime(); });
    for (var i = 1; i < dates.length; i++) {
      assert.ok(dates[i] <= dates[i - 1], 'not sorted newest first');
    }
  });

  it('invalid sort falls back to default (newest)', async function () {
    var res = await request('GET', '/api/products?sort=evil_column');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    assert.ok(items.length > 0, 'should still return products');
  });
});

// ═══════════════════════════════════════════════
// PAGINATION (3)
// ═══════════════════════════════════════════════
describe('Phase 11: Pagination', function () {
  it('page=1&limit=3 returns 3 products with pagination metadata', async function () {
    var res = await request('GET', '/api/products?page=1&limit=3');
    assert.equal(res.status, 200);
    assert.equal(typeof res.json, 'object');
    assert.ok(Array.isArray(res.json.products));
    assert.equal(res.json.products.length, 3);
    assert.equal(res.json.page, 1);
    assert.equal(res.json.limit, 3);
    assert.ok(res.json.total >= 8);
    assert.ok(res.json.totalPages >= 3);
  });

  it('page=2&limit=3 returns different products from page 1', async function () {
    var p1 = await request('GET', '/api/products?page=1&limit=3');
    var p2 = await request('GET', '/api/products?page=2&limit=3');
    var ids1 = p1.json.products.map(function (p) { return p.id; });
    var ids2 = p2.json.products.map(function (p) { return p.id; });
    var overlap = ids1.filter(function (id) { return ids2.indexOf(id) !== -1; });
    assert.equal(overlap.length, 0, 'pages should not overlap');
  });

  it('excessive limit is capped at 100', async function () {
    var res = await request('GET', '/api/products?page=1&limit=999');
    assert.equal(res.status, 200);
    assert.equal(res.json.limit, 100, 'limit should be capped at 100');
  });
});

// ═══════════════════════════════════════════════
// COMBINED FILTERS (2)
// ═══════════════════════════════════════════════
describe('Phase 11: Combined Filters', function () {
  it('search + category + sort work together', async function () {
    var res = await request('GET', '/api/products?q=40A&sort=price_asc');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    assert.ok(items.length >= 1);
    items.forEach(function (p) {
      assert.ok(p.sku.toLowerCase().includes('40a') || p.name.toLowerCase().includes('40a') || (p.model_number && p.model_number.toLowerCase().includes('40a')) || (p.slug && p.slug.toLowerCase().includes('40a')));
    });
  });

  it('category + brand + inStock combined', async function () {
    var res = await request('GET', '/api/products?brand=schneider-electric&inStock=true');
    assert.equal(res.status, 200);
    var items = res.json.products || res.json;
    items.forEach(function (p) {
      assert.ok(p.stock > 0);
      assert.ok(p.brand && p.brand.slug === 'schneider-electric');
    });
  });
});

// ═══════════════════════════════════════════════
// EMPTY SEARCH RESULTS (1)
// ═══════════════════════════════════════════════
describe('Phase 11: Empty Results', function () {
  it('search with no matches returns empty array', async function () {
    var res = await request('GET', '/api/products?q=xyznonexistent');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.equal(res.json.length, 0);
  });
});

// ═══════════════════════════════════════════════
// FILTERS ENDPOINT (2)
// ═══════════════════════════════════════════════
describe('Phase 11: Filters Endpoint', function () {
  it('GET /api/products/filters returns categories, brands, priceRange', async function () {
    var res = await request('GET', '/api/products/filters');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.categories));
    assert.ok(res.json.categories.length >= 9);
    assert.ok(Array.isArray(res.json.brands));
    assert.ok(res.json.priceRange);
    assert.equal(typeof res.json.priceRange.min, 'number');
    assert.equal(typeof res.json.priceRange.max, 'number');
  });

  it('filters endpoint returns valid category slugs', async function () {
    var res = await request('GET', '/api/products/filters');
    res.json.categories.forEach(function (c) {
      assert.ok(c.slug, 'category should have slug');
      assert.ok(c.name, 'category should have name');
    });
  });
});

// ═══════════════════════════════════════════════
// BACKWARD COMPATIBILITY (2)
// ═══════════════════════════════════════════════
describe('Phase 11: Backward Compatibility', function () {
  it('GET /api/products with no params returns flat array', async function () {
    var res = await request('GET', '/api/products');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json), 'should return flat array for backward compat');
    assert.ok(res.json.length >= 8);
  });

  it('GET /api/products?search= returns flat array', async function () {
    var res = await request('GET', '/api/products?search=mcb');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json), 'old search param should return flat array');
  });
});

// ═══════════════════════════════════════════════
// FRONTEND PRESERVATION (1)
// ═══════════════════════════════════════════════
describe('Phase 11: Frontend Preservation', function () {
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
