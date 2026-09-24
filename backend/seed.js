const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const isReset = process.argv.includes('--reset');
  if (isReset) {
    console.log('Resetting product stock and names to defaults...');
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '_seed_data.json'), 'utf8'));
    for (const p of data.products) {
      await prisma.product.updateMany({ where: { sku: p.sku }, data: { stock: p.stock || 500 } });
      // Restore canonical localization names so dev/test pollution cannot persist across resets
      if (p.loName || p.enName) {
        await prisma.productLocalization.updateMany({ where: { product: { sku: p.sku }, locale: 'lo' }, data: { name: p.loName || '' } });
        await prisma.productLocalization.updateMany({ where: { product: { sku: p.sku }, locale: 'en' }, data: { name: p.enName || '' } });
      }
    }
    console.log('  Product stock and names reset to defaults.');
    return;
  }

  console.log('Seeding NB LAO database...');
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '_seed_data.json'), 'utf8'));

  // Clear new tables (Phase 5)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  // Clear loyalty tables (Phase 16)
  await prisma.pointsLedger.deleteMany();
  await prisma.loyaltyConfig.deleteMany();
  await prisma.loyaltyTier.deleteMany();
  // Clear Phase 24 tables
  await prisma.importJob.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.quotationStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.productVariantOption.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.deliveryAddress.deleteMany();
  await prisma.shippingBranch.deleteMany();
  await prisma.shippingCompany.deleteMany();
  // Clear all tables
  await prisma.productRelation.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productLocalization.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brandLocalization.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.categoryLocalization.deleteMany();
  await prisma.category.deleteMany();

  // CATEGORIES
  const catIdMap = {};
  for (const cat of data.categories) {
    const created = await prisma.category.create({
      data: {
        slug: cat.slug, icon: cat.icon, sortOrder: 0,
        localizations: { create: [{ locale: 'lo', name: cat.lo }, { locale: 'en', name: cat.en }] },
      },
    });
    catIdMap[cat.slug] = created.id;
    for (let i = 0; i < cat.subs.length; i++) {
      const sub = cat.subs[i];
      const subCreated = await prisma.category.create({
        data: {
          parentId: created.id, slug: cat.slug + '-' + sub.slug, sortOrder: i + 1,
          localizations: { create: [{ locale: 'lo', name: sub.lo }, { locale: 'en', name: sub.en }] },
        },
      });
      catIdMap[cat.slug + '-' + sub.slug] = subCreated.id;
    }
  }
  console.log('  Categories: ' + Object.keys(catIdMap).length + ' created');

  // BRANDS
  const brandIdMap = {};
  for (const brand of data.brands) {
    const created = await prisma.brand.create({
      data: {
        slug: brand.slug, sortOrder: brand.sortOrder,
        localizations: { create: [{ locale: 'lo', name: brand.name }, { locale: 'en', name: brand.name }] },
      },
    });
    brandIdMap[brand.slug] = created.id;
  }
  console.log('  Brands: ' + data.brands.length + ' created');

  // PRODUCTS
  const productIdMap = {};
  for (const p of data.products) {
    const created = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku, slug: p.slug,
        categoryId: catIdMap[p.catSlug],
        brandId: p.brandSlug ? brandIdMap[p.brandSlug] : undefined,
        price: p.price !== undefined ? p.price : undefined,
        priceUnit: p.priceUnit || undefined,
        stock: p.stock || 0,
        origin: p.origin || undefined,
        warranty: p.warranty || undefined,
        modelNumber: p.modelNumber || undefined,
        localizations: { create: [
          { locale: 'lo', name: p.loName, description: p.loDesc || undefined },
          { locale: 'en', name: p.enName, description: p.enDesc || undefined },
        ]},
      },
      update: { stock: p.stock || 500 },
    });
    productIdMap[p.sku] = created.id;
    if (p.specs) {
      for (let i = 0; i < p.specs.length; i++) {
        const s = p.specs[i];
        await prisma.productSpecification.create({
          data: {
            productId: created.id, specKey: s.key,
            specLabelLo: s.loLabel, specLabelEn: s.enLabel,
            specValue: s.value, sortOrder: i + 1,
          },
        });
      }
    }
  }
  console.log('  Products: ' + data.products.length + ' created');


  // CUSTOMERS
  const existingCustomer = await prisma.customer.findUnique({ where: { email: 'test@nblao.la' } });
  if (!existingCustomer) {
    const customerHash = await bcrypt.hash('TestPass123!', 10);
    await prisma.customer.create({
      data: {
        email: 'test@nblao.la',
        passwordHash: customerHash,
        name: 'Test User',
        phone: '+856 20 1234 5678',
        company: 'NB Lao Trading Co.',
        role: 'customer',
      },
    });
    console.log('  Customers: 1 created');
  } else {
    console.log('  Customers: already seeded');
  }

  // POSITIONS
  const positions = [
    { name: 'Super Admin', description: 'Full system access', isSystem: true },
    { name: 'Admin', description: 'Administrative access', isSystem: true },
    { name: 'Staff', description: 'Standard staff access', isSystem: false },
    { name: 'Order Manager', description: 'Order and quotation management', isSystem: false },
    { name: 'Catalog Manager', description: 'Product catalog management', isSystem: false },
  ];
  for (const pos of positions) {
    const existing = await prisma.position.findUnique({ where: { name: pos.name } });
    if (!existing) {
      await prisma.position.create({ data: pos });
    }
  }
  console.log('  Positions: ' + positions.length + ' ensured');

  // LOYALTY TIERS
  const tiers = [
    { name: 'Bronze', minPoints: 0, minSpending: 0, discount: 0, multiplier: 1.0, sortOrder: 1 },
    { name: 'Silver', minPoints: 5000, minSpending: 5000000, discount: 2.0, multiplier: 1.2, sortOrder: 2 },
    { name: 'Gold', minPoints: 20000, minSpending: 20000000, discount: 5.0, multiplier: 1.5, sortOrder: 3 },
    { name: 'Platinum', minPoints: 50000, minSpending: 50000000, discount: 10.0, multiplier: 2.0, sortOrder: 4 },
  ];
  for (const tier of tiers) {
    const existing = await prisma.loyaltyTier.findUnique({ where: { name: tier.name } });
    if (!existing) {
      await prisma.loyaltyTier.create({ data: tier });
    }
  }
  console.log('  Loyalty tiers: ' + tiers.length + ' ensured');

  // LOYALTY CONFIG
  const existingConfig = await prisma.loyaltyConfig.findFirst();
  if (!existingConfig) {
    await prisma.loyaltyConfig.create({
      data: {
        config: JSON.stringify({
          enabled: true,
          earningRate: 1,
          redemptionRate: 1000,
          minRedeem: 100,
          maxRedeemPerOrder: 0.5,
          minOrderForRedeem: 100000,
          expirationDays: 365,
          eligibleStatuses: ['confirmed', 'processing', 'shipped', 'delivered'],
        }),
      },
    });
    console.log('  Loyalty config: created');
  } else {
    console.log('  Loyalty config: already seeded');
  }

  // ADMIN ACCOUNT (Super Admin)
  const existingAdmin = await prisma.customer.findUnique({ where: { email: 'admin@nblao.la' } });
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const adminCustomer = await prisma.customer.create({
      data: {
        email: 'admin@nblao.la',
        passwordHash: adminHash,
        name: 'NB Lao Admin',
        role: 'admin',
      },
    });
    // Create staff record for admin
    const superAdminPos = await prisma.position.findUnique({ where: { name: 'Super Admin' } });
    await prisma.staff.create({
      data: {
        customerId: adminCustomer.id,
        positionId: superAdminPos ? superAdminPos.id : null,
        isSuperAdmin: true,
        permissions: JSON.stringify(['all']),
      },
    });
    await prisma.customer.update({ where: { id: adminCustomer.id }, data: { staffId: (await prisma.staff.findFirst({ where: { customerId: adminCustomer.id } })).id } });
    console.log('  Admin account: admin@nblao.la created (Super Admin)');
  } else {
    // Ensure existing admin has a staff record
    const adminStaff = await prisma.staff.findUnique({ where: { customerId: existingAdmin.id } });
    if (!adminStaff) {
      const superAdminPos = await prisma.position.findUnique({ where: { name: 'Super Admin' } });
      const staff = await prisma.staff.create({
        data: {
          customerId: existingAdmin.id,
          positionId: superAdminPos ? superAdminPos.id : null,
          isSuperAdmin: true,
          permissions: JSON.stringify(['all']),
        },
      });
      await prisma.customer.update({ where: { id: existingAdmin.id }, data: { staffId: staff.id } });
      console.log('  Admin staff record created');
    } else {
      console.log('  Admin account: already seeded');
    }
  }

  // ── SHIPPING COMPANIES ──
  const shippingCompanies = [
    { name: 'ອານຸສິດ', nameEn: 'Anusith', sortOrder: 1 },
    { name: 'ຮຸ່ງອາລຸນ', nameEn: 'Houngaloun', sortOrder: 2 },
    { name: 'ມີໄຊ', nameEn: 'Meexay', sortOrder: 3 },
    { name: 'ກຽງໄກ', nameEn: 'Keoangkai', sortOrder: 4 },
    { name: 'ຢູ່ນິເທວ', nameEn: 'Youni Thew', sortOrder: 5 },
  ];
  for (const sc of shippingCompanies) {
    const existing = await prisma.shippingCompany.findUnique({ where: { name: sc.name } });
    if (!existing) {
      await prisma.shippingCompany.create({ data: sc });
    }
  }
  console.log('  Shipping companies: ' + shippingCompanies.length + ' ensured');

  // ── PAYMENT METHODS ──
  const paymentMethods = [
    { code: 'bank_transfer', nameLo: 'ຍ້າຍເງິນຜ່ານທະນາຄານ', nameEn: 'Bank Transfer', sortOrder: 1 },
    { code: 'qr', nameLo: 'ຈ່າຍຜ່ານ QR', nameEn: 'QR Payment', sortOrder: 2 },
    { code: 'cod', nameLo: 'ຈ່າຍເງິນນະມັດສະການ', nameEn: 'Cash on Delivery', sortOrder: 3 },
  ];
  for (const pm of paymentMethods) {
    const existing = await prisma.paymentMethod.findUnique({ where: { code: pm.code } });
    if (!existing) {
      await prisma.paymentMethod.create({ data: pm });
    }
  }
  console.log('  Payment methods: ' + paymentMethods.length + ' ensured');

  // PRODUCT RELATIONS
  await prisma.productRelation.create({
    data: {
      sourceProductId: productIdMap['EL-BRK-40A'],
      relatedProductId: productIdMap['EL-PNL-12W'],
    },
  });
  console.log('  Product relations: 1 created');
  console.log('Seed complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
