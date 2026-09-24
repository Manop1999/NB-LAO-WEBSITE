const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../lib/auth');

// POST /api/coupons/validate — validate coupon and return discount info
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { code, orderSubtotal } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = await prisma.couponCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    // Check active
    if (!coupon.isActive) {
      return res.status(400).json({ error: 'This coupon is no longer active' });
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'This coupon has expired' });
    }

    // Check max uses
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: 'This coupon has reached its usage limit' });
    }

    // Check min order amount
    const subtotal = parseInt(orderSubtotal) || 0;
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        error: `Minimum order amount is ${coupon.minOrderAmount.toLocaleString()} KIP`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = Math.floor(subtotal * coupon.value / 100);
    } else {
      discountAmount = Math.min(coupon.value, subtotal);
    }

    res.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount_amount: discountAmount,
      min_order_amount: coupon.minOrderAmount,
      description: coupon.description,
    });
  } catch (err) {
    console.error('POST /api/coupons/validate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
