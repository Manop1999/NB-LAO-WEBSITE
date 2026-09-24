// ══════════════════════════════════════════════════════
// SHIPPING COMPANIES & BRANCHES — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/shipping'))
// Endpoints:
//   GET    /shipping/companies
//   POST   /shipping/companies
//   PUT    /shipping/companies/:id
//   DELETE /shipping/companies/:id
//   POST   /shipping/companies/:id/branches
//   PUT    /shipping/companies/:id/branches/:branchId
//   DELETE /shipping/companies/:id/branches/:branchId
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

// ── Company Routes ───────────────────────────────────

// GET /shipping/companies — list all companies with branches
router.get('/shipping/companies', async (req, res) => {
  try {
    const companies = await prisma.shippingCompany.findMany({
      include: { branches: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(companies.map(c => ({
      id: c.id, name: c.name, name_en: c.nameEn, phone: c.phone,
      logo_url: c.logoUrl, is_active: c.isActive, sort_order: c.sortOrder,
      branches: c.branches.map(b => ({
        id: b.id, name: b.name, name_en: b.nameEn, province: b.province,
        district: b.district, phone: b.phone, is_active: b.isActive,
      })),
    }))); 
  } catch (err) { res.status(500).json({ error: 'Failed to fetch shipping companies' }); }
});

// POST /shipping/companies — create company
router.post('/shipping/companies', async (req, res) => {
  try {
    const { name, name_en, phone, logo_url, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const company = await prisma.shippingCompany.create({
      data: { name, nameEn: name_en || null, phone: phone || null,
              logoUrl: logo_url || null, sortOrder: sort_order || 0 },
    });
    logAudit(req, 'create', 'shipping', company.id, { name });
    res.status(201).json({ id: company.id, name: company.name });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Company name already exists' });
    res.status(500).json({ error: 'Failed to create shipping company' });
  }
});

// PUT /shipping/companies/:id — update company
router.put('/shipping/companies/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.shippingCompany.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Company not found' });
    const { name, name_en, phone, logo_url, is_active, sort_order } = req.body;
    const updated = await prisma.shippingCompany.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(name_en !== undefined && { nameEn: name_en }),
        ...(phone !== undefined && { phone }),
        ...(logo_url !== undefined && { logoUrl: logo_url }),
        ...(is_active !== undefined && { isActive: is_active }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    logAudit(req, 'update', 'shipping', id, { name: updated.name });
    res.json({ id: updated.id, name: updated.name });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Company name already exists' });
    res.status(500).json({ error: 'Failed to update shipping company' });
  }
});

// DELETE /shipping/companies/:id — delete company
router.delete('/shipping/companies/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.shippingCompany.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Company not found' });
    logAudit(req, 'delete', 'shipping', id, { name: existing.name });
    await prisma.shippingCompany.delete({ where: { id } });
    res.json({ message: 'Company deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete shipping company' }); }
});

// ── Branch Routes ────────────────────────────────────

// POST /shipping/companies/:id/branches — create branch
router.post('/shipping/companies/:id/branches', async (req, res) => {
  try {
    const companyId = safeParseInt(req.params.id);
    if (!companyId) return res.status(400).json({ error: 'Invalid company ID' });
    const company = await prisma.shippingCompany.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const { name, name_en, province, district, phone, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const branch = await prisma.shippingBranch.create({
      data: { companyId, name, nameEn: name_en || null, province: province || null,
              district: district || null, phone: phone || null, sortOrder: sort_order || 0 },
    });
    logAudit(req, 'create', 'shipping_branch', branch.id, { name, companyId });
    res.status(201).json({ id: branch.id, name: branch.name });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Branch already exists for this company' });
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// PUT /shipping/companies/:id/branches/:branchId — update branch
router.put('/shipping/companies/:id/branches/:branchId', async (req, res) => {
  try {
    const branchId = safeParseInt(req.params.branchId);
    if (!branchId) return res.status(400).json({ error: 'Invalid branch ID' });
    const existing = await prisma.shippingBranch.findUnique({ where: { id: branchId } });
    if (!existing) return res.status(404).json({ error: 'Branch not found' });
    const { name, name_en, province, district, phone, is_active, sort_order } = req.body;
    const updated = await prisma.shippingBranch.update({
      where: { id: branchId },
      data: {
        ...(name !== undefined && { name }),
        ...(name_en !== undefined && { nameEn: name_en }),
        ...(province !== undefined && { province }),
        ...(district !== undefined && { district }),
        ...(phone !== undefined && { phone }),
        ...(is_active !== undefined && { isActive: is_active }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    logAudit(req, 'update', 'shipping_branch', branchId, { name: updated.name });
    res.json({ id: updated.id, name: updated.name });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Branch already exists for this company' });
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

// DELETE /shipping/companies/:id/branches/:branchId — delete branch
router.delete('/shipping/companies/:id/branches/:branchId', async (req, res) => {
  try {
    const branchId = safeParseInt(req.params.branchId);
    if (!branchId) return res.status(400).json({ error: 'Invalid branch ID' });
    const existing = await prisma.shippingBranch.findUnique({ where: { id: branchId } });
    if (!existing) return res.status(404).json({ error: 'Branch not found' });
    logAudit(req, 'delete', 'shipping_branch', branchId, { name: existing.name });
    await prisma.shippingBranch.delete({ where: { id: branchId } });
    res.json({ message: 'Branch deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete branch' }); }
});

module.exports = router;
