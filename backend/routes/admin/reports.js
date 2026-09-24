const { Router } = require('express');
const prisma = require('../../lib/prisma');

const router = Router();

// ═══════════════════════════════════════════════
// SALES REPORTS
// ═══════════════════════════════════════════════

router.get('/reports/sales', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    let dateFilter = {};
    const now = new Date();
    if (period === '7d') dateFilter.gte = new Date(now - 7 * 86400000);
    else if (period === '30d') dateFilter.gte = new Date(now - 30 * 86400000);
    else if (period === '90d') dateFilter.gte = new Date(now - 90 * 86400000);
    else if (period === '1y') dateFilter.gte = new Date(now - 365 * 86400000);
    const where = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const allOrders = await prisma.order.findMany({ where, include: { items: true } });
    const orders = allOrders.sort((a, b) => b.createdAt - a.createdAt);

    const totalOrders = allOrders.length;
    let totalRevenue = 0;
    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;
    const byStatus = {};
    const productMap = {};
    const dailyMap = {};

    for (const o of allOrders) {
      const orderTotal = o.items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);
      totalRevenue += orderTotal;
      totalPointsEarned += o.pointsEarned || 0;
      totalPointsRedeemed += o.pointsRedeemed || 0;

      if (!byStatus[o.status]) byStatus[o.status] = { status: o.status, count: 0, revenue: 0 };
      byStatus[o.status].count++;
      byStatus[o.status].revenue += orderTotal;

      const day = o.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, orders: 0, revenue: 0 };
      dailyMap[day].orders++;
      dailyMap[day].revenue += orderTotal;

      for (const item of o.items) {
        if (!productMap[item.productName]) productMap[item.productName] = { productName: item.productName, totalQty: 0, totalRevenue: 0 };
        productMap[item.productName].totalQty += item.quantity;
        productMap[item.productName].totalRevenue += (item.unitPrice || 0) * item.quantity;
      }
    }

    res.json({
      summary: {
        totalOrders,
        totalRevenue,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        totalPointsEarned,
        totalPointsRedeemed,
      },
      byStatus: Object.values(byStatus).sort((a, b) => b.revenue - a.revenue),
      topProducts: Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
      dailyTrend: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    });
  } catch (err) {
    console.error('Admin sales report error:', err);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// ═══════════════════════════════════════════════
// INVENTORY REPORTS
// ═══════════════════════════════════════════════

router.get('/reports/inventory', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        localizations: true,
        category: { include: { localizations: true } },
        brand: { include: { localizations: true } },
      },
    });

    const lowStock = [];
    const outOfStock = [];
    const catMap = {};
    const brandMap = {};
    let inStock = 0, preOrder = 0;

    for (const p of products) {
      const catName = (p.category?.localizations.find(l => l.locale === 'lo') || {}).name || p.category?.slug || 'Unknown';
      const brandName = (p.brand?.localizations.find(l => l.locale === 'lo') || {}).name || p.brand?.slug || 'Unknown';
      const prodName = (p.localizations.find(l => l.locale === 'lo') || {}).name || p.sku;

      if (p.stock === 0) {
        outOfStock.push({ id: p.id, name: prodName, sku: p.sku, stock: p.stock, category: catName, brand: brandName, status: p.status });
      } else if (p.stock <= 5) {
        lowStock.push({ id: p.id, name: prodName, sku: p.sku, stock: p.stock, category: catName, brand: brandName, status: p.status });
      } else {
        inStock++;
      }
      if (p.status === 'pre-order') preOrder++;

      if (!catMap[catName]) catMap[catName] = { category: catName, count: 0, totalStock: 0 };
      catMap[catName].count++;
      catMap[catName].totalStock += p.stock;

      if (!brandMap[brandName]) brandMap[brandName] = { brand: brandName, count: 0, totalStock: 0 };
      brandMap[brandName].count++;
      brandMap[brandName].totalStock += p.stock;
    }

    res.json({
      summary: {
        totalProducts: products.length,
        inStock,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        preOrder,
      },
      lowStock,
      outOfStock,
      byCategory: Object.values(catMap).sort((a, b) => b.count - a.count),
      byBrand: Object.values(brandMap).sort((a, b) => b.count - a.count),
    });
  } catch (err) {
    console.error('Admin inventory report error:', err);
    res.status(500).json({ error: 'Failed to generate inventory report' });
  }
});

module.exports = router;
