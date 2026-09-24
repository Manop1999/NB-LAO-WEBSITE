const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { cacheControl } = require('../middleware/security');

// GET /api/categories - all categories with localizations, nested children
router.get('/', cacheControl(300), async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        localizations: true,
        children: {
          include: { localizations: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result = categories.map(cat => {
      const lo = cat.localizations.find(l => l.locale === 'lo');
      const en = cat.localizations.find(l => l.locale === 'en');
      return {
        id: cat.id,
        slug: cat.slug,
        icon: cat.icon,
        sort_order: cat.sortOrder,
        name_lo: lo ? lo.name : '',
        name_en: en ? en.name : '',
        children: cat.children.map(child => {
          const clo = child.localizations.find(l => l.locale === 'lo');
          const cen = child.localizations.find(l => l.locale === 'en');
          return {
            id: child.id,
            slug: child.slug,
            parent_id: child.parentId,
            name_lo: clo ? clo.name : '',
            name_en: cen ? cen.name : '',
          };
        }),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/categories/:slug - single category
router.get('/:slug', cacheControl(300), async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        localizations: true,
        children: {
          include: { localizations: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) return res.status(404).json({ error: 'Category not found' });

    const lo = category.localizations.find(l => l.locale === 'lo');
    const en = category.localizations.find(l => l.locale === 'en');

    res.json({
      id: category.id,
      slug: category.slug,
      icon: category.icon,
      name_lo: lo ? lo.name : '',
      name_en: en ? en.name : '',
      products_count: category._count.products,
      children: category.children.map(child => {
        const clo = child.localizations.find(l => l.locale === 'lo');
        const cen = child.localizations.find(l => l.locale === 'en');
        return {
          id: child.id,
          slug: child.slug,
          name_lo: clo ? clo.name : '',
          name_en: cen ? cen.name : '',
        };
      }),
    });
  } catch (err) {
    console.error('GET /api/categories/:slug error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
