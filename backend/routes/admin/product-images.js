// ══════════════════════════════════════════════════════
// PRODUCT IMAGES — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/product-images'))
// Endpoints:
//   GET    /products/:id/images
//   POST   /products/:id/images
//   PUT    /products/:id/images/:imageId
//   DELETE /products/:id/images/:imageId
// ══════════════════════════════════════════════════════

const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();
const MAX_IMAGES = 8;

// ── Routes ───────────────────────────────────────────

// GET /products/:id/images — list images for a product
router.get('/products/:id/images', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const images = await prisma.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } });
    res.json({ images });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch images' }); }
});

// POST /products/:id/images — add image to product
router.post('/products/:id/images', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const count = await prisma.productImage.count({ where: { productId: id } });
    if (count >= MAX_IMAGES) return res.status(400).json({ error: 'Maximum ' + MAX_IMAGES + ' images per product' });
    const { url, altLo, altEn, isPrimary, sortOrder } = req.body;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Image URL is required' });
    if (isPrimary) await prisma.productImage.updateMany({ where: { productId: id }, data: { isPrimary: false } });
    const image = await prisma.productImage.create({ data: { productId: id, url, altLo: altLo || null, altEn: altEn || null, isPrimary: isPrimary || false, sortOrder: sortOrder || count } });
    auditLog({ staffId: req.user.staffId, action: 'create', module: 'product_images', targetId: id, details: JSON.stringify({ imageId: image.id }) }).catch(() => {});
    res.status(201).json(image);
  } catch (err) { res.status(500).json({ error: 'Failed to create image' }); }
});

// PUT /products/:id/images/:imageId — update image
router.put('/products/:id/images/:imageId', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    const imageId = safeParseInt(req.params.imageId);
    if (!id || !imageId) return res.status(400).json({ error: 'Invalid ID' });
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
    if (!image) return res.status(404).json({ error: 'Image not found' });
    const { url, altLo, altEn, isPrimary, sortOrder } = req.body;
    if (isPrimary) await prisma.productImage.updateMany({ where: { productId: id }, data: { isPrimary: false } });
    const updated = await prisma.productImage.update({ where: { id: imageId }, data: { ...(url !== undefined && { url }), ...(altLo !== undefined && { altLo }), ...(altEn !== undefined && { altEn }), ...(isPrimary !== undefined && { isPrimary }), ...(sortOrder !== undefined && { sortOrder }) } });
    auditLog({ staffId: req.user.staffId, action: 'update', module: 'product_images', targetId: id, details: JSON.stringify({ imageId }) }).catch(() => {});
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Failed to update image' }); }
});

// DELETE /products/:id/images/:imageId — delete image
router.delete('/products/:id/images/:imageId', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    const imageId = safeParseInt(req.params.imageId);
    if (!id || !imageId) return res.status(400).json({ error: 'Invalid ID' });
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
    if (!image) return res.status(404).json({ error: 'Image not found' });
    await prisma.productImage.delete({ where: { id: imageId } });
    auditLog({ staffId: req.user.staffId, action: 'delete', module: 'product_images', targetId: id, details: JSON.stringify({ imageId }) }).catch(() => {});
    res.json({ message: 'Image deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete image' }); }
});

module.exports = router;
