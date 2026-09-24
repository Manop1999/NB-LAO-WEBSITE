const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { auditLog } = require('../../middleware/rbac');
const { notifyReviewApproved, notifyReviewRejected } = require('../../services/notifications');

const router = Router();

// Helper: non-blocking audit write (Reviews uses object-style calling convention)
function logAudit(data) {
  auditLog(data).catch(() => {});
}

// ══════════════════════════════════════════════════════
// REVIEWS MANAGEMENT — Phase 19
// ══════════════════════════════════════════════════════

router.get('/reviews', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const where = {};

    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      where.status = req.query.status;
    }
    if (req.query.rating) {
      const r = parseInt(req.query.rating);
      if (r >= 1 && r <= 5) where.rating = r;
    }
    if (req.query.search && typeof req.query.search === 'string') {
      where.OR = [
        { title: { contains: req.query.search.trim() } },
        { comment: { contains: req.query.search.trim() } },
      ];
    }
    if (req.query.productId) {
      where.productId = parseInt(req.query.productId);
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          product: { select: { id: true, sku: true, slug: true } },
          customer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.productReview.count({ where }),
    ]);

    res.json({ reviews, total, page, limit });
  } catch (err) {
    console.error('Admin list reviews error:', err);
    res.status(500).json({ error: 'Failed to list reviews' });
  }
});

router.put('/reviews/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid review ID' });

    const review = await prisma.productReview.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const { status, adminNote } = req.body;
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const data = {};
    if (status) data.status = status;
    if (adminNote !== undefined) data.adminNote = adminNote || null;

    const updated = await prisma.productReview.update({ where: { id }, data });
    logAudit({ staffId: req.user.staffId, action: 'update', module: 'reviews', targetId: id, details: JSON.stringify({ status: updated.status }) });

    // Send email notification on approve/reject (non-blocking)
    if (status && status !== review.status) {
      const reviewWithRelations = await prisma.productReview.findUnique({
        where: { id }, include: { customer: true, product: { include: { localizations: true } } },
      });
      if (reviewWithRelations && reviewWithRelations.customer) {
        const prodName = (reviewWithRelations.product.localizations.find(l => l.locale === 'lo') || reviewWithRelations.product.localizations[0] || {}).name || reviewWithRelations.product.sku;
        const productData = { name: prodName };
        if (status === 'approved') {
          notifyReviewApproved(reviewWithRelations.customer, productData).catch(() => {});
        } else if (status === 'rejected') {
          notifyReviewRejected(reviewWithRelations.customer, productData, adminNote || null).catch(() => {});
        }
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('Admin update review error:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid review ID' });

    const review = await prisma.productReview.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await prisma.productReview.delete({ where: { id } });
    logAudit({ staffId: req.user.staffId, action: 'delete', module: 'reviews', targetId: id });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('Admin delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
