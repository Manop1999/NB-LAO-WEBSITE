// ══════════════════════════════════════════════════════
// POSITIONS — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/positions'))
// Endpoints: GET /positions, POST /positions, PUT /positions/:id, DELETE /positions/:id
// ══════════════════════════════════════════════════════

const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();

// ── Helpers ──────────────────────────────────────────

function auditCtx(req) {
  return { staffId: req.user?.staffId || null, customerId: req.user?.id || null, ipAddress: req.ip || null };
}

function logAudit(req, action, mod, targetId, details) {
  auditLog({ ...auditCtx(req), action, module: mod, targetId: targetId || null, details: details ? JSON.stringify(details) : null }).catch(() => {});
}

// ── Routes ───────────────────────────────────────────

// GET /positions — list all positions
router.get('/positions', async (req, res) => {
  try {
    const positions = await prisma.position.findMany({
      include: { _count: { select: { staff: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(positions.map(p => ({
      id: p.id, name: p.name, description: p.description,
      is_system: p.isSystem, sort_order: p.sortOrder,
      staff_count: p._count.staff,
      created_at: p.createdAt,
    })));
  } catch (err) {
    console.error('Admin GET positions error:', err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// POST /positions — create position
router.post('/positions', async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const existing = await prisma.position.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: 'Position name already exists' });
    const pos = await prisma.position.create({
      data: { name, description: description || null, sortOrder: sort_order || 0 },
    });
    logAudit(req, 'create', 'positions', pos.id, { name });
    res.status(201).json({ id: pos.id, name: pos.name, description: pos.description });
  } catch (err) {
    console.error('Admin POST position error:', err);
    res.status(500).json({ error: 'Failed to create position' });
  }
});

// PUT /positions/:id — update position (blocks system positions)
router.put('/positions/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.position.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Position not found' });
    if (existing.isSystem) return res.status(400).json({ error: 'Cannot modify system positions' });
    const { name, description, sort_order } = req.body;
    if (name && name !== existing.name) {
      const dup = await prisma.position.findUnique({ where: { name } });
      if (dup) return res.status(409).json({ error: 'Position name already exists' });
    }
    const updated = await prisma.position.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    logAudit(req, 'update', 'positions', id, { name: updated.name });
    res.json({ id: updated.id, name: updated.name, description: updated.description });
  } catch (err) {
    console.error('Admin PUT position error:', err);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// DELETE /positions/:id — delete position (blocks system/staffed)
router.delete('/positions/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.position.findUnique({ where: { id }, include: { _count: { select: { staff: true } } } });
    if (!existing) return res.status(404).json({ error: 'Position not found' });
    if (existing.isSystem) return res.status(400).json({ error: 'Cannot delete system positions' });
    if (existing._count.staff > 0) return res.status(400).json({ error: 'Cannot delete position with assigned staff' });
    await prisma.position.delete({ where: { id } });
    logAudit(req, 'delete', 'positions', id);
    res.json({ message: 'Position deleted' });
  } catch (err) {
    console.error('Admin DELETE position error:', err);
    res.status(500).json({ error: 'Failed to delete position' });
  }
});

module.exports = router;
