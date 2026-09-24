const { Router } = require('express');
const prisma = require('../../lib/prisma');

const router = Router();

// ═══════════════════════════════════════════════
// DASHBOARD SUMMARY
// ═══════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const [productCount, categoryCount, brandCount, customerCount, orderCount, quotationCount,
           pendingReviews, lowStockCount, recentOrders, totalRevenue] =
      await Promise.all([
        prisma.product.count(),
        prisma.category.count({ where: { parentId: null } }),
        prisma.brand.count(),
        prisma.customer.count(),
        prisma.order.count(),
        prisma.quotation.count(),
        prisma.productReview.count({ where: { status: 'pending' } }),
        prisma.product.count({ where: { stock: { lte: 5 }, stock: { gt: 0 } } }),
        prisma.order.findMany({
          orderBy: { createdAt: 'desc' }, take: 5,
          include: { customer: { select: { name: true } }, items: true },
        }),
        prisma.order.aggregate({ _sum: { discountApplied: true }, _count: true }),
      ]);

    // Calculate total revenue from order items (database-level aggregation)
    const [revenueRow] = await prisma.$queryRaw`SELECT COALESCE(SUM("unitPrice" * "quantity"), 0) AS "totalRevenue" FROM "OrderItem"`;
    const revenueSum = Number(revenueRow.totalRevenue);

    res.json({
      products: productCount,
      categories: categoryCount,
      brands: brandCount,
      customers: customerCount,
      orders: orderCount,
      quotations: quotationCount,
      pending_reviews: pendingReviews,
      low_stock: lowStockCount,
      total_revenue: revenueSum,
      recent_orders: recentOrders.map(o => ({
        id: o.id, order_number: o.orderNumber, status: o.status,
        customer_name: o.customer ? o.customer.name : '',
        total: o.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0),
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
