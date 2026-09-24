const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const BASE = 'http://localhost:3001';
let server, adminToken;

function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method, hostname: 'localhost', port: 3001, path: urlPath,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    };
    const r = http.request(opts, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); } catch(e) { resolve({ status: res.statusCode, data: buf }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

before(async () => {
  try { execSync('taskkill //F //IM node.exe 2>&1 || echo ok', { stdio: 'ignore' }); } catch(e) {}
  await new Promise(r => setTimeout(r, 500));
  server = spawn('node', ['backend/server.js'], {
    env: { ...process.env, NODE_ENV: 'test' }, stdio: 'ignore', detached: true,
  });
  server.unref();
  await new Promise(r => setTimeout(r, 2500));
  const login = await req('POST', '/api/auth/login', { email: 'admin@nblao.la', password: 'Admin123!' });
  adminToken = login.data?.token;
});

after(() => {
  try { process.kill(-server.pid, 'SIGTERM'); } catch(e) {}
});

// ═══════════════════════════════════════════════
// ADMIN SHIPPING COMPANIES
// ═══════════════════════════════════════════════
describe('Phase 25: Admin Shipping UI', () => {
  it('admin.html has loadShipping function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function loadShipping'));
  });

  it('admin.html has showShippingModal function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function showShippingModal'));
  });

  it('admin.html has saveShipping function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function saveShipping'));
  });

  it('admin.html has deleteShipping function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function deleteShipping'));
  });

  it('admin sidebar has shipping nav entry', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('data-page="shipping"'));
    assert.ok(html.includes("navigateTo('shipping')"));
  });

  it('admin switchTo has shipping case', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('case "shipping":'));
  });

  it('Admin can list shipping companies via API', async () => {
    const res = await req('GET', '/api/admin/shipping/companies', null, adminToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
  });
});

// ═══════════════════════════════════════════════
// ADMIN PAYMENT METHODS
// ═══════════════════════════════════════════════
describe('Phase 25: Admin Payment Methods UI', () => {
  it('admin.html has loadPaymentMethods function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function loadPaymentMethods'));
  });

  it('admin.html has showPaymentModal function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function showPaymentModal'));
  });

  it('admin.html has savePaymentMethod function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function savePaymentMethod'));
  });

  it('admin sidebar has payment-methods nav entry', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('data-page="payment-methods"'));
    assert.ok(html.includes("navigateTo('payment-methods')"));
  });

  it('admin switchTo has payment-methods case', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('case "payment-methods":'));
  });

  it('Payment methods are publicly accessible', async () => {
    const res = await req('GET', '/api/payment/methods');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
  });
});

// ═══════════════════════════════════════════════
// ADMIN PRODUCT VARIANTS
// ═══════════════════════════════════════════════
describe('Phase 25: Admin Variants UI', () => {
  it('admin.html has loadVariants function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function loadVariants'));
  });

  it('admin.html has deleteVariant function', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('async function deleteVariant'));
  });

  it('admin sidebar has variants nav entry', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('data-page="variants"'));
    assert.ok(html.includes("navigateTo('variants')"));
  });

  it('admin switchTo has variants case', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('case "variants":'));
  });
});

// ═══════════════════════════════════════════════
// CUSTOMER STATUS BADGES
// ═══════════════════════════════════════════════
describe('Phase 25: Customer Status Badges', () => {
  it('customer.js has orderStatusBadge function', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('function orderStatusBadge'));
  });

  it('orderStatusBadge handles common statuses', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('pending:') || js.includes('"pending"'));
    assert.ok(js.includes('confirmed:') || js.includes('"confirmed"'));
    assert.ok(js.includes('shipped:') || js.includes('"shipped"'));
    assert.ok(js.includes('delivered:') || js.includes('"delivered"'));
    assert.ok(js.includes('cancelled:') || js.includes('"cancelled"'));
  });

  it('customer order list uses status badge', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('orderStatusBadge(o.status)') || js.includes('orderStatusBadge(q.status)'));
  });
});

// ═══════════════════════════════════════════════
// FILE INTEGRITY
// ═══════════════════════════════════════════════
describe('Phase 25: File Integrity', () => {
  it('admin.html JS syntax is valid', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(m, 'Should have script tag');
    const vm = require('vm');
    try { new vm.Script(m[1]); }
    catch(e) { assert.fail('JS syntax error: ' + e.message); }
  });

  it('customer.js syntax is valid', () => {
    const vm = require('vm');
    const js = fs.readFileSync('js/customer.js', 'utf8');
    try { new vm.Script(js); }
    catch(e) { assert.fail('JS syntax error: ' + e.message); }
  });

  it('protected wireframe files unchanged', () => {
    const md5 = (d) => require('crypto').createHash('md5').update(d).digest('hex');
    assert.equal(md5(fs.readFileSync('nb_lao_wireframes_v2_updated.html')), 'aebe02f72a5852289b1a7ad27c7dd657');
    assert.equal(md5(fs.readFileSync('styles/nblao.css')), 'ad86eea2c740140705b8c06b2419d1a4');
    assert.equal(md5(fs.readFileSync('js/nblao.js')), 'b53a5966017bdd3fb7794e58822aeb98');
  });

  it('admin sidebar has all new entries', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('data-page="shipping"'));
    assert.ok(html.includes('data-page="payment-methods"'));
    assert.ok(html.includes('data-page="variants"'));
  });
});
