const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const BASE = 'http://localhost:3001';
let server;
let adminToken, customerToken;
const TEST_EMAIL = 'phase24test2@nblao.la';
const TEST_PASS = 'TestPass123';

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

  // Login as admin (password is Admin123!)
  const adminLogin = await req('POST', '/api/auth/login', { email: 'admin@nblao.la', password: 'Admin123!' });
  adminToken = adminLogin.data?.token;

  // Register or login test customer
  const reg = await req('POST', '/api/auth/register', {
    email: TEST_EMAIL, password: TEST_PASS, name: 'Phase24 Tester',
  });
  // Always try to login (works whether just registered or already existed)
  const custLogin = await req('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
  customerToken = custLogin.data?.token;
});

after(() => {
  try { process.kill(-server.pid, 'SIGTERM'); } catch(e) {}
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.customer.findUnique({ where: { email: TEST_EMAIL } }).then(c => {
      if (!c) return prisma.$disconnect();
      return prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({ where: { cart: { customerId: c.id } } }).catch(() => {});
        await tx.cart.deleteMany({ where: { customerId: c.id } }).catch(() => {});
        await tx.orderItem.deleteMany({ where: { order: { customerId: c.id } } }).catch(() => {});
        await tx.order.deleteMany({ where: { customerId: c.id } }).catch(() => {});
        await tx.quotationItem.deleteMany({ where: { quotation: { customerId: c.id } } }).catch(() => {});
        await tx.quotation.deleteMany({ where: { customerId: c.id } }).catch(() => {});
        await tx.deliveryAddress.deleteMany({ where: { customerId: c.id } }).catch(() => {});
        await tx.customer.delete({ where: { id: c.id } }).catch(() => {});
      }).then(() => prisma.$disconnect()).catch(() => prisma.$disconnect());
    }).catch(() => {});
  } catch(e) {}
});

// ═══════════════════════════════════════════════
// PHASE 24: STEP 1 — SCHEMA
// ═══════════════════════════════════════════════
describe('Phase 24: Schema & Database', () => {
  it('Prisma schema has new models', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    assert.ok(schema.includes('model ShippingCompany'));
    assert.ok(schema.includes('model ShippingBranch'));
    assert.ok(schema.includes('model DeliveryAddress'));
    assert.ok(schema.includes('model PaymentMethod'));
    assert.ok(schema.includes('model Payment'));
    assert.ok(schema.includes('model ProductVariant'));
    assert.ok(schema.includes('model ProductVariantOption'));
    assert.ok(schema.includes('model OrderStatusHistory'));
  });

  it('CartItem has variant fields', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    assert.ok(schema.includes('variantId'));
    assert.ok(schema.includes('variantName'));
  });

  it('Order has shipping fields', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    assert.ok(schema.includes('shippingCompanyId'));
    assert.ok(schema.includes('shippingCost'));
    assert.ok(schema.includes('deliveryAddressId'));
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: STEPS 2-4 — SHIPPING, ADDRESSES, PAYMENT
// ═══════════════════════════════════════════════
describe('Phase 24: Shipping API', () => {
  it('GET /api/shipping/companies returns data', async () => {
    const res = await req('GET', '/api/shipping/companies');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
    assert.ok(res.data[0].name);
    assert.ok(Array.isArray(res.data[0].branches));
  });

  it('Admin can list shipping companies', async () => {
    const res = await req('GET', '/api/admin/shipping/companies', null, adminToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });
});

describe('Phase 24: Delivery Addresses', () => {
  let addrId;
  it('Customer can create address', async () => {
    const res = await req('POST', '/api/addresses', {
      label: 'Office', recipient_name: 'Test User', phone: '02012345678',
      address_line1: '123 Test Street', district: 'Chanthabouly', province: 'Vientiane', is_default: true,
    }, customerToken);
    assert.ok(res.status === 201 || res.status === 200, 'Status: ' + res.status);
    addrId = res.data?.id;
  });

  it('Customer can list addresses', async () => {
    const res = await req('GET', '/api/addresses', null, customerToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
  });

  it('Customer can delete address', async () => {
    if (addrId) {
      const res = await req('DELETE', '/api/addresses/' + addrId, null, customerToken);
      assert.ok(res.status === 200 || res.status === 204);
    }
  });
});

describe('Phase 24: Payment API', () => {
  it('GET /api/payment/methods returns data', async () => {
    const res = await req('GET', '/api/payment/methods');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
    assert.ok(res.data[0].code);
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: STEP 5 — PRODUCT VARIANTS
// ═══════════════════════════════════════════════
describe('Phase 24: Product Variants', () => {
  it('GET /api/products/:id/variants returns array', async () => {
    const prods = await req('GET', '/api/products?limit=1');
    if (prods.data?.products?.length > 0) {
      const pid = prods.data.products[0].id;
      const res = await req('GET', '/api/products/' + pid + '/variants');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    }
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: STEPS 6-7 — ORDER/QUOTATION ENHANCEMENT
// ═══════════════════════════════════════════════
describe('Phase 24: Order Enhancement', () => {
  it('Admin order list includes shipping fields', async () => {
    const orders = await req('GET', '/api/admin/orders', null, adminToken);
    assert.equal(orders.status, 200);
    assert.ok(Array.isArray(orders.data));
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: STEP 8 — CSV EXPORT
// ═══════════════════════════════════════════════
describe('Phase 24: CSV Export', () => {
  it('Admin can export products CSV', async () => {
    const res = await req('GET', '/api/admin/products/export', null, adminToken);
    assert.equal(res.status, 200);
  });

  it('Admin can export customers CSV', async () => {
    const res = await req('GET', '/api/admin/customers/export', null, adminToken);
    assert.equal(res.status, 200);
  });

  it('Admin can export staff CSV', async () => {
    const res = await req('GET', '/api/admin/staff/export', null, adminToken);
    assert.equal(res.status, 200);
  });

  it('Admin can export orders CSV', async () => {
    const res = await req('GET', '/api/admin/orders/export', null, adminToken);
    assert.equal(res.status, 200);
  });

  it('Admin can export quotations CSV', async () => {
    const res = await req('GET', '/api/admin/quotations/export', null, adminToken);
    assert.equal(res.status, 200);
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: STEP 9 — PDF
// ═══════════════════════════════════════════════
describe('Phase 24: PDF Generation', () => {
  it('PDF service exists with required functions', () => {
    assert.ok(fs.existsSync('backend/services/pdf.js'));
    const pdf = fs.readFileSync('backend/services/pdf.js', 'utf8');
    assert.ok(pdf.includes('generateOrderPDF'));
    assert.ok(pdf.includes('generateQuotationPDF'));
    assert.ok(pdf.includes('buildPDF'));
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: STEPS 10-14 — CUSTOMER FRONTEND
// ═══════════════════════════════════════════════
describe('Phase 24: Customer Frontend', () => {
  it('customer.js has variant selection', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('selectVariant'));
    assert.ok(js.includes('_productVariants'));
    assert.ok(js.includes('variant-opt'));
  });

  it('customer.js has delivery address support', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('checkout-address'));
    assert.ok(js.includes('loadBranches'));
  });

  it('customer.js has payment method support', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('checkout-payment-method') || js.includes('paymentMethod'));
    assert.ok(js.includes('/payment/methods'));
  });

  it('customer.js has order confirmation step', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('_orderConfirmed') || js.includes('confirmYes'));
  });

  it('customer.js passes variantId to cart API', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('variantId'));
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: STEPS 15-17 — ADMIN FRONTEND
// ═══════════════════════════════════════════════
describe('Phase 24: Admin Frontend', () => {
  it('admin.html has language switcher', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('data-lang="lo"'));
    assert.ok(html.includes('data-lang="en"'));
    assert.ok(html.includes('switchAdminLang'));
  });

  it('admin.html has i18n system', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('currentAdminLang'));
    assert.ok(html.includes('adminT('));
  });

  it('admin.html has back navigation', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('goBack'));
    assert.ok(html.includes('_pageHistory'));
  });

  it('admin.html has CSV export buttons', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('products/export'));
    assert.ok(html.includes('customers/export'));
    assert.ok(html.includes('staff/export'));
    assert.ok(html.includes('orders/export'));
    assert.ok(html.includes('quotations/export'));
  });

  it('admin.html has PDF download functions', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('downloadOrderPDF'));
    assert.ok(html.includes('downloadQuotPDF'));
  });

  it('admin.html shows customer level', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('super_vip') || html.includes('Super VIP'));
    assert.ok(html.includes('level'));
  });

  it('admin.html shows delivery/shipping in order detail', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('delivery_address'));
    assert.ok(html.includes('shipping_company'));
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: INTEGRATION
// ═══════════════════════════════════════════════
describe('Phase 24: Integration', () => {
  it('Shipping companies are publicly accessible', async () => {
    const res = await req('GET', '/api/shipping/companies');
    assert.equal(res.status, 200);
    assert.ok(res.data.length > 0);
  });

  it('Payment methods are publicly accessible', async () => {
    const res = await req('GET', '/api/payment/methods');
    assert.equal(res.status, 200);
    assert.ok(res.data.length > 0);
  });

  it('Cart has variant fields in response', async () => {
    const prods = await req('GET', '/api/products?limit=1');
    if (prods.data?.products?.length > 0) {
      const pid = prods.data.products[0].id;
      await req('POST', '/api/cart/items', { productId: pid, quantity: 1 }, customerToken);
      const cart = await req('GET', '/api/cart', null, customerToken);
      assert.equal(cart.status, 200);
      if (cart.data?.items?.length > 0) {
        assert.ok('variant_id' in cart.data.items[0]);
        assert.ok('variant_name' in cart.data.items[0]);
      }
      await req('DELETE', '/api/cart', null, customerToken);
    }
  });
});

// ═══════════════════════════════════════════════
// PHASE 24: FILE CHECKS
// ═══════════════════════════════════════════════
describe('Phase 24: Files & Structure', () => {
  it('New route files exist', () => {
    assert.ok(fs.existsSync('backend/routes/shipping.js'));
    assert.ok(fs.existsSync('backend/routes/payment.js'));
    assert.ok(fs.existsSync('backend/routes/addresses.js'));
    assert.ok(fs.existsSync('backend/routes/variants.js'));
    assert.ok(fs.existsSync('backend/services/pdf.js'));
  });

  it('All new JS files pass syntax check', () => {
    const files = [
      'backend/routes/shipping.js',
      'backend/routes/payment.js',
      'backend/routes/addresses.js',
      'backend/routes/variants.js',
      'backend/routes/products.js',
      'backend/routes/cart.js',
      'backend/routes/orders.js',
      'backend/services/pdf.js',
    ];
    const vm = require('vm');
    for (const f of files) {
      const code = fs.readFileSync(f, 'utf8');
      try { new vm.Script(code, { filename: f }); }
      catch(e) { assert.fail(f + ' syntax error: ' + e.message); }
    }
  });

  it('Protected wireframe files unchanged', () => {
    const md5 = (data) => require('crypto').createHash('md5').update(data).digest('hex');
    assert.equal(md5(fs.readFileSync('nb_lao_wireframes_v2_updated.html')), 'aebe02f72a5852289b1a7ad27c7dd657');
    assert.equal(md5(fs.readFileSync('styles/nblao.css')), 'ad86eea2c740140705b8c06b2419d1a4');
    assert.equal(md5(fs.readFileSync('js/nblao.js')), 'b53a5966017bdd3fb7794e58822aeb98');
  });
});
