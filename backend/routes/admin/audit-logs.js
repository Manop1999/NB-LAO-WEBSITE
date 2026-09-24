const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');

const router = Router();

// ═══════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════

router.get('/audit-logs', async (req, res) => {
  try {
    const page = safeParseInt(req.query.page) || 1;
    const limit = Math.min(safeParseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.module) where.module = req.query.module;
    if (req.query.staffId) where.staffId = safeParseInt(req.query.staffId);
    if (req.query.fromDate || req.query.toDate) {
      where.createdAt = {};
      if (req.query.fromDate) where.createdAt.gte = new Date(req.query.fromDate);
      if (req.query.toDate) where.createdAt.lte = new Date(req.query.toDate + 'T23:59:59.999Z');
    }
    if (req.query.search) {
      where.OR = [
        { action: { contains: req.query.search } },
        { module: { contains: req.query.search } },
        { details: { contains: req.query.search } },
      ];
    }
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
        include: {
          staff: { include: { customer: { select: { name: true, email: true } } } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({
      logs: logs.map(l => ({
        id: l.id,
        action: l.action,
        module: l.module,
        target_id: l.targetId,
        details: l.details ? JSON.parse(l.details) : null,
        ip_address: l.ipAddress,
        staff_name: l.staff?.customer?.name || 'System',
        staff_email: l.staff?.customer?.email || null,
        created_at: l.createdAt,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Admin GET audit-logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
