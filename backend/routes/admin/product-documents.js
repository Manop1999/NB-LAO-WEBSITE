// ══════════════════════════════════════════════════════
// PRODUCT DOCUMENTS — Extracted from admin.js (Phase 27)
// Mount via: router.use(require('./admin/product-documents'))
// Endpoints:
//   GET    /products/:id/documents
//   POST   /products/:id/documents
//   PUT    /products/:id/documents/:docId
//   DELETE /products/:id/documents/:docId
// ══════════════════════════════════════════════════════

const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();
const MAX_DOCS = 20;

// ── Routes ───────────────────────────────────────────

// GET /products/:id/documents — list documents for a product
router.get('/products/:id/documents', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const docs = await prisma.productDocument.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } });
    res.json({ documents: docs });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch documents' }); }
});

// POST /products/:id/documents — add document to product
router.post('/products/:id/documents', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product ID' });
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const count = await prisma.productDocument.count({ where: { productId: id } });
    if (count >= MAX_DOCS) return res.status(400).json({ error: 'Maximum ' + MAX_DOCS + ' documents per product' });
    const { titleLo, titleEn, fileUrl, fileType, sortOrder } = req.body;
    if (!titleLo || !titleEn || !fileUrl) return res.status(400).json({ error: 'titleLo, titleEn, and fileUrl are required' });
    const doc = await prisma.productDocument.create({ data: { productId: id, titleLo, titleEn, fileUrl, fileType: fileType || null, sortOrder: sortOrder || count } });
    auditLog({ staffId: req.user.staffId, action: 'create', module: 'product_docs', targetId: id, details: JSON.stringify({ docId: doc.id }) }).catch(() => {});
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: 'Failed to create document' }); }
});

// PUT /products/:id/documents/:docId — update document
router.put('/products/:id/documents/:docId', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    const docId = safeParseInt(req.params.docId);
    if (!id || !docId) return res.status(400).json({ error: 'Invalid ID' });
    const doc = await prisma.productDocument.findFirst({ where: { id: docId, productId: id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { titleLo, titleEn, fileUrl, fileType, sortOrder } = req.body;
    const updated = await prisma.productDocument.update({ where: { id: docId }, data: { ...(titleLo !== undefined && { titleLo }), ...(titleEn !== undefined && { titleEn }), ...(fileUrl !== undefined && { fileUrl }), ...(fileType !== undefined && { fileType }), ...(sortOrder !== undefined && { sortOrder }) } });
    auditLog({ staffId: req.user.staffId, action: 'update', module: 'product_docs', targetId: id, details: JSON.stringify({ docId }) }).catch(() => {});
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Failed to update document' }); }
});

// DELETE /products/:id/documents/:docId — delete document
router.delete('/products/:id/documents/:docId', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    const docId = safeParseInt(req.params.docId);
    if (!id || !docId) return res.status(400).json({ error: 'Invalid ID' });
    const doc = await prisma.productDocument.findFirst({ where: { id: docId, productId: id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await prisma.productDocument.delete({ where: { id: docId } });
    auditLog({ staffId: req.user.staffId, action: 'delete', module: 'product_docs', targetId: id, details: JSON.stringify({ docId }) }).catch(() => {});
    res.json({ message: 'Document deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete document' }); }
});

module.exports = router;
