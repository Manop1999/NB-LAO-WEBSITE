// ══════════════════════════════════════════════════════
// PRODUCT SPECIFICATIONS — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/product-specifications'))
// Endpoints:
//   GET    /products/:id/specs
//   POST   /products/:id/specs
//   PUT    /products/:id/specs/:specId
//   DELETE /products/:id/specs/:specId
// ══════════════════════════════════════════════════════

const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();
const MAX_SPECS = 50;

// ── Routes ───────────────────────────────────────────

// GET /products/:id/specs — list specifications for a product
router.get('/products/:id/specs', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const specs = await prisma.productSpecification.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } });
    res.json({ specifications: specs });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch specs' }); }
});

// POST /products/:id/specs — add specification to product
router.post('/products/:id/specs', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const count = await prisma.productSpecification.count({ where: { productId: id } });
    if (count >= MAX_SPECS) return res.status(400).json({ error: 'Maximum ' + MAX_SPECS + ' specifications per product' });
    const { specKey, specLabelLo, specLabelEn, specValue, sortOrder } = req.body;
    if (!specKey || !specValue) return res.status(400).json({ error: 'specKey and specValue are required' });
    const dup = await prisma.productSpecification.findUnique({ where: { productId_specKey: { productId: id, specKey } } });
    if (dup) return res.status(409).json({ error: 'Specification key already exists' });
    const spec = await prisma.productSpecification.create({ data: { productId: id, specKey, specLabelLo: specLabelLo || specKey, specLabelEn: specLabelEn || specKey, specValue, sortOrder: sortOrder || count } });
    auditLog({ staffId: req.user.staffId, action: 'create', module: 'product_specs', targetId: id, details: JSON.stringify({ specId: spec.id, specKey }) }).catch(() => {});
    res.status(201).json(spec);
  } catch (err) { res.status(500).json({ error: 'Failed to create spec' }); }
});

// PUT /products/:id/specs/:specId — update specification
router.put('/products/:id/specs/:specId', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    const specId = safeParseInt(req.params.specId);
    if (!id || !specId) return res.status(400).json({ error: 'Invalid ID' });
    const spec = await prisma.productSpecification.findFirst({ where: { id: specId, productId: id } });
    if (!spec) return res.status(404).json({ error: 'Specification not found' });
    const { specKey, specLabelLo, specLabelEn, specValue, sortOrder } = req.body;
    const updated = await prisma.productSpecification.update({ where: { id: specId }, data: { ...(specKey !== undefined && { specKey }), ...(specLabelLo !== undefined && { specLabelLo }), ...(specLabelEn !== undefined && { specLabelEn }), ...(specValue !== undefined && { specValue }), ...(sortOrder !== undefined && { sortOrder }) } });
    auditLog({ staffId: req.user.staffId, action: 'update', module: 'product_specs', targetId: id, details: JSON.stringify({ specId }) }).catch(() => {});
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Failed to update spec' }); }
});

// DELETE /products/:id/specs/:specId — delete specification
router.delete('/products/:id/specs/:specId', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    const specId = safeParseInt(req.params.specId);
    if (!id || !specId) return res.status(400).json({ error: 'Invalid ID' });
    const spec = await prisma.productSpecification.findFirst({ where: { id: specId, productId: id } });
    if (!spec) return res.status(404).json({ error: 'Specification not found' });
    await prisma.productSpecification.delete({ where: { id: specId } });
    auditLog({ staffId: req.user.staffId, action: 'delete', module: 'product_specs', targetId: id, details: JSON.stringify({ specId }) }).catch(() => {});
    res.json({ message: 'Specification deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete spec' }); }
});

module.exports = router;
