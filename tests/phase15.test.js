/**
 * Phase 15 Tests — Admin RBAC & Staff Management
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const opts = { hostname: 'localhost', port: 3001, path, method,
      headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = http.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function md5(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

const TEST_EMAIL = 'rbac-test@nblao.la';
const ADMIN_EMAIL = 'admin@nblao.la';
const ADMIN_PASS = 'Admin123!';
let adminToken = null;
let testToken = null;

describe('Phase 15: Admin RBAC & Staff Management', () => {

  // ── Setup ──
  it('setup: login as admin', async () => {
    const res = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    const body = JSON.parse(res.body);
    adminToken = body.token;
    assert.ok(adminToken, 'Admin should have token');
    assert.ok(body.staff, 'Admin login should return staff info');
    assert.ok(body.staff.isSuperAdmin, 'Admin should be super admin');
  });

  it('setup: create test customer', async () => {
    const res = await request('POST', '/api/auth/register', { email: TEST_EMAIL, password: 'TestPass123!', name: 'RBAC Tester' });
    if (res.status === 201) {
      testToken = JSON.parse(res.body).token;
    } else {
      const login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: 'TestPass123!' });
      testToken = JSON.parse(login.body).token;
    }
    assert.ok(testToken);
  });

  // ── 1. Schema has new models ──
  it('Schema has Staff, Position, AuditLog models', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    assert.ok(schema.includes('model Staff'), 'Staff model');
    assert.ok(schema.includes('model Position'), 'Position model');
    assert.ok(schema.includes('model AuditLog'), 'AuditLog model');
    assert.ok(schema.includes('staffId'), 'Customer has staffId');
    assert.ok(schema.includes('isSuperAdmin'), 'Staff has isSuperAdmin');
    assert.ok(schema.includes('permissions'), 'Staff has permissions');
  });

  // ── 2. Positions API ──
  it('GET /api/admin/positions returns positions', async () => {
    const res = await request('GET', '/api/admin/positions', null, adminToken);
    assert.strictEqual(res.status, 200);
    const positions = JSON.parse(res.body);
    assert.ok(Array.isArray(positions));
    assert.ok(positions.length >= 5, 'Should have at least 5 positions');
    const superAdmin = positions.find(p => p.name === 'Super Admin');
    assert.ok(superAdmin, 'Should have Super Admin position');
    assert.ok(superAdmin.is_system, 'Super Admin should be system position');
  });

  it('POST /api/admin/positions creates position', async () => {
    const res = await request('POST', '/api/admin/positions', { name: 'Test Position', description: 'For testing' }, adminToken);
    assert.strictEqual(res.status, 201);
    const pos = JSON.parse(res.body);
    assert.ok(pos.id);
    assert.strictEqual(pos.name, 'Test Position');
  });

  it('PUT /api/admin/positions/:id updates position', async () => {
    const list = JSON.parse((await request('GET', '/api/admin/positions', null, adminToken)).body);
    const testPos = list.find(p => p.name === 'Test Position');
    const res = await request('PUT', '/api/admin/positions/' + testPos.id, { description: 'Updated desc' }, adminToken);
    assert.strictEqual(res.status, 200);
  });

  it('DELETE /api/admin/positions/:id deletes non-system position', async () => {
    const list = JSON.parse((await request('GET', '/api/admin/positions', null, adminToken)).body);
    const testPos = list.find(p => p.name === 'Test Position');
    const res = await request('DELETE', '/api/admin/positions/' + testPos.id, null, adminToken);
    assert.strictEqual(res.status, 200);
  });

  it('Cannot delete system positions', async () => {
    const list = JSON.parse((await request('GET', '/api/admin/positions', null, adminToken)).body);
    const sysPos = list.find(p => p.is_system);
    const res = await request('DELETE', '/api/admin/positions/' + sysPos.id, null, adminToken);
    assert.ok(res.status >= 400, 'Should reject deleting system position');
  });

  // ── 3. Staff API ──
  it('GET /api/admin/staff returns staff list', async () => {
    const res = await request('GET', '/api/admin/staff', null, adminToken);
    assert.strictEqual(res.status, 200);
    const staff = JSON.parse(res.body);
    assert.ok(Array.isArray(staff));
    assert.ok(staff.length >= 1, 'Should have at least 1 staff (admin)');
    const superAdmin = staff.find(s => s.is_super_admin);
    assert.ok(superAdmin, 'Should have super admin staff');
  });

  it('POST /api/admin/staff creates staff from customer', async () => {
    const customers = JSON.parse((await request('GET', '/api/admin/customers', null, adminToken)).body);
    const testCust = customers.find(c => c.email === TEST_EMAIL);
    const positions = JSON.parse((await request('GET', '/api/admin/positions', null, adminToken)).body);
    const staffPos = positions.find(p => p.name === 'Staff');
    const res = await request('POST', '/api/admin/staff', {
      customer_id: testCust.id, position_id: staffPos.id,
    }, adminToken);
    assert.strictEqual(res.status, 201);
  });

  it('PUT /api/admin/staff/:id updates staff', async () => {
    const staff = JSON.parse((await request('GET', '/api/admin/staff', null, adminToken)).body);
    const testStaff = staff.find(s => s.customer.email === TEST_EMAIL);
    const res = await request('PUT', '/api/admin/staff/' + testStaff.id, { active: false }, adminToken);
    assert.strictEqual(res.status, 200);
    // Reactivate
    await request('PUT', '/api/admin/staff/' + testStaff.id, { active: true }, adminToken);
  });

  // ── 4. Password reset by admin ──
  it('Admin can reset customer password', async () => {
    const customers = JSON.parse((await request('GET', '/api/admin/customers', null, adminToken)).body);
    const testCust = customers.find(c => c.email === TEST_EMAIL);
    const res = await request('POST', '/api/admin/customers/' + testCust.id + '/reset-password', { password: 'NewPass123!' }, adminToken);
    assert.strictEqual(res.status, 200);
    // Verify new password works
    const login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: 'NewPass123!' });
    assert.strictEqual(login.status, 200);
    // Reset back
    await request('POST', '/api/admin/customers/' + testCust.id + '/reset-password', { password: 'TestPass123!' }, adminToken);
  });

  // ── 5. Audit logs API ──
  it('GET /api/admin/audit-logs returns logs', async () => {
    const res = await request('GET', '/api/admin/audit-logs', null, adminToken);
    assert.strictEqual(res.status, 200);
    const data = JSON.parse(res.body);
    assert.ok(Array.isArray(data.logs));
    assert.ok('total' in data);
    assert.ok('page' in data);
    assert.ok('totalPages' in data);
  });

  // ── 6. Backward compatibility — old admin still works ──
  it('Old admin login still works with backward compatibility', async () => {
    const res = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    assert.strictEqual(res.status, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.token);
    assert.ok(body.customer.role === 'admin');
  });

  // ── 7. Auth response includes role ──
  it('Login response includes role and staff info', async () => {
    const res = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    const body = JSON.parse(res.body);
    assert.ok(body.customer.role, 'Should include role');
    assert.ok(body.staff !== undefined, 'Should include staff field');
  });

  // ── 8. RBAC middleware exists ──
  it('RBAC middleware file exists with correct exports', () => {
    const rbac = fs.readFileSync('backend/middleware/rbac.js', 'utf8');
    assert.ok(rbac.includes('requirePermission'), 'Should export requirePermission');
    assert.ok(rbac.includes('requireAllPermissions'), 'Should export requireAllPermissions');
    assert.ok(rbac.includes('requireSuperAdmin'), 'Should export requireSuperAdmin');
    assert.ok(rbac.includes('hasPermission'), 'Should export hasPermission');
    assert.ok(rbac.includes('parsePermissions'), 'Should export parsePermissions');
    assert.ok(rbac.includes('auditLog'), 'Should export auditLog');
  });

  // ── 9. Admin middleware supports RBAC ──
  it('Admin middleware supports RBAC staff lookup', () => {
    const adminMw = fs.readFileSync('backend/middleware/admin.js', 'utf8');
    assert.ok(adminMw.includes('staffRecord'), 'Should attach staff record to req');
    assert.ok(adminMw.includes('isSuperAdmin'), 'Should check super admin');
  });

  // ── 10. Auth includes staff info in token ──
  it('Auth signToken supports staff parameter', () => {
    const authJs = fs.readFileSync('backend/lib/auth.js', 'utf8');
    assert.ok(authJs.includes('function signToken(customer, staff)'), 'signToken accepts staff');
    assert.ok(authJs.includes('staffId'), 'Token includes staffId');
    assert.ok(authJs.includes('isSuperAdmin'), 'Token includes isSuperAdmin');
  });

  // ── 11. Seed creates positions ──
  it('Seed file creates default positions', () => {
    const seed = fs.readFileSync('backend/seed.js', 'utf8');
    assert.ok(seed.includes('Super Admin'), 'Seed creates Super Admin position');
    assert.ok(seed.includes('Position'), 'Seed handles positions');
    assert.ok(seed.includes('isSuperAdmin: true'), 'Seed creates super admin staff');
  });

  // ── 12. Admin.html has new sidebar items ──
  it('Admin dashboard has Staff, Positions, Audit sidebar items', () => {
    const html = fs.readFileSync('admin.html', 'utf8');
    assert.ok(html.includes('data-page=\"staff\"'), 'Staff sidebar link');
    assert.ok(html.includes('data-page=\"positions\"'), 'Positions sidebar link');
    assert.ok(html.includes('data-page=\"audit\"'), 'Audit sidebar link');
    assert.ok(html.includes('loadStaff'), 'loadStaff function');
    assert.ok(html.includes('loadPositions'), 'loadPositions function');
    assert.ok(html.includes('loadAuditLogs'), 'loadAuditLogs function');
  });

  // ── 13. Admin routes include new endpoints ──
  it('Admin routes include staff, positions, audit-logs endpoints', () => {
    const staffMod = fs.readFileSync('backend/routes/admin/staff.js', 'utf8');
    assert.ok(staffMod.includes('/staff'), 'Staff routes');
    const admin = fs.readFileSync('backend/routes/admin.js', 'utf8');
    assert.ok(admin.includes('/positions'), 'Positions routes');
    assert.ok(admin.includes('/audit-logs'), 'Audit logs routes');
    const pwdReset = fs.readFileSync('backend/routes/admin/password-reset.js', 'utf8');
    assert.ok(pwdReset.includes('/reset-password'), 'Password reset route');
  });

  // ── 14. Existing admin functionality preserved ──
  it('Existing admin endpoints still work', async () => {
    const dash = await request('GET', '/api/admin/dashboard', null, adminToken);
    assert.strictEqual(dash.status, 200);
    const prods = await request('GET', '/api/admin/products', null, adminToken);
    assert.strictEqual(prods.status, 200);
    const custs = await request('GET', '/api/admin/customers', null, adminToken);
    assert.strictEqual(custs.status, 200);
    const orders = await request('GET', '/api/admin/orders', null, adminToken);
    assert.strictEqual(orders.status, 200);
    const quotes = await request('GET', '/api/admin/quotations', null, adminToken);
    assert.strictEqual(quotes.status, 200);
    const emails = await request('GET', '/api/admin/emails', null, adminToken);
    assert.strictEqual(emails.status, 200);
  });

  // ── 15. Customer functionality preserved ──
  it('Customer-facing endpoints still work', async () => {
    const login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: 'TestPass123!' });
    assert.strictEqual(login.status, 200);
    const token = JSON.parse(login.body).token;
    const me = await request('GET', '/api/auth/me', null, token);
    assert.strictEqual(me.status, 200);
    const products = await request('GET', '/api/products');
    assert.strictEqual(products.status, 200);
    const cart = await request('GET', '/api/cart', null, token);
    assert.strictEqual(cart.status, 200);
  });

  // ── 16. Original wireframe preserved ──
  it('Original wireframe files are preserved', () => {
    assert.strictEqual(md5('nb_lao_wireframes_v2_original_backup.html'), '69b1396610c1d27917d16cc193c00103');
    assert.strictEqual(md5('nb_lao_wireframes_v2_updated.html'), 'aebe02f72a5852289b1a7ad27c7dd657');
    assert.strictEqual(md5('js/nblao.js'), 'b53a5966017bdd3fb7794e58822aeb98');
  });

  // ── 17. Cleanup ──
  it('cleanup: remove test staff', async () => {
    const staff = JSON.parse((await request('GET', '/api/admin/staff', null, adminToken)).body);
    const testStaff = staff.find(s => s.customer.email === TEST_EMAIL);
    if (testStaff) {
      await request('DELETE', '/api/admin/staff/' + testStaff.id, null, adminToken);
    }
  });
});
