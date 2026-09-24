const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { safeParseInt, cacheControl } = require('../middleware/security');

// ── Sort whitelist ──
const SORT_OPTIONS = {
  'newest':      { createdAt: 'desc' },
  'oldest':      { createdAt: 'asc' },
  'price_asc':   { price: 'asc' },
  'price_desc':  { price: 'desc' },
  'name_asc':    { sortOrder: 'asc' },
  'name_desc':   { sortOrder: 'desc' },
  'stock_desc':  { stock: 'desc' },
};
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function formatProduct(p, locale, reviewData) {
  const loc = p.localizations.find(l => l.locale === locale) || p.localizations[0];
  const imageCount = p._count?.images ?? (p.images ? p.images.length : 0);
  const rd = reviewData || {};
  return {
    id: p.id, sku: p.sku, slug: p.slug,
    name: loc ? loc.name : '',
    description: loc ? loc.description : null,
    price: p.price, price_unit: p.priceUnit,
    stock: p.stock, status: p.status,
    origin: p.origin, warranty: p.warranty,
    model_number: p.modelNumber,
    category_slug: p.category ? p.category.slug : null,
    category_name: p.category ? (p.category.localizations.find(l => l.locale === locale) || p.category.localizations[0] || {}).name : null,
    brand: p.brand ? { slug: p.brand.slug, name: (p.brand.localizations.find(l => l.locale === locale) || p.brand.localizations[0] || {}).name } : null,
    images: p.images ? p.images.map(img => ({ id: img.id, url: img.url, alt_lo: img.altLo, alt_en: img.altEn, is_primary: img.isPrimary, sort_order: img.sortOrder })) : [],
    image_count: imageCount,
    average_rating: rd.average_rating ?? null,
    review_count: rd.review_count ?? 0,
    created_at: p.createdAt,
  };
}

// GET /api/products - list with search, filters, sorting, pagination
router.get('/', cacheControl(60), async (req, res) => {
  try {
    const locale = req.query.locale || 'lo';
    const where = { status: 'active' };
    const conditions = [];  // collect all conditions, then merge

    // ── Search: q (name, SKU, model across localizations) ──
    const q = req.query.q || req.query.search; // backward compat
    if (q && typeof q === 'string' && q.trim()) {
      const term = q.trim();
      // Find matching product IDs from localizations (name search)
      const nameMatches = await prisma.productLocalization.findMany({
        where: { name: { contains: term } },
        select: { productId: true },
      });
      const nameIds = nameMatches.map(l => l.productId);
      // Also match by SKU, modelNumber, or slug on the Product table
      const orConditions = [
        { id: { in: nameIds } },
        { sku: { contains: term } },
        { modelNumber: { contains: term } },
        { slug: { contains: term } },
      ];
      // If term could be a number, also search price
      const numVal = Number(term);
      if (Number.isInteger(numVal) && numVal > 0) {
        orConditions.push({ price: numVal });
      }
      conditions.push({ OR: orConditions });
    }

    // Determine whether to return paginated format
    const usePagination = req.query.page !== undefined || req.query.limit !== undefined ||
                          req.query.sort !== undefined || req.query.inStock !== undefined ||
                          req.query.minPrice !== undefined || req.query.maxPrice !== undefined;
    const emptyResult = usePagination
      ? { products: [], total: 0, page: 1, limit: DEFAULT_LIMIT, totalPages: 0 }
      : [];

    // ── Filter: category slug (includes all descendants recursively) ──
    if (req.query.category && typeof req.query.category === 'string') {
      const cat = await prisma.category.findUnique({ where: { slug: req.query.category.trim() } });
      if (!cat) return res.json(emptyResult);
      // Recursively collect all descendant category IDs
      const catIds = [cat.id];
      const queue = [cat.id];
      while (queue.length > 0) {
        const parentId = queue.shift();
        const children = await prisma.category.findMany({ where: { parentId }, select: { id: true } });
        for (const child of children) {
          catIds.push(child.id);
          queue.push(child.id);
        }
      }
      conditions.push({ categoryId: { in: catIds } });
    }

    // ── Filter: brand slug ──
    if (req.query.brand && typeof req.query.brand === 'string') {
      const brand = await prisma.brand.findUnique({ where: { slug: req.query.brand.trim() } });
      if (!brand) return res.json(emptyResult);
      conditions.push({ brandId: brand.id });
    }

    // ── Filter: price range ──
    if (req.query.minPrice !== undefined) {
      const min = safeParseInt(req.query.minPrice);
      if (min !== null) conditions.push({ price: { gte: min } });
    }
    if (req.query.maxPrice !== undefined) {
      const max = safeParseInt(req.query.maxPrice);
      if (max !== null) conditions.push({ price: { lte: max } });
    }

    // ── Filter: inStock ──
    if (req.query.inStock === 'true') {
      conditions.push({ stock: { gt: 0 } });
    }

    // ── Filter: stockFilter (low/out) — server-side ──
    if (req.query.stockFilter === 'low') {
      conditions.push({ stock: { gt: 0, lte: 50 } });
    } else if (req.query.stockFilter === 'out') {
      conditions.push({ stock: { lte: 0 } });
    }

    // ── Merge all conditions with AND ──
    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // ── Sorting (whitelist) ──
    const sortKey = req.query.sort || 'newest';
    const orderBy = SORT_OPTIONS[sortKey] || SORT_OPTIONS['newest'];

    // ── Pagination ──
    let page = safeParseInt(req.query.page) || 1;
    let limit = safeParseInt(req.query.limit) || DEFAULT_LIMIT;
    if (page < 1) page = 1;
    if (limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const skip = (page - 1) * limit;

    // ── Execute query ──
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          localizations: true,
          images: { where: { isPrimary: true }, take: 1 },
          category: { include: { localizations: true } },
          brand: { include: { localizations: true } },
          _count: { select: { images: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // ── Batch aggregate reviews for listed products ──
    const productIds = products.map(p => p.id);
    const reviewStats = productIds.length > 0 ? await prisma.productReview.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, status: 'approved' },
      _avg: { rating: true },
      _count: { rating: true },
    }) : [];
    const reviewMap = {};
    for (const rs of reviewStats) {
      reviewMap[rs.productId] = {
        average_rating: rs._avg.rating ? Math.round(rs._avg.rating * 10) / 10 : null,
        review_count: rs._count.rating,
      };
    }

    const formatted = products.map(p => formatProduct(p, locale, reviewMap[p.id] || {}));

    if (usePagination) {
      return res.json({
        products: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Backward compatibility: flat array for old-style queries
    res.json(formatted);
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/filters - get available filter options
router.get('/filters', cacheControl(300), async (req, res) => {
  try {
    const [categories, brands, priceStats] = await Promise.all([
      prisma.category.findMany({
        where: { parentId: null },
        include: { localizations: true, _count: { select: { products: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.brand.findMany({
        include: { localizations: true, _count: { select: { products: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.product.aggregate({
        where: { status: 'active' },
        _min: { price: true },
        _max: { price: true },
      }),
    ]);      const locale = req.query.locale || 'lo';

    // Build parent-child hierarchy with child product counts
    const categoryTree = [];
    for (const parent of categories) {
      const parentLoc = parent.localizations.find(l => l.locale === locale) || parent.localizations[0];
      // Count products in children
      const childSlugs = [];
      const childrenWithCounts = [];
      // Fetch children with counts
      const childCats = await prisma.category.findMany({
        where: { parentId: parent.id },
        include: { localizations: true, _count: { select: { products: true } } },
        orderBy: { sortOrder: 'asc' },
      });
      for (const ch of childCats) {
        const chLoc = ch.localizations.find(l => l.locale === locale) || ch.localizations[0];
        childrenWithCounts.push({ slug: ch.slug, name: chLoc ? chLoc.name : ch.slug, count: ch._count.products });
        childSlugs.push(ch._count.products);
      }
      const totalCount = parent._count.products + childSlugs.reduce((a, b) => a + b, 0);
      categoryTree.push({
        slug: parent.slug, name: parentLoc ? parentLoc.name : parent.slug, icon: parent.icon,
        count: totalCount,
        children: childrenWithCounts,
      });
    }

    res.json({
      categories: categoryTree,
      brands: brands.map(b => {
        const loc = b.localizations.find(l => l.locale === locale) || b.localizations[0];
        return { slug: b.slug, name: loc ? loc.name : '', count: b._count.products };
      }),
      priceRange: {
        min: priceStats._min.price || 0,
        max: priceStats._max.price || 0,
      },
      sortOptions: Object.keys(SORT_OPTIONS).map(k => ({ value: k, label: k })),
    });
  } catch (err) {
    console.error('GET /api/products/filters error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:slug - single product detail
router.get('/:slug', cacheControl(60), async (req, res) => {
  try {
    const locale = req.query.locale || 'lo';
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        localizations: true,
        images: { orderBy: { sortOrder: 'asc' } },
        specifications: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { sortOrder: 'asc' } },
        category: { include: { localizations: true } },
        brand: { include: { localizations: true } },
        relatedProducts: {
          include: {
            relatedProduct: {
              include: { localizations: true, images: { where: { isPrimary: true }, take: 1 }, specifications: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });

    if (!product || product.status !== 'active') return res.status(404).json({ error: 'Product not found' });

    const loc = product.localizations.find(l => l.locale === locale) || product.localizations[0];
    const catLoc = product.category ? product.category.localizations.find(l => l.locale === locale) : null;
    const brandLoc = product.brand ? product.brand.localizations.find(l => l.locale === locale) : null;

    res.json({
      id: product.id, sku: product.sku, slug: product.slug,
      name: loc ? loc.name : '',
      description: loc ? loc.description : null,
      price: product.price, price_unit: product.priceUnit,
      stock: product.stock, status: product.status,
      origin: product.origin, warranty: product.warranty,
      model_number: product.modelNumber,
      category: product.category ? { slug: product.category.slug, name: catLoc ? catLoc.name : '' } : null,
      brand: product.brand ? { slug: product.brand.slug, name: brandLoc ? brandLoc.name : '' } : null,
      images: product.images.map(img => ({
        id: img.id, url: img.url, alt_lo: img.altLo, alt_en: img.altEn,
        is_primary: img.isPrimary, sort_order: img.sortOrder,
      })),
      specifications: product.specifications.map(s => ({
        key: s.specKey,
        label: locale === 'en' ? s.specLabelEn : s.specLabelLo,
        value: s.specValue,
      })),
      documents: (product.documents || []).map(d => ({
        id: d.id, title: locale === 'en' ? d.titleEn : d.titleLo,
        file_url: d.fileUrl, file_type: d.fileType, sort_order: d.sortOrder,
      })),
      how_to_use: locale === 'en' ? loc?.howToUseEn : loc?.howToUseLo,
      related_products: product.relatedProducts.map(rp => {
        const rLoc = rp.relatedProduct.localizations.find(l => l.locale === locale) || rp.relatedProduct.localizations[0];
        const rImg = rp.relatedProduct.images?.[0];
        return {
          sku: rp.relatedProduct.sku, slug: rp.relatedProduct.slug,
          name: rLoc ? rLoc.name : '',
          price: rp.relatedProduct.price, stock: rp.relatedProduct.stock,
          image: rImg ? rImg.url : null,
          brand: rp.relatedProduct.brand ? { slug: rp.relatedProduct.brand.slug, name: (rp.relatedProduct.brand.localizations.find(l => l.locale === locale) || rp.relatedProduct.brand.localizations[0] || {}).name } : null,
          category_name: rp.relatedProduct.category ? (rp.relatedProduct.category.localizations.find(l => l.locale === locale) || rp.relatedProduct.category.localizations[0] || {}).name : null,
        };
      }),
    });
  } catch (err) {
    console.error('GET /api/products/:slug error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── REVIEWS ───────────────────────────────────────
const { authMiddleware } = require('../lib/auth');

// GET /api/products/:slug/reviews — list approved reviews + stats
router.get('/:slug/reviews', cacheControl(60), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const page = Math.max(1, safeParseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, safeParseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: product.id, status: 'approved' },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.productReview.count({ where: { productId: product.id, status: 'approved' } }),
      prisma.productReview.aggregate({
        where: { productId: product.id, status: 'approved' },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    res.json({
      reviews: reviews.map(r => ({
        id: r.id, rating: r.rating, title: r.title, comment: r.comment,
        customer_name: r.customer.name,
        created_at: r.createdAt,
      })),
      total, page, limit,
      average_rating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : null,
      total_reviews: stats._count.rating,
    });
  } catch (err) {
    console.error('GET /api/products/:slug/reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:slug/reviews — submit review (auth required)
router.post('/:slug/reviews', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { rating, title, comment } = req.body;
    const r = parseInt(rating, 10);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: 'Rating must be an integer from 1 to 5' });
    }
    if (title && typeof title === 'string' && title.length > 200) {
      return res.status(400).json({ error: 'Title must be 200 characters or less' });
    }
    if (comment && typeof comment === 'string' && comment.length > 2000) {
      return res.status(400).json({ error: 'Comment must be 2000 characters or less' });
    }

    // Check duplicate
    const existing = await prisma.productReview.findUnique({
      where: { productId_customerId: { productId: product.id, customerId: req.user.id } },
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }

    const review = await prisma.productReview.create({
      data: {
        productId: product.id,
        customerId: req.user.id,
        rating: r,
        title: title || null,
        comment: comment || null,
        status: 'pending',
      },
    });

    res.status(201).json({ id: review.id, status: review.status, message: 'Review submitted for moderation' });
  } catch (err) {
    console.error('POST /api/products/:slug/reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:slug/reviews — update own review
router.put('/:slug/reviews', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const review = await prisma.productReview.findUnique({
      where: { productId_customerId: { productId: product.id, customerId: req.user.id } },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const { rating, title, comment } = req.body;
    const data = {};
    if (rating !== undefined) {
      const r = parseInt(rating, 10);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ error: 'Rating must be an integer from 1 to 5' });
      }
      data.rating = r;
    }
    if (title !== undefined) data.title = title || null;
    if (comment !== undefined) data.comment = comment || null;
    data.status = 'pending'; // re-submit for moderation

    const updated = await prisma.productReview.update({ where: { id: review.id }, data });
    res.json({ id: updated.id, status: updated.status, message: 'Review updated and resubmitted for moderation' });
  } catch (err) {
    console.error('PUT /api/products/:slug/reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:slug/reviews — delete own review
router.delete('/:slug/reviews', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const review = await prisma.productReview.findUnique({
      where: { productId_customerId: { productId: product.id, customerId: req.user.id } },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await prisma.productReview.delete({ where: { id: review.id } });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /api/products/:slug/reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id/variants — public: list active variants for a product
router.get('/:id/variants', cacheControl(60), async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
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
