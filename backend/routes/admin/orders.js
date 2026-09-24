const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');
const { notifyOrderStatusChanged } = require('../../services/notifications');
const loyaltyService = require('../../services/loyalty');

const router = Router();

// Helper: extract audit context from request
function auditCtx(req) {
  return { staffId: req.user?.staffId || null, customerId: req.user?.id || null, ipAddress: req.ip || null };
}

// Helper: non-blocking audit write
function logAudit(req, action, module, targetId, details) {
  auditLog({ ...auditCtx(req), action, module, targetId: targetId || null, details: details ? JSON.stringify(details) : null }).catch(() => {});
}

// ═══════════════════════════════════════════════
// ORDERS (admin view)
// ═══════════════════════════════════════════════

var VALID_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// GET /api/admin/orders — list all orders across all customers
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: { select: { id: true, name: true, email: true, company: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders.map(o => ({
      id: o.id,
      order_number: o.orderNumber,
      status: o.status,
      notes: o.notes,
      customer: o.customer,
      items_count: o.items.length,
      total: o.items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
      payment_method: o.paymentMethod || null,
      createdAt: o.createdAt,
    })));
  } catch (err) {
    console.error('Admin GET orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/admin/orders/:id — single order with items + customer
router.get('/orders/:id', async (req, res) => {
  try {
    const oid = safeParseInt(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid order ID' });
    const order = await prisma.order.findUnique({
      where: { id: oid },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        items: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({
      id: order.id,
      order_number: order.orderNumber,
      status: order.status,
      notes: order.notes,
      customer: order.customer,
      items: order.items.map(i => ({
        product_id: i.productId,
        product_name: i.productName,
        unit_price: i.unitPrice,
        quantity: i.quantity,
        subtotal: (i.unitPrice || 0) * i.quantity,
      })),
      total: order.items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
      payment_method: order.paymentMethod || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (err) {
    console.error('Admin GET order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/admin/orders/:id — update status and/or notes
router.put('/orders/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status, notes, quoted_amount } = req.body;
    if (status !== undefined && !VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Valid: ' + VALID_ORDER_STATUSES.join(', ') });
    }

    const oldStatus = existing.status;
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(quoted_amount !== undefined && { quotedAmount: quoted_amount }),
      },
    });
    // Send status change notification and handle loyalty points (non-blocking)
    if (status && status !== oldStatus) {
      const customer = await prisma.customer.findUnique({ where: { id: existing.customerId } });
      const orderWithItems = await prisma.order.findUnique({ where: { id }, include: { items: true } });
      if (customer && customer.email) {
        notifyOrderStatusChanged(customer, orderWithItems, oldStatus, status, orderWithItems.items.map(i => ({
          name: i.productName, price: i.unitPrice, quantity: i.quantity,
        }))).catch(() => {});
      }
      // Handle loyalty points on status change
      // Calculate order total from items
      const orderItems = await prisma.orderItem.findMany({ where: { orderId: id } });
      const orderTotal = orderItems.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);
      loyaltyService.handleOrderStatusChange(id, status, existing.customerId, orderTotal).catch(() => {});
    }
    logAudit(req, 'status_change', 'orders', id, { from: oldStatus, to: updated.status });
    res.json({
      id: updated.id,
      order_number: updated.orderNumber,
      status: updated.status,
      notes: updated.notes,
    });
  } catch (err) {
    console.error('Admin PUT order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
