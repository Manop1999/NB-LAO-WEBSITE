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
        resolve({ status: res.statusCode, body: data, json: json, headers: res.headers });
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
// CUSTOMER SPA FILES (3)
// ═══════════════════════════════════════════════
describe('Phase 12: Customer SPA Files', function () {
  it('customer.html exists and is non-empty', function () {
    assert.ok(fs.existsSync('customer.html'), 'customer.html missing');
    const content = fs.readFileSync('customer.html', 'utf8');
    assert.ok(content.length > 1000, 'customer.html too small');
    assert.ok(content.includes('customer.js'), 'customer.html should reference customer.js');
    assert.ok(content.includes('nblao.css'), 'customer.html should use existing CSS');
  });

  it('js/customer.js exists and is non-empty', function () {
    assert.ok(fs.existsSync('js/customer.js'), 'js/customer.js missing');
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.length > 5000, 'js/customer.js too small');
  });

  it('customer.html serves HTTP 200', async function () {
    const res = await request('GET', '/customer.html');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('customer.js'));
  });
});

// ═══════════════════════════════════════════════
// CUSTOMER SPA ROUTING (2)
// ═══════════════════════════════════════════════
describe('Phase 12: Customer SPA Routing', function () {
  it('/customer redirects to customer.html', async function () {
    const res = await request('GET', '/customer');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location === '/customer.html');
  });

  it('customer.html contains SPA router reference', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.includes('hashchange') || content.includes('router'), 'SPA router not found');
    assert.ok(content.includes('navigate'), 'navigate function not found');
  });
});

// ═══════════════════════════════════════════════
// API INTEGRATION (4)
// ═══════════════════════════════════════════════
describe('Phase 12: API Integration', function () {
  it('customer.js references all required API endpoints', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.includes('/auth/login'), 'login API missing');
    assert.ok(content.includes('/auth/register'), 'register API missing');
    assert.ok(content.includes('/auth/me'), 'me API missing');
    assert.ok(content.includes('/products'), 'products API missing');
    assert.ok(content.includes('/categories'), 'categories API missing');
    assert.ok(content.includes('/cart'), 'cart API missing');
    assert.ok(content.includes('/orders'), 'orders API missing');
    assert.ok(content.includes('/quotations'), 'quotations API missing');
  });

  it('customer.js has JWT token handling', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.includes('localStorage'), 'localStorage not used');
    assert.ok(content.includes('nblao_token'), 'token key not found');
    assert.ok(content.includes('Bearer'), 'Bearer auth header not found');
  });

  it('customer.js supports both Lao and English', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.includes("'lo'") || content.includes('"lo"'), 'Lao locale not found');
    assert.ok(content.includes("'en'") || content.includes('"en"'), 'English locale not found');
    assert.ok(content.includes('setLang'), 'language switcher not found');
  });

  it('customer.js handles search and filtering', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.includes('q=') || content.includes('search'), 'search param not found');
    assert.ok(content.includes('category'), 'category filter not found');
    assert.ok(content.includes('brand'), 'brand filter not found');
    assert.ok(content.includes('minPrice'), 'minPrice filter not found');
    assert.ok(content.includes('maxPrice'), 'maxPrice filter not found');
    assert.ok(content.includes('inStock'), 'inStock filter not found');
    assert.ok(content.includes('sort'), 'sort param not found');
  });
});

// ═══════════════════════════════════════════════
// SECURITY (2)
// ═══════════════════════════════════════════════
describe('Phase 12: Security', function () {
  it('customer.js does not expose JWT secret', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(!content.includes('nblao-dev-secret'), 'JWT secret should not be in frontend');
    assert.ok(!content.includes('JWT_SECRET'), 'JWT_SECRET should not be in frontend');
  });

  it('customer.js handles 401 by clearing token', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.includes('401') || content.includes('removeItem'), '401 handling not found');
  });
});

// ═══════════════════════════════════════════════
// PAGES IMPLEMENTED (2)
// ═══════════════════════════════════════════════
describe('Phase 12: Pages Implemented', function () {
  it('customer.js renders all required page views', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    // Check for page render functions
    assert.ok(content.includes('renderHome'), 'home page missing');
    assert.ok(content.includes('renderProducts') || content.includes('products'), 'products page missing');
    assert.ok(content.includes('renderProductDetail') || content.includes('product'), 'product detail missing');
    assert.ok(content.includes('renderCart'), 'cart page missing');
    assert.ok(content.includes('renderCheckout'), 'checkout page missing');
    assert.ok(content.includes('renderLogin'), 'login page missing');
    assert.ok(content.includes('renderRegister'), 'register page missing');
    assert.ok(content.includes('renderAccount'), 'account page missing');
    assert.ok(content.includes('renderOrders'), 'orders page missing');
    assert.ok(content.includes('renderQuotations'), 'quotations page missing');
  });

  it('customer.js has logout functionality', function () {
    const content = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(content.includes('doLogout') || content.includes('logout'), 'logout function not found');
    assert.ok(content.includes('removeItem'), 'token removal not found');
  });
});

// ═══════════════════════════════════════════════
// FRONTEND PRESERVATION (1)
// ═══════════════════════════════════════════════
describe('Phase 12: Frontend Preservation', function () {
  it('all 4 original frontend files match Phase 1 baselines', function () {
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
