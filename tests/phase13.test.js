/**
 * Phase 13 Tests — Customer Frontend Refinement
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

// ── HTTP helpers ──
function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001' + path, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function md5(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

// ── Phase 1 baselines (updated for CSS accent color change) ──
const BASELINES = {
  css:    { md5: 'ad86eea2c740140705b8c06b2419d1a4', lines: 3828, file: 'styles/nblao.css' },
};

describe('Phase 13: Customer Frontend Refinement', () => {

  // ── 1. CSS accent color change ──
  it('CSS uses #0099FF accent color', () => {
    const css = fs.readFileSync('styles/nblao.css', 'utf8');
    assert.ok(css.includes('#0099ff'), 'nblao.css should contain the #0099ff accent');
    assert.ok(css.includes('#007acc'), 'nblao.css should contain the #007acc hover accent');
    assert.ok(!css.includes('--safety:#E85C24'), 'Old orange accent should be removed');
  });

  // ── 2. customer.html accent color ──
  it('customer.html uses accent color variables', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('var(--safety, #0099ff)'), 'customer.html should use --safety with the #0099ff accent for buttons');
    // Check key interactive elements use the new accent
    assert.ok(html.includes('background: var(--safety, #0099ff)'), 'Buttons should use safety color');
    assert.ok(html.includes('border: 2px solid var(--safety, #0099ff)'), 'Ghost/quote buttons should use safety border');
  });

  // ── 3. Skeleton loading styles ──
  it('customer.html has skeleton loading styles', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('.skeleton'), 'Should have .skeleton class');
    assert.ok(html.includes('.skel-card'), 'Should have .skel-card class');
    assert.ok(html.includes('skShimmer'), 'Should have shimmer animation');
    assert.ok(html.includes('.page-in'), 'Should have page-in transition class');
    assert.ok(html.includes('.page-out'), 'Should have page-out transition class');
  });

  // ── 4. How to Order section styles ──
  it('customer.html has How to Order section styles', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('.how-section'), 'Should have .how-section class');
    assert.ok(html.includes('.how-grid'), 'Should have .how-grid class');
    assert.ok(html.includes('.how-step'), 'Should have .how-step class');
  });

  // ── 5. Partners footer section ──
  it('customer.html has Partners footer styles', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('.partners-section'), 'Should have .partners-section class');
    assert.ok(html.includes('.partner-logo'), 'Should have .partner-logo class');
    assert.ok(html.includes('.partners-label'), 'Should have .partners-label class');
  });

  // ── 6. Category accordion styles ──
  it('customer.html has category accordion styles', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('.cat-acc-wrap'), 'Should have .cat-acc-wrap class');
    assert.ok(html.includes('.cat-acc-head'), 'Should have .cat-acc-head class');
    assert.ok(html.includes('.cat-acc-body'), 'Should have .cat-acc-body class');
    assert.ok(html.includes('.cat-acc-child'), 'Should have .cat-acc-child class');
  });

  // ── 7. Expanded stock filter styles ──
  it('customer.html has expanded stock filter styles', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    assert.ok(html.includes('.filter-radio'), 'Should have .filter-radio class');
  });

  // ── 8. customer.js has all new i18n keys ──
  it('customer.js has complete i18n translations', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    // Lao keys
    assert.ok(js.includes("howToOrder:'ວິທີການສັ່ງຊື້'"), 'Should have Lao howToOrder');
    assert.ok(js.includes("step1Title:'ເລືອກສິນຄ້າ'"), 'Should have Lao step1Title');
    assert.ok(js.includes("partners:'ຄູ່ຮ່ວມທຸລະກິດ"), 'Should have Lao partners');
    assert.ok(js.includes("stockAvailable:'ມີສະຕັອກ'"), 'Should have Lao stockAvailable');
    assert.ok(js.includes("allStock:'ສະຖານະສິນຄ້າ'"), 'Should have Lao allStock');
    assert.ok(js.includes("stockOutOfStock:'ໝົດສະຕັອກ'"), 'Should have Lao stockOutOfStock');
    // English keys
    assert.ok(js.includes("howToOrder:'How to Order'"), 'Should have English howToOrder');
    assert.ok(js.includes("partners:'Business Partners / Authorized Dealers'"), 'Should have English partners');
    assert.ok(js.includes("stockAvailable:'In Stock'"), 'Should have English stockAvailable');
    assert.ok(js.includes("stockLowStock:'Low Stock'"), 'Should have English stockLowStock');
    assert.ok(js.includes("addedToCart:'Added to cart'"), 'Should have addedToCart key');
    assert.ok(js.includes("featuredProducts:'Featured Products'"), 'Should have featuredProducts key');
  });

  // ── 9. customer.js has smooth page transitions ──
  it('customer.js has smooth page transition system', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('page-out'), 'Should have page-out class');
    assert.ok(js.includes('page-in'), 'Should have page-in class');
    assert.ok(js.includes('_lastPage'), 'Should track last page for transitions');
    assert.ok(js.includes('skeletonCards'), 'Should have skeletonCards function');
    assert.ok(js.includes('skeletonHome'), 'Should have skeletonHome function');
    assert.ok(js.includes('skeletonSidebar'), 'Should have skeletonSidebar function');
  });

  // ── 10. customer.js has category accordion ──
  it('customer.js has category accordion rendering', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('renderCategoryAccordion'), 'Should have renderCategoryAccordion function');
    assert.ok(js.includes('toggleCatAcc'), 'Should have toggleCatAcc function');
    assert.ok(js.includes('cat-acc-head'), 'Should render cat-acc-head class');
    assert.ok(js.includes('cat-acc-child'), 'Should render cat-acc-child class');
    assert.ok(js.includes('children'), 'Should handle children in category data');
  });

  // ── 11. customer.js has How to Order section ──
  it('customer.js has How to Order rendering', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('renderHowToOrder'), 'Should have renderHowToOrder function');
    assert.ok(js.includes("step1Title"), 'Should render step1Title');
    assert.ok(js.includes("step2Title"), 'Should render step2Title');
    assert.ok(js.includes("step3Title"), 'Should render step3Title');
    assert.ok(js.includes("step4Title"), 'Should render step4Title');
  });

  // ── 12. customer.js has Partners footer ──
  it('customer.js has Partners section in footer', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('renderFooter'), 'Should have renderFooter function');
    assert.ok(js.includes('footer-partners'), 'Should render footer-partners class');
    assert.ok(js.includes('fp-logo'), 'Should render fp-logo class');
    assert.ok(js.includes('fp-label'), 'Should render fp-label class');
    assert.ok(js.includes('__PARTNERS_DATA__'), 'Should support dynamic partners data');
    assert.ok(js.includes('SCHNEIDER ELECTRIC'), 'Should have default partner list');
  });

  // ── 13. customer.js has expanded stock filters ──
  it('customer.js has expanded stock filter options', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('renderStockFilter'), 'Should have renderStockFilter function');
    assert.ok(js.includes('applyStockOption'), 'Should have applyStockOption function');
    assert.ok(js.includes('stockFilter'), 'Should use stockFilter param');
    assert.ok(js.includes("'available'"), 'Should have available stock filter');
    assert.ok(js.includes("'low'"), 'Should have low stock filter');
    assert.ok(js.includes("'out'"), 'Should have out-of-stock filter');
  });

  // ── 14. customer.js has reactive language switching ──
  it('customer.js re-renders header and footer on language switch', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('updateHeaderAuth'), 'Should call updateHeaderAuth');
    // setLang should re-render header, footer, and page
    const setLangMatch = js.match(/function setLang[\s\S]*?(?=\nfunction |\n\/\/ ═)/);
    assert.ok(setLangMatch, 'Should have setLang function');
    assert.ok(setLangMatch[0].includes('renderHeader'), 'setLang should re-render header');
    assert.ok(setLangMatch[0].includes('renderFooter'), 'setLang should re-render footer');
    assert.ok(setLangMatch[0].includes('router()'), 'setLang should re-render page');
    // Nav update function
    assert.ok(js.includes('nav2'), 'Should update nav2 links');
    assert.ok(js.includes("searchPh"), 'Should update search placeholder');
  });

  // ── 15. customer.js has sort options ──
  it('customer.js has expanded sort options', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('nameAsc'), 'Should have nameAsc sort option');
    assert.ok(js.includes('nameDesc'), 'Should have nameDesc sort option');
    assert.ok(js.includes("value=\"name_asc\""), 'Should have name_asc option in select');
    assert.ok(js.includes("value=\"name_desc\""), 'Should have name_desc option in select');
  });

  // ── 16. nblao.css has new component styles ──
  it('nblao.css has all new component styles', () => {
    const css = fs.readFileSync('styles/nblao.css', 'utf8');
    assert.ok(css.includes('.skeleton-shimmer'), 'Should have skeleton shimmer');
    assert.ok(css.includes('@keyframes shimmer'), 'Should have shimmer animation');
    assert.ok(css.includes('.page-transition'), 'Should have page-transition class');
    assert.ok(css.includes('.how-to-order'), 'Should have how-to-order class');
    assert.ok(css.includes('.how-steps'), 'Should have how-steps class');
    assert.ok(css.includes('.footer-partners'), 'Should have footer-partners class');
    assert.ok(css.includes('.cat-acc-wrap'), 'Should have cat-acc-wrap class');
    assert.ok(css.includes('.cat-acc-head'), 'Should have cat-acc-head class');
    assert.ok(css.includes('.filter-radio'), 'Should have filter-radio class');
  });

  // ── 17. Customer page serves correctly ──
  it('GET /customer.html returns 200', async () => {
    const res = await get('/customer.html');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('customer.js'), 'Should load customer.js');
    assert.ok(res.body.includes('nblao.css'), 'Should load nblao.css');
    assert.ok(res.body.includes('skeleton'), 'Should have skeleton styles');
  });

  // ── 18. /customer redirect works ──
  it('GET /customer returns 302 redirect', async () => {
    const res = await get('/customer');
    assert.strictEqual(res.status, 302);
  });

  // ── 19. Filters API returns parent-child hierarchy ──
  it('GET /api/products/filters returns parent-child categories', async () => {
    const res = await get('/api/products/filters');
    assert.strictEqual(res.status, 200);
    const data = JSON.parse(res.body);
    assert.ok(Array.isArray(data.categories), 'categories should be array');
    assert.ok(data.categories.length > 0, 'should have categories');
    const firstCat = data.categories[0];
    assert.ok(firstCat.name, 'parent should have name');
    assert.ok(firstCat.slug, 'parent should have slug');
    assert.ok(Array.isArray(firstCat.children), 'parent should have children array');
    assert.ok(firstCat.children.length > 0, 'first parent should have children');
    const child = firstCat.children[0];
    assert.ok(child.name, 'child should have name');
    assert.ok(child.slug, 'child should have slug');
    assert.ok(typeof child.count === 'number', 'child should have count');
  });

  // ── 20. CSS baseline preserved ──
  it('CSS matches updated Phase 1 baseline', () => {
    const hash = md5(BASELINES.css.file);
    assert.strictEqual(hash, BASELINES.css.md5,
      `${BASELINES.css.file} MD5 mismatch: got ${hash}, expected ${BASELINES.css.md5}`);
  });

  // ── 21. Original wireframe files untouched ──
  it('Original wireframe HTML files are untouched', () => {
    const backupMd5 = md5('nb_lao_wireframes_v2_original_backup.html');
    assert.strictEqual(backupMd5, '69b1396610c1d27917d16cc193c00103',
      'backup HTML should be untouched');
    const updatedMd5 = md5('nb_lao_wireframes_v2_updated.html');
    assert.strictEqual(updatedMd5, 'aebe02f72a5852289b1a7ad27c7dd657',
      'updated HTML should be untouched');
    const jsMd5 = md5('js/nblao.js');
    assert.strictEqual(jsMd5, 'b53a5966017bdd3fb7794e58822aeb98',
      'nblao.js should be untouched');
  });

  // ── 22. Customer page includes all required sections ──
  it('customer.html has all required section classes', () => {
    const html = fs.readFileSync('customer.html', 'utf8');
    // Auth
    assert.ok(html.includes('.auth-page'), 'auth page styles');
    assert.ok(html.includes('.auth-card'), 'auth card styles');
    // Products
    assert.ok(html.includes('.prod-card'), 'product card styles');
    assert.ok(html.includes('.prod-grid'), 'product grid styles');
    // Listing
    assert.ok(html.includes('.listing-layout'), 'listing layout styles');
    assert.ok(html.includes('.listing-sidebar'), 'listing sidebar styles');
    // Detail
    assert.ok(html.includes('.detail-layout'), 'detail layout styles');
    // Cart
    assert.ok(html.includes('.cart-layout'), 'cart layout styles');
    assert.ok(html.includes('.cart-summary'), 'cart summary styles');
    // Account
    assert.ok(html.includes('.account-grid'), 'account grid styles');
    assert.ok(html.includes('.account-nav'), 'account nav styles');
    // Pagination
    assert.ok(html.includes('.pagination'), 'pagination styles');
    // Toast
    assert.ok(html.includes('.toast'), 'toast styles');
  });

  // ── 23. js/customer.js uses esc() instead of html() ──
  it('customer.js uses esc() for XSS safety', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    assert.ok(js.includes('function esc('), 'Should have esc function');
    // Ensure esc is used for user data
    assert.ok(js.includes('esc(p.name)'), 'Should escape product name');
    assert.ok(js.includes('esc(p.sku)'), 'Should escape product SKU');
  });

  // ── 24. customer.js has footer translation for contact/about ──
  it('footer is fully translatable', () => {
    const js = fs.readFileSync('js/customer.js', 'utf8');
    // Check footer uses t() for translatable strings
    assert.ok(js.includes("t('about')"), 'Footer should use t() for about');
    assert.ok(js.includes("t('contact')"), 'Footer should use t() for contact');
    assert.ok(js.includes("t('partners')"), 'Footer should use t() for partners');
    // Check Lao contact info
    assert.ok(js.includes('ບ້ານໜອງບອນ'), 'Footer should have Lao address');
    assert.ok(js.includes('Nongbon Village'), 'Footer should have English address');
  });
});
