const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../lib/auth');

router.use(authMiddleware);

// GET /api/wishlist — list wishlist items
router.get('/', async (req, res) => {
  try {
    const items = await prisma.wishlist.findMany({
      where: { customerId: req.user.id },
      include: {
        product: {
          include: {
            localizations: true,
            images: { where: { isPrimary: true }, take: 1 },
            brand: { include: { localizations: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const locale = req.query.locale || 'lo';
    res.json({
      items: items.map(w => {
        const p = w.product;
        const loc = p ? (p.localizations.find(l => l.locale === locale) || p.localizations[0]) : null;
        return {
          id: w.id,
          product_id: p ? p.id : null,
          slug: p ? p.slug : null,
          name: loc ? loc.name : '',
          sku: p ? p.sku : null,
          price: p ? p.price : null,
          stock: p ? p.stock : 0,
          status: p ? p.status : 'deleted',
          image: p && p.images[0] ? p.images[0].url : null,
          brand: p && p.brand ? {
            slug: p.brand.slug,
            name: (p.brand.localizations.find(l => l.locale === locale) || p.brand.localizations[0] || {}).name,
          } : null,
          added_at: w.createdAt,
        };
      }),
      total: items.length,
    });
  } catch (err) {
    console.error('GET /api/wishlist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wishlist — add product to wishlist
router.post('/', async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required' });

    const product = await prisma.product.findUnique({ where: { id: parseInt(productId) }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const existing = await prisma.wishlist.findUnique({
      where: { customerId_productId: { customerId: req.user.id, productId: product.id } },
    });
    if (existing) return res.status(409).json({ error: 'Product already in wishlist' });

    const item = await prisma.wishlist.create({
      data: { customerId: req.user.id, productId: product.id },
    });

    res.status(201).json({ id: item.id, message: 'Added to wishlist' });
  } catch (err) {
    console.error('POST /api/wishlist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wishlist/:productId — remove from wishlist
router.delete('/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (!productId) return res.status(400).json({ error: 'Invalid product ID' });

    const item = await prisma.wishlist.findUnique({
      where: { customerId_productId: { customerId: req.user.id, productId } },
    });
    if (!item) return res.status(404).json({ error: 'Not in wishlist' });

    await prisma.wishlist.delete({ where: { id: item.id } });
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.error('DELETE /api/wishlist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wishlist/check/:productId — check if product is wishlisted
router.get('/check/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (!productId) return res.status(400).json({ error: 'Invalid product ID' });

    const item = await prisma.wishlist.findUnique({
      where: { customerId_productId: { customerId: req.user.id, productId } },
    });
    res.json({ wishlisted: !!item });
  } catch (err) {
    console.error('GET /api/wishlist/check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
