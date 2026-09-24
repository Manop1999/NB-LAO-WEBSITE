const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../lib/auth');
const { notifyOrderCreated, notifyOrderStatusChanged } = require('../services/notifications');
const { safeParseInt } = require('../middleware/security');
const loyaltyService = require('../services/loyalty');

const router = Router();
router.use(authMiddleware);

// Canonical order lifecycle — must stay in sync with the Admin Portal status list
// (admin.html order status select).  Filters are validated against this list.
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// Parse a YYYY-MM-DD query value into a local day boundary (null when absent/invalid).
function parseDay(value, endOfDay) {
  const s = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + (endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'));
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/orders — list customer's orders (pagination + optional status/date/search filters)
// Filters are additive and read-only; they never widen the customerId scope.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = { customerId: req.user.id };
    const status = String(req.query.status || '').trim();
    if (status && ORDER_STATUSES.includes(status)) where.status = status;
    const q = String(req.query.q || '').trim();
    if (q) where.orderNumber = { contains: q };
    const from = parseDay(req.query.from, false);
    const to = parseDay(req.query.to, true);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, coupon: { select: { code: true } }, deliveryAddress: true, shippingCompany: true, shippingBranch: true },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map((o) => {
        const subtotal = o.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
        return {
          id: o.id,
          order_number: o.orderNumber,
          status: o.status,
          subtotal,
          discount_applied: o.discountApplied || 0,
          points_earned: o.pointsEarned || 0,
          points_redeemed: o.pointsRedeemed || 0,
          coupon_code: o.coupon ? o.coupon.code : null,
          payment_method: o.paymentMethod || null,
          total: subtotal - (o.discountApplied || 0),
          createdAt: o.createdAt,
        };
      }),
      total, page, limit,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/summary — status counts for the authenticated customer's dashboard.
// Must be declared before '/:id' so 'summary' is not captured as an ID.
router.get('/summary', async (req, res) => {
  try {
    const group = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: { customerId: req.user.id },
    });
    const byStatus = {};
    let totalOrders = 0;
    for (const g of group) {
      byStatus[g.status] = g._count;
      totalOrders += g._count;
    }
    res.json({ total: totalOrders, byStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order summary' });
  }
});

// GET /api/orders/:id — single order with items
router.get('/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order ID' });
    const o = await prisma.order.findFirst({
      where: { id, customerId: req.user.id },
      include: { items: true, coupon: { select: { code: true } }, deliveryAddress: true, shippingCompany: true, shippingBranch: true },
    });
    if (!o) return res.status(404).json({ error: 'Order not found' });

    const subtotal = o.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
    // Include delivery/shipping info
    const deliveryAddress = o.deliveryAddress ? {
      label: o.deliveryAddress.label,
      recipient_name: o.deliveryAddress.recipientName,
      phone: o.deliveryAddress.phone,
      address: o.deliveryAddress.address,
      district: o.deliveryAddress.district,
      province: o.deliveryAddress.province,
      postal_code: o.deliveryAddress.postalCode,
    } : null;
    const shippingCompany = o.shippingCompany ? { name: o.shippingCompany.name } : null;
    const shippingBranch = o.shippingBranch ? { name: o.shippingBranch.name, address: o.shippingBranch.address } : null;
    res.json({
      id: o.id,
      order_number: o.orderNumber,
      status: o.status,
      subtotal,
      discount_applied: o.discountApplied || 0,
      shipping_cost: o.shippingCost || 0,
      shipping_method: o.shippingMethod || null,
      payment_method: o.paymentMethod || null,
      delivery_address: deliveryAddress,
      shipping_company: shippingCompany,
      shipping_branch: shippingBranch,
      points_earned: o.pointsEarned || 0,
      points_redeemed: o.pointsRedeemed || 0,
      coupon_code: o.coupon ? o.coupon.code : null,
      total: subtotal - (o.discountApplied || 0),
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        product_id: i.productId,
        product_name: i.productName,
        unit_price: i.unitPrice,
        quantity: i.quantity,
        line_total: (i.unitPrice || 0) * i.quantity,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// GET /api/orders/:id/history — order status history for customer
router.get('/:id/history', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order ID' });
    const o = await prisma.order.findFirst({ where: { id, customerId: req.user.id }, select: { id: true } });
    if (!o) return res.status(404).json({ error: 'Order not found' });
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(history.map(h => ({
      id: h.id,
      from_status: h.fromStatus,
      to_status: h.toStatus,
      notes: h.notes,
      staff_name: h.staffName,
      position_name: h.positionName,
      createdAt: h.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

// POST /api/orders — create order from cart, clear cart
router.post('/', async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { customerId: req.user.id },
      include: { items: { include: { product: { include: { localizations: true } } } } },
    });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock for all items
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${item.product.sku}. Available: ${item.product.stock}, requested: ${item.quantity}`,
        });
      }
    }

    // Calculate total for loyalty
    let orderTotal = 0;
    for (const item of cart.items) {
      orderTotal += (item.product.price || 0) * item.quantity;
    }

    // Apply tier discount
    let tierDiscount = 0;
    const customer = await prisma.customer.findUnique({ where: { id: req.user.id } });
    if (customer && customer.tierId) {
      const tier = await prisma.loyaltyTier.findUnique({ where: { id: customer.tierId } }).catch(() => null);
      if (tier && tier.discount > 0) {
        tierDiscount = Math.floor(orderTotal * (tier.discount / 100));
      }
    }

    // Apply coupon discount (server-side validation)
    let couponId = null;
    let couponDiscount = 0;
    let couponMaxUses = null;
    const couponCode = req.body.couponCode;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const coupon = await prisma.couponCode.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
      if (!coupon) return res.status(400).json({ error: 'Invalid coupon code' });
      if (!coupon.isActive) return res.status(400).json({ error: 'Coupon is not active' });
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon has expired' });
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Coupon usage limit reached' });
      const subtotalAfterTier = orderTotal - tierDiscount;
      if (coupon.minOrderAmount && subtotalAfterTier < coupon.minOrderAmount) {
        return res.status(400).json({ error: `Minimum order amount is ${coupon.minOrderAmount.toLocaleString()} KIP` });
      }
      if (coupon.type === 'percentage') {
        couponDiscount = Math.floor(subtotalAfterTier * coupon.value / 100);
      } else {
        couponDiscount = Math.min(coupon.value, subtotalAfterTier);
      }
      couponId = coupon.id;
      couponMaxUses = coupon.maxUses;
    }

    const totalDiscount = tierDiscount + couponDiscount;

    // Create order with items, decrement stock, clear cart — all atomic
    const order = await prisma.$transaction(async (tx) => {
      // Atomic coupon use increment
      if (couponId) {
        const updated = await tx.couponCode.updateMany({
          where: { id: couponId, usedCount: { lt: couponMaxUses || 999999 } },
          data: { usedCount: { increment: 1 } },
        });
        if (updated.count === 0) throw new Error('COUPON_EXHAUSTED');
      }

      // Generate order number atomically using max existing number
      const lastOrder = await tx.order.findFirst({ orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } });
      const nextNum = lastOrder ? parseInt(lastOrder.orderNumber.replace('ORD-', '')) + 1 : 1;
      const orderNumber = 'ORD-' + String(nextNum).padStart(5, '0');

      // Accept delivery/shipping info
      const deliveryAddressId = safeParseInt(req.body.deliveryAddressId);
      const shippingCompanyId = safeParseInt(req.body.shippingCompanyId);
      const shippingBranchId = safeParseInt(req.body.shippingBranchId);
      const shippingCost = Math.max(0, safeParseInt(req.body.shippingCost) || 0);
      const shippingMethod = req.body.shippingMethod || null;
      const paymentMethod = req.body.paymentMethod || null;

      const o = await tx.order.create({
        data: {
          customerId: req.user.id,
          orderNumber,
          couponId,
          discountApplied: totalDiscount,
          deliveryAddressId: deliveryAddressId || null,
          shippingCompanyId: shippingCompanyId || null,
          shippingBranchId: shippingBranchId || null,
          shippingCost,
          shippingMethod,
          paymentMethod,
        },
      });

      for (const item of cart.items) {
        const loc = item.product.localizations.find((l) => l.locale === 'lo') || item.product.localizations[0];
        await tx.orderItem.create({
          data: {
            orderId: o.id,
            productId: item.productId,
            productName: loc ? loc.name : '',
            unitPrice: item.product.price,
            quantity: item.quantity,
          },
        });

        // Decrement stock atomically
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return o;
    });

    // Return with items
    const result = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, coupon: { select: { code: true } } },
    });

    // Apply loyalty after order creation (with real orderId)
    let pointsRedeemed = 0;
    let loyaltyDiscount = 0;
    const redeemPoints = req.body.redeemPoints ? safeParseInt(req.body.redeemPoints) : 0;
    if (redeemPoints > 0) {
      const redResult = await loyaltyService.redeemPoints(req.user.id, redeemPoints, orderTotal, order.id);
      if (!redResult.error) {
        pointsRedeemed = redResult.pointsRedeemed;
        loyaltyDiscount = redResult.discountKip;
        await prisma.order.update({
          where: { id: order.id },
          data: { pointsRedeemed, discountApplied: totalDiscount + loyaltyDiscount },
        });
      }
    }

    // Award points for this order
    loyaltyService.earnPoints(req.user.id, orderTotal, order.id).catch(() => {});
    // Update customer lifetime spending
    prisma.customer.update({ where: { id: req.user.id }, data: { lifetimeSpending: { increment: orderTotal } } }).catch(() => {});

    // Send order confirmation email (non-blocking)
    if (customer && customer.email) {
      notifyOrderCreated(customer, result, result.items.map(i => ({
        name: i.productName, price: i.unitPrice, quantity: i.quantity,
      }))).catch(() => {});
    }

    const subtotal = result.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
    const finalDiscount = totalDiscount + loyaltyDiscount;

    res.status(201).json({
      id: result.id,
      order_number: result.orderNumber,
      status: result.status,
      payment_method: result.paymentMethod || null,
      subtotal,
      tier_discount: tierDiscount,
      coupon_discount: couponDiscount,
      coupon_code: result.coupon ? result.coupon.code : null,
      loyalty_discount: loyaltyDiscount,
      points_redeemed: pointsRedeemed,
      points_earned: result.pointsEarned || 0,
      discount_applied: finalDiscount,
      total: subtotal - finalDiscount,
      items: result.items.map((i) => ({
        product_id: i.productId,
        product_name: i.productName,
        unit_price: i.unitPrice,
        quantity: i.quantity,
        line_total: (i.unitPrice || 0) * i.quantity,
      })),
    });
  } catch (err) {
    if (err.message === 'COUPON_EXHAUSTED') {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH /api/orders/:id/cancel — customer cancels a pending order
router.patch('/:id/cancel', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order ID' });
    const existing = await prisma.order.findFirst({
      where: { id, customerId: req.user.id },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    // Update status, restore stock, reverse loyalty points — all atomic
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({ where: { id }, data: { status: 'cancelled' } });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: { orderId: id, fromStatus: 'pending', toStatus: 'cancelled', notes: 'Cancelled by customer' },
      });

      // Restore stock for each item
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    // Reverse loyalty points (non-blocking)
    const orderTotal = existing.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
    loyaltyService.handleOrderStatusChange(id, 'cancelled', req.user.id, orderTotal).catch(() => {});

    res.json({ id: existing.id, order_number: existing.orderNumber, status: 'cancelled' });
  } catch (err) {
    console.error('Order cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
