const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../lib/auth');
const { notifyQuotationCreated, notifyQuotationStatusChanged } = require('../services/notifications');
const { safeParseInt } = require('../middleware/security');

const router = Router();
router.use(authMiddleware);

// Canonical quotation lifecycle (mirrors the Admin Portal status select).
// Filters are always validated against this list — the customer scope is never widened.
const QUOTATION_STATUSES = ['pending', 'reviewed', 'quoted', 'accepted', 'rejected', 'cancelled'];

// Parse a YYYY-MM-DD query value into a local day boundary (null when absent/invalid).
function parseDay(value, endOfDay) {
  const s = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + (endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'));
  return isNaN(d.getTime()) ? null : d;
}

// Build the customer-scoped where-clause shared by the list and summary endpoints.
function quotationWhere(req) {
  const where = { customerId: req.user.id };
  const status = String(req.query.status || '').trim();
  if (status && QUOTATION_STATUSES.includes(status)) where.status = status;
  const q = String(req.query.q || '').trim();
  if (q) where.quotationNumber = { contains: q };
  const from = parseDay(req.query.from, false);
  const to = parseDay(req.query.to, true);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  return where;
}

// GET /api/quotations — list customer's quotations.
// Optional, additive query params: status, q (quotation number), from, to, page, limit.
// Without page/limit the legacy bare-array body is preserved (existing clients/tests).
router.get('/', async (req, res) => {
  try {
    const where = quotationWhere(req);
    const wantsPaging = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const select = { id: true, quotationNumber: true, status: true, quotedAmount: true, createdAt: true };
    const [rows, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select,
        ...(wantsPaging ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
      wantsPaging ? prisma.quotation.count({ where }) : Promise.resolve(null),
    ]);

    const mapped = rows.map((q) => ({
      id: q.id,
      quotation_number: q.quotationNumber,
      status: q.status,
      quoted_amount: q.quotedAmount,
      createdAt: q.createdAt,
    }));

    if (wantsPaging) return res.json({ quotations: mapped, total: total == null ? mapped.length : total, page, limit });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

// GET /api/quotations/summary — per-status counts for the authenticated customer.
// Declared before '/:id' so 'summary' is never captured as an ID.
router.get('/summary', async (req, res) => {
  try {
    const group = await prisma.quotation.groupBy({
      by: ['status'],
      _count: true,
      where: { customerId: req.user.id },
    });
    const byStatus = {};
    let total = 0;
    for (const g of group) { byStatus[g.status] = g._count; total += g._count; }
    res.json({ total, byStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotation summary' });
  }
});

// GET /api/quotations/:id — single quotation with items
router.get('/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid quotation ID' });
    const q = await prisma.quotation.findFirst({
      where: { id, customerId: req.user.id },
      include: { items: true },
    });
    if (!q) return res.status(404).json({ error: 'Quotation not found' });
    res.json({
      id: q.id,
      quotation_number: q.quotationNumber,
      status: q.status,
      quoted_amount: q.quotedAmount,
      createdAt: q.createdAt,
      items: q.items.map((i) => ({
        product_id: i.productId,
        product_name: i.productName,
        unit_price: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

// GET /api/quotations/:id/history — quotation status history for customer
router.get('/:id/history', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid quotation ID' });
    const q = await prisma.quotation.findFirst({ where: { id, customerId: req.user.id }, select: { id: true } });
    if (!q) return res.status(404).json({ error: 'Quotation not found' });
    const history = await prisma.quotationStatusHistory.findMany({
      where: { quotationId: id },
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
    res.status(500).json({ error: 'Failed to fetch quotation history' });
  }
});

// POST /api/quotations — create quotation from cart
router.post('/', async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { customerId: req.user.id },
      include: { items: { include: { product: { include: { localizations: true } } } } },
    });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    // Generate globally unique quotation number
    const lastQt = await prisma.quotation.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = lastQt ? parseInt(lastQt.quotationNumber.replace('QT-', '')) + 1 : 1;
    const quotationNumber = 'QT-' + String(nextNum).padStart(5, '0');
    // Create quotation with items in a transaction
    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: { customerId: req.user.id, quotationNumber },
      });
      for (const item of cart.items) {
        const loc = item.product.localizations.find((l) => l.locale === 'lo') || item.product.localizations[0];
        await tx.quotationItem.create({
          data: {
            quotationId: q.id,
            productId: item.productId,
            productName: loc ? loc.name : '',
            unitPrice: item.product.price,
            quantity: item.quantity,
          },
        });
      }
      return q;
    });
    // Return with items
    const result = await prisma.quotation.findUnique({
      where: { id: quotation.id },
      include: { items: true },
    });
    // Send quotation request received email (non-blocking)
    const customer = await prisma.customer.findUnique({ where: { id: req.user.id } });
    if (customer && customer.email) {
      notifyQuotationCreated(customer, result, result.items.map(i => ({
        name: i.productName, price: i.unitPrice, quantity: i.quantity,
      }))).catch(() => {});
    }
    res.status(201).json({
      id: result.id,
      quotation_number: result.quotationNumber,
      status: result.status,
      items: result.items.map((i) => ({
        product_id: i.productId,
        product_name: i.productName,
        unit_price: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

// PATCH /api/quotations/:id/cancel — customer cancels a pending quotation
router.patch('/:id/cancel', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid quotation ID' });
    const existing = await prisma.quotation.findFirst({
      where: { id, customerId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending quotations can be cancelled' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.quotation.update({ where: { id }, data: { status: 'cancelled' } });
      await tx.quotationStatusHistory.create({
        data: { quotationId: id, fromStatus: 'pending', toStatus: 'cancelled', notes: 'Cancelled by customer' },
      });
    });
    res.json({ id: existing.id, quotation_number: existing.quotationNumber, status: 'cancelled' });
  } catch (err) {
    console.error('Quotation cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel quotation' });
  }
});

// DELETE /api/quotations/:id — customer deletes a pending quotation
router.delete('/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid quotation ID' });
    const existing = await prisma.quotation.findFirst({
      where: { id, customerId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending quotations can be deleted' });
    }
    // Hard delete — items cascade via onDelete: Cascade
    await prisma.quotation.delete({ where: { id } });
    res.json({ message: 'Quotation deleted' });
  } catch (err) {
    console.error('Quotation delete error:', err);
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});

module.exports = router;
