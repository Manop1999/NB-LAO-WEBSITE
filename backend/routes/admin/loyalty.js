const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const loyaltyService = require('../../services/loyalty');

const router = Router();

// ═══════════════════════════════════════════════
// LOYALTY MANAGEMENT
// ═══════════════════════════════════════════════

// GET /api/admin/loyalty/stats — loyalty statistics
router.get('/loyalty/stats', async (req, res) => {
  try {
    const stats = await loyaltyService.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Admin loyalty stats error:', err);
    res.status(500).json({ error: 'Failed to fetch loyalty stats' });
  }
});

// GET /api/admin/loyalty/config — get loyalty configuration
router.get('/loyalty/config', async (req, res) => {
  try {
    const config = await loyaltyService.getConfig();
    res.json(config);
  } catch (err) {
    console.error('Admin loyalty config error:', err);
    res.status(500).json({ error: 'Failed to fetch loyalty config' });
  }
});

// PUT /api/admin/loyalty/config — update loyalty configuration
router.put('/loyalty/config', async (req, res) => {
  try {
    const updated = await loyaltyService.updateConfig(req.body, req.staffRecord?.id);
    res.json(updated);
  } catch (err) {
    console.error('Admin loyalty config update error:', err);
    res.status(500).json({ error: 'Failed to update loyalty config' });
  }
});

// GET /api/admin/loyalty/tiers — list all tiers
router.get('/loyalty/tiers', async (req, res) => {
  try {
    const tiers = await loyaltyService.getTiers();
    res.json(tiers);
  } catch (err) {
    console.error('Admin loyalty tiers error:', err);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// POST /api/admin/loyalty/tiers — create tier
router.post('/loyalty/tiers', async (req, res) => {
  try {
    const { name, minPoints, minSpending, discount, multiplier, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const existing = await prisma.loyaltyTier.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: 'Tier name already exists' });
    const tier = await prisma.loyaltyTier.create({
      data: {
        name,
        minPoints: minPoints || 0,
        minSpending: minSpending || 0,
        discount: discount || 0,
        multiplier: multiplier || 1.0,
        sortOrder: sortOrder || 0,
      },
    });
    res.status(201).json(tier);
  } catch (err) {
    console.error('Admin POST loyalty tier error:', err);
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// PUT /api/admin/loyalty/tiers/:id — update tier
router.put('/loyalty/tiers/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.loyaltyTier.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Tier not found' });
    const { name, minPoints, minSpending, discount, multiplier, isActive, sortOrder } = req.body;
    const tier = await prisma.loyaltyTier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(minPoints !== undefined && { minPoints }),
        ...(minSpending !== undefined && { minSpending }),
        ...(discount !== undefined && { discount }),
        ...(multiplier !== undefined && { multiplier }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    res.json(tier);
  } catch (err) {
    console.error('Admin PUT loyalty tier error:', err);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// DELETE /api/admin/loyalty/tiers/:id — delete tier (non-system only)
router.delete('/loyalty/tiers/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.loyaltyTier.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Tier not found' });
    // Check if any customers use this tier
    const customersWithTier = await prisma.customer.count({ where: { tierId: id } });
    if (customersWithTier > 0) {
      return res.status(400).json({ error: 'Cannot delete tier with customers assigned. Reassign them first.' });
    }
    await prisma.loyaltyTier.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin DELETE loyalty tier error:', err);
    res.status(500).json({ error: 'Failed to delete tier' });
  }
});

// GET /api/admin/loyalty/customers — list customers with points info
router.get('/loyalty/customers', async (req, res) => {
  try {
    const page = safeParseInt(req.query.page) || 1;
    const limit = Math.min(safeParseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: { role: 'customer' },
        select: {
          id: true, name: true, email: true, company: true,
          pointsBalance: true, lifetimePoints: true, lifetimeSpending: true, tierId: true,
        },
        orderBy: { lifetimePoints: 'desc' },
        skip, take: limit,
      }),
      prisma.customer.count({ where: { role: 'customer' } }),
    ]);
    const tiers = await prisma.loyaltyTier.findMany();
    const tierMap = {};
    tiers.forEach(t => { tierMap[t.id] = t.name; });
    res.json({
      customers: customers.map(c => ({ ...c, tier: tierMap[c.tierId] || 'Bronze' })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Admin loyalty customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/admin/loyalty/customers/:id — get customer loyalty detail + ledger
router.get('/loyalty/customers/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const summary = await loyaltyService.getCustomerSummary(id);
    if (!summary) return res.status(404).json({ error: 'Customer not found' });
    res.json(summary);
  } catch (err) {
    console.error('Admin loyalty customer detail error:', err);
    res.status(500).json({ error: 'Failed to fetch customer loyalty detail' });
  }
});

// POST /api/admin/loyalty/customers/:id/adjust — manually adjust points
router.post('/loyalty/customers/:id/adjust', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const rawPoints = Number(req.body.points);
    const points = Number.isInteger(rawPoints) ? rawPoints : null;
    if (points === null || points === 0) return res.status(400).json({ error: 'Points must be a non-zero integer' });
    const reason = req.body.reason || 'Manual adjustment by admin';
    const result = await loyaltyService.adjustPoints(id, points, reason, req.staffRecord?.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error('Admin loyalty adjust error:', err);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
});

// POST /api/admin/loyalty/expire — run points expiration
router.post('/loyalty/expire', async (req, res) => {
  try {
    // Get all customers with active points
    const customers = await prisma.customer.findMany({ where: { pointsBalance: { gt: 0 } } });
    let totalExpired = 0;
    for (const c of customers) {
      const result = await loyaltyService.expirePoints(c.id);
      totalExpired += result.expired;
    }
    res.json({ totalCustomersProcessed: customers.length, totalExpired });
  } catch (err) {
    console.error('Admin loyalty expire error:', err);
    res.status(500).json({ error: 'Failed to run expiration' });
  }
});

module.exports = router;
