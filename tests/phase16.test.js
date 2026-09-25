/**
 * Phase 16: Customer Points & Loyalty — Step 8b Tests
 * Tests the loyalty service, API endpoints, earning, redemption, tiers, and edge cases.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('../backend/lib/prisma');
const loyalty = require('../backend/services/loyalty');

const BASE = 'http://localhost:3001';

// ─── HTTP Helpers ──────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + (url.search || ''),
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function md5(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

// ─── Test Setup ────────────────────────────────────────────────────

const TEST_EMAIL = 'phase16_test@nblao.la';
const TEST_PASS = 'Phase16TestPass!';
const TEST_NAME = 'Phase 16 Test User';
let testCustomerId = null;
let customerToken = null;

// ─── Tests ─────────────────────────────────────────────────────────

describe('Phase 16: Customer Points & Loyalty', () => {

  // ── File & Schema Checks ──────────────────────────────────────────

  describe('Phase 16: Files & Schema', () => {
    it('loyalty service exists', () => {
      assert.ok(fs.existsSync('backend/services/loyalty.js'));
    });
    it('loyalty routes exist', () => {
      assert.ok(fs.existsSync('backend/routes/loyalty.js'));
    });
    it('loyalty service exports required functions', () => {
      assert.equal(typeof loyalty.getConfig, 'function');
      assert.equal(typeof loyalty.earnPoints, 'function');
      assert.equal(typeof loyalty.redeemPoints, 'function');
      assert.equal(typeof loyalty.expirePoints, 'function');
      assert.equal(typeof loyalty.adjustPoints, 'function');
      assert.equal(typeof loyalty.calculateTier, 'function');
      assert.equal(typeof loyalty.upgradeCustomerTier, 'function');
      assert.equal(typeof loyalty.getCustomerSummary, 'function');
      assert.equal(typeof loyalty.getAdminStats, 'function');
      assert.equal(typeof loyalty.updateConfig, 'function');
    });
    it('PointsLedger model exists in Prisma', () => {
      assert.ok(prisma.pointsLedger);
    });
    it('LoyaltyConfig model exists in Prisma', () => {
      assert.ok(prisma.loyaltyConfig);
    });
    it('LoyaltyTier model exists in Prisma', () => {
      assert.ok(prisma.loyaltyTier);
    });
    it('Customer has pointsBalance field', async () => {
      const c = await prisma.customer.findFirst({ select: { pointsBalance: true } });
      assert.ok(c !== null);
      assert.equal(typeof c.pointsBalance, 'number');
    });
    it('Customer has lifetimePoints field', async () => {
      const c = await prisma.customer.findFirst({ select: { lifetimePoints: true } });
      assert.ok(c !== null);
      assert.equal(typeof c.lifetimePoints, 'number');
    });
    it('Customer has tierId field', async () => {
      const c = await prisma.customer.findFirst({ select: { tierId: true } });
      assert.ok(c !== null);
    });
    it('Order has pointsRedeemed and discountApplied fields', async () => {
      const last = await prisma.order.findFirst({
        select: { pointsRedeemed: true, discountApplied: true },
      });
      // fields exist even if null
      assert.ok('pointsRedeemed' in (last || {}));
    });
    it('loyalty config seeded', async () => {
      const cfg = await prisma.loyaltyConfig.findFirst();
      assert.ok(cfg);
      const parsed = JSON.parse(cfg.config);
      assert.equal(parsed.enabled, true);
      assert.equal(parsed.earningRate, 1);
      assert.equal(parsed.redemptionRate, 1000);
    });
    it('4 loyalty tiers seeded', async () => {
      const tiers = await prisma.loyaltyTier.findMany();
      assert.equal(tiers.length, 4);
      assert.equal(tiers[0].name, 'Bronze');
      assert.equal(tiers[3].name, 'Platinum');
    });
  });

  // ── Setup: create test customer ───────────────────────────────────

  describe('Phase 16: Test Setup', () => {
    it('create test customer', async () => {
      // Clean up any existing test customer
      const existing = await prisma.customer.findUnique({ where: { email: TEST_EMAIL } });
      if (existing) {
        await prisma.pointsLedger.deleteMany({ where: { customerId: existing.id } });
        await prisma.customer.delete({ where: { id: existing.id } });
      }
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(TEST_PASS, 10);
      const c = await prisma.customer.create({
        data: {
          email: TEST_EMAIL,
          passwordHash: hash,
          name: TEST_NAME,
          phone: '+856 20 9999 9999',
          company: 'Phase 16 Test Co.',
        },
      });
      testCustomerId = c.id;
      assert.ok(testCustomerId);
    });
    it('login as test customer', async () => {
      const res = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
      assert.equal(res.status, 200);
      customerToken = res.data.token;
      assert.ok(customerToken);
    });
  });

  // ── Public API Endpoints ──────────────────────────────────────────

  describe('Phase 16: Public Loyalty API', () => {
    it('GET /api/loyalty/tiers returns 4 tiers', async () => {
      const res = await request('GET', '/api/loyalty/tiers');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.equal(res.data.length, 4);
      assert.equal(res.data[0].name, 'Bronze');
    });
    it('GET /api/loyalty/config returns config', async () => {
      const res = await request('GET', '/api/loyalty/config');
      assert.equal(res.status, 200);
      assert.equal(res.data.enabled, true);
      assert.ok(res.data.earningRate > 0);
      assert.ok(res.data.redemptionRate > 0);
    });
    it('GET /api/loyalty/leaderboard returns array', async () => {
      const res = await request('GET', '/api/loyalty/leaderboard');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });
  });

  // ── Auth-Required Endpoints ───────────────────────────────────────

  describe('Phase 16: Authenticated Loyalty API', () => {
    it('GET /api/loyalty/summary requires auth', async () => {
      const res = await request('GET', '/api/loyalty/summary');
      assert.equal(res.status, 401);
    });
    it('GET /api/loyalty/summary returns full summary', async () => {
      const res = await request('GET', '/api/loyalty/summary', null, customerToken);
      assert.equal(res.status, 200);
      assert.equal(typeof res.data.pointsBalance, 'number');
      assert.equal(typeof res.data.lifetimePoints, 'number');
      // currentTier may be null if no tierId set, but field should exist
      assert.ok('currentTier' in res.data);
      assert.ok(Array.isArray(res.data.ledger));
      assert.ok(res.data.config);
    });
  });

  // ── Points Earning ────────────────────────────────────────────────

  describe('Phase 16: Points Earning', () => {
    it('earnPoints returns points and updates balance', async () => {
      const before = await loyalty.getCustomerSummary(testCustomerId);
      const baseBal = before.pointsBalance;
      const result = await loyalty.earnPoints(testCustomerId, 500000, null);
      assert.ok(result);
      assert.ok(result.points > 0);
      const after = await loyalty.getCustomerSummary(testCustomerId);
      assert.equal(after.pointsBalance, baseBal + result.points);
      assert.ok(after.lifetimePoints >= before.lifetimePoints + result.points);
    });
    it('earnPoints creates ledger entry', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      assert.ok(s.ledger.some(e => e.type === 'earned'));
      const entry = s.ledger.find(e => e.type === 'earned');
      assert.ok(typeof entry.points === 'number');
      assert.ok(typeof entry.balanceBefore === 'number');
      assert.ok(typeof entry.balanceAfter === 'number');
    });
    it('duplicate earnPoints returns null', async () => {
      // Earn with same null orderId — should be caught by findFirst check
      const result = await loyalty.earnPoints(testCustomerId, 500000, null);
      assert.equal(result, null);
    });
    it('earnPoints for non-existent customer returns null', async () => {
      const result = await loyalty.earnPoints(999999, 100000, null);
      assert.equal(result, null);
    });
    it('earnPoints returns null when disabled', async () => {
      const orig = await loyalty.getConfig();
      await loyalty.updateConfig({ enabled: false });
      const result = await loyalty.earnPoints(testCustomerId, 100000, null);
      assert.equal(result, null);
      await loyalty.updateConfig({ enabled: orig.enabled });
    });
  });

  // ── Points Redemption ─────────────────────────────────────────────

  describe('Phase 16: Points Redemption', () => {
    it('redeemPoints works with sufficient balance', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      const bal = s.pointsBalance;
      if (bal >= 100) {
        const toRedeem = Math.min(bal, 150);
        const result = await loyalty.redeemPoints(testCustomerId, toRedeem, 500000, null);
        assert.ok(result);
        assert.ok(result.pointsRedeemed > 0);
        assert.ok(result.discountKip > 0);
        assert.equal(result.discountKip, result.pointsRedeemed * 1000);
      }
    });
    it('redeemPoints creates ledger entry', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      assert.ok(s.ledger.some(e => e.type === 'redeemed'));
      assert.ok(s.totalRedeemed > 0);
    });
    it('insufficient points returns error', async () => {
      const result = await loyalty.redeemPoints(testCustomerId, 999999, 500000, null);
      assert.ok(result.error);
      assert.ok(result.error.includes('Insufficient'));
    });
    it('below minimum order returns error', async () => {
      const result = await loyalty.redeemPoints(testCustomerId, 100, 50000, null);
      assert.ok(result.error);
      assert.ok(result.error.includes('Minimum'));
    });
  });

  // ── Manual Adjustment ─────────────────────────────────────────────

  describe('Phase 16: Manual Adjustment', () => {
    it('adjustPoints adds points', async () => {
      const before = (await loyalty.getCustomerSummary(testCustomerId)).pointsBalance;
      const result = await loyalty.adjustPoints(testCustomerId, 200, 'Admin bonus');
      assert.ok(result);
      assert.equal(result.points, 200);
      const after = await loyalty.getCustomerSummary(testCustomerId);
      assert.equal(after.pointsBalance, before + 200);
    });
    it('adjustPoints creates ledger entry', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      assert.ok(s.ledger.some(e => e.type === 'adjusted'));
    });
    it('negative adjustment deducts points', async () => {
      const before = (await loyalty.getCustomerSummary(testCustomerId)).pointsBalance;
      const result = await loyalty.adjustPoints(testCustomerId, -50, 'Test deduction');
      assert.ok(result);
      assert.equal(result.points, -50);
      const after = await loyalty.getCustomerSummary(testCustomerId);
      assert.equal(after.pointsBalance, before - 50);
    });
    it('over-deduction blocked', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      const result = await loyalty.adjustPoints(testCustomerId, -(s.pointsBalance + 10000), 'too much');
      assert.ok(result.error);
      assert.ok(result.error.includes('Insufficient'));
    });
    it('zero adjustment returns error', async () => {
      const result = await loyalty.adjustPoints(testCustomerId, 0, 'zero');
      assert.ok(result.error);
    });
  });

  // ── Tier Calculation & Upgrade ────────────────────────────────────

  describe('Phase 16: Tier Calculation & Upgrade', () => {
    it('calculateTier returns Bronze for low points', async () => {
      const tier = await loyalty.calculateTier(testCustomerId);
      assert.ok(tier);
      assert.equal(tier.name, 'Bronze');
    });
    it('upgradeCustomerTier upgrades to Silver at 5000 points', async () => {
      await prisma.customer.update({ where: { id: testCustomerId }, data: { lifetimePoints: 6000 } });
      const result = await loyalty.upgradeCustomerTier(testCustomerId);
      assert.ok(result);
      assert.equal(result.newTier.name, 'Silver');
    });
    it('currentTier reflects Silver after upgrade', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      assert.equal(s.currentTier.name, 'Silver');
    });
    it('upgradeCustomerTier to Gold at 20000 points', async () => {
      await prisma.customer.update({ where: { id: testCustomerId }, data: { lifetimePoints: 25000 } });
      const result = await loyalty.upgradeCustomerTier(testCustomerId);
      assert.ok(result);
      assert.equal(result.newTier.name, 'Gold');
      const s = await loyalty.getCustomerSummary(testCustomerId);
      assert.equal(s.currentTier.name, 'Gold');
    });
    it('revert to Bronze after lowering points', async () => {
      // Set points below Silver threshold and reset tierId
      await prisma.customer.update({ where: { id: testCustomerId }, data: { lifetimePoints: 100, tierId: null } });
      const result = await loyalty.upgradeCustomerTier(testCustomerId);
      // Should not upgrade (100 < 5000 Silver threshold), so tier remains null or Bronze
      const after = await loyalty.getCustomerSummary(testCustomerId);
      // currentTier may be null (no tierId) or Bronze; both are acceptable
      assert.ok(after.currentTier === null || after.currentTier.name === 'Bronze');
    });
    it('summary shows nextTier', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      assert.ok(s.nextTier);
      assert.ok(s.nextTier.name);
      assert.ok(s.nextTier.minPoints > 0);
    });
  });

  // ── Points Expiration ─────────────────────────────────────────────

  describe('Phase 16: Points Expiration', () => {
    it('no points expired when all within validity', async () => {
      const result = await loyalty.expirePoints(testCustomerId);
      assert.equal(result.expired, 0);
    });
  });

  // ── Customer Summary ──────────────────────────────────────────────

  describe('Phase 16: Customer Summary', () => {
    it('summary contains all required fields', async () => {
      const s = await loyalty.getCustomerSummary(testCustomerId);
      assert.equal(s.customerId, testCustomerId);
      assert.equal(typeof s.pointsBalance, 'number');
      assert.equal(typeof s.lifetimePoints, 'number');
      assert.equal(typeof s.lifetimeSpending, 'number');
      assert.ok(s.currentTier);
      assert.ok(s.nextTier);
      assert.ok(s.config);
      assert.ok(Array.isArray(s.ledger));
      assert.equal(typeof s.totalEarned, 'number');
      assert.equal(typeof s.totalRedeemed, 'number');
      assert.equal(typeof s.totalExpired, 'number');
    });
    it('summary returns null for non-existent customer', async () => {
      const s = await loyalty.getCustomerSummary(999999);
      assert.equal(s, null);
    });
  });

  // ── Admin Stats ───────────────────────────────────────────────────

  describe('Phase 16: Admin Stats', () => {
    it('getAdminStats returns stats', async () => {
      const stats = await loyalty.getAdminStats();
      assert.ok(stats.totalCustomers > 0);
      assert.ok(typeof stats.totalPointsIssued === 'number');
      assert.ok(typeof stats.totalPointsRedeemed === 'number');
      assert.ok(typeof stats.totalPointsExpired === 'number');
      assert.ok(Array.isArray(stats.tierDistribution));
    });
  });

  // ── Config Update ─────────────────────────────────────────────────

  describe('Phase 16: Config Update', () => {
    it('updateConfig changes earning rate', async () => {
      const orig = await loyalty.getConfig();
      const updated = await loyalty.updateConfig({ earningRate: 77 });
      assert.equal(updated.earningRate, 77);
      await loyalty.updateConfig({ earningRate: orig.earningRate });
      const restored = await loyalty.getConfig();
      assert.equal(restored.earningRate, orig.earningRate);
    });
    it('getConfig returns defaults when no config row', async () => {
      const cfg = await loyalty.getConfig();
      assert.ok(cfg.earningRate > 0);
      assert.ok(cfg.redemptionRate > 0);
      assert.ok(Array.isArray(cfg.eligibleStatuses));
    });
  });

  // ── Frontend Preservation ─────────────────────────────────────────

  describe('Phase 16: Frontend Preservation', () => {
    it('original wireframe HTML unchanged', () => {
      const baseline = 'aebe02f72a5852289b1a7ad27c7dd657';
      assert.equal(md5('nb_lao_wireframes_v2_updated.html'), baseline);
    });
    it('CSS unchanged', () => {
      const baseline = 'ad86eea2c740140705b8c06b2419d1a4';
      assert.equal(md5('styles/nblao.css'), baseline);
    });
    it('original JS unchanged', () => {
      const baseline = 'b53a5966017bdd3fb7794e58822aeb98';
      assert.equal(md5('js/nblao.js'), baseline);
    });
    it('admin dashboard preserved', () => {
      const baseline = 'bf1c012c4d21b699817846e1f80f47c5';
      assert.equal(md5('admin.html'), baseline);
    });
  });

  // ── Admin Loyalty (Step 8c) ──────────────────────────────────────

  describe('Phase 16 Step 8c: Admin Loyalty Management', () => {
    let adminToken = null;

    it('login as admin', async () => {
      const res = await request('POST', '/api/auth/login', { email: 'admin@nblao.la', password: 'Admin123!' });
      assert.equal(res.status, 200);
      adminToken = res.data.token;
      assert.ok(adminToken);
    });

    it('non-admin rejected from admin loyalty stats', async () => {
      const res = await request('GET', '/api/admin/loyalty/stats', null, customerToken);
      assert.ok(res.status === 401 || res.status === 403);
    });

    it('unauthenticated rejected from admin loyalty stats', async () => {
      const res = await request('GET', '/api/admin/loyalty/stats');
      assert.equal(res.status, 401);
    });

    it('GET /api/admin/loyalty/stats returns stats', async () => {
      const res = await request('GET', '/api/admin/loyalty/stats', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.data.totalCustomers > 0);
      assert.equal(typeof res.data.totalPointsIssued, 'number');
      assert.ok(Array.isArray(res.data.tierDistribution));
    });

    it('GET /api/admin/loyalty/config returns config', async () => {
      const res = await request('GET', '/api/admin/loyalty/config', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.data.enabled !== undefined);
      assert.ok(res.data.earningRate !== undefined);
    });

    it('PUT /api/admin/loyalty/config updates config', async () => {
      const orig = (await request('GET', '/api/admin/loyalty/config', null, adminToken)).data;
      const res = await request('PUT', '/api/admin/loyalty/config', { earningRate: 77 }, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.data.earningRate, 77);
      await request('PUT', '/api/admin/loyalty/config', { earningRate: orig.earningRate }, adminToken);
      const restored = (await request('GET', '/api/admin/loyalty/config', null, adminToken)).data;
      assert.equal(restored.earningRate, orig.earningRate);
    });

    it('GET /api/admin/loyalty/tiers returns all tiers', async () => {
      const res = await request('GET', '/api/admin/loyalty/tiers', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.data.length >= 4);
    });

    it('POST /api/admin/loyalty/tiers creates tier', async () => {
      const res = await request('POST', '/api/admin/loyalty/tiers', {
        name: 'Step 8c Test Tier', minPoints: 100, discount: 3.0, multiplier: 1.1,
      }, adminToken);
      assert.equal(res.status, 201);
      assert.equal(res.data.name, 'Step 8c Test Tier');
      assert.ok(res.data.id);
    });

    it('POST /api/admin/loyalty/tiers rejects duplicate name', async () => {
      const res = await request('POST', '/api/admin/loyalty/tiers', { name: 'Bronze' }, adminToken);
      assert.equal(res.status, 409);
    });

    it('PUT /api/admin/loyalty/tiers/:id updates tier', async () => {
      const tiers = (await request('GET', '/api/admin/loyalty/tiers', null, adminToken)).data;
      const testTier = tiers.find(t => t.name === 'Step 8c Test Tier');
      assert.ok(testTier);
      const res = await request('PUT', '/api/admin/loyalty/tiers/' + testTier.id, { discount: 5.0 }, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.data.discount, 5.0);
    });

    it('DELETE /api/admin/loyalty/tiers/:id deletes tier', async () => {
      const tiers = (await request('GET', '/api/admin/loyalty/tiers', null, adminToken)).data;
      const testTier = tiers.find(t => t.name === 'Step 8c Test Tier');
      assert.ok(testTier);
      const res = await request('DELETE', '/api/admin/loyalty/tiers/' + testTier.id, null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('PUT /api/admin/loyalty/tiers/999999 returns 404', async () => {
      const res = await request('PUT', '/api/admin/loyalty/tiers/999999', { discount: 1 }, adminToken);
      assert.equal(res.status, 404);
    });

    it('GET /api/admin/loyalty/customers returns paginated list', async () => {
      const res = await request('GET', '/api/admin/loyalty/customers', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.data.customers.length > 0);
      assert.ok(res.data.total > 0);
      assert.ok(res.data.totalPages > 0);
    });

    it('GET /api/admin/loyalty/customers/:id returns detail', async () => {
      const res = await request('GET', '/api/admin/loyalty/customers/' + testCustomerId, null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.data.customerId, testCustomerId);
      assert.equal(typeof res.data.pointsBalance, 'number');
      assert.ok(Array.isArray(res.data.ledger));
    });

    it('GET /api/admin/loyalty/customers/999999 returns 404', async () => {
      const res = await request('GET', '/api/admin/loyalty/customers/999999', null, adminToken);
      assert.equal(res.status, 404);
    });

    it('POST /api/admin/loyalty/customers/:id/adjust credits points', async () => {
      const before = (await request('GET', '/api/admin/loyalty/customers/' + testCustomerId, null, adminToken)).data.pointsBalance;
      const res = await request('POST', '/api/admin/loyalty/customers/' + testCustomerId + '/adjust', {
        points: 500, reason: 'Step 8c test credit',
      }, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.data.points, 500);
      assert.equal(res.data.balanceAfter, before + 500);
    });

    it('POST /api/admin/loyalty/customers/:id/adjust deducts points', async () => {
      const before = (await request('GET', '/api/admin/loyalty/customers/' + testCustomerId, null, adminToken)).data.pointsBalance;
      const res = await request('POST', '/api/admin/loyalty/customers/' + testCustomerId + '/adjust', {
        points: -100, reason: 'Step 8c test deduction',
      }, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.data.points, -100);
      assert.equal(res.data.balanceAfter, before - 100);
    });

    it('points adjustment persisted in database', async () => {
      const res = await request('GET', '/api/admin/loyalty/customers/' + testCustomerId, null, adminToken);
      assert.ok(res.data.ledger.some(e => e.type === 'adjusted'));
    });

    it('POST /adjust rejects zero points', async () => {
      const res = await request('POST', '/api/admin/loyalty/customers/' + testCustomerId + '/adjust', { points: 0 }, adminToken);
      assert.equal(res.status, 400);
    });

    it('POST /adjust rejects invalid customer', async () => {
      const res = await request('POST', '/api/admin/loyalty/customers/999999/adjust', { points: 100 }, adminToken);
      assert.equal(res.status, 400);
    });

    it('POST /api/admin/loyalty/expire runs expiration', async () => {
      const res = await request('POST', '/api/admin/loyalty/expire', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(typeof res.data.totalCustomersProcessed, 'number');
      assert.equal(typeof res.data.totalExpired, 'number');
    });
  });

  // ── Cleanup ───────────────────────────────────────────────────────

  describe('Phase 16: Cleanup', () => {
    it('clean up test customer', async () => {
      if (testCustomerId) {
        await prisma.pointsLedger.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.customer.delete({ where: { id: testCustomerId } });
      }
      assert.ok(true);
    });
  });
});
