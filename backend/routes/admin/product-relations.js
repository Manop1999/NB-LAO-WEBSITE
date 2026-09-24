// ══════════════════════════════════════════════════════
// PRODUCT RELATIONS — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/product-relations'))
// Endpoints:
//   GET    /products/:id/relations
//   POST   /products/:id/relations
//   DELETE /products/:id/relations/:relationId
// ══════════════════════════════════════════════════════

const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();
const MAX_RELATIONS = 20;

// ── Routes ───────────────────────────────────────────

// GET /products/:id/relations — list related products
router.get('/products/:id/relations', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const relations = await prisma.productRelation.findMany({ where: { sourceProductId: id }, include: { relatedProduct: { include: { localizations: true } } } });
    res.json({ relations: relations.map(r => ({ id: r.id, product_id: r.relatedProductId, name: (r.relatedProduct.localizations.find(l => l.locale === 'lo') || r.relatedProduct.localizations[0] || {}).name || r.relatedProduct.sku, sku: r.relatedProduct.sku })) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch relations' }); }
});

// POST /products/:id/relations — create relation
router.post('/products/:id/relations', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const count = await prisma.productRelation.count({ where: { sourceProductId: id } });
    if (count >= MAX_RELATIONS) return res.status(400).json({ error: 'Maximum ' + MAX_RELATIONS + ' related products' });
    const { relatedProductId } = req.body;
    if (!relatedProductId) return res.status(400).json({ error: 'relatedProductId is required' });
    if (relatedProductId === id) return res.status(400).json({ error: 'Cannot relate a product to itself' });
    const target = await prisma.product.findUnique({ where: { id: relatedProductId } });
    if (!target) return res.status(404).json({ error: 'Related product not found' });
    const dup = await prisma.productRelation.findUnique({ where: { sourceProductId_relatedProductId: { sourceProductId: id, relatedProductId } } });
    if (dup) return res.status(409).json({ error: 'Relation already exists' });
    const relation = await prisma.productRelation.create({ data: { sourceProductId: id, relatedProductId } });
    auditLog({ staffId: req.user.staffId, action: 'create', module: 'product_relations', targetId: id, details: JSON.stringify({ relatedProductId }) }).catch(() => {});
    res.status(201).json({ id: relation.id, product_id: relatedProductId });
  } catch (err) { res.status(500).json({ error: 'Failed to create relation' }); }
});

// DELETE /products/:id/relations/:relationId — delete relation
router.delete('/products/:id/relations/:relationId', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    const relationId = safeParseInt(req.params.relationId);
    if (!id || !relationId) return res.status(400).json({ error: 'Invalid ID' });
    const relation = await prisma.productRelation.findFirst({ where: { id: relationId, sourceProductId: id } });
    if (!relation) return res.status(404).json({ error: 'Relation not found' });
    await prisma.productRelation.delete({ where: { id: relationId } });
    auditLog({ staffId: req.user.staffId, action: 'delete', module: 'product_relations', targetId: id, details: JSON.stringify({ relationId }) }).catch(() => {});
    res.json({ message: 'Relation removed' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete relation' }); }
});

module.exports = router;
