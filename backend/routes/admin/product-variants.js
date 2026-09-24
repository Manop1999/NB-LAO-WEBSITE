// ══════════════════════════════════════════════════════
// PRODUCT VARIANTS — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/product-variants'))
// Endpoints:
//   GET    /products/:id/variants
//   POST   /products/:id/variants
//   PUT    /products/:id/variants/:vid
//   DELETE /products/:id/variants/:vid
//   POST   /products/:id/variants/:vid/options
//   DELETE /products/:id/variants/:vid/options/:oid
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

// ── Variant Routes ───────────────────────────────────

// GET /products/:id/variants — list variants with options
router.get('/products/:id/variants', async (req, res) => {
  try {
    const pid = safeParseInt(req.params.id);
    if (!pid) return res.status(400).json({ error: 'Invalid product ID' });
    const variants = await prisma.productVariant.findMany({
      where: { productId: pid },
      include: { options: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(variants.map(v => ({
      id: v.id, sku: v.sku, name: v.name, price: v.price, stock: v.stock,
      is_active: v.isActive, sort_order: v.sortOrder,
      options: v.options.map(o => ({ id: o.id, key: o.optionKey, value: o.optionValue })),
    })));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch variants' }); }
});

// POST /products/:id/variants — create variant + options
router.post('/products/:id/variants', async (req, res) => {
  try {
    const pid = safeParseInt(req.params.id);
    if (!pid) return res.status(400).json({ error: 'Invalid product ID' });
    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const { sku, name, price, stock, sort_order, options } = req.body;
    if (!sku) return res.status(400).json({ error: 'sku is required' });
    const variant = await prisma.productVariant.create({
      data: {
        productId: pid, sku, name: name || null, price: price || null,
        stock: stock || 0, sortOrder: sort_order || 0,
        options: options ? { create: options.map(o => ({ optionKey: o.key, optionValue: o.value })) } : undefined,
      },
      include: { options: true },
    });
    // Enable hasVariants on parent product
    await prisma.product.update({ where: { id: pid }, data: { hasVariants: true } });
    logAudit(req, 'create', 'product_variants', variant.id, { sku, productId: pid });
    res.status(201).json({ id: variant.id, sku: variant.sku, name: variant.name });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Variant SKU already exists' });
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// PUT /products/:id/variants/:vid — update variant
router.put('/products/:id/variants/:vid', async (req, res) => {
  try {
    const vid = safeParseInt(req.params.vid);
    if (!vid) return res.status(400).json({ error: 'Invalid variant ID' });
    const existing = await prisma.productVariant.findUnique({ where: { id: vid } });
    if (!existing) return res.status(404).json({ error: 'Variant not found' });
    const { sku, name, price, stock, is_active, sort_order } = req.body;
    const updated = await prisma.productVariant.update({
      where: { id: vid },
      data: {
        ...(sku !== undefined && { sku }),
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(stock !== undefined && { stock }),
        ...(is_active !== undefined && { isActive: is_active }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    logAudit(req, 'update', 'product_variants', vid, { sku: updated.sku });
    res.json({ id: updated.id, sku: updated.sku, name: updated.name });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Variant SKU already exists' });
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

// DELETE /products/:id/variants/:vid — delete variant
router.delete('/products/:id/variants/:vid', async (req, res) => {
  try {
    const vid = safeParseInt(req.params.vid);
    if (!vid) return res.status(400).json({ error: 'Invalid variant ID' });
    const existing = await prisma.productVariant.findUnique({ where: { id: vid } });
    if (!existing) return res.status(404).json({ error: 'Variant not found' });
    logAudit(req, 'delete', 'product_variants', vid, { sku: existing.sku });
    await prisma.productVariant.delete({ where: { id: vid } });
    res.json({ message: 'Variant deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete variant' }); }
});

// ── Variant Option Routes ────────────────────────────

// POST /products/:id/variants/:vid/options — create option
router.post('/products/:id/variants/:vid/options', async (req, res) => {
  try {
    const vid = safeParseInt(req.params.vid);
    if (!vid) return res.status(400).json({ error: 'Invalid variant ID' });
    const existing = await prisma.productVariant.findUnique({ where: { id: vid } });
    if (!existing) return res.status(404).json({ error: 'Variant not found' });
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'key and value are required' });
    const option = await prisma.productVariantOption.create({
      data: { variantId: vid, optionKey: key, optionValue: value },
    });
    res.status(201).json({ id: option.id, key: option.optionKey, value: option.optionValue });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Option key already exists for this variant' });
    res.status(500).json({ error: 'Failed to create option' });
  }
});

// DELETE /products/:id/variants/:vid/options/:oid — delete option
router.delete('/products/:id/variants/:vid/options/:oid', async (req, res) => {
  try {
    const oid = safeParseInt(req.params.oid);
    if (!oid) return res.status(400).json({ error: 'Invalid option ID' });
    const existing = await prisma.productVariantOption.findUnique({ where: { id: oid } });
    if (!existing) return res.status(404).json({ error: 'Option not found' });
    await prisma.productVariantOption.delete({ where: { id: oid } });
    res.json({ message: 'Option deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete option' }); }
});

module.exports = router;
