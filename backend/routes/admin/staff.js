const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

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
// STAFF MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/staff', async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      include: {
        customer: { select: { id: true, email: true, name: true, phone: true, active: true } },
        position: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(staff.map(s => ({
      id: s.id,
      customer: s.customer,
      position: s.position,
      is_super_admin: s.isSuperAdmin,
      active: s.active,
      permissions: JSON.parse(s.permissions || '[]'),
      created_at: s.createdAt,
    })));
  } catch (err) {
    console.error('Admin GET staff error:', err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const { customer_id, position_id, is_super_admin, permissions } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });
    const customer = await prisma.customer.findUnique({ where: { id: customer_id } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const existingStaff = await prisma.staff.findUnique({ where: { customerId: customer_id } });
    if (existingStaff) return res.status(409).json({ error: 'Customer already has a staff record' });
    const staff = await prisma.staff.create({
      data: {
        customerId: customer_id,
        positionId: position_id || null,
        isSuperAdmin: is_super_admin || false,
        permissions: JSON.stringify(permissions || []),
      },
    });
    await prisma.customer.update({ where: { id: customer_id }, data: { role: 'staff', staffId: staff.id } });
    logAudit(req, 'create', 'staff', staff.id, { customer_id });
    res.status(201).json({ id: staff.id, customer_id: staff.customerId, is_super_admin: staff.isSuperAdmin });
  } catch (err) {
    console.error('Admin POST staff error:', err);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Staff not found' });
    const { position_id, is_super_admin, active, permissions } = req.body;
    // Prevent deactivating super admin if last one
    if (active === false && existing.isSuperAdmin) {
      const superAdminCount = await prisma.staff.count({ where: { isSuperAdmin: true, active: true } });
      if (superAdminCount <= 1) return res.status(400).json({ error: 'Cannot deactivate the last super admin' });
    }
    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(position_id !== undefined && { positionId: position_id }),
        ...(is_super_admin !== undefined && { isSuperAdmin: is_super_admin }),
        ...(active !== undefined && { active }),
        ...(permissions !== undefined && { permissions: JSON.stringify(permissions) }),
      },
    });
    // Sync customer role
    if (active === false) {
      await prisma.customer.update({ where: { id: existing.customerId }, data: { active: false } });
    } else if (active === true) {
      await prisma.customer.update({ where: { id: existing.customerId }, data: { active: true } });
    }
    logAudit(req, 'update', 'staff', id, { is_super_admin: updated.isSuperAdmin, active: updated.active });
    res.json({ id: updated.id, is_super_admin: updated.isSuperAdmin, active: updated.active });
  } catch (err) {
    console.error('Admin PUT staff error:', err);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Staff not found' });
    if (existing.isSuperAdmin) return res.status(400).json({ error: 'Cannot delete super admin staff' });
    await prisma.customer.update({ where: { id: existing.customerId }, data: { staffId: null, role: 'customer' } });
    await prisma.staff.delete({ where: { id } });    logAudit(req, 'delete', 'staff', id);
    res.json({ message: 'Staff removed' });
  } catch (err) {
    console.error('Admin DELETE staff error:', err);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

module.exports = router;
