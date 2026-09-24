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
// PRODUCTS CRUD
// ═══════════════════════════════════════════════

// GET /api/admin/products — list all products (including inactive)
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        localizations: true,
        category: true,
        brand: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(products.map(p => ({
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      price: p.price,
      price_unit: p.priceUnit,
      stock: p.stock,
      status: p.status,
      category_id: p.categoryId,
      brand_id: p.brandId,
      origin: p.origin,
      warranty: p.warranty,
      model_number: p.modelNumber,
      name_lo: (p.localizations.find(l => l.locale === 'lo') || {}).name || '',
      name_en: (p.localizations.find(l => l.locale === 'en') || {}).name || '',
    })));
  } catch (err) {
    console.error('Admin GET products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/admin/products/:id — single product with localizations
router.get('/products/:id', async (req, res) => {
  try {
    const pid = safeParseInt(req.params.id);
    if (!pid) return res.status(400).json({ error: 'Invalid product ID' });
    const product = await prisma.product.findUnique({
      where: { id: pid },
      include: {
        localizations: true,
        images: true,
        specifications: true,
        category: true,
        brand: true,
      },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      price: product.price,
      price_unit: product.priceUnit,
      stock: product.stock,
      status: product.status,
      category_id: product.categoryId,
      brand_id: product.brandId,
      origin: product.origin,
      warranty: product.warranty,
      model_number: product.modelNumber,
      sort_order: product.sortOrder,
      localizations: product.localizations.map(l => ({
        locale: l.locale, name: l.name, description: l.description,
      })),
      images: product.images.map(img => ({
        id: img.id, url: img.url, alt_lo: img.altLo, alt_en: img.altEn,
        is_primary: img.isPrimary, sort_order: img.sortOrder,
      })),
      specifications: product.specifications.map(s => ({
        id: s.id, spec_key: s.specKey, spec_label_lo: s.specLabelLo,
        spec_label_en: s.specLabelEn, spec_value: s.specValue, sort_order: s.sortOrder,
      })),
    });
  } catch (err) {
    console.error('Admin GET product error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/admin/products — create product with localizations
router.post('/products', async (req, res) => {
  try {
    const { sku, slug, category_id, brand_id, price, price_unit, stock, status,
            origin, warranty, model_number, sort_order, localizations } = req.body;
    if (!sku || !slug || !category_id) {
      return res.status(400).json({ error: 'sku, slug, and category_id are required' });
    }
    // Check unique constraints
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) return res.status(409).json({ error: 'SKU already exists' });
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) return res.status(409).json({ error: 'Slug already exists' });

    const product = await prisma.product.create({
      data: {
        sku, slug,
        categoryId: category_id,
        brandId: brand_id || null,
        price: price || null,
        priceUnit: price_unit || null,
        stock: stock || 0,
        status: status || 'active',
        origin: origin || null,
        warranty: warranty || null,
        modelNumber: model_number || null,
        sortOrder: sort_order || 0,
        localizations: {
          create: (localizations || []).map(l => ({
            locale: l.locale,
            name: l.name,
            description: l.description || null,
            howToUseLo: l.howToUseLo || null,
            howToUseEn: l.howToUseEn || null,
          })),
        },
      },
      include: { localizations: true },
    });
    logAudit(req, 'create', 'products', product.id, { sku, slug });
    res.status(201).json({
      id: product.id, sku: product.sku, slug: product.slug,
      name_lo: (product.localizations.find(l => l.locale === 'lo') || {}).name || '',
      name_en: (product.localizations.find(l => l.locale === 'en') || {}).name || '',
    });
  } catch (err) {
    console.error('Admin POST product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/admin/products/:id — update product
router.put('/products/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { sku, slug, category_id, brand_id, price, price_unit, stock, status,
            origin, warranty, model_number, sort_order, localizations } = req.body;

    // Check uniqueness if sku/slug changed
    if (sku && sku !== existing.sku) {
      const dup = await prisma.product.findUnique({ where: { sku } });
      if (dup) return res.status(409).json({ error: 'SKU already exists' });
    }
    if (slug && slug !== existing.slug) {
      const dup = await prisma.product.findUnique({ where: { slug } });
      if (dup) return res.status(409).json({ error: 'Slug already exists' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(sku !== undefined && { sku }),
        ...(slug !== undefined && { slug }),
        ...(category_id !== undefined && { categoryId: category_id }),
        ...(brand_id !== undefined && { brandId: brand_id }),
        ...(price !== undefined && { price }),
        ...(price_unit !== undefined && { priceUnit: price_unit }),
        ...(stock !== undefined && { stock }),
        ...(status !== undefined && { status }),
        ...(origin !== undefined && { origin }),
        ...(warranty !== undefined && { warranty }),
        ...(model_number !== undefined && { modelNumber: model_number }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    // Upsert localizations
    if (Array.isArray(localizations)) {
      for (const loc of localizations) {
        if (!loc.locale) continue;
        const data = {};
        if (loc.name !== undefined) data.name = loc.name;
        if (loc.description !== undefined) data.description = loc.description;
        if (loc.howToUseLo !== undefined) data.howToUseLo = loc.howToUseLo;
        if (loc.howToUseEn !== undefined) data.howToUseEn = loc.howToUseEn;
        if (Object.keys(data).length === 0) continue;
        await prisma.productLocalization.upsert({
          where: { productId_locale: { productId: id, locale: loc.locale } },
          update: data,
          create: { productId: id, locale: loc.locale, name: loc.name || '', ...data },
        });
      }
    }
    logAudit(req, 'update', 'products', id, { sku: updated.sku });
    // Return updated product with localizations
    const finalProduct = await prisma.product.findUnique({
      where: { id },
      include: { localizations: true },
    });
    res.json({ id: finalProduct.id, sku: finalProduct.sku, slug: finalProduct.slug, status: finalProduct.status,
      localizations: finalProduct.localizations.map(l => ({ locale: l.locale, name: l.name, description: l.description, howToUseLo: l.howToUseLo, howToUseEn: l.howToUseEn })) });
  } catch (err) {
    console.error('Admin PUT product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id — delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    logAudit(req, 'delete', 'products', id, { sku: existing.sku });
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Admin DELETE product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
