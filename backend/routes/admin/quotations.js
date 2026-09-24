const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');
const { notifyQuotationStatusChanged } = require('../../services/notifications');

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
// QUOTATIONS (admin view)
// ═══════════════════════════════════════════════

var VALID_QUOTATION_STATUSES = ['pending', 'reviewed', 'quoted', 'accepted', 'rejected'];

// GET /api/admin/quotations — list all quotations across all customers
router.get('/quotations', async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        customer: { select: { id: true, name: true, email: true, company: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quotations.map(q => ({
      id: q.id,
      quotation_number: q.quotationNumber,
      status: q.status,
      notes: q.notes,
      customer: q.customer,
      items_count: q.items.length,
      total: q.items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
      createdAt: q.createdAt,
    })));
  } catch (err) {
    console.error('Admin GET quotations error:', err);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

// GET /api/admin/quotations/:id — single quotation with items + customer
router.get('/quotations/:id', async (req, res) => {
  try {
    const qid = safeParseInt(req.params.id);
    if (!qid) return res.status(400).json({ error: 'Invalid quotation ID' });
    const quotation = await prisma.quotation.findUnique({
      where: { id: qid },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        items: true,
      },
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json({
      id: quotation.id,
      quotation_number: quotation.quotationNumber,
      status: quotation.status,
      notes: quotation.notes,
      customer: quotation.customer,
      items: quotation.items.map(i => ({
        product_id: i.productId,
        product_name: i.productName,
        unit_price: i.unitPrice,
        quantity: i.quantity,
        subtotal: (i.unitPrice || 0) * i.quantity,
      })),
      total: quotation.items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    });
  } catch (err) {
    console.error('Admin GET quotation error:', err);
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

// PUT /api/admin/quotations/:id — update status and/or notes
router.put('/quotations/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });

    const { status, notes } = req.body;
    if (status !== undefined && !VALID_QUOTATION_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Valid: ' + VALID_QUOTATION_STATUSES.join(', ') });
    }

    const oldStatus = existing.status;
    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });
    // Send status change notification (non-blocking)
    if (status && status !== oldStatus) {
      const customer = await prisma.customer.findUnique({ where: { id: existing.customerId } });
      const quotationWithItems = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
      if (customer && customer.email) {
        notifyQuotationStatusChanged(customer, quotationWithItems, oldStatus, status, quotationWithItems.items.map(i => ({
          name: i.productName, price: i.unitPrice, quantity: i.quantity,
        }))).catch(() => {});
      }
    }
    logAudit(req, 'status_change', 'quotations', id, { from: oldStatus, to: updated.status });
    res.json({
      id: updated.id,
      quotation_number: updated.quotationNumber,
      status: updated.status,
      notes: updated.notes,
    });
  } catch (err) {
    console.error('Admin PUT quotation error:', err);
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

module.exports = router;
