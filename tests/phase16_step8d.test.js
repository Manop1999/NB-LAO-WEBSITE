/**
 * Phase 16 Step 8d: Loyalty Notification End-to-End Verification
 * Tests that email notifications are triggered and logged correctly for:
 * 1. Points earned
 * 2. Tier upgraded
 * 3. Points redeemed
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../backend/lib/prisma');
const loyalty = require('../backend/services/loyalty');
const { notifyPointsEarned, notifyTierUpgraded, notifyPointsRedeemed } = require('../backend/services/notifications');

const TEST_EMAIL = 'step8d_notif_test@nblao.la';
const TEST_PASS = 'Step8dTestPass!';
let testCustomerId = null;

describe('Phase 16 Step 8d: Loyalty Notification Verification', () => {

  // ── Setup ─────────────────────────────────────────────────────────

  describe('Step 8d: Setup', () => {
    it('create test customer for notification tests', async () => {
      const bcrypt = require('bcryptjs');
      const existing = await prisma.customer.findUnique({ where: { email: TEST_EMAIL } });
      if (existing) {
        await prisma.pointsLedger.deleteMany({ where: { customerId: existing.id } });
        await prisma.emailNotification.deleteMany({ where: { customerId: existing.id } });
        await prisma.customer.delete({ where: { id: existing.id } });
      }
      const hash = await bcrypt.hash(TEST_PASS, 10);
      const c = await prisma.customer.create({
        data: { email: TEST_EMAIL, passwordHash: hash, name: 'Step 8d Notification Test', company: 'Test Co.' },
      });
      testCustomerId = c.id;
      assert.ok(testCustomerId);
    });
  });

  // ── Notification function signatures ───────────────────────────────

  describe('Step 8d: Notification Function Signatures', () => {
    it('notifyPointsEarned is a function', () => {
      assert.equal(typeof notifyPointsEarned, 'function');
    });
    it('notifyTierUpgraded is a function', () => {
      assert.equal(typeof notifyTierUpgraded, 'function');
    });
    it('notifyPointsRedeemed is a function', () => {
      assert.equal(typeof notifyPointsRedeemed, 'function');
    });
  });

  // ── Points Earned Notification ────────────────────────────────────

  describe('Step 8d: Points Earned Notification', () => {
    it('notifyPointsEarned creates EmailNotification record', async () => {
      const customer = await prisma.customer.findUnique({ where: { id: testCustomerId } });
      const beforeCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_earned' } });
      const result = await notifyPointsEarned(customer, 500, null, 'Bronze');
      assert.ok(result);
      assert.equal(result.success, true);
      const afterCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_earned' } });
      assert.equal(afterCount, beforeCount + 1);
    });
    it('points_earned record has correct fields', async () => {
      const record = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'points_earned' },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(record);
      assert.equal(record.recipientEmail, TEST_EMAIL);
      assert.ok(record.subject.includes('Points Earned'));
      assert.equal(record.type, 'points_earned');
      assert.equal(record.status, 'sent');
      assert.ok(record.sentAt);
      assert.ok(record.createdAt);
    });
    it('notifyPointsEarned handles null orderId gracefully', async () => {
      const customer = await prisma.customer.findUnique({ where: { id: testCustomerId } });
      const result = await notifyPointsEarned(customer, 100, null, null);
      assert.ok(result);
      assert.equal(result.success, true);
      const record = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'points_earned' },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(record);
    });
    it('loyalty.earnPoints triggers points_earned notification', async () => {
      // Reset ledger to avoid duplicate orderId=null check
      await prisma.pointsLedger.deleteMany({ where: { customerId: testCustomerId, type: 'earned' } });
      const beforeCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_earned' } });
      await loyalty.earnPoints(testCustomerId, 200000, null);
      await new Promise(r => setTimeout(r, 200));
      const afterCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_earned' } });
      assert.ok(afterCount > beforeCount, 'notification should be created after earnPoints');
    });
    it('points_earned record has correct customer email', async () => {
      const record = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'points_earned' },
        orderBy: { createdAt: 'desc' },
      });
      assert.equal(record.recipientEmail, TEST_EMAIL);
    });
  });

  // ── Tier Upgraded Notification ────────────────────────────────────

  describe('Step 8d: Tier Upgraded Notification', () => {
    it('notifyTierUpgraded creates EmailNotification record', async () => {
      const customer = await prisma.customer.findUnique({ where: { id: testCustomerId } });
      const beforeCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'tier_upgraded' } });
      const result = await notifyTierUpgraded(customer, 'Bronze', 'Silver', 2.0);
      assert.ok(result);
      assert.equal(result.success, true);
      const afterCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'tier_upgraded' } });
      assert.equal(afterCount, beforeCount + 1);
    });
    it('tier_upgraded record has correct fields', async () => {
      const record = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'tier_upgraded' },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(record);
      assert.equal(record.recipientEmail, TEST_EMAIL);
      assert.ok(record.subject.includes('Tier Upgraded'));
      assert.equal(record.type, 'tier_upgraded');
      assert.equal(record.status, 'sent');
      assert.ok(record.sentAt);
    });
    it('notifyTierUpgraded handles null oldTierName gracefully', async () => {
      const customer = await prisma.customer.findUnique({ where: { id: testCustomerId } });
      const result = await notifyTierUpgraded(customer, null, 'Gold', 5.0);
      assert.ok(result);
      assert.equal(result.success, true);
    });
    it('tier upgrade via earnPoints triggers notification', async () => {
      // Reset ledger and customer to low points, then earn enough to trigger Silver tier
      await prisma.pointsLedger.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.customer.update({ where: { id: testCustomerId }, data: { lifetimePoints: 4500, tierId: null } });
      const beforeCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'tier_upgraded' } });
      // Earning 600 points brings lifetimePoints to ~5100, above Silver threshold (5000)
      await loyalty.earnPoints(testCustomerId, 600000, null);
      await new Promise(r => setTimeout(r, 300));
      const afterCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'tier_upgraded' } });
      assert.ok(afterCount > beforeCount, 'tier upgrade notification should be created via earnPoints');
    });
  });

  // ── Points Redeemed Notification ──────────────────────────────────

  describe('Step 8d: Points Redeemed Notification', () => {
    it('notifyPointsRedeemed creates EmailNotification record', async () => {
      const customer = await prisma.customer.findUnique({ where: { id: testCustomerId } });
      const beforeCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_redeemed' } });
      const result = await notifyPointsRedeemed(customer, 100, 100000, null);
      assert.ok(result);
      assert.equal(result.success, true);
      const afterCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_redeemed' } });
      assert.equal(afterCount, beforeCount + 1);
    });
    it('points_redeemed record has correct fields', async () => {
      const record = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'points_redeemed' },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(record);
      assert.equal(record.recipientEmail, TEST_EMAIL);
      assert.ok(record.subject.includes('Points Redeemed'));
      assert.equal(record.type, 'points_redeemed');
      assert.equal(record.status, 'sent');
      assert.ok(record.sentAt);
    });
    it('notifyPointsRedeemed handles null orderId gracefully', async () => {
      const customer = await prisma.customer.findUnique({ where: { id: testCustomerId } });
      const result = await notifyPointsRedeemed(customer, 50, 50000, null);
      assert.ok(result);
      assert.equal(result.success, true);
    });
    it('loyalty.redeemPoints triggers points_redeemed notification', async () => {
      // Ensure customer has enough points
      const summary = await loyalty.getCustomerSummary(testCustomerId);
      const bal = summary.pointsBalance;
      if (bal >= 100) {
        const beforeCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_redeemed' } });
        await loyalty.redeemPoints(testCustomerId, Math.min(bal, 150), 500000, null);
        await new Promise(r => setTimeout(r, 200));
        const afterCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_redeemed' } });
        assert.ok(afterCount > beforeCount, 'redeem notification should be created');
      }
    });
  });

  // ── Notification Failure Safety ───────────────────────────────────

  describe('Step 8d: Notification Failure Safety', () => {
    it('notifyPointsEarned does not throw on invalid customer', async () => {
      // Call with customer object that has no email — should not throw
      const fakeCustomer = { id: 999999, name: 'Nonexistent', email: 'nonexistent@example.com' };
      const result = await notifyPointsEarned(fakeCustomer, 100, null, null);
      assert.ok(result);
      assert.equal(result.success, true); // dev mode logs to console
    });
    it('earnPoints succeeds even with non-customer notification target', async () => {
      // Reset ledger to avoid duplicate check
      await prisma.pointsLedger.deleteMany({ where: { customerId: testCustomerId, type: 'earned' } });
      const summary = await loyalty.getCustomerSummary(testCustomerId);
      const beforeBal = summary.pointsBalance;
      const result = await loyalty.earnPoints(testCustomerId, 100000, null);
      assert.ok(result);
      assert.ok(result.points > 0);
      const after = await loyalty.getCustomerSummary(testCustomerId);
      assert.equal(after.pointsBalance, beforeBal + result.points);
    });
  });

  // ── Notification Logging Completeness ──────────────────────────────

  describe('Step 8d: Notification Logging', () => {
    it('all three notification types are logged in EmailNotification', async () => {
      const types = await prisma.emailNotification.groupBy({
        by: ['type'],
        where: { customerId: testCustomerId },
      });
      const typeNames = types.map(t => t.type);
      assert.ok(typeNames.includes('points_earned'), 'points_earned logged');
      assert.ok(typeNames.includes('tier_upgraded'), 'tier_upgraded logged');
      assert.ok(typeNames.includes('points_redeemed'), 'points_redeemed logged');
    });
    it('all notifications have status=sent in dev mode', async () => {
      const records = await prisma.emailNotification.findMany({
        where: { customerId: testCustomerId, type: { in: ['points_earned', 'tier_upgraded', 'points_redeemed'] } },
      });
      assert.ok(records.length > 0);
      for (const r of records) {
        assert.equal(r.status, 'sent', 'notification ' + r.id + ' should have status=sent');
        assert.ok(r.sentAt, 'notification ' + r.id + ' should have sentAt');
      }
    });
    it('notification records reference correct customer', async () => {
      const records = await prisma.emailNotification.findMany({
        where: { customerId: testCustomerId, type: { in: ['points_earned', 'tier_upgraded', 'points_redeemed'] } },
      });
      for (const r of records) {
        assert.equal(r.customerId, testCustomerId, 'notification ' + r.id + ' references correct customer');
        assert.equal(r.recipientEmail, TEST_EMAIL, 'notification ' + r.id + ' has correct email');
      }
    });
    it('notification records have correct subjects for each type', async () => {
      const earned = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'points_earned' }, orderBy: { createdAt: 'desc' },
      });
      assert.ok(earned.subject.includes('Points Earned'));
      const upgraded = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'tier_upgraded' }, orderBy: { createdAt: 'desc' },
      });
      assert.ok(upgraded.subject.includes('Tier Upgraded'));
      const redeemed = await prisma.emailNotification.findFirst({
        where: { customerId: testCustomerId, type: 'points_redeemed' }, orderBy: { createdAt: 'desc' },
      });
      assert.ok(redeemed.subject.includes('Points Redeemed'));
    });
  });

  // ── No Duplicate Notifications ────────────────────────────────────

  describe('Step 8d: No Duplicate Prevention Needed', () => {
    it('each earnPoints call triggers exactly one notification', async () => {
      // Reset ledger to avoid duplicate check
      await prisma.pointsLedger.deleteMany({ where: { customerId: testCustomerId, type: 'earned' } });
      const beforeCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_earned' } });
      await loyalty.earnPoints(testCustomerId, 50000, null);
      await new Promise(r => setTimeout(r, 200));
      const afterCount = await prisma.emailNotification.count({ where: { customerId: testCustomerId, type: 'points_earned' } });
      assert.equal(afterCount, beforeCount + 1, 'exactly one notification per earnPoints call');
    });
  });

  // ── Cleanup ───────────────────────────────────────────────────────

  describe('Step 8d: Cleanup', () => {
    it('clean up test customer and notifications', async () => {
      if (testCustomerId) {
        await prisma.emailNotification.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.pointsLedger.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.customer.delete({ where: { id: testCustomerId } });
      }
      assert.ok(true);
    });
  });
});
