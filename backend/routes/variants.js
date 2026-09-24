const { Router } = require('express');
const prisma = require('../lib/prisma');
const { rateLimiters } = require('../middleware/security');
const { safeParseInt } = require('../middleware/security');

const router = Router();

// GET /api/products/:id/variants — public: list active variants
router.get('/:id/variants', rateLimiters.read, async (req, res) => {
  try {
    const productId = safeParseInt(req.params.id);
    if (!productId) return res.status(400).json({ error: 'Invalid product ID' });
    const variants = await prisma.productVariant.findMany({
      where: { productId, isActive: true },
      include: { options: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(variants.map(v => ({
      id: v.id, sku: v.sku, name: v.name, price: v.price,
      stock: v.stock, options: v.options.map(o => ({ key: o.optionKey, value: o.optionValue })),
    })));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch variants' }); }
});

module.exports = router;
