const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../lib/auth');
const { isValidQuantity, safeParseInt } = require('../middleware/security');

const router = Router();
router.use(authMiddleware);

// Helper: get or create cart for current customer
async function getOrCreateCart(customerId) {
  let cart = await prisma.cart.findUnique({
    where: { customerId },
    include: { items: true },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId },
      include: { items: true },
    });
  }
  return cart;
}

// Helper: format cart response with live product data (batch query, no N+1)
async function formatCart(cart) {
  if (cart.items.length === 0) return { id: cart.id, items: [] };
  const productIds = cart.items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { localizations: true, images: { where: { isPrimary: true }, take: 1 } },
  });
  const productMap = {};
  for (const p of products) productMap[p.id] = p;
  // Batch-fetch all variants in one query
  const variantIds = cart.items.filter(i => i.variantId).map(i => i.variantId);
  const variants = variantIds.length > 0
    ? await prisma.productVariant.findMany({ where: { id: { in: variantIds } } })
    : [];
  const variantMap = {};
  for (const v of variants) variantMap[v.id] = v;
  const items = cart.items.map(item => {
    const product = productMap[item.productId];
    if (!product) return null;
    const loc = product.localizations.find((l) => l.locale === 'lo') || product.localizations[0];
    const thumb = product.images && product.images[0];
    // Resolve variant info
    let variantPrice = product.price;
    let variantStock = product.stock;
    let variantName = item.variantName || null;
    let variantSku = product.sku;
    if (item.variantId) {
      const variant = variantMap[item.variantId];
      if (variant && variant.isActive) {
        variantPrice = variant.price || product.price;
        variantStock = variant.stock;
        variantName = variant.name || variantName;
        variantSku = variant.sku;
      }
    }
    return {
      id: item.id,
      product_id: product.id,
      variant_id: item.variantId || null,
      variant_name: variantName,
      name: loc ? loc.name : '',
      sku: variantSku,
      slug: product.slug,
      price: variantPrice,
      price_unit: product.priceUnit,
      quantity: item.quantity,
      stock: variantStock,
      in_stock: variantStock > 0,
      thumbnail_url: thumb ? thumb.url : null,
    };
  });
  return { id: cart.id, items: items.filter(Boolean) };
}

// GET /api/cart — get current customer's cart
router.get('/', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const formatted = await formatCart(cart);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /api/cart/items — add item to cart
router.post('/items', async (req, res) => {
  try {
    let { productId, quantity, variantId } = req.body;
    productId = safeParseInt(productId);
    variantId = variantId ? safeParseInt(variantId) : null;
    if (!productId) {
      return res.status(400).json({ error: 'Valid productId is required' });
    }
    if (!isValidQuantity(quantity)) {
      return res.status(400).json({ error: 'quantity must be a positive integer (1-10000)' });
    }
    quantity = parseInt(quantity, 10);
    // Validate product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }
    // Validate variant if provided
    let variantName = null;
    if (variantId) {
      const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId, isActive: true } });
      if (!variant) {
        return res.status(400).json({ error: 'Invalid variant for this product' });
      }
      variantName = variant.name;
    }
    const cart = await getOrCreateCart(req.user.id);
    // Check if item already exists (matching product + variant)
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: variantId || null },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity, variantId, variantName },
      });
    }
    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });
    const formatted = await formatCart(updated);
    res.status(existing ? 200 : 201).json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// PUT /api/cart/items/:id — update quantity
router.put('/items/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!isValidQuantity(quantity)) {
      return res.status(400).json({ error: 'quantity must be a positive integer (1-10000)' });
    }
    const itemId = safeParseInt(req.params.id);
    if (!itemId) {
      return res.status(400).json({ error: 'Invalid cart item ID' });
    }
    const cart = await getOrCreateCart(req.user.id);
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });
    const formatted = await formatCart(updated);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// DELETE /api/cart/items/:id — remove item
router.delete('/items/:id', async (req, res) => {
  try {
    const itemId = safeParseInt(req.params.id);
    if (!itemId) {
      return res.status(400).json({ error: 'Invalid cart item ID' });
    }
    const cart = await getOrCreateCart(req.user.id);
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    await prisma.cartItem.delete({ where: { id: item.id } });
    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });
    const formatted = await formatCart(updated);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// DELETE /api/cart — clear entire cart
router.delete('/', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });
    const formatted = await formatCart(updated);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
