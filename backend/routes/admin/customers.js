const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');
const { notifyAccountActivated, notifyAccountDeactivated } = require('../../services/notifications');

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
// CUSTOMERS (admin view)
// ═══════════════════════════════════════════════

// GET /api/admin/customers — list all customers
router.get('/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true, email: true, name: true, phone: true, company: true,
        role: true, active: true, createdAt: true,
        _count: { select: { orders: true, quotations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers.map(c => ({
      id: c.id, email: c.email, name: c.name, phone: c.phone,
      company: c.company, role: c.role, active: c.active,
      orders_count: c._count.orders,
      quotations_count: c._count.quotations,
      createdAt: c.createdAt,
    })));
  } catch (err) {
    console.error('Admin GET customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/admin/customers/:id — single customer with order/quotation history
router.get('/customers/:id', async (req, res) => {
  try {
    const custId = safeParseInt(req.params.id);
    if (!custId) return res.status(400).json({ error: 'Invalid customer ID' });
    const customer = await prisma.customer.findUnique({
      where: { id: custId },
      select: {
        id: true, email: true, name: true, phone: true, company: true,
        role: true, active: true, createdAt: true, updatedAt: true,
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Fetch order history
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch quotation history
    const quotations = await prisma.quotation.findMany({
      where: { customerId: customer.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      ...customer,
      orders: orders.map(o => ({
        id: o.id, order_number: o.orderNumber, status: o.status,
        total: o.items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
        items_count: o.items.length,
        createdAt: o.createdAt,
      })),
      quotations: quotations.map(q => ({
        id: q.id, quotation_number: q.quotationNumber, status: q.status,
        total: q.items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
        items_count: q.items.length,
        createdAt: q.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin GET customer error:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// PUT /api/admin/customers/:id — update role and/or active status
router.put('/customers/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const { role, active, name, phone, company } = req.body;

    // Prevent admin from deactivating themselves
    if (active === false && existing.role === 'admin') {
      const adminCount = await prisma.customer.count({ where: { role: 'admin', active: true } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot deactivate the last active admin' });
      }
    }

    const VALID_ROLES = ['customer', 'staff', 'admin'];
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Valid: ' + VALID_ROLES.join(', ') });
    }

    const oldActive = existing.active;
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
      },
      select: {
        id: true, email: true, name: true, phone: true, company: true,
        role: true, active: true,
      },
    });
    // Send account status notification (non-blocking)
    if (active !== undefined && active !== oldActive) {
      if (active === true) {
        notifyAccountActivated(updated).catch(() => {});
      } else {
        notifyAccountDeactivated(updated).catch(() => {});
      }
    }
    logAudit(req, 'update', 'customers', id, { role: updated.role, active: updated.active });
    res.json(updated);
  } catch (err) {
    console.error('Admin PUT customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

module.exports = router;
