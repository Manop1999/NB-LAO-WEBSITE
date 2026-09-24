// ══════════════════════════════════════════════════════
// COUPON CODES MANAGEMENT — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/coupons'))
// Endpoints: GET /coupons, POST /coupons, PUT /coupons/:id, DELETE /coupons/:id, GET /coupons/:id/stats
// ══════════════════════════════════════════════════════

const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { auditLog } = require('../../middleware/rbac');

const router = Router();

// ── Routes ───────────────────────────────────────────

// GET /coupons — list coupons with pagination
router.get('/coupons', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      prisma.couponCode.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.couponCode.count(),
    ]);
    res.json({ coupons, total, page, limit });
  } catch (err) {
    console.error('Admin list coupons error:', err);
    res.status(500).json({ error: 'Failed to list coupons' });
  }
});

// POST /coupons — create coupon
router.post('/coupons', async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxUses, expiresAt, isActive, description } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code is required' });
    }
    if (!type || !['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }
    if (typeof value !== 'number' || value <= 0) {
      return res.status(400).json({ error: 'Value must be a positive number' });
    }
    if (type === 'percentage' && value > 100) {
      return res.status(400).json({ error: 'Percentage value cannot exceed 100' });
    }

    const coupon = await prisma.couponCode.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value,
        minOrderAmount: minOrderAmount || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
        description: description || null,
      },
    });
    auditLog({ staffId: req.user.staffId, action: 'create', module: 'coupons', targetId: coupon.id, details: JSON.stringify({ code: coupon.code }) }).catch(() => {});
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Coupon code already exists' });
    console.error('Admin create coupon error:', err);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// PUT /coupons/:id — update coupon
router.put('/coupons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid coupon ID' });

    const coupon = await prisma.couponCode.findUnique({ where: { id } });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

    const { code, type, value, minOrderAmount, maxUses, expiresAt, isActive, description } = req.body;
    const data = {};
    if (code !== undefined) data.code = code.trim().toUpperCase();
    if (type !== undefined) {
      if (!['percentage', 'fixed'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
      data.type = type;
    }
    if (value !== undefined) {
      if (typeof value !== 'number' || value <= 0) return res.status(400).json({ error: 'Invalid value' });
      data.value = value;
    }
    if (minOrderAmount !== undefined) data.minOrderAmount = minOrderAmount || null;
    if (maxUses !== undefined) data.maxUses = maxUses || null;
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) data.isActive = isActive;
    if (description !== undefined) data.description = description || null;

    const updated = await prisma.couponCode.update({ where: { id }, data });
    auditLog({ staffId: req.user.staffId, action: 'update', module: 'coupons', targetId: id, details: JSON.stringify({ code: updated.code }) }).catch(() => {});
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Coupon code already exists' });
    console.error('Admin update coupon error:', err);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// DELETE /coupons/:id — delete coupon
router.delete('/coupons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid coupon ID' });

    const coupon = await prisma.couponCode.findUnique({ where: { id } });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

    await prisma.couponCode.delete({ where: { id } });
    auditLog({ staffId: req.user.staffId, action: 'delete', module: 'coupons', targetId: id, details: JSON.stringify({ code: coupon.code }) }).catch(() => {});
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    console.error('Admin delete coupon error:', err);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// GET /coupons/:id/stats — coupon usage statistics
router.get('/coupons/:id/stats', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid coupon ID' });

    const coupon = await prisma.couponCode.findUnique({ where: { id } });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

    const orderCount = await prisma.order.count({ where: { couponId: id } });
    const totalDiscount = await prisma.order.aggregate({ where: { couponId: id }, _sum: { discountApplied: true } });

    res.json({
      coupon,
      orders_using: orderCount,
      total_discount_applied: totalDiscount._sum.discountApplied || 0,
    });
  } catch (err) {
    console.error('Admin coupon stats error:', err);
    res.status(500).json({ error: 'Failed to get coupon stats' });
  }
});

module.exports = router;
