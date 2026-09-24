const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../lib/auth');
const { rateLimiters, safeParseInt, cacheControl } = require('../middleware/security');

const router = Router();

// GET /api/payment/methods — public: list active payment methods
router.get('/methods', rateLimiters.read, cacheControl(300), async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(methods.map(m => ({
      id: m.id,
      code: m.code,
      name_lo: m.nameLo,
      name_en: m.nameEn,
      description: m.description,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// POST /api/payment/submit — customer submits payment for an order
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { orderId, method, reference } = req.body;
    const oid = safeParseInt(orderId);
    if (!oid) return res.status(400).json({ error: 'Valid orderId is required' });
    if (!method || typeof method !== 'string') return res.status(400).json({ error: 'Payment method is required' });

    // Validate order belongs to customer
    const order = await prisma.order.findFirst({
      where: { id: oid, customerId: req.user.id },
      include: { payment: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment) return res.status(400).json({ error: 'Payment already exists for this order' });

    // Calculate order total
    const subtotal = order.items ? order.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0) : 0;
    const total = subtotal - (order.discountApplied || 0) + (order.shippingCost || 0);

    // Validate payment method exists
    const pm = await prisma.paymentMethod.findFirst({ where: { code: method, isActive: true } });
    if (!pm) return res.status(400).json({ error: 'Invalid payment method' });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: oid,
        method: method,
        amount: total,
        reference: reference || null,
        status: method === 'cod' ? 'pending' : 'pending',
      },
    });

    res.status(201).json({
      id: payment.id,
      order_id: payment.orderId,
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
      reference: payment.reference,
      created_at: payment.createdAt,
    });
  } catch (err) {
    console.error('Payment submission error:', err);
    res.status(500).json({ error: 'Failed to submit payment' });
  }
});

// GET /api/payment/status/:orderId — customer checks payment status
router.get('/status/:orderId', authMiddleware, async (req, res) => {
  try {
    const oid = safeParseInt(req.params.orderId);
    if (!oid) return res.status(400).json({ error: 'Invalid order ID' });

    const payment = await prisma.payment.findFirst({
      where: { orderId: oid, order: { customerId: req.user.id } },
    });
    if (!payment) return res.json({ status: 'none', message: 'No payment found' });

    res.json({
      id: payment.id,
      order_id: payment.orderId,
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
      reference: payment.reference,
      paid_at: payment.paidAt,
      created_at: payment.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

module.exports = router;