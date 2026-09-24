const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { cacheControl } = require('../middleware/security');

// GET /api/brands - all brands with localizations
router.get('/', cacheControl(300), async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      include: { localizations: true },
      orderBy: { sortOrder: 'asc' },
    });
    const result = brands.map(b => {
      const lo = b.localizations.find(l => l.locale === 'lo');
      const en = b.localizations.find(l => l.locale === 'en');
      return {
        id: b.id, slug: b.slug,
        name_lo: lo ? lo.name : '', name_en: en ? en.name : '',
      };
    });
    res.json(result);
  } catch (err) {
    console.error('GET /api/brands error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/brands/:slug - single brand with products
router.get('/:slug', cacheControl(300), async (req, res) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { slug: req.params.slug },
      include: {
        localizations: true,
        products: {
          include: {
            localizations: { where: { locale: req.query.locale || 'lo' } },
            images: { where: { isPrimary: true }, take: 1 },
            category: { include: { localizations: true } },
          },
        },
      },
    });
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const lo = brand.localizations.find(l => l.locale === 'lo');
    const en = brand.localizations.find(l => l.locale === 'en');
    res.json({
      id: brand.id, slug: brand.slug,
      name_lo: lo ? lo.name : '', name_en: en ? en.name : '',
      products: brand.products.map(p => ({
        id: p.id, sku: p.sku, slug: p.slug,
        name: p.localizations[0] ? p.localizations[0].name : '',
        price: p.price, price_unit: p.priceUnit, stock: p.stock,
      })),
    });
  } catch (err) {
    console.error('GET /api/brands/:slug error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
