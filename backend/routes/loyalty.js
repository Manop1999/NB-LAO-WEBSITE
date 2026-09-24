/**
 * Loyalty Routes — Customer-facing API
 * Phase 16: Customer Points & Loyalty
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../lib/auth');
const loyalty = require('../services/loyalty');

// ─── GET /api/loyalty/summary ──────────────────────────────────────
// Returns full loyalty summary for the authenticated customer
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const summary = await loyalty.getCustomerSummary(req.user.id);
    if (!summary) return res.status(404).json({ error: 'Customer not found' });
    res.json(summary);
  } catch (err) {
    console.error('Loyalty summary error:', err);
    res.status(500).json({ error: 'Failed to fetch loyalty summary' });
  }
});

// ─── GET /api/loyalty/tiers ────────────────────────────────────────
// Returns all active loyalty tiers
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await loyalty.getActiveTiers();
    res.json(tiers);
  } catch (err) {
    console.error('Loyalty tiers error:', err);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// ─── GET /api/loyalty/config ───────────────────────────────────────
// Returns public loyalty config (earning rate, redemption rate, etc.)
router.get('/config', async (req, res) => {
  try {
    const config = await loyalty.getConfig();
    res.json({
      enabled: config.enabled,
      earningRate: config.earningRate,
      redemptionRate: config.redemptionRate,
      minRedeem: config.minRedeem,
    });
  } catch (err) {
    console.error('Loyalty config error:', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// ─── GET /api/loyalty/leaderboard ──────────────────────────────────
// Returns top customers by lifetime points
router.get('/leaderboard', async (req, res) => {
  try {
    const prisma = require('../lib/prisma');
    const top = await prisma.customer.findMany({
      select: { id: true, name: true, lifetimePoints: true, tierId: true },
      orderBy: { lifetimePoints: 'desc' },
      take: 10,
    });
    const tiers = await prisma.loyaltyTier.findMany();
    const tierMap = {};
    tiers.forEach(t => { tierMap[t.id] = t.name; });
    res.json(top.map((c, i) => ({
      rank: i + 1,
      name: c.name,
      lifetimePoints: c.lifetimePoints,
      tier: tierMap[c.tierId] || 'Bronze',
    })));
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
