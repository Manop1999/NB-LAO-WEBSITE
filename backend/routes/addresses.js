const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../lib/auth');
const { safeParseInt, sanitizeString } = require('../middleware/security');

const router = Router();
router.use(authMiddleware);

// GET /api/addresses — list customer's delivery addresses
router.get('/', async (req, res) => {
  try {
    const addresses = await prisma.deliveryAddress.findMany({
      where: { customerId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(addresses.map(a => ({
      id: a.id, label: a.label, recipient_name: a.recipientName,
      phone: a.phone, address_line1: a.addressLine1, address_line2: a.addressLine2,
      province: a.province, district: a.district, village: a.village,
      postal_code: a.postalCode, is_default: a.isDefault,
    })));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch addresses' }); }
});

// POST /api/addresses — create delivery address
router.post('/', async (req, res) => {
  try {
    const { label, recipient_name, phone, address_line1, address_line2,
            province, district, village, postal_code, is_default } = req.body;
    if (!recipient_name || !phone || !address_line1 || !province || !district) {
      return res.status(400).json({ error: 'recipient_name, phone, address_line1, province, and district are required' });
    }
    // If setting as default, unset other defaults
    if (is_default) {
      await prisma.deliveryAddress.updateMany({
        where: { customerId: req.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    const address = await prisma.deliveryAddress.create({
      data: {
        customerId: req.user.id,
        label: label || null,
        recipientName: sanitizeString(recipient_name),
        phone: sanitizeString(phone),
        addressLine1: sanitizeString(address_line1),
        addressLine2: address_line2 || null,
        province: sanitizeString(province),
        district: sanitizeString(district),
        village: village || null,
        postalCode: postal_code || null,
        isDefault: !!is_default,
      },
    });
    res.status(201).json({
      id: address.id, label: address.label, recipient_name: address.recipientName,
      phone: address.phone, address_line1: address.addressLine1, address_line2: address.addressLine2,
      province: address.province, district: address.district, village: address.village,
      postal_code: address.postalCode, is_default: address.isDefault,
    });
  } catch (err) { res.status(500).json({ error: 'Failed to create address' }); }
});

// PUT /api/addresses/:id — update delivery address
router.put('/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid address ID' });
    const existing = await prisma.deliveryAddress.findFirst({ where: { id, customerId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    const { label, recipient_name, phone, address_line1, address_line2,
            province, district, village, postal_code, is_default } = req.body;
    if (is_default) {
      await prisma.deliveryAddress.updateMany({
        where: { customerId: req.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    const updated = await prisma.deliveryAddress.update({
      where: { id },
      data: {
        ...(label !== undefined && { label: label || null }),
        ...(recipient_name !== undefined && { recipientName: sanitizeString(recipient_name) }),
        ...(phone !== undefined && { phone: sanitizeString(phone) }),
        ...(address_line1 !== undefined && { addressLine1: sanitizeString(address_line1) }),
        ...(address_line2 !== undefined && { addressLine2: address_line2 || null }),
        ...(province !== undefined && { province: sanitizeString(province) }),
        ...(district !== undefined && { district: sanitizeString(district) }),
        ...(village !== undefined && { village: village || null }),
        ...(postal_code !== undefined && { postalCode: postal_code || null }),
        ...(is_default !== undefined && { isDefault: !!is_default }),
      },
    });
    res.json({
      id: updated.id, label: updated.label, recipient_name: updated.recipientName,
      phone: updated.phone, address_line1: updated.addressLine1, address_line2: updated.addressLine2,
      province: updated.province, district: updated.district, village: updated.village,
      postal_code: updated.postalCode, is_default: updated.isDefault,
    });
  } catch (err) { res.status(500).json({ error: 'Failed to update address' }); }
});

// DELETE /api/addresses/:id — delete delivery address
router.delete('/:id', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid address ID' });
    const existing = await prisma.deliveryAddress.findFirst({ where: { id, customerId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    await prisma.deliveryAddress.delete({ where: { id } });
    res.json({ message: 'Address deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete address' }); }
});

// PUT /api/addresses/:id/default — set as default
router.put('/:id/default', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid address ID' });
    const existing = await prisma.deliveryAddress.findFirst({ where: { id, customerId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    await prisma.deliveryAddress.updateMany({
      where: { customerId: req.user.id, isDefault: true },
      data: { isDefault: false },
    });
    await prisma.deliveryAddress.update({ where: { id }, data: { isDefault: true } });
    res.json({ message: 'Default address set' });
  } catch (err) { res.status(500).json({ error: 'Failed to set default address' }); }
});

module.exports = router;
