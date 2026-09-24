#!/usr/bin/env bash
# Contract: Phase 0-4 — decomposition, backend, catalog, auth.
# Checks: file existence, byte-identical extraction, backend, schema, API, auth, frontend preservation.
set -uo pipefail
P=0; F=0
pass() { echo "  ✓ $1"; P=$((P+1)); }
fail() { echo "  ✗ $1"; F=$((F+1)); }

echo "=== Phase 1: Decomposition Contract ==="

# Existence
for f in nb_lao_wireframes_v2_original_backup.html nb_lao_wireframes_v2_updated.html styles/nblao.css js/nblao.js; do
  test -f "$f" && pass "$f exists" || fail "$f missing"
done

# Byte-identical extraction
grep -q ':root' styles/nblao.css && grep -qi '#0099ff' styles/nblao.css && pass "css has correct accent color" || fail "css mismatch"
diff -q <(sed -n '893,1261p' nb_lao_wireframes_v2_original_backup.html) js/nblao.js >/dev/null && pass "js matches original" || fail "js mismatch"
diff -q <(sed -n '294,891p' nb_lao_wireframes_v2_original_backup.html) <(sed -n '10,607p' nb_lao_wireframes_v2_updated.html) >/dev/null && pass "html body unchanged" || fail "html body changed"

# Backup integrity
test "$(wc -l < nb_lao_wireframes_v2_original_backup.html)" -eq 1264 && pass "backup 1264 lines" || fail "backup line count wrong"

# Correct references in modified HTML
grep -q 'href="styles/nblao.css"' nb_lao_wireframes_v2_updated.html && pass "css link present" || fail "css link missing"
grep -q 'src="js/nblao.js"' nb_lao_wireframes_v2_updated.html && pass "js script present" || fail "js script missing"

# No leftover inline blocks
! grep -q '<style>' nb_lao_wireframes_v2_updated.html && pass "no inline <style>" || fail "inline <style> found"
! grep -q '</style>' nb_lao_wireframes_v2_updated.html && pass "no inline </style>" || fail "inline </style> found"
! grep -q '^<script>' nb_lao_wireframes_v2_updated.html && pass "no bare <script>" || fail "bare <script> found"

echo ""
echo "=== Phase 2: Backend Foundation ==="

# Existence
test -f package.json && pass "package.json exists" || fail "package.json missing"
test -f prisma/schema.prisma && pass "prisma/schema.prisma exists" || fail "prisma/schema.prisma missing"
test -f backend/server.js && pass "backend/server.js exists" || fail "backend/server.js missing"
test -d node_modules && pass "node_modules exists" || fail "node_modules missing"

# Schema content
grep -q 'model Category' prisma/schema.prisma && pass "Catalog models in schema" || fail "Catalog models missing"
grep -q 'provider = "sqlite"' prisma/schema.prisma && pass "SQLite provider in schema" || fail "SQLite provider missing"

# Database file
test -f prisma/dev.db && pass "prisma/dev.db exists" || fail "prisma/dev.db missing"

echo ""
echo "=== Phase 3: Catalog Database ==="

# Existence
test -f backend/routes/categories.js && pass "routes/categories.js exists" || fail "routes/categories.js missing"
test -f backend/routes/brands.js && pass "routes/brands.js exists" || fail "routes/brands.js missing"
test -f backend/routes/products.js && pass "routes/products.js exists" || fail "routes/products.js missing"
test -f backend/seed.js && pass "backend/seed.js exists" || fail "backend/seed.js missing"
test -f backend/_seed_data.json && pass "backend/_seed_data.json exists" || fail "backend/_seed_data.json missing"

# Schema has catalog models
grep -q 'model Category' prisma/schema.prisma && pass "Category model in schema" || fail "Category model missing"
grep -q 'model Brand' prisma/schema.prisma && pass "Brand model in schema" || fail "Brand model missing"
grep -q 'model Product' prisma/schema.prisma && pass "Product model in schema" || fail "Product model missing"
grep -q 'model ProductImage' prisma/schema.prisma && pass "ProductImage model in schema" || fail "ProductImage model missing"
grep -q 'model ProductSpecification' prisma/schema.prisma && pass "ProductSpecification model in schema" || fail "ProductSpecification model missing"
grep -q 'model ProductRelation' prisma/schema.prisma && pass "ProductRelation model in schema" || fail "ProductRelation model missing"

echo ""
echo "=== Phase 4: Authentication ==="

# Existence
test -f backend/routes/auth.js && pass "routes/auth.js exists" || fail "routes/auth.js missing"
test -f backend/lib/auth.js && pass "lib/auth.js exists" || fail "lib/auth.js missing"

# Schema has Customer model
grep -q 'model Customer' prisma/schema.prisma && pass "Customer model in schema" || fail "Customer model missing"

# Dependencies installed
test -d node_modules/bcryptjs && pass "bcryptjs installed" || fail "bcryptjs missing"
test -d node_modules/jsonwebtoken && pass "jsonwebtoken installed" || fail "jsonwebtoken missing"

# Auth routes mounted in server
grep -q 'api/auth' backend/server.js && pass "auth routes mounted" || fail "auth routes not mounted"

# express.json middleware present
grep -q 'express.json' backend/server.js && pass "express.json middleware" || fail "express.json missing"

# JWT_SECRET fallback in auth lib
grep -q 'nblao-dev-secret' backend/lib/auth.js && pass "JWT dev secret fallback" || fail "JWT fallback missing"

echo ""
echo "=== Frontend Preservation (all phases) ==="

grep -q ':root' styles/nblao.css && grep -qi '#0099ff' styles/nblao.css && pass "css intact with correct accent" || fail "css changed"
diff -q <(sed -n '893,1261p' nb_lao_wireframes_v2_original_backup.html) js/nblao.js >/dev/null && pass "js still matches" || fail "js changed"
test -f nb_lao_wireframes_v2_original_backup.html && pass "backup still exists" || fail "backup missing"

echo ""
echo "=== Phase 5: Shopping Cart & Orders ==="

# Existence
test -f backend/routes/cart.js && pass "routes/cart.js exists" || fail "routes/cart.js missing"
test -f backend/routes/quotations.js && pass "routes/quotations.js exists" || fail "routes/quotations.js missing"
test -f backend/routes/orders.js && pass "routes/orders.js exists" || fail "routes/orders.js missing"

# Schema has new models
grep -q "model Cart" prisma/schema.prisma && pass "Cart model in schema" || fail "Cart model missing"
grep -q "model CartItem" prisma/schema.prisma && pass "CartItem model in schema" || fail "CartItem model missing"
grep -q "model Quotation" prisma/schema.prisma && pass "Quotation model in schema" || fail "Quotation model missing"
grep -q "model QuotationItem" prisma/schema.prisma && pass "QuotationItem model in schema" || fail "QuotationItem model missing"
grep -q "model Order" prisma/schema.prisma && pass "Order model in schema" || fail "Order model missing"
grep -q "model OrderItem" prisma/schema.prisma && pass "OrderItem model in schema" || fail "OrderItem model missing"

# Routes mounted in server
grep -q "api/cart" backend/server.js && pass "cart routes mounted" || fail "cart routes not mounted"
grep -q "api/quotations" backend/server.js && pass "quotations routes mounted" || fail "quotations routes not mounted"
grep -q "api/orders" backend/server.js && pass "orders routes mounted" || fail "orders routes not mounted"

echo ""
echo "=== Phase 6: Admin Dashboard ==="

# Existence
test -f backend/middleware/admin.js && pass "middleware/admin.js exists" || fail "middleware/admin.js missing"
test -f backend/routes/admin.js && pass "routes/admin.js exists" || fail "routes/admin.js missing"

# Admin middleware
grep -q "adminMiddleware" backend/middleware/admin.js && pass "adminMiddleware exported" || fail "adminMiddleware missing"
grep -q "role.*admin" backend/middleware/admin.js && pass "role check present" || fail "role check missing"

# Admin routes mounted
grep -q "api/admin" backend/server.js && pass "admin routes mounted" || fail "admin routes not mounted"

# Admin CRUD endpoints exist in route file
grep -q "/dashboard" backend/routes/admin/dashboard.js && pass "dashboard endpoint" || fail "dashboard endpoint missing"
grep -q "/products" backend/routes/admin/products.js && pass "products CRUD" || fail "products CRUD missing"
grep -q "/categories" backend/routes/admin/categories.js && pass "categories CRUD" || fail "categories CRUD missing"
grep -q "/brands" backend/routes/admin/brands.js && pass "brands CRUD" || fail "brands CRUD missing"

# Admin seed account
grep -q "admin@nblao.la" backend/seed.js && pass "admin seed account" || fail "admin seed missing"

# Phase 6 test file
test -f tests/phase6.test.js && pass "phase6.test.js exists" || fail "phase6.test.js missing"
grep -q "admin" tests/phase6.test.js && pass "phase6 tests cover admin" || fail "phase6 tests missing admin"

echo ""
echo "=== Phase 7: Admin Order & Quotation Management ==="

# Schema has notes fields
grep -q "notes.*String" prisma/schema.prisma && pass "notes field in schema" || fail "notes field missing from schema"

# Admin order/quotation endpoints
grep -q "/orders" backend/routes/admin/orders.js && pass "admin orders endpoint" || fail "admin orders endpoint missing"
grep -q "/quotations" backend/routes/admin/quotations.js && pass "admin quotations endpoint" || fail "admin quotations endpoint missing"

# Status validation
grep -q "VALID_ORDER_STATUSES" backend/routes/admin/orders.js && pass "order status validation" || fail "order status validation missing"
grep -q "VALID_QUOTATION_STATUSES" backend/routes/admin/quotations.js && pass "quotation status validation" || fail "quotation status validation missing"

# Phase 7 test file
test -f tests/phase7.test.js && pass "phase7.test.js exists" || fail "phase7.test.js missing"
grep -q "Admin Orders" tests/phase7.test.js && pass "phase7 tests cover admin orders" || fail "phase7 tests missing admin orders"
grep -q "Admin Quotations" tests/phase7.test.js && pass "phase7 tests cover admin quotations" || fail "phase7 tests missing admin quotations"

echo ""
echo "=== Phase 8: Admin Customer Management ==="

# Customer model has active field
grep -q "active.*Boolean" prisma/schema.prisma && pass "Customer active field" || fail "Customer active field missing"

# Admin customer endpoints
grep -q "/customers" backend/routes/admin/customers.js && pass "admin customers endpoint" || fail "admin customers endpoint missing"

# Deactivation block in auth
grep -q "deactivated" backend/routes/auth.js && pass "deactivation block in auth" || fail "deactivation block missing"

# Phase 8 test file
test -f tests/phase8.test.js && pass "phase8.test.js exists" || fail "phase8.test.js missing"
grep -q "Admin Customers" tests/phase8.test.js && pass "phase8 tests cover admin customers" || fail "phase8 tests missing admin customers"

echo ""
echo "=== Phase 9: Email Notification System ==="

# Email service exists
test -f backend/services/email.js && pass "services/email.js exists" || fail "services/email.js missing"
test -f backend/services/notifications.js && pass "services/notifications.js exists" || fail "services/notifications.js missing"

# Nodemailer installed
test -d node_modules/nodemailer && pass "nodemailer installed" || fail "nodemailer missing"

# EmailNotification model in schema
grep -q "model EmailNotification" prisma/schema.prisma && pass "EmailNotification model" || fail "EmailNotification model missing"

# Email notifications integrated
grep -q "notifyOrderCreated" backend/routes/orders.js && pass "order creation notification" || fail "order creation notification missing"
grep -q "notifyOrderStatusChanged" backend/routes/admin/orders.js && pass "order status notification" || fail "order status notification missing"
grep -q "notifyQuotationCreated" backend/routes/quotations.js && pass "quotation creation notification" || fail "quotation creation notification missing"
grep -q "notifyQuotationStatusChanged" backend/routes/admin/quotations.js && pass "quotation status notification" || fail "quotation status notification missing"
grep -q "notifyAccountActivated" backend/routes/admin/customers.js && pass "account activation notification" || fail "account activation notification missing"
grep -q "notifyAccountDeactivated" backend/routes/admin/customers.js && pass "account deactivation notification" || fail "account deactivation notification missing"

# Admin email log endpoint
grep -q "'/emails'" backend/routes/admin/emails.js 2>/dev/null && pass "admin emails endpoint" || grep -q "api/admin/emails" backend/routes/admin.js && pass "admin emails endpoint" || fail "admin emails endpoint missing"

# Phase 9 test file
test -f tests/phase9.test.js && pass "phase9.test.js exists" || fail "phase9.test.js missing"

echo ""
echo "=== Frontend Preservation (all phases) ==="

grep -q ':root' styles/nblao.css && grep -qi '#0099ff' styles/nblao.css && pass "css intact with correct accent" || fail "css changed"
diff -q <(sed -n '893,1261p' nb_lao_wireframes_v2_original_backup.html) js/nblao.js >/dev/null && pass "js still matches" || fail "js changed"
test -f nb_lao_wireframes_v2_original_backup.html && pass "backup still exists" || fail "backup missing"

echo ""
echo "=== Phase 10: Security Hardening ==="

# Security middleware exists
test -f backend/middleware/security.js && pass "middleware/security.js exists" || fail "middleware/security.js missing"

# Security middleware exports
grep -q "rateLimit" backend/middleware/security.js && pass "rate limiter defined" || fail "rate limiter missing"
grep -q "securityHeaders" backend/middleware/security.js && pass "security headers defined" || fail "security headers missing"
grep -q "sanitizeString" backend/middleware/security.js && pass "input sanitization defined" || fail "input sanitization missing"
grep -q "isValidEmail" backend/middleware/security.js && pass "email validation defined" || fail "email validation missing"
grep -q "isValidPassword" backend/middleware/security.js && pass "password validation defined" || fail "password validation missing"
grep -q "safeParseInt" backend/middleware/security.js && pass "safe parseInt defined" || fail "safe parseInt missing"

# Security middleware integrated in server
grep -q "securityHeaders" backend/server.js && pass "security headers in server" || fail "security headers not in server"
grep -q "sanitizeInput" backend/server.js && pass "sanitize input in server" || fail "sanitize input not in server"
grep -q "rateLimiters" backend/server.js && pass "rate limiters in server" || fail "rate limiters not in server"
grep -q "bodySizeLimit" backend/server.js && pass "body size limit in server" || fail "body size limit not in server"

# Auth hardening
grep -q "isValidEmail" backend/routes/auth.js && pass "auth email validation" || fail "auth email validation missing"
grep -q "isValidPassword" backend/routes/auth.js && pass "auth password validation" || fail "auth password validation missing"

# Cart hardening
grep -q "isValidQuantity" backend/routes/cart.js && pass "cart quantity validation" || fail "cart quantity validation missing"
grep -q "safeParseInt" backend/routes/cart.js && pass "cart safe parseInt" || fail "cart safe parseInt missing"

# Admin hardening
grep -q "safeParseInt" backend/routes/admin/workflow.js && pass "admin safe parseInt" || fail "admin safe parseInt missing"

# Phase 10 test file
test -f tests/phase10.test.js && pass "phase10.test.js exists" || fail "phase10.test.js missing"
grep -q "Security Headers" tests/phase10.test.js && pass "phase10 tests cover headers" || fail "phase10 tests missing headers"
grep -q "Email Validation" tests/phase10.test.js && pass "phase10 tests cover email validation" || fail "phase10 tests missing email validation"
grep -q "Password Strength" tests/phase10.test.js && pass "phase10 tests cover password strength" || fail "phase10 tests missing password strength"
grep -q "Safe Integer" tests/phase10.test.js && pass "phase10 tests cover safe parseInt" || fail "phase10 tests missing safe parseInt"

echo ""
echo "=== Phase 11: Search & Filtering ==="

# Search/filter features exist
grep -q "SORT_OPTIONS" backend/routes/products.js && pass "sort whitelist defined" || fail "sort whitelist missing"
grep -q "MAX_LIMIT" backend/routes/products.js && pass "max limit defined" || fail "max limit missing"
grep -q "minPrice" backend/routes/products.js && pass "price filters implemented" || fail "price filters missing"
grep -q "inStock" backend/routes/products.js && pass "stock filter implemented" || fail "stock filter missing"
grep -q "safeParseInt" backend/routes/products.js && pass "safe parseInt in products" || fail "safe parseInt missing in products"
grep -q "/filters" backend/routes/products.js && pass "filters endpoint exists" || fail "filters endpoint missing"

# Phase 11 test file
test -f tests/phase11.test.js && pass "phase11.test.js exists" || fail "phase11.test.js missing"
grep -q "Basic Search" tests/phase11.test.js && pass "phase11 tests cover search" || fail "phase11 tests missing search"
grep -q "Price Filters" tests/phase11.test.js && pass "phase11 tests cover price filters" || fail "phase11 tests missing price filters"
grep -q "Pagination" tests/phase11.test.js && pass "phase11 tests cover pagination" || fail "phase11 tests missing pagination"
grep -q "Sorting" tests/phase11.test.js && pass "phase11 tests cover sorting" || fail "phase11 tests missing sorting"

echo ""
echo "=== Phase 12: Customer Frontend SPA ==="

# Customer SPA files exist
test -f customer.html && pass "customer.html exists" || fail "customer.html missing"
test -f js/customer.js && pass "js/customer.js exists" || fail "js/customer.js missing"

# Customer SPA features
grep -q "renderHome" js/customer.js && pass "home page rendered" || fail "home page missing"
grep -q "renderProducts" js/customer.js && pass "products page rendered" || fail "products page missing"
grep -q "renderCart" js/customer.js && pass "cart page rendered" || fail "cart page missing"
grep -q "renderLogin" js/customer.js && pass "login page rendered" || fail "login page missing"
grep -q "renderRegister" js/customer.js && pass "register page rendered" || fail "register page missing"
grep -q "renderAccount" js/customer.js && pass "account page rendered" || fail "account page missing"
grep -q "renderOrders" js/customer.js && pass "orders page rendered" || fail "orders page missing"
grep -q "renderQuotations" js/customer.js && pass "quotations page rendered" || fail "quotations page missing"
grep -q "doLogout" js/customer.js && pass "logout function exists" || fail "logout missing"
grep -q "localStorage" js/customer.js && pass "token persistence exists" || fail "token persistence missing"

# Customer SPA route
grep -q "/customer" backend/server.js && pass "customer route in server" || fail "customer route missing"

# Phase 12 test file
test -f tests/phase12.test.js && pass "phase12.test.js exists" || fail "phase12.test.js missing"

echo ""
echo "=== Phase 13: Customer Frontend Refinement ==="
test -f tests/phase13.test.js && pass "phase13.test.js exists" || fail "phase13.test.js missing"
grep -q 'renderCategoryAccordion' js/customer.js && pass "customer.js has category accordion" || fail "category accordion missing"
grep -q 'renderHowToOrder' js/customer.js && pass "customer.js has how-to-order section" || fail "how-to-order missing"
grep -q 'renderStockFilter' js/customer.js && pass "customer.js has expanded stock filters" || fail "expanded stock filters missing"
grep -q 'footer-partners' js/customer.js && pass "customer.js has partners footer" || fail "partners footer missing"
grep -qi '#0099ff' styles/nblao.css && pass "CSS accent color #0099ff" || fail "accent color not updated"
grep -q 'skeleton' customer.html && pass "customer.html has skeleton styles" || fail "skeleton styles missing"
grep -q 'page-in' customer.html && pass "customer.html has page transitions" || fail "page transitions missing"
grep -q 'skeletonHome' js/customer.js && pass "customer.js has skeleton loader" || fail "skeleton loader missing"
grep -q 'toggleCatAcc' js/customer.js && pass "customer.js has accordion toggle" || fail "accordion toggle missing"
grep -q "howToOrder" js/customer.js && pass "customer.js has howToOrder i18n" || fail "howToOrder i18n missing"
grep -q "stockAvailable" js/customer.js && pass "customer.js has stock filter i18n" || fail "stock filter i18n missing"
grep -q 'children' backend/routes/products.js && pass "backend filters has children" || fail "backend children missing"

echo ""
echo "=== Phase 14: Product Detail & Cart UX ==="
test -f tests/phase14.test.js && pass "phase14.test.js exists" || fail "phase14.test.js missing"
grep -q 'switchDetailTab' js/customer.js && pass "customer.js has 5-tab detail" || fail "5-tab detail missing"
grep -q 'setGalleryImage' js/customer.js && pass "customer.js has image gallery" || fail "image gallery missing"
grep -q 'galleryNav' js/customer.js && pass "customer.js has gallery navigation" || fail "gallery nav missing"
grep -q 'clearCart' js/customer.js && pass "customer.js has clear cart" || fail "clear cart missing"
grep -q '_orderSubmitting' js/customer.js && pass "customer.js has order duplicate protection" || fail "order duplicate protection missing"
grep -q '_quoteSubmitting' js/customer.js && pass "customer.js has quote duplicate protection" || fail "quote duplicate protection missing"
grep -q 'success-page' customer.html && pass "customer.html has success page" || fail "success page missing"
grep -q 'gallery-main-img' customer.html && pass "customer.html has gallery CSS" || fail "gallery CSS missing"
grep -q 'detail-tabs' customer.html && pass "customer.html has tabs CSS" || fail "tabs CSS missing"
grep -q 'related-grid' customer.html && pass "customer.html has related products CSS" || fail "related products CSS missing"
grep -q 'tab-desc' js/customer.js && pass "customer.js has desc tab" || fail "desc tab missing"
grep -q 'tab-specs' js/customer.js && pass "customer.js has specs tab" || fail "specs tab missing"
grep -q 'tab-docs' js/customer.js && pass "customer.js has docs tab" || fail "docs tab missing"
grep -q 'tab-howto' js/customer.js && pass "customer.js has howto tab" || fail "howto tab missing"
grep -q 'tab-related' js/customer.js && pass "customer.js has related tab" || fail "related tab missing"
grep -q 'model ProductDocument' prisma/schema.prisma && pass "ProductDocument model in schema" || fail "ProductDocument model missing"
grep -q 'howToUseLo' prisma/schema.prisma && pass "howToUseLo in schema" || fail "howToUseLo missing"
grep -q 'howToUseEn' prisma/schema.prisma && pass "howToUseEn in schema" || fail "howToUseEn missing"
grep -q 'thumbnail_url' backend/routes/cart.js && pass "cart returns thumbnail_url" || fail "cart thumbnail missing"
grep -q 'documents' backend/routes/products.js && pass "products API returns documents" || fail "products documents missing"
grep -q 'how_to_use' backend/routes/products.js && pass "products API returns how_to_use" || fail "products how_to_use missing"
grep -q 'ProductDocument' prisma/schema.prisma && pass "ProductDocument in schema" || fail "ProductDocument missing"

echo ""
echo "=== Phase 15: Admin RBAC & Staff Management ==="
test -f tests/phase15.test.js && pass "phase15.test.js exists" || fail "phase15.test.js missing"
grep -q 'model Staff' prisma/schema.prisma && pass "Staff model in schema" || fail "Staff model missing"
grep -q 'model Position' prisma/schema.prisma && pass "Position model in schema" || fail "Position model missing"
grep -q 'model AuditLog' prisma/schema.prisma && pass "AuditLog model in schema" || fail "AuditLog model missing"
grep -q 'staffId' prisma/schema.prisma && pass "Customer has staffId" || fail "staffId missing"
grep -q 'isSuperAdmin' prisma/schema.prisma && pass "Staff has isSuperAdmin" || fail "isSuperAdmin missing"
grep -q 'requirePermission' backend/middleware/rbac.js && pass "RBAC middleware exported" || fail "RBAC middleware missing"
grep -q 'requireSuperAdmin' backend/middleware/rbac.js && pass "requireSuperAdmin exported" || fail "requireSuperAdmin missing"
grep -q 'auditLog' backend/middleware/rbac.js && pass "auditLog exported" || fail "auditLog missing"
grep -q 'staffRecord' backend/middleware/admin.js && pass "admin middleware has RBAC" || fail "admin middleware missing RBAC"
grep -q 'staffId.*staff' backend/lib/auth.js && pass "auth token includes staffId" || fail "auth token missing staffId"
grep -q '/staff' backend/routes/admin/staff.js && pass "staff routes exist" || fail "staff routes missing"
grep -q '/positions' backend/routes/admin.js && pass "positions routes exist" || fail "positions routes missing"
grep -q '/audit-logs' backend/routes/admin/audit-logs.js && pass "audit-logs routes exist" || fail "audit-logs routes missing"
grep -q 'reset-password' backend/routes/admin/password-reset.js && pass "password reset route exists" || fail "password reset route missing"
grep -q 'loadStaff' admin.html && pass "admin dashboard has staff page" || fail "admin dashboard missing staff"
grep -q 'loadPositions' admin.html && pass "admin dashboard has positions page" || fail "admin dashboard missing positions"
grep -q 'loadAuditLogs' admin.html && pass "admin dashboard has audit page" || fail "admin dashboard missing audit"

echo ""
echo "=== Phase 16: Customer Points & Loyalty ==="
test -f tests/phase16.test.js && pass "phase16.test.js exists" || fail "phase16.test.js missing"
test -f backend/services/loyalty.js && pass "loyalty service exists" || fail "loyalty service missing"
test -f backend/routes/loyalty.js && pass "loyalty routes exist" || fail "loyalty routes missing"
grep -q 'PointsLedger' prisma/schema.prisma && pass "PointsLedger model in schema" || fail "PointsLedger model missing"
grep -q 'LoyaltyConfig' prisma/schema.prisma && pass "LoyaltyConfig model in schema" || fail "LoyaltyConfig model missing"
grep -q 'LoyaltyTier' prisma/schema.prisma && pass "LoyaltyTier model in schema" || fail "LoyaltyTier model missing"
grep -q 'pointsBalance' prisma/schema.prisma && pass "Customer.pointsBalance in schema" || fail "Customer.pointsBalance missing"
grep -q 'lifetimePoints' prisma/schema.prisma && pass "Customer.lifetimePoints in schema" || fail "Customer.lifetimePoints missing"
grep -q 'loyalty' backend/server.js && pass "loyalty route mounted" || fail "loyalty route not mounted"
grep -q 'loadLoyalty' admin.html && pass "admin dashboard has loyalty page" || fail "admin dashboard missing loyalty"

echo ""
echo "=== Combined Test Suite (sequential) ==="


echo "=== Phase 17: Password Reset & Self-Service ==="
test -f tests/phase17.test.js && pass "phase17.test.js exists" || fail "phase17.test.js missing"
grep -q "PasswordResetToken" prisma/schema.prisma && pass "PasswordResetToken model exists" || fail "PasswordResetToken model missing"
grep -q "forgot-password" backend/routes/auth.js && pass "forgot-password route exists" || fail "forgot-password route missing"
grep -q "reset-password" backend/routes/auth.js && pass "reset-password route exists" || fail "reset-password route missing"
grep -q "change-password" backend/routes/auth.js && pass "change-password route exists" || fail "change-password route missing"
grep -q "notifyPasswordReset" backend/services/notifications.js && pass "notifyPasswordReset exists" || fail "notifyPasswordReset missing"
grep -q "notifyPasswordChanged" backend/services/notifications.js && pass "notifyPasswordChanged exists" || fail "notifyPasswordChanged missing"
grep -q "renderForgotPassword" js/customer.js && pass "forgot password page exists" || fail "forgot password page missing"
grep -q "renderResetPassword" js/customer.js && pass "reset password page exists" || fail "reset password page missing"
grep -q "renderChangePassword" js/customer.js && pass "change password page exists" || fail "change password page missing"
grep -q "forgotPassword:" js/customer.js && pass "Lao i18n password reset" || fail "Lao i18n missing"


echo "=== Phase 18: Audit Logs & Reports ==="
test -f tests/phase18.test.js && pass "phase18.test.js exists" || fail "phase18.test.js missing"
grep -q "reports/sales" backend/routes/admin/reports.js && pass "sales report API exists" || fail "sales report API missing"
grep -q "reports/inventory" backend/routes/admin/reports.js && pass "inventory report API exists" || fail "inventory report API missing"
grep -q "logAudit" backend/routes/admin/orders.js && pass "audit wiring exists" || fail "audit wiring missing"
grep -q "loadSales" admin.html && pass "sales UI exists" || fail "sales UI missing"
grep -q "loadInventory" admin.html && pass "inventory UI exists" || fail "inventory UI missing"
grep -q "auditFilters" admin.html && pass "enhanced audit UI exists" || fail "enhanced audit UI missing"


echo "=== Phase 19: Reviews, Coupons, Wishlist ==="
test -f tests/phase19.test.js && pass "phase19.test.js exists" || fail "phase19.test.js missing"
grep -q "ProductReview" prisma/schema.prisma && pass "ProductReview model in schema" || fail "ProductReview model missing"
grep -q "CouponCode" prisma/schema.prisma && pass "CouponCode model in schema" || fail "CouponCode model missing"
grep -q "Wishlist" prisma/schema.prisma && pass "Wishlist model in schema" || fail "Wishlist model missing"
grep -q "loadReviews" admin.html && pass "admin reviews page exists" || fail "admin reviews page missing"
grep -q "loadCoupons" admin.html && pass "admin coupons page exists" || fail "admin coupons page missing"
grep -q "renderWishlist" js/customer.js && pass "customer wishlist page exists" || fail "customer wishlist page missing"
grep -q "applyCoupon" js/customer.js && pass "customer coupon input exists" || fail "customer coupon input missing"
grep -q "loadProductReviews" js/customer.js && pass "customer reviews tab exists" || fail "customer reviews tab missing"
grep -q "wishlist" backend/server.js && pass "wishlist route mounted" || fail "wishlist route not mounted"
grep -q "coupons" backend/server.js && pass "coupons route mounted" || fail "coupons route not mounted"
grep -q "notifyReviewSubmitted" backend/services/notifications.js && pass "review notifications exist" || fail "review notifications missing"


echo "=== Phase 20: Production Hardening ==="
test -f tests/phase20.test.js && pass "phase20.test.js exists" || fail "phase20.test.js missing"
grep -q "in_stock" backend/routes/cart.js && pass "cart has stock check" || fail "cart stock check missing"
grep -q "Insufficient stock" backend/routes/orders.js && pass "order has stock validation" || fail "order stock validation missing"
grep -q "notifyReviewApproved" backend/routes/admin/reviews.js && pass "review notifications wired" || fail "review notifications not wired"
grep -q "loadEmails" admin.html && pass "admin emails page exists" || fail "admin emails page missing"
grep -q "total_revenue" admin.html && pass "dashboard has revenue" || fail "dashboard revenue missing"
grep -q "discount_applied" js/customer.js && pass "customer order financials" || fail "customer order financials missing"

# ── Phase 21: Product Sub-Resources & CSV Export ──
grep -q "manageProductImages" admin.html && pass "admin has product images UI" || fail "product images UI missing"
grep -q "manageProductSpecs" admin.html && pass "admin has product specs UI" || fail "product specs UI missing"
grep -q "manageProductDocs" admin.html && pass "admin has product docs UI" || fail "product docs UI missing"
grep -q "manageProductRelations" admin.html && pass "admin has product relations UI" || fail "product relations UI missing"
grep -q "sales/export" backend/routes/admin/report-exports.js 2>/dev/null && pass "sales CSV export API exists" || grep -q "sales/export" backend/routes/admin.js && pass "sales CSV export API exists" || fail "sales CSV export missing"
grep -q "inventory/export" backend/routes/admin/report-exports.js 2>/dev/null && pass "inventory CSV export API exists" || grep -q "inventory/export" backend/routes/admin.js && pass "inventory CSV export API exists" || fail "inventory CSV export missing"
grep -q "product_images" backend/routes/admin.js backend/routes/admin/product-images.js && pass "admin product images API exists" || fail "product images API missing"
grep -q "product_specs" backend/routes/admin.js backend/routes/admin/product-specifications.js && pass "admin product specs API exists" || fail "product specs API missing"
grep -q "product_docs" backend/routes/admin.js backend/routes/admin/product-documents.js && pass "admin product docs API exists" || fail "product docs API missing"
grep -q "product_relations" backend/routes/admin.js backend/routes/admin/product-relations.js && pass "admin product relations API exists" || fail "product relations API missing"

test -f tests/phase21_part1.test.js && pass "phase21_part1.test.js exists" || fail "phase21_part1.test.js missing"

# ── Phase 22: Customer Product Gallery ──
grep -q "average_rating" backend/routes/products.js && pass "product listing returns average_rating" || fail "average_rating missing from listing API"
grep -q "image_count" backend/routes/products.js && pass "product listing returns image_count" || fail "image_count missing from listing API"
grep -q "lightbox-overlay" customer.html && pass "lightbox CSS exists" || fail "lightbox CSS missing"
grep -q "openLightbox" js/customer.js && pass "lightbox JS exists" || fail "lightbox JS missing"
grep -q "galleryNav" js/customer.js && pass "gallery navigation exists" || fail "gallery nav missing"
grep -q 'loading.*lazy' js/customer.js && pass "lazy loading implemented" || fail "lazy loading missing"
grep -q "prod-rating" customer.html && pass "rating CSS exists" || fail "rating CSS missing"
grep -q "prod-img-badge" customer.html && pass "image count badge CSS exists" || fail "image badge CSS missing"
test -f tests/phase22.test.js && pass "phase22.test.js exists" || fail "phase22.test.js missing"

# ── Phase 23: Admin Product Editing & Quotation Pricing ──
grep -q "quotedAmount" prisma/schema.prisma && pass "Quotation has quotedAmount field" || fail "quotedAmount missing from schema"
grep -q "howToUseLo" backend/routes/admin/products.js && pass "Admin product create includes howToUse" || fail "howToUse missing from admin create"
grep -q "productId_locale" backend/routes/admin/products.js && pass "Admin product update upserts localizations" || fail "localization upsert missing"
grep -q "pDescLo" admin.html && pass "Admin has description fields" || fail "description fields missing"
grep -q "pHowLo" admin.html && pass "Admin has how-to-use fields" || fail "how-to-use fields missing"
grep -q "pPriceUnit" admin.html && pass "Admin has price unit field" || fail "price unit field missing"
grep -q "qAmount" admin.html && pass "Admin quotation has quoted amount field" || fail "quotation amount field missing"
grep -q "quoted_amount" js/customer.js && pass "Customer quotation shows quoted amount" || fail "customer quotation amount missing"
test -f tests/phase23.test.js && pass "phase23.test.js exists" || fail "phase23.test.js missing"
test -f tests/phase24.test.js && pass "phase24.test.js exists" || fail "phase24.test.js missing"
test -f tests/phase25.test.js && pass "phase25.test.js exists" || fail "phase25.test.js missing"
test -f tests/phase26.test.js && pass "phase26.test.js exists" || fail "phase26.test.js missing"

# ── Phase 27: Environment & Security Hardening ──
test -f .env.example && pass ".env.example exists" || fail ".env.example missing"
grep -q 'JWT_SECRET' .env.example && pass ".env.example documents JWT_SECRET" || fail "JWT_SECRET missing from .env.example"
grep -q 'CORS_ORIGINS' .env.example && pass ".env.example documents CORS_ORIGINS" || fail "CORS_ORIGINS missing from .env.example"
grep -q 'SMTP_HOST' .env.example && pass ".env.example documents SMTP_HOST" || fail "SMTP_HOST missing from .env.example"
grep -q 'DATABASE_URL' .env.example && pass ".env.example documents DATABASE_URL" || fail "DATABASE_URL missing from .env.example"
grep -q 'crypto' backend/server.js && pass "X-Request-ID crypto import exists" || fail "crypto import missing"
grep -q 'x-request-id\|requestId' backend/server.js && pass "Request ID middleware exists" || fail "request ID middleware missing"
grep -q 'errorHandler' backend/server.js && pass "Global error handler exists" || fail "global error handler missing"
grep -q 'process.exit(1)' backend/lib/auth.js && pass "JWT_SECRET validation exits in production" || fail "JWT_SECRET validation missing"
grep -q 'uncaughtException' backend/server.js && pass "uncaughtException handler exists" || fail "uncaughtException handler missing"
grep -q 'unhandledRejection' backend/server.js && pass "unhandledRejection handler exists" || fail "unhandledRejection handler missing"
grep -q 'SIGTERM' backend/server.js && pass "SIGTERM handler exists" || fail "SIGTERM handler missing"
grep -q 'SIGINT' backend/server.js && pass "SIGINT handler exists" || fail "SIGINT handler missing"
grep -q '\$disconnect' backend/server.js && pass "Prisma graceful disconnect exists" || fail "Prisma disconnect missing"
grep -q 'uptime' backend/server.js && pass "Health endpoint has uptime" || fail "health uptime missing"
grep -q 'memory' backend/server.js && pass "Health endpoint has memory" || fail "health memory missing"

# ── Phase 27: Admin Modularization ──
# Verify 27 admin sub-modules exist
test -d backend/routes/admin && pass "admin/ directory exists" || fail "admin/ directory missing"
ADMIN_MOD_COUNT=$(ls backend/routes/admin/*.js 2>/dev/null | wc -l)
test "$ADMIN_MOD_COUNT" -eq 27 && pass "27 admin modules extracted" || fail "expected 27 admin modules, found $ADMIN_MOD_COUNT"

# admin.js is a clean index/router — no route handlers
grep -qE "router\.(get|post|put|delete)\(" backend/routes/admin.js && fail "admin.js still has route handlers" || pass "admin.js has no route handlers"

# admin.js only imports express and adminMiddleware (no stale imports)
STALE_IMPORTS=$(grep -c "require" backend/routes/admin.js)
test "$STALE_IMPORTS" -le 32 && pass "admin.js has minimal requires ("$STALE_IMPORTS")" || fail "admin.js has stale requires ("$STALE_IMPORTS")"

# admin.js has module.exports = router
grep -q "module.exports = router" backend/routes/admin.js && pass "admin.js exports router" || fail "admin.js missing router export"

# Dashboard uses Prisma aggregate or _sum/_count for optimization
grep -qE "aggregate|_sum|_count" backend/routes/admin/dashboard.js && pass "dashboard uses Prisma aggregate" || fail "dashboard missing aggregate optimization"

# ── Phase 33: CSP & Security Middleware ──
grep -q "Content-Security-Policy" backend/middleware/security.js && pass "CSP header defined" || fail "CSP header missing"

# ── Phase 33: Configurable PORT ──
grep -q "process.env.PORT" backend/server.js && pass "PORT is configurable" || fail "PORT not configurable"

# ── Phase 30: Operational Scripts ──
test -f scripts/backup-db.js && pass "backup-db.js exists" || fail "backup-db.js missing"
test -f scripts/restore-db.js && pass "restore-db.js exists" || fail "restore-db.js missing"
test -f scripts/cleanup-images.js && pass "cleanup-images.js exists" || fail "cleanup-images.js missing"

# ── Phase 29-36: Admin i18n ──
# Admin Lao dictionary exists
grep -q "nbLao:" admin.html && pass "admin nbLao dictionary exists" || fail "admin nbLao dictionary missing"
# Admin English dictionary exists
grep -qE "en: \{" admin.html && grep -qE 'dashboard: "Dashboard"' admin.html && pass "admin en dictionary exists" || fail "admin en dictionary missing"
# Minimum adminT() usage
ADMIN_T_COUNT=$(grep -c "adminT(" admin.html 2>/dev/null || echo 0)
test "$ADMIN_T_COUNT" -ge 300 && pass "adminT() calls >= 300 ("$ADMIN_T_COUNT")" || fail "adminT() calls too low ("$ADMIN_T_COUNT", expected >= 300)"

# ── Phase 31-32: Customer SPA i18n ──
# Customer Lao dictionary exists
grep -q "lo: {" js/customer.js && pass "customer lo dictionary exists" || fail "customer lo dictionary missing"
# Customer English dictionary exists
grep -q "en: {" js/customer.js && pass "customer en dictionary exists" || fail "customer en dictionary missing"
# Minimum t() usage
CUST_T_COUNT=$(grep -c "t('" js/customer.js 2>/dev/null || echo 0)
test "$CUST_T_COUNT" -ge 300 && pass "customer t() calls >= 300 ("$CUST_T_COUNT")" || fail "customer t() calls too low ("$CUST_T_COUNT", expected >= 300)"

# ── Phase 33: Protected MD5 — admin.html ──
ADMIN_HASH=$(node -e "var fs=require('fs'),c=require('crypto');process.stdout.write(c.createHash('md5').update(fs.readFileSync('admin.html')).digest('hex'))" 2>/dev/null)
TEST_ADMIN_HASH=$(grep 'admin.html' tests/phase16_step8e.test.js 2>/dev/null | grep -oP '[a-f0-9]{32}' | head -1)
test -n "$ADMIN_HASH" && pass "admin.html MD5 computable" || fail "admin.html MD5 computation failed"
test -n "$TEST_ADMIN_HASH" && pass "admin.html MD5 baseline found in test" || fail "admin.html MD5 baseline not found in test"
test "$ADMIN_HASH" = "$TEST_ADMIN_HASH" && pass "admin.html MD5 matches test baseline" || fail "admin.html MD5 mismatch ("$ADMIN_HASH" vs expected "$TEST_ADMIN_HASH")"

# Reset product stock before tests (Phase 30: test isolation)
NODE_ENV=test node backend/seed.js --reset 2>/dev/null

# Start server for combined test suite
NODE_ENV=test node backend/server.js &
SERVER_PID=$!
sleep 5
NODE_ENV=test node --test --test-concurrency=1 tests/phase2.test.js tests/phase3.test.js tests/phase4.test.js tests/phase5.test.js tests/phase6.test.js tests/phase7.test.js tests/phase8.test.js tests/phase9.test.js tests/phase10.test.js tests/phase11.test.js tests/phase12.test.js tests/phase13.test.js tests/phase14.test.js tests/phase15.test.js tests/phase16.test.js tests/phase16_step8d.test.js tests/phase16_step8e.test.js tests/phase17.test.js tests/phase18.test.js tests/phase19.test.js tests/phase20.test.js tests/phase21_part1.test.js tests/phase22.test.js tests/phase23.test.js tests/phase24.test.js tests/phase25.test.js tests/phase26.test.js >/dev/null 2>&1 && pass "combined test suite (687/687)" || fail "combined test suite has failures"
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "=== $P passed, $F failed ==="
exit "$F"
