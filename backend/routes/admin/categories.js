// ══════════════════════════════════════════════════════
// CATEGORIES CRUD — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/categories'))
// Endpoints: GET /categories, GET /categories/:id, POST /categories, PUT /categories/:id, DELETE /categories/:id
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

// GET /categories — list all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        localizations: true,
        _count: { select: { products: true, children: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories.map(c => ({
      id: c.id,
      slug: c.slug,
      icon: c.icon,
      parent_id: c.parentId,
      sort_order: c.sortOrder,
      name_lo: (c.localizations.find(l => l.locale === 'lo') || {}).name || '',
      name_en: (c.localizations.find(l => l.locale === 'en') || {}).name || '',
      products_count: c._count.products,
      children_count: c._count.children,
    })));
  } catch (err) {
    console.error('Admin GET categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /categories/:id — single category
router.get('/categories/:id', async (req, res) => {
  try {
    const cid = safeParseInt(req.params.id);
    if (!cid) return res.status(400).json({ error: 'Invalid category ID' });
    const category = await prisma.category.findUnique({
      where: { id: cid },
      include: { localizations: true },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({
      id: category.id,
      slug: category.slug,
      icon: category.icon,
      parent_id: category.parentId,
      sort_order: category.sortOrder,
      localizations: category.localizations.map(l => ({
        locale: l.locale, name: l.name,
      })),
    });
  } catch (err) {
    console.error('Admin GET category error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /categories — create category with localizations
router.post('/categories', async (req, res) => {
  try {
    const { slug, icon, parent_id, sort_order, localizations } = req.body;
    if (!slug) return res.status(400).json({ error: 'slug is required' });
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Slug already exists' });

    const category = await prisma.category.create({
      data: {
        slug,
        icon: icon || null,
        parentId: parent_id || null,
        sortOrder: sort_order || 0,
        localizations: {
          create: (localizations || []).map(l => ({
            locale: l.locale,
            name: l.name,
          })),
        },
      },
      include: { localizations: true },
    });
    logAudit(req, 'create', 'categories', category.id, { slug });
    res.status(201).json({
      id: category.id, slug: category.slug,
      name_lo: (category.localizations.find(l => l.locale === 'lo') || {}).name || '',
      name_en: (category.localizations.find(l => l.locale === 'en') || {}).name || '',
    });
  } catch (err) {
    console.error('Admin POST category error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /categories/:id — update category
router.put('/categories/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const { slug, icon, parent_id, sort_order } = req.body;
    if (slug && slug !== existing.slug) {
      const dup = await prisma.category.findUnique({ where: { slug } });
      if (dup) return res.status(409).json({ error: 'Slug already exists' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(icon !== undefined && { icon }),
        ...(parent_id !== undefined && { parentId: parent_id }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    logAudit(req, 'update', 'categories', id, { slug: updated.slug });
    res.json({ id: updated.id, slug: updated.slug });
  } catch (err) {
    console.error('Admin PUT category error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /categories/:id — delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    await prisma.category.delete({ where: { id } });
    logAudit(req, 'delete', 'categories', id, { slug: existing.slug });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Admin DELETE category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
