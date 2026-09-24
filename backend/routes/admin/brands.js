// ══════════════════════════════════════════════════════
// BRANDS CRUD — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/brands'))
// Endpoints: GET /brands, GET /brands/:id, POST /brands, PUT /brands/:id, DELETE /brands/:id
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

// GET /brands — list all brands
router.get('/brands', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        localizations: true,
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(brands.map(b => ({
      id: b.id,
      slug: b.slug,
      logo_url: b.logoUrl,
      sort_order: b.sortOrder,
      name_lo: (b.localizations.find(l => l.locale === 'lo') || {}).name || '',
      name_en: (b.localizations.find(l => l.locale === 'en') || {}).name || '',
      products_count: b._count.products,
    })));
  } catch (err) {
    console.error('Admin GET brands error:', err);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// GET /brands/:id — single brand
router.get('/brands/:id', async (req, res) => {
  try {
    const bid = safeParseInt(req.params.id);
    if (!bid) return res.status(400).json({ error: 'Invalid brand ID' });
    const brand = await prisma.brand.findUnique({
      where: { id: bid },
      include: { localizations: true },
    });
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({
      id: brand.id,
      slug: brand.slug,
      logo_url: brand.logoUrl,
      sort_order: brand.sortOrder,
      localizations: brand.localizations.map(l => ({
        locale: l.locale, name: l.name,
      })),
    });
  } catch (err) {
    console.error('Admin GET brand error:', err);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// POST /brands — create brand with localizations
router.post('/brands', async (req, res) => {
  try {
    const { slug, logo_url, sort_order, localizations } = req.body;
    if (!slug) return res.status(400).json({ error: 'slug is required' });
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Slug already exists' });

    const brand = await prisma.brand.create({
      data: {
        slug,
        logoUrl: logo_url || null,
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
    logAudit(req, 'create', 'brands', brand.id, { slug });
    res.status(201).json({
      id: brand.id, slug: brand.slug,
      name_lo: (brand.localizations.find(l => l.locale === 'lo') || {}).name || '',
      name_en: (brand.localizations.find(l => l.locale === 'en') || {}).name || '',
    });
  } catch (err) {
    console.error('Admin POST brand error:', err);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// PUT /brands/:id — update brand
router.put('/brands/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Brand not found' });

    const { slug, logo_url, sort_order } = req.body;
    if (slug && slug !== existing.slug) {
      const dup = await prisma.brand.findUnique({ where: { slug } });
      if (dup) return res.status(409).json({ error: 'Slug already exists' });
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(logo_url !== undefined && { logoUrl: logo_url }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    logAudit(req, 'update', 'brands', id, { slug: updated.slug });
    res.json({ id: updated.id, slug: updated.slug });
  } catch (err) {
    console.error('Admin PUT brand error:', err);
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// DELETE /brands/:id — delete brand
router.delete('/brands/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Brand not found' });
    await prisma.brand.delete({ where: { id } });
    logAudit(req, 'delete', 'brands', id, { slug: existing.slug });
    res.json({ message: 'Brand deleted' });
  } catch (err) {
    console.error('Admin DELETE brand error:', err);
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

module.exports = router;
