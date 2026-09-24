// Admin router — modular mount/index for all admin sub-modules
// Each module exports a Router. Mount via: app.use('/api/admin', require('./admin'));

const { Router } = require('express');
const { adminMiddleware } = require('../middleware/admin');

const router = Router();
router.use(adminMiddleware);


// CSV EXPORTS & IMPORTS — Phase 27: extracted to ./admin/csv.js
router.use(require('./admin/csv'));


// PDF EXPORT — Phase 27: extracted to ./admin/pdf-exports.js
router.use(require('./admin/pdf-exports'));


// ═══════════════════════════════════════════════
// DASHBOARD SUMMARY — Phase 27: extracted to ./admin/dashboard.js
// ═══════════════════════════════════════════════
router.use(require('./admin/dashboard'));

// ═══════════════════════════════════════════════
// PRODUCTS CRUD — Phase 27: extracted to ./admin/products.js
// ═══════════════════════════════════════════════
router.use(require('./admin/products'));

// ═══════════════════════════════════════════════
// CATEGORIES CRUD — Phase 27: extracted to ./admin/categories.js
// ═══════════════════════════════════════════════
router.use(require('./admin/categories'));

// ═══════════════════════════════════════════════
// BRANDS CRUD — Phase 27: extracted to ./admin/brands.js
// ═══════════════════════════════════════════════
router.use(require('./admin/brands'));

// ═══════════════════════════════════════════════
// ORDERS — Phase 27: extracted to ./admin/orders.js
// ═══════════════════════════════════════════════
router.use(require('./admin/orders'));

// ═══════════════════════════════════════════════
// QUOTATIONS — Phase 27: extracted to ./admin/quotations.js
// ═══════════════════════════════════════════════
router.use(require('./admin/quotations'));

// ═══════════════════════════════════════════════
// CUSTOMERS — Phase 27: extracted to ./admin/customers.js
// ═══════════════════════════════════════════════
router.use(require('./admin/customers'));

// ═══════════════════════════════════════════════
// EMAIL NOTIFICATION LOG — Phase 27: extracted to ./admin/emails.js
// ═══════════════════════════════════════════════
router.use(require('./admin/emails'));

// ═══════════════════════════════════════════════
// POSITIONS — Phase 27: extracted to ./admin/positions.js
// ═══════════════════════════════════════════════
router.use(require('./admin/positions'));

// ═══════════════════════════════════════════════
// STAFF MANAGEMENT — Phase 27: extracted to ./admin/staff.js
// ═══════════════════════════════════════════════
router.use(require('./admin/staff'));

// ═══════════════════════════════════════════════
// PASSWORD RESET BY ADMIN — Phase 27: extracted to ./admin/password-reset.js
// ═══════════════════════════════════════════════
router.use(require('./admin/password-reset'));

// ═══════════════════════════════════════════════
// AUDIT LOGS — Phase 27: extracted to ./admin/audit-logs.js
// ═══════════════════════════════════════════════
router.use(require('./admin/audit-logs'));

// ═══════════════════════════════════════════════
// LOYALTY MANAGEMENT — Phase 27: extracted to ./admin/loyalty.js
// ═══════════════════════════════════════════════
router.use(require('./admin/loyalty'));

// ═══════════════════════════════════════════════
// REPORTS — Phase 27: extracted to ./admin/reports.js
// ═══════════════════════════════════════════════
router.use(require('./admin/reports'));

// ══════════════════════════════════════════════════════
// REVIEWS MANAGEMENT — Phase 27: extracted to ./admin/reviews.js
// ══════════════════════════════════════════════════════
router.use(require('./admin/reviews'));

// ══════════════════════════════════════════════════════
// COUPON CODES MANAGEMENT — Phase 27: extracted to ./admin/coupons.js
// ══════════════════════════════════════════════════════
router.use(require('./admin/coupons'));

// ═══════════════════════════════════════════════
// PRODUCT IMAGES — Phase 27: extracted to ./admin/product-images.js

router.use(require('./admin/product-images'));

// ═══════════════════════════════════════════════
// PRODUCT SPECIFICATIONS — Phase 27: extracted to ./admin/product-specifications.js
// ═══════════════════════════════════════════════
router.use(require('./admin/product-specifications'));

// ═══════════════════════════════════════════════
// PRODUCT DOCUMENTS — Phase 27: extracted to ./admin/product-documents.js
// ═══════════════════════════════════════════════
router.use(require('./admin/product-documents'));

// ═══════════════════════════════════════════════
// PRODUCT RELATIONS — Phase 27: extracted to ./admin/product-relations.js
// ═══════════════════════════════════════════════
router.use(require('./admin/product-relations'));


// ═══════════════════════════════════════════════
// PRODUCT VARIANTS — Phase 27: extracted to ./admin/product-variants.js
router.use(require('./admin/product-variants'));

// ═══════════════════════════════════════════════
// CSV EXPORT — Report CSV Exports: extracted to ./admin/report-exports.js
// ═══════════════════════════════════════════════
router.use(require('./admin/report-exports'));

// ═══════════════════════════════════════════════
// SHIPPING COMPANIES & BRANCHES — Phase 27: extracted to ./admin/shipping.js
// ═══════════════════════════════════════════════
router.use(require('./admin/shipping'));

// PAYMENT METHODS — Phase 27: extracted to ./admin/payment-methods.js
router.use(require('./admin/payment-methods'));

// ═══════════════════════════════════════════════
// WORKFLOW — Phase 27: extracted to ./admin/workflow.js
// ═══════════════════════════════════════════════
router.use(require('./admin/workflow'));

module.exports = router;
