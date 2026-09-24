const { Router } = require('express');
const prisma = require('../lib/prisma');
const { rateLimiters, cacheControl } = require('../middleware/security');

const router = Router();

// GET /api/shipping/companies — public: list active shipping companies with branches
router.get('/companies', rateLimiters.read, cacheControl(300), async (req, res) => {
  try {
    const companies = await prisma.shippingCompany.findMany({
      where: { isActive: true },
      include: {
        branches: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(companies.map(c => ({
      id: c.id,
      name: c.name,
      name_en: c.nameEn,
      phone: c.phone,
      logo_url: c.logoUrl,
      branches: c.branches.map(b => ({
        id: b.id,
        name: b.name,
        name_en: b.nameEn,
        province: b.province,
        district: b.district,
        phone: b.phone,
      })),
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipping companies' });
  }
});

module.exports = router;
