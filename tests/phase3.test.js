const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE = 'http://localhost:3001';

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${urlPath}`, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body, json });
      });
    }).on('error', reject);
  });
}

function md5(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function lineCount(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

// ═══════════════════════════════════════════════
// Fixed Phase 1 baselines (never recomputed)
// ═══════════════════════════════════════════════
const BASELINES = {
  backup: { md5: '69b1396610c1d27917d16cc193c00103', lines: 1265, file: 'nb_lao_wireframes_v2_original_backup.html' },
  html:   { md5: 'aebe02f72a5852289b1a7ad27c7dd657', lines: 611, file: 'nb_lao_wireframes_v2_updated.html' },
  css:    { md5: 'ad86eea2c740140705b8c06b2419d1a4', lines: 3828, file: 'styles/nblao.css' },
  js:     { md5: 'b53a5966017bdd3fb7794e58822aeb98', lines: 370, file: 'js/nblao.js' },
};

// ═══════════════════════════════════════════════
// Phase 3: Catalog API Tests (12)
// ═══════════════════════════════════════════════
describe('Phase 3: Categories API', () => {
  it('GET /api/categories returns 200', async () => {
    const res = await get('/api/categories');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
  });

  it('categories has 9 top-level items', async () => {
    const res = await get('/api/categories');
    assert.equal(res.json.length, 9);
  });

  it('category has slug, name_lo, name_en', async () => {
    const res = await get('/api/categories');
    const cat = res.json[0];
    assert.ok(cat.slug, 'slug missing');
    assert.ok(cat.name_lo, 'name_lo missing');
    assert.ok(cat.name_en, 'name_en missing');
  });

  it('GET /api/categories/:slug returns single category', async () => {
    const res = await get('/api/categories/elec');
    assert.equal(res.status, 200);
    assert.equal(res.json.slug, 'elec');
    assert.ok(Array.isArray(res.json.children));
  });
});

describe('Phase 3: Brands API', () => {
  it('GET /api/brands returns 200', async () => {
    const res = await get('/api/brands');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
  });

  it('brands has 13 items', async () => {
    const res = await get('/api/brands');
    assert.equal(res.json.length, 13);
  });

  it('brand has slug, name_lo, name_en', async () => {
    const res = await get('/api/brands');
    const brand = res.json[0];
    assert.ok(brand.slug, 'slug missing');
    assert.ok(brand.name_lo, 'name_lo missing');
    assert.ok(brand.name_en, 'name_en missing');
  });
});

describe('Phase 3: Products API', () => {
  it('GET /api/products returns 200', async () => {
    const res = await get('/api/products');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
  });

  it('products has at least 8 items', async () => {
    const res = await get('/api/products');
    assert.ok(res.json.length >= 8, 'expected at least 8 products, got ' + res.json.length);
  });

  it('GET /api/products?category=elec filters by category', async () => {
    const res = await get('/api/products?category=elec');
    assert.ok(res.json.length > 0);
    assert.ok(res.json.length < 8, 'should filter out non-electrical products');
    for (const p of res.json) {
      assert.ok(p.category_slug, 'category_slug missing');
    }
  });

  it('GET /api/products?search=mcb finds MCB product', async () => {
    const res = await get('/api/products?search=mcb');
    assert.ok(res.json.length >= 1, 'should find at least 1 MCB product');
    const names = res.json.map(p => (p.name || '').toLowerCase());
    assert.ok(names.some(n => n.includes('mcb')), 'MCB not found in results');
  });

  it('GET /api/products/:slug returns detail with specs', async () => {
    const res = await get('/api/products/mcb-40a-1-pole');
    assert.equal(res.status, 200);
    assert.equal(res.json.sku, 'EL-BRK-40A');
    assert.ok(Array.isArray(res.json.specifications), 'specifications missing');
    assert.ok(res.json.specifications.length > 0, 'specifications empty');
    assert.ok(Array.isArray(res.json.images), 'images missing');
  });
});

// ═══════════════════════════════════════════════
// Frontend Preservation Tests (4)
// Using fixed Phase 1 baselines — never recomputed
// ═══════════════════════════════════════════════
describe('Phase 3: Frontend Preservation', () => {
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

// ═══════════════════════════════════════════════
// HIERARCHICAL CATEGORY FILTERING
// ═══════════════════════════════════════════════
describe('Hierarchical Category Filtering', function () {
  it('Parent category returns products from all descendants', async function () {
    const res = await get('/api/products?category=elec');
    assert.equal(res.status, 200);
    const items = res.json.products || res.json;
    assert.ok(items.length >= 6, 'parent elec should include products from children (got ' + items.length + ')');
    // Verify products come from different categories
    const slugs = new Set(items.map(p => p.category_slug));
    assert.ok(slugs.size >= 2, 'should have products from multiple child categories');
  });

  it('Parent with zero direct products still returns descendant products', async function () {
    const res = await get('/api/products?category=safe');
    assert.equal(res.status, 200);
    const items = res.json.products || res.json;
    assert.ok(items.length >= 1, 'parent safe should return products from safety-helmets child');
  });

  it('Child category returns only its own products', async function () {
    const res = await get('/api/products?category=elec-circuit-breakers');
    assert.equal(res.status, 200);
    const items = res.json.products || res.json;
    assert.equal(items.length, 1, 'circuit-breakers should have exactly 1 product');
    assert.ok(items[0].category_slug === 'elec-circuit-breakers');
  });

  it('Parent category + inStock filter works together', async function () {
    const res = await get('/api/products?category=elec&inStock=true');
    assert.equal(res.status, 200);
    const items = res.json.products || res.json;
    assert.ok(items.length >= 1, 'should return in-stock electrical products');
    items.forEach(function (p) { assert.ok(p.stock > 0); });
  });

  it('Invalid category returns empty result', async function () {
    const res = await get('/api/products?category=nonexistent-slug');
    assert.equal(res.status, 200);
    const items = res.json.products || res.json;
    assert.equal(items.length, 0);
  });
});
