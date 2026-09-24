const { Router } = require('express');
const prisma = require('../../lib/prisma');

const router = Router();

// ═══════════════════════════════════════════════
// CSV EXPORT — Report CSV Exports
// ═══════════════════════════════════════════════

router.get('/reports/sales/export', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    let dateFilter = {};
    const now = new Date();
    if (period === '7d') dateFilter.gte = new Date(now - 7 * 86400000);
    else if (period === '30d') dateFilter.gte = new Date(now - 30 * 86400000);
    else if (period === '90d') dateFilter.gte = new Date(now - 90 * 86400000);
    else if (period === '1y') dateFilter.gte = new Date(now - 365 * 86400000);
    const where = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
    const orders = await prisma.order.findMany({ where, include: { items: true, customer: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
    let csv = '\uFEFFOrder Number,Customer,Email,Status,Subtotal,Discount,Date\n';
    for (const o of orders) {
      const subtotal = o.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
      csv += [o.orderNumber, o.customer?.name || '', o.customer?.email || '', o.status, subtotal, o.discountApplied || 0, o.createdAt.toISOString().slice(0, 10)].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n';
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report-' + period + '.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: 'Failed to export sales report' }); }
});

router.get('/reports/inventory/export', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { localizations: true, category: { include: { localizations: true } }, brand: { include: { localizations: true } } } });
    let csv = '\uFEFFSKU,Name,Category,Brand,Stock,Status,Price\n';
    for (const p of products) {
      const name = (p.localizations.find(l => l.locale === 'lo') || p.localizations[0] || {}).name || p.sku;
      const cat = (p.category?.localizations.find(l => l.locale === 'lo') || {}).name || p.category?.slug || '';
      const brand = (p.brand?.localizations.find(l => l.locale === 'lo') || {}).name || p.brand?.slug || '';
      csv += [p.sku, name, cat, brand, p.stock, p.status, p.price || 0].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n';
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: 'Failed to export inventory report' }); }
});

module.exports = router;
