/**
 * NB LAO Customer SPA — Phase 13 Refinement
 * Hash-based SPA with vanilla JS, connects to existing API
 */

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
const App = {
  token: localStorage.getItem('nblao_token') || null,
  customer: null,
  lang: localStorage.getItem('nblao_lang') || 'lo',
  cart: { items: [] },
  cartCount: 0
};

// ═══════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════
const API = {
  BASE: '/api',
  async req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (App.token) opts.headers['Authorization'] = 'Bearer ' + App.token;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.BASE + path, opts);
    const data = await res.json().catch(() => null);
    if (res.status === 401) { App.token = null; App.customer = null; localStorage.removeItem('nblao_token'); }
    return { status: res.status, data };
  },
  get(p) { return this.req('GET', p); },
  post(p, b) { return this.req('POST', p, b); },
  put(p, b) { return this.req('PUT', p, b); },
  patch(p, b) { return this.req('PATCH', p, b); },
  del(p) { return this.req('DELETE', p); }
};

// ═══════════════════════════════════════════════
// I18N — Complete translation keys
// ═══════════════════════════════════════════════
const T = {
  lo: {
    home:'ໜ້າຫຼັກ', products:'ສິນຄ້າ', login:'ເຂົ້າສູ່ລະບົບ', register:'ລົງທະບຽນ',
    cart:'ກະຕ່າ', logout:'ອອກຈາກລະບົບ', account:'ບັນຊີຂອງຂ້ອຍ',
    orders:'ປະຫວັດການສັ່ງຊື້', quotations:'ປະຫວັດຂໍລາຄາ',
    search:'ຄົ້ນຫາສິນຄ້າ...', searchPh:'ຄົ້ນຫາຊື່, SKU, ຮຸ່ນ...',
    categories:'ໝວດໝູ່ສິນຄ້າ', brands:'ຍີ່ຫໍ້', filters:'ຕົວກັ້ງ',
    allCategories:'ໝວດໝູ່ທັງໝົດ', allBrands:'ຍີ່ຫໍ້ທັງໝົດ',
    priceRange:'ລາຄາ', minPrice:'ລາຄາຕ່ຳສຸດ', maxPrice:'ລາຄາສູງສຸດ',
    inStock:'ມີສະຕັອກເທົ່ານັ້ນ', sort:'ລຽງຕາມ',
    newest:'ໃໝ່ລ່າສຸດ', oldest:'ເກົ່າສຸດ',
    priceLow:'ລາຄາຕ່ຳ→ສູງ', priceHigh:'ລາຄາສູງ→ຕ່ຳ',
    results:'ລາຍການ', page:'ໜ້າ', of:'ຈາກ', prev:'ກ່ອນໜ້າ', next:'ຕໍ່ໄປ',
    noResults:'ບໍ່ພົບລາຍການ', loading:'ກຳລັງໂຫຼດ...',
    addToCart:'🛒 ໃສ່ກະຕ່າ', requestQuote:'📄 ຂໍລາຄາ',
    qty:'ຈຳນວນ', stock:'ມີສະຕັອກ', outOfStock:'ໝົດສະຕັອກ',
    lowStock:'ເຫລືອໜ້ອຍ', price:'ລາຄາ', brand:'ຍີ່ຫໍ້',
    origin:'ແຫລ່ງຜະລິດ', warranty:'ການຮັບປະກັນ', model:'ຮຸ່ນ',
    description:'ລາຍລະອຽດ', specifications:'ຂໍ້ມູນສະເພາະ',
    related:'ສິນຄ້າກ່ຽວຂ້ອງ', detail:'ລາຍລະອຽດ',
    cartTitle:'ກະຕ່າສິນຄ້າ', emptyCart:'ກະຕ່າວ່າງເປົ່າ',
    continueShopping:'ກັບໄປເລືອກສິນຄ້າ', total:'ຍອດລວມ',
    noOrders:'ຍັງບໍ່ມີອໍເດີ້', noQuotations:'ຍັງບໍ່ມີຂໍລາຄາ',
    checkout:'ສັ່ງຊື້', requestAllQuote:'ຂໍລາຄາທັງໝົດ',
    remove:'ລຶບ', subtotal:'ລວມຍ່ອຍ',
    orderSuccess:'ສັ່ງຊື້ສຳເລັດ!', quoteSuccess:'ຂໍລາຄາສຳເລັດ!',
    orderNumber:'ເລກທີອໍເດີ້', quoteNumber:'ເລກທີໃບສະເໜີລາຄາ',
    status:'ສະຖານະ', date:'ວັນທີ', items:'ລາຍການ',
    email:'ອີເມວ', password:'ລະຫັດຜ່ານ', name:'ຊື່',
    phone:'ເບີໂທ', company:'ບໍລິສັດ',
    loginTitle:'ເຂົ້າສູ່ລະບົບ', registerTitle:'ລົງທະບຽນ',
    noAccount:'ຍັງບໍ່ມີບັນຊີ?', hasAccount:'ມີບັນຊີແລ້ວ?',
    createAccount:'ສ້າງບັນຊີໃໝ່', loginHere:'ເຂົ້າສູ່ລະບົບທີ່ນີ້',
    pending:'ລໍຖ້າ', confirmed:'ຢືນຢັນແລ້ວ', shipped:'ຈັດສົ່ງແລ້ວ',
    delivered:'ໄດ້ຮັບແລ້ວ', cancelled:'ຍົກເລີກ',
    reviewed:'ກວດສອບແລ້ວ', quoted:'ສະເໜີລາຄາແລ້ວ',
    accepted:'ຍອດັດ', rejected:'ປະຕິເສດ',
    orderHistory:'ປະຫວັດການສັ່ງຊື້', quoteHistory:'ປະຫວັດຂໍລາຄາ',
    viewDetail:'ເບິ່ງລາຍລະອຽດ', back:'ກັບຄືນ',
    hello:'ສະບາຍດີ', myAccount:'ບັນຊີຂອງຂ້ອຍ',
    updateProfile:'ອັບເດດຂໍ້ມູນ', saved:'ບັນທຶກແລ້ວ',
    perUnit:'/ ໜ່ວຍ', contactForPrice:'ຕິດຕໍ່ຂໍລາຄາ',
    requiredField:'ກະລຸນາຕື່ມຂໍ້ມູນ', invalidEmail:'ອີເມວບໍ່ຖືກຕ້ອງ',
    passwordMismatch:'ລະຫັດຜ່ານບໍ່ກົງກັນ', passwordShort:'ລະຫັດຜ່ານຕ່ຳສຸດ8ຕົວ',
    deactivated:'ບັນຊີນີ້ຖືກປິດການໃຊ້ງານແລ້ວ',
    adminAccessDenied:'ບັນຊີນີ້ບໍ່ສາມາດເຂົ້າໃຊ້ Customer Portal ໄດ້',
    networkError:'ເຊື່ອມຕໍ່ລົ້ມເຫຼວ, ກະລຸນາລອງໃໝ່',
    electrical:'ໄຟຟ້າ', mechanical:'ກົນຈັກ', tools:'ເຄື່ອງມື',
    safety:'ຄວາມປອດໄພ', motors:'ມອເຕີ', water:'ນ້ຳ',
    services:'ບໍລິການ', about:'ກ່ຽວກັບເຮົາ', contact:'ຕິດຕໍ່', servicesDesc:'ບໍລິການຂອງພວກເຮົາ', aboutDesc:'ກ່ຽວກັບບໍລິສັດ NB LAO', contactDesc:'ຕິດຕໍ່ພວກເຮົາ',
    heroTitle:'ອຸປະກອນອຸດສາຫະກຳ ແລະ ໄຟຟ້າ ຄົບຊຸດ',
    heroDesc:'ຄົ້ນຫາ, ປຽບທຽບ ແລະ ຂໍລາຄາອຸປະກອນຈາກຫລາຍຍີ່ຫໍ້',
    promo1:'ໂປຣໂມຊັນຕົ້ນປີ — ຫລຸດ 15%', promo1sub:'ສະເພາະລູກຄ້າອໍເດີ້ໂດຍກົງ',
    promo2:'ຈັດສົ່ງທົ່ວປະເທດ', promo2sub:'ສຳລັບອໍເດີ້ 5,000,000 ກີບຂຶ້ນ',
    featuredProducts:'ສິນຄ້າແນະນຳ',
    confirmOrder:'ຢືນຢັນການສັ່ງຊື້', confirmOrderDesc:'ກະລຸນາກວດສອບລາຍການກ່ອນຢືນຢັນ',
    addedToCart:'ເພີ່ມໃສ່ກະຕ່າແລ້ວ',
    // Stock filters
    allStock:'ສະຖານະສິນຄ້າ', stockAvailable:'ມີສະຕັອກ', stockLowStock:'ເຫລືອໜ້ອຍ', stockOutOfStock:'ໝົດສະຕັອກ', stockPreOrder:'ສັ່ງລ່ວງໜ້າ',
    // How to Order
    menu:'ເມນູ', language:'ພາສາ',
    howToOrder:'ວິທີການສັ່ງຊື້', step1Title:'ເລືອກສິນຄ້າ', step1Desc:'ຄົ້ນຫາ ຫຼື ເລືອກຈາກໝວດໝູ່ ແລ້ວເລືອກໃສ່ກະຕ່າ ຫຼື ຂໍລາຄາ',
    step2Title:'ສົ່ງຄຳຂໍ', step2Desc:'ໃສ່ຂໍ້ມູນຕິດຕໍ່ ແລະ ສະຖານທີ່ຈັດສົ່ງ ຫຼືຢືນຢັນອໍເດີ້ໂດຍກົງ',
    step3Title:'ຮັບການຢືນຢັນ', step3Desc:'ທີມງານຕິດຕໍ່ພາຍໃນ 24 ຊົ່ວໂມງ ເພື່ອຢືນຢັນລາຄາ ແລະ ຈັດສົ່ງ',
    step4Title:'ຮັບສິນຄ້າ', step4Desc:'ຈັດສົ່ງທົ່ວປະເທດ ພ້ອມທີມງານຕິດຕາມອໍເດີ້ໃຫ້ຕະຫລອດ',
    // Partners
    partners:'ຄູ່ຮ່ວມທຸລະກິດ / ຕົວແທນຈຳໜ່າຍ',
    // Tabs
    tabDesc:'ລາຍລະອຽດ', tabSpecs:'ຂໍ້ມູນສະເພາະ', tabDocs:'ເອກະສານ', tabHowTo:'ວິທີໃຊ້ງານ', tabRelated:'ສິນຄ້າກ່ຽວຂ້ອງ',
    noDocs:'ຍັງບໍ່ມີເອກະສານ', noHowTo:'ຍັງບໍ່ມີຂໍ້ມູນການໃຊ້ງານ', quotedPrice:'ລາຄາລວມ',
    // Cart
    clearCart:'ລຶບກະຕ່າ', confirmClear:'ຕ້ອງການລຶບກະຕ່າທັງໝົດບໍ?',
    // Checkout
    deliveryInfo:'ຂໍ້ມູນຈັດສົ່ງ', orderNotes:'ບັນຊາໝາຍເຫດ', notesPlaceholder:'ໝາຍເຫດ (ບໍ່ບັງຄັບບັງຄັບ)...',
    submitOrder:'ຢືນຢັນສັ່ງຊື້', submitting:'ກຳລັງດຳເນີນງານ...',
    orderConfirmed:'ສັ່ງຊື້ສຳເລັດແລ້ວ!', viewOrder:'ເບິ່ງລາຍການສັ່ງຊື້',
    // Quotation
    quoteNotes:'ໝາຍເຫດສຳລັບຂໍລາຄາ', quoteNotesPlaceholder:'ລະບຸຄວາມຕ້ອງການເພີ່ມເຕີມ...',
    submitQuote:'ສົ່ງຂໍລາຄາ', quoteRequested:'ຂໍລາຄາສຳເລັດແລ້ວ!', viewQuote:'ເບິ່ງໃບສະເໜີລາຄາ',
    // Sort
    sortBy:'ລຽງຕາມ:', nameAsc:'ຊື່ ກ-ຮ', nameDesc:'ຊື່ ຮ-ກ',
    // Loyalty
    loyalty:'ສະມາຊິກຄວາມສັດຊື່', availablePoints:'ພິນທະທີ່ມີ', currentTier:'ລະດັບປັດຈຸບັນ', lifetimePoints:'ພິນທະລວມ',
    redeemed:'ໃຊ້ແລ້ວ', nextTier:'ລະດັບຕໍ່ໄປ', needed:'ຕ້ອງການ', tierDiscount:'ສ່ວນຫຼຸດລະດັບ',
    pointsHistory:'ປະຫວັດພິນທະ', balance:'ຍອດຄົງເຫຼືອ', points:'ພິນທະ', type:'ປະເພດ',
    earned:'ໄດ້ຮັບ', expired:'ໝົດອາຍຸ', adjusted:'ປັບ', reversed:'ຄືນ',
    pointsEarnOnThisOrder:'ຈະໄດ້ຮັບພິນທະຈາກອໍເດີ້ນີ້', loyaltyNotAvailable:'ລະບົບຄວາມສັດຊື່ຍັງບໍ່ມີ',
    noPointsHistory:'ຍັງບໍ່ມີປະຫວັດພິນທະ', redeemPoints:'ໃຊ້ພິນທະ',
    max:'ສູງສຸດ', processing:'ກຳລັງດຳເນີນການ',
    // Password Reset
    forgotPassword:'ລືມລະຫັດຜ່ານ', forgotPasswordTitle:'ລືມລະຫັດຜ່ານ',
    forgotPasswordDesc:'ກະລຸນາໃສ່ອີເມວເພື່ອຮັບລິ້ງຕັ້ງລະຫັດຜ່ານ',
    sendResetLink:'ສົ່ງລິ້ງຕັ້ງລະຫັດ', resetSent:'ສົ່ງລິ້ງຕັ້ງລະຫັດແລ້ວ!',
    resetSentDesc:'ກວດສອບອີເມວແລ້ວຄລິກລິ້ງເພື່ອຕັ້ງລະຫັດຜ່ານໃໝ່',
    resetPasswordTitle:'ຕັ້ງລະຫັດໃໝ່',
    newPassword:'ລະຫັດໃໝ່', confirmPassword:'ຢັ້ງຢືນລະຫັດ',
    resetPassword:'ຕັ້ງລະຫັດ', resetSuccess:'ຕັ້ງລະຫັດສຳເລັດແລ້ວ!',
    resetExpired:'ລິ້ງນີ້ໝົດອາຍຸ ຫຼືບໍ່ຖືກຕ້ອງ',
    changePasswordTitle:'ປ່ຽນລະຫັດ', currentPassword:'ລະຫັດປັດຈຸບັນ',
    changePassword:'ປ່ຽນລະຫັດ', passwordChanged:'ປ່ຽນລະຫັດສຳເລັດແລ້ວ!',
    forgotPasswordLink:'ລືມລະຫັດຜ່ານ?',
    // Phase 19
    tabReviews:'ຄຳຕິຊົມ', writeReview:'ຂຽນຄຳຕິຊົມ', editReview:'ແກ້ໄຂຄຳຕິຊົມ', yourRating:'ການໃຫ້ຄະແນນ',
    submitReview:'ສົ່ງຄຳຕິຊົມ', reviewSubmitted:'ຄຳຕິຊົມຖືກສົ່ງແລ້ວ', reviewUpdated:'ຄຳຕິຊົມຖືກອັບເດດ',
    reviewDeleted:'ຄຳຕິຊົມຖືກລຶບ', noReviews:'ຍັງບໍ່ມີຄຳຕິຊົມ', rating:'ຄະແນນ', reviews:'ຄຳຕິຊົມ',
    basedOn:'ອີງຕາມ', stars:'ດາວ', reviewPlaceholder:'ແບ່ງປັນປະສົບການ...', reviewTitle:'ຫົວຂໍ້',
    thankYouReview:'ຂອບໃຈສຳລັບຄຳຕິຊົມ!', purchaseRequired:'ຕ້ອງຊື້ກ່ອນຈຶ່ງສາມາດຕິຊົມໄດ້',
    // Timeline
    statusTimeline:'ປະຫວັດສະຖານະ', noHistory:'ຍັງບໍ່ມີປະຫວັດ',
    initialStatus:'ສະຖານະເລີ່ມຕົ້ນ', byStaff:'ໂດຍ',
    couponCode:'ລະຫັດຄູປອງ', applyCoupon:'ນຳໃຊ້', removeCoupon:'ລຶບ', couponApplied:'ນຳໃຊ້ຄູປອງແລ້ວ!',
    couponInvalid:'ລະຫັດຄູປອງບໍ່ຖືກ', couponExpired:'ຄູປອງໝົດອາຍຸ', couponMinOrder:'ລາຄາຕ່ຳກວ່າຂັ້ນຕ່ຳ',
    couponMaxUses:'ຄູປອງໝົດການນຳໃຊ້', couponNotActive:'ຄູປອງບໍ່ເປີດໃຊ້',
    discount:'ສ່ວນຫຼຸດ', couponDiscount:'ສ່ວນຫຼຸດຄູປອງ', totalAfterDiscount:'ລວມຫຼັງສ່ວນຫຼຸດ',
    wishlist:'ລາຍການທີ່ມັກ', addToWishlist:'ເພີ່ມໃນລາຍການທີ່ມັກ', removeFromWishlist:'ລຶບຈາກລາຍການທີ່ມັກ',
    wishlistEmpty:'ລາຍການທີ່ມັກຫວ່າງເປົ່າ', wishlistAdded:'ເພີ່ມແລ້ວ', wishlistRemoved:'ລຶບແລ້ວ',
    itemsInWishlist:'ລາຍການ', moveTocart:'ຍ້າຍໄປກະຕ່າ', notAvailable:'ສິນຄ້າໝົດແລ້ວ',
    backToLogin:'ກັບໄປເຂົ້າສູ່ລະບົບ',
    navHome:'ໜ້າຫຼັກ',
    navProducts:'ສິນຄ້າ',
    navLogin:'ເຂົ້າສູ່ລະບົບ',
    navRegister:'ລົງທະບຽນ',
    navCart:'ກະຕ່າ',
    navLogout:'ອອກຈາກລະບົບ',
    navAccount:'ບັນຊີຂອງຂ້ອຍ',
    navOrders:'ປະຫວັດການສັ່ງຊື້',
    navQuotations:'ປະຫວັດຂໍລາຄາ',
    filterCategories:'ໝວດໝູ່',
    filterBrands:'ຍີ່ຫໍ້',
    filterFilters:'ຕົວກັ້ງ',
    filterAllCats:'ໝວດໝູ່ທັງໝົດ',
    filterAllBrands:'ຍີ່ຫໍ້ທັງໝົດ',
    filterPriceRange:'ລາຄາ',
    filterMinPrice:'ລາຄາຕ່ຳສຸດ',
    filterMaxPrice:'ລາຄາສູງສຸດ',
    filterInStock:'ມີສະຕັອກເທົ່ານັ້ນ',
    filterSort:'ລຽງຕາມ',
    filterNewest:'ໃໝ່ລ່າສຸດ',
    filterOldest:'ເກົ່າສຸດ',
    filterPage:'ໜ້າ',
    filterPrev:'ກ່ອນໜ້າ',
    filterNext:'ຕໍ່ໄປ',
    cardQty:'ຈຳນວນ',
    cardPrice:'ລາຄາ',
    cardBrand:'ຍີ່ຫໍ້',
    cardOrigin:'ແຫລ່ງຜະລິດ',
    cardWarranty:'ການຮັບປະກັນ',
    cardModel:'ຮຸ່ນ',
    detailDesc:'ລາຍລະອຽດ',
    detailSpecs:'ຂໍ້ມູນສະເພາະ',
    detailRelated:'ສິນຄ້າກ່ຽວຂ້ອງ',
    detailMore:'ລາຍລະອຽດ',
    cartTitle2:'ກະຕ່າສິນຄ້າ',
    cartEmpty:'ກະຕ່າວ່າງເປົ່າ',
    cartContinue:'ກັບໄປເລືອກສິນຄ້າ',
    cartTotal:'ຍອດລວມ',
    cartCheckout:'ສັ່ງຊື້',
    cartRequestAll:'ຂໍລາຄາທັງໝົດ',
    cartRemove:'ລຶບ',
    cartSubtotal:'ລວມຍ່ອຍ',
    orderSuccess2:'ສັ່ງຊື້ສຳເລັດ!',
    quoteSuccess2:'ຂໍລາຄາສຳເລັດ!',
    orderNum:'ເລກທີອໍເດີ້',
    quoteNum:'ເລກທີໃບສະເໜີລາຄາ',
    orderStatus:'ສະຖານະ',
    orderDate:'ວັນທີ',
    orderItems:'ລາຍການ',
    authEmail:'ອີເມວ',
    authPassword:'ລະຫັດຜ່ານ',
    authName:'ຊື່',
    authPhone:'ເບີໂທ',
    authCompany:'ບໍລິສັດ',
    authLoginTitle:'ເຂົ້າສູ່ລະບົບ',
    authRegisterTitle:'ລົງທະບຽນ',
    authNoAccount:'ຍັງບໍ່ມີບັນຊີ?',
    authHasAccount:'ມີບັນຊີແລ້ວ?',
    authCreate:'ສ້າງບັນຊີໃໝ່',
    authLoginHere:'ເຂົ້າສູ່ລະບົບທີ່ນີ້',
    statusPending:'ລໍຖ້າ',
    statusConfirmed:'ຢືນຢັນແລ້ວ',
    statusShipped:'ຈັດສົ່ງແລ້ວ',
    statusDelivered:'ໄດ້ຮັບແລ້ວ',
    statusCancelled:'ຍົກເລີກ',
    statusReviewed:'ກວດສອບແລ້ວ',
    statusQuoted:'ສະເໜີລາຄາແລ້ວ',
    statusAccepted:'ຍອດັດ',
    statusRejected:'ປະຕິເສດ',
    accountOrders:'ປະຫວັດການສັ່ງຊື້',
    accountQuotes:'ປະຫວັດຂໍລາຄາ',
    accountHistory:'ປະຫວັດບັນຊີ',
    accountView:'ເບິ່ງລາຍລະອຽດ',
    accountBack:'ກັບຄືນ',
    accountHello:'ສະບາຍດີ',
    accountMy:'ບັນຊີຂອງຂ້ອຍ',
    accountUpdate:'ອັບເດດຂໍ້ມູນ',
    accountSaved:'ບັນທຶກແລ້ວ',
    manageMyAccount:'ຈັດການບັນຊີ',
    myProfile:'ຂໍ້ມູນສ່ວນຕົວ',
    addressBook:'ທີ່ຢູ່',
    editProfile:'ແກ້ໄຂຂໍ້ມູນ',
    changePassword:'ປ່ຽນລະຫັດຜ່ານ',
    fullName:'ຊື່ເຕັມ',
    emailAddress:'ອີເມວ',
    mobile:'ໂທລະສັບ',
    gender:'ເພດ',
    company:'ບໍລິສັດ',
    addNewAddress:'ເພີ່ມທີ່ຢູ່ໃໝ່',
    editAddress:'ແກ້ໄຂທີ່ຢູ່',
    deleteAddress:'ລຶບທີ່ຢູ່',
    defaultShipping:'ຈັດສົ່ງຕົວເລືອກ',
    defaultBilling:'ບິນຕົວເລືອກ',
    addressBookTitle:'ທີ່ຢູ່ຈັດສົ່ງ',
    saveChanges:'ບັນທຶກການປ່ຽນແປງ',
    profileUpdated:'ອັບເດດຂໍ້ມູນສຳເລັດແລ້ວ',
    addressAdded:'ເພີ່ມທີ່ຢູ່ແລ້ວ',
    addressUpdated:'ອັບເດດທີ່ຢູ່ແລ້ວ',
    confirmDeleteAddr:'ຕ້ອງການລຶບທີ່ຢູ່ນີ້ບໍ?',
    footerElectrical:'ໄຟຟ້າ',
    footerMechanical:'ກົນຈັກ',
    footerTools:'ເຄື່ອງມື',
    footerSafety:'ຄວາມປອດໄພ',
    footerMotors:'ມອເຕີ',
    footerWater:'ນ້ຳ',
    footerServices:'ບໍລິການ',
    footerAbout:'ກ່ຽວກັບເຮົາ',
    footerContact:'ຕິດຕໍ່',
    footerDelivery:'ຈັດສົ່ງທົ່ວປະເທດ',
    footerFeatured:'ສິນຄ້າແນະນຳ',
    howStep1:'ເລືອກສິນຄ້າ',
    howStep2:'ສົ່ງຄຳຂໍ',
    howStep3:'ຮັບການຢືນຢັນ',
    howStep4:'ຮັບສິນຄ້າ',
    checkoutDelivery:'ຂໍ້ມູນຈັດສົ່ງ',
    checkoutNotes:'ບັນຊາໝາຍເຫດ',
    checkoutView:'ເບິ່ງລາຍການສັ່ງຊື້',
    quoteNotes2:'ໝາຍເຫດສຳລັບຂໍລາຄາ',
    quoteSubmit:'ສົ່ງຂໍລາຄາ',
    quoteView:'ເບິ່ງໃບສະເໜີລາຄາ',
    loyaltyTitle:'ສະມາຊິກຄວາມສັດຊື່',
    loyaltyAvail:'ພິນທະທີ່ມີ',
    loyaltyTier:'ລະດັບປັດຈຸບັນ',
    loyaltyLifetime:'ພິນທະລວມ',
    loyaltyRedeemed:'ໃຊ້ແລ້ວ',
    loyaltyNext:'ລະດັບຕໍ່ໄປ',
    loyaltyDiscount:'ສ່ວນຫຼຸດລະດັບ',
    loyaltyHistory:'ປະຫວັດພິນທະ',
    loyaltyBalance:'ຍອດຄົງເຫຼືອ',
    loyaltyPoints2:'ພິນທະ',
    loyaltyType:'ປະເພດ',
    loyaltyRedeem:'ໃຊ້ພິນທະ',
    pwdForgot:'ລືມລະຫັດຜ່ານ',
    pwdSend:'ສົ່ງລິ້ງຕັ້ງລະຫັດ',
    pwdSetTitle:'ຕັ້ງລະຫັດໃໝ່',
    pwdNew:'ລະຫັດໃໝ່',
    pwdConfirm:'ຢັ້ງຢືນລະຫັດ',
    pwdReset:'ຕັ້ງລະຫັດ',
    pwdChange:'ປ່ຽນລະຫັດ',
    pwdCurrent:'ລະຫັດປັດຈຸບັນ',
    addrTitle:'ທີ່ຢູ່ຈັດສົ່ງ',
    addrAdd:'ເພີ່ມທີ່ຢູ່ໃໝ່',
    addrEdit:'ແກ້ໄຂທີ່ຢູ່',
    addrDelete:'ລຶບທີ່ຢູ່',
    addrRecipient:'ຊື່ຜູ້ຮັບ',
    addrProvince:'ແຂວງ',
    addrDistrict:'ເມືອງ',
    addrVillage:'ບ້ານ',
    addrPostal:'ລະຫັດໄປສະນີ',
    addrDefault:'ທີ່ຢູ່ຫຼັກ',
    addrLabel:'ປ້າຍກຳກັບ',
    addrOffice:'ທີ່ດຳເນີນງານ',
    addrWarehouse:'ຄັງສິນຄ້າ',
    addrSelect:'ເລືອກທີ່ຢູ່ຈັດສົ່ງ',
    reviewTitle2:'ຄຳຕິຊົມ',
    reviewEdit:'ແກ້ໄຂຄຳຕິຊົມ',
    reviewRating:'ການໃຫ້ຄະແນນ',
    reviewSubmit2:'ສົ່ງຄຳຕິຊົມ',
    reviewRating2:'ຄະແນນ',
    reviewHeadline:'ຫົວຂໍ້',
    timelineTitle:'ປະຫວັດສະຖານະ',
    timelineInit:'ສະຖານະເລີ່ມຕົ້ນ',
    couponCode2:'ລະຫັດຄູປອງ',
    couponApply:'ນຳໃຊ້',
    couponRemove:'ລຶບ',
    couponDiscount2:'ສ່ວນຫຼຸດຄູປອງ',
    wishlistTitle:'ລາຍການທີ່ມັກ',
    miscBronze:'ທອງ',
    miscDefault:'ທີ່ຢູ່ຫຼັກ',
    miscEscape:'ປິດ',
    miscPaid:'ຈ່າຍແລ້ວ',
    miscRefunded:'ຄືນເງິນແລ້ວ',
    miscApproved:'ອະນຸມັດແລ້ວ',
    miscDraft:'ຮ່າງ',
    miscInStock:'ມີສະຕັອກ',
    miscLowStock:'ເຫລືອໜ້ອຍ',
    miscDescription:'ລາຍລະອຽດ',
    miscSpecifications:'ຂໍ້ມູນສະເພາະ',
    miscDocuments:'ເອກະສານ',
    miscRelatedProducts:'ສິນຄ້າກ່ຽວຂ້ອງ',
    miscQuotedPrice:'ລາຄາລວມ',
    miscSubtotal:'ລວມຍ່ອຍ',
    miscDeliveryInfo:'ຂໍ້ມູນຈັດສົ່ງ',
    miscOrderNotes:'ບັນຊາໝາຍເຫດ',
    miscConfirmOrder:'ຢືນຢັນການສັ່ງຊື້',
    miscViewOrderDetails:'ເບິ່ງລາຍການສັ່ງຊື້',
    miscQuotationNotes:'ໝາຍເຫດສຳລັບຂໍລາຄາ',
    miscSubmitQuoteRequest:'ສົ່ງຂໍລາຄາ',
    miscViewQuotation:'ເບິ່ງໃບສະເໜີລາຄາ',
    miscLoyalty:'ຄວາມສັດຊື່',
    miscAvailablePoints:'ພິນທະທີ່ມີ',
    miscCurrentTier:'ລະດັບປັດຈຸບັນ',
    miscLifetimePoints:'ພິນທະລວມ',
    miscRedeemed:'ໃຊ້ແລ້ວ',
    miscNextTier:'ລະດັບຕໍ່ໄປ',
    miscTierDiscount:'ສ່ວນຫຼຸດລະດັບ',
    miscPointsHistory:'ປະຫວັດພິນທະ',
    miscBalance:'ຍອດຄົງເຫຼືອ',
    miscPoints:'ພິນທະ',
    miscType:'ປະເພດ',
    miscRedeemPoints:'ໃຊ້ພິນທະ',
    miscForgotPassword:'ລືມລະຫັດຜ່ານ',
    miscSendResetLink:'ສົ່ງລິ້ງຕັ້ງລະຫັດ',
    miscSetNewPassword:'ຕັ້ງລະຫັດໃໝ່',
    miscNewPassword:'ລະຫັດໃໝ່',
    miscConfirmPassword:'ຢັ້ງຢືນລະຫັດ',
    miscResetPassword:'ຕັ້ງລະຫັດ',
    miscChangePassword:'ປ່ຽນລະຫັດ',
    miscCurrentPassword:'ລະຫັດປັດຈຸບັນ',
    miscDeliveryAddresses:'ທີ່ຢູ່ຈັດສົ່ງ',
    miscAddAddress:'ເພີ່ມທີ່ຢູ່ໃໝ່',
    miscEditAddress:'ແກ້ໄຂທີ່ຢູ່',
    miscDeleteAddress:'ລຶບທີ່ຢູ່',
    miscRecipientName:'ຊື່ຜູ້ຮັບ',
    miscProvince:'ແຂວງ',
    miscDistrict:'ເມືອງ',
    miscVillage:'ບ້ານ',
    miscPostalCode:'ລະຫັດໄປສະນີ',
    miscDefault2:'ທີ່ຢູ່ຫຼັກ',
    miscLabel:'ປ້າຍກຳກັບ',
    miscOffice:'ທີ່ດຳເນີນງານ',
    miscWarehouse:'ຄັງສິນຄ້າ',
    miscSelectAddress:'ເລືອກທີ່ຢູ່ຈັດສົ່ງ',
    miscReviews:'ຄຳຕິຊົມ',
    miscEditReview:'ແກ້ໄຂຄຳຕິຊົມ',
    miscYourRating:'ການໃຫ້ຄະແນນ',
    miscSubmitReview:'ສົ່ງຄຳຕິຊົມ',
    miscRating:'ຄະແນນ',
    miscReviewTitle:'ຫົວຂໍ້',
    miscStatusHistory:'ປະຫວັດສະຖານະ',
    miscInitialStatus:'ສະຖານະເລີ່ມຕົ້ນ',
    miscCouponCode:'ລະຫັດຄູປອງ',
    miscApply:'ນຳໃຊ້',
    miscRemove:'ລຶບ',
    miscDiscount:'ສ່ວນຫຼຸດ',
    miscCouponDiscount:'ສ່ວນຫຼຸດຄູປອງ',
    miscWishlist:'ລາຍການທີ່ມັກ',
    miscProcessing:'ກຳລັງດຳເນີນການ',
    miscCancel:'ຍົກເລີກ',
    ok:'ຕົກລົງ', cancel:'ຍົກເລີກ',
    eyebrowSub:'ແພລະຕະຟອມການຈັດຊື້ອຸປະກອນ', loadingReviews:'ກຳລັງໂຫຼດຄຳຕິຊົມ...',
    deliveryAddresses:'ທີ່ຢູ່ຈັດສົ່ງ', addAddress:'ເພີ່ມທີ່ຢູ່', editAddress:'ແກ້ໄຂທີ່ຢູ່', deleteAddress:'ລຶບທີ່ຢູ່',
    recipientName:'ຊື່ຜູ້ຮັບ', addressLine1:'ທີ່ຢູ່ 1', addressLine2:'ທີ່ຢູ່ 2',
    setDefault:'ຕັ້ງເປັນຄ່າເລີ່ມຕົ້ນ', isDefault:'ຄ່າເລີ່ມຕົ້ນ',
    noAddresses:'ຍັງບໍ່ມີທີ່ຢູ່', addressSaved:'ບັນທຶກທີ່ຢູ່ແລ້ວ', addressDeleted:'ລຶບທີ່ຢູ່ແລ້ວ', confirmDelete:'ລຶບທີ່ຢູ່ນີ້?',
    label:'ປ້າຍ', office:'ຫ້ອງການ', warehouse:'ຄັງສິນຄ້າ', selectAddress:'ເລືອກທີ່ຢູ່',
    paid:'ຈ່າຍແລ້ວ', refunded:'ຄືນເງິນແລ້ວ', approved:'ອະນຸມັດແລ້ວ', draft:'ຮ່າງ',
    title:'ຫົວຂໍ້', comment:'ຄຳເຫັນ', code:'ລະຫັດ', orderSubtotal:'ລວມຍ່ອຍ', tabDocs2:'ເອກະສານ',
    shippingCompany:'ບໍລິສັດຂົນສົ່ງ', selectShipping:'ເລືອກບໍລິສັດຂົນສົ່ງ',
    shippingBranch:'ສາຂາຂົນສົ່ງ', selectBranch:'ເລືອກສາຂາ',
    paymentMethod:'ວິທີຈ່າຍເງິນ', selectPayment:'ເລືອກວິທີຈ່າຍເງິນ',
    confirmYes:'ຢືນຢັນ', province:'ແຂວງ', district:'ເມືອງ',
    village:'ບ້ານ', postalCode:'ລະຫັດໄປສະນີ',
    orderStatusPending:'ລໍຖ້າ', orderStatusConfirmed:'ຢືນຢັນແລ້ວ',
    orderStatusProcessing:'ກຳລັງດຳເນີນການ', orderStatusShipped:'ຈັດສົ່ງແລ້ວ',
    orderStatusDelivered:'ໄດ້ຮັບແລ້ວ', orderStatusCancelled:'ຍົກເລີກ',
    orderStatusPaid:'ຈ່າຍແລ້ວ', orderStatusRefunded:'ຄືນເງິນແລ້ວ',
    orderStatusRejected:'ປະຕິເສດ', orderStatusApproved:'ອະນຸມັດແລ້ວ',
    orderStatusQuoted:'ສະເໜີລາຄາແລ້ວ', orderStatusDraft:'ຮ່າງ',
    orderStatusReviewed:'ກວດສອບແລ້ວ', orderStatusAccepted:'ຍອມຮັບ',
    confirmYesLabel:'ຢືນຢັນ',
    skuLabel:'SKU', options:'ຕົວເລືອກ', tier:'ລະດັບ',
    category:'ໝວດໝູ່',
    cancelOrder:'ຍົກເລີກອໍເດີ້', cancelOrderConfirm:'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການຍົກເລີກອໍເດີ້ນີ້?',
    cancelQuotation:'ຍົກເລີກຂໍລາຄາ', cancelQuotationConfirm:'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການຍົກເລີກຂໍລາຄານີ້?',
    deleteQuotation:'ລຶບຂໍລາຄາ', deleteQuotationConfirm:'ການດຳເນີນການນີ້ບໍ່ສາມາດຍ້ອນກັນໄດ້. ທ່ານແນ່ໃຈບໍ່?',
    orderCancelled:'ຍົກເລີກອໍເດີ້ແລ້ວ', quoteCancelled:'ຍົກເລີກຂໍລາຄາແລ້ວ',
    quoteDeleted:'ລຶບຂໍລາຄາແລ້ວ',
    loginWelcome:'ຍິນດີຕ້ອນຮັບກັບມາ', loginWelcomeSub:'ເຂົ້າສູ່ລະບົບສູ່ບັນຊີ NB LAO ຂອງທ່ານ',
    showPassword:'ສະແດງລະຫັດຜ່ານ', hidePassword:'ເຊື່ອງລະຫັດຜ່ານ',
    loginHeroTitle:'ສະໜອງພະລັງໃຫ້ທຸລະກິດຂອງທ່ານ ດ້ວຍການແກ້ໄຂທີ່ເຊື່ອຖືໄດ້',
    loginHeroSub:'ຜູ້ຈຳໜ່າຍອຸປະກອນອຸດສາຫະກຳ ແລະ ໄຟຟ້າ ຄົບວົງຈອນ ສຳລັບຮ້ານຄ້າ ແລະ ໂຄງການ',
    loginTag1:'ຜະລິດຕະພັນອຸດສາຫະກຳ', loginTag2:'ບໍລິການອຸດໜູນ', loginTag3:'ການຈະເລີນເຕີບໂຕຍືນຍົງ',
    dashboard:'ແຜງຄວບຄຸມ', welcomeBack:'ສະບາຍດີ', dashSubtitle:'ພາບລວມບັນຊີຂອງທ່ານ',
    dashTotalOrders:'ອໍເດີ້ທັງໝົດ', dashPendingOrders:'ອໍເດີ້ລໍຖ້າ', dashActiveQuotations:'ໃບສະເໜີລາຄາທີ່ດຳເນີນການ',
    dashLoyaltyPoints:'ຄະແນນສະສົມ', viewAll:'ເບິ່ງທັງໝົດ',
    recentOrders:'ອໍເດີ້ຫຼ້າສຸດ', recentQuotations:'ໃບສະເໜີລາຄາຫຼ້າສຸດ',
    quickActions:'ການດຳເນີນການດ່ວນ', browseProducts:'ເລືອກຊື້ສິນຄ້າ',
    dashDataError:'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້', dashRetry:'ລອງໃໝ່',
    dashBannerTag:'ສິນຄ້າຄຸນນະພາບ ເພື່ອອະນາຄົດທີ່ຍືນຍົງ',
    dashSavedItems:'ລາຍການທີ່ມັກ',
    dashFilters:'ກອງອໍເດີ້', dashDateRange:'ຊ່ວງວັນທີ', dashQuickFilter:'ກອງດ່ວນ',
    dashSearchUnified:'ຄົ້ນຫາ Order ຫຼື Quotation...', dashSearchUnifiedHeading:'ຄົ້ນຫາ Order ຫຼື Quotation',
    dashAllTime:'ທັງໝົດເວລາ', dashLast7:'7 ວັນຜ່ານມາ', dashLast30:'30 ວັນຜ່ານມາ',
    dashLast90:'90 ວັນຜ່ານມາ', dashThisYear:'ປີນີ້', dashCustomRange:'ກຳນົດເອງ',
    dashOrderStatus:'ສະຖານະອໍເດີ້', dashSearchOrder:'ຄົ້ນຫາເລກອໍເດີ້...', dashAllStatus:'ທັງໝົດ', dashSearchLabel:'ຄົ້ນຫາ',
    dashApplyFilters:'ນຳໃຊ້ການກອງ', dashReset:'ລ້າງຄືນ',
    dashNoMatch:'ບໍ່ມີອໍເດີ້ທີ່ກົງກັບການກອງ', dashFrom:'ຈາກ', dashTo:'ເຖິງ',
    dashShowing:'ສະແດງ',
    dashScopeShared:'ຊ່ວງວັນທີ (ອໍເດີ້ ແລະ ໃບສະເໜີລາຄາ)', dashStartDate:'ວັນທີເລີ່ມ', dashEndDate:'ວັນທີສິ້ນສຸດ',
    dashQuoteStatus:'ສະຖານະໃບສະເໜີລາຄາ', dashSearchQuote:'ຄົ້ນຫາເລກໃບສະເໜີ...', dashNoQuotesMatch:'ບໍ່ມີໃບສະເໜີທີ່ກົງກັບການກອງ',
    dashOrdersSection:'ອໍເດີ້', dashQuotesSection:'ໃບສະເໜີລາຄາ',
    dashInvalidRange:'ວັນທີສິ້ນສຸດ ຕ້ອງບໍ່ກ່ອນວັນທີເລີ່ມ', dashClearDates:'ລ້າງວັນທີ',
    dashPrev:'ກ່ອນໜ້າ', dashNext:'ຕໍ່ໄປ', dashPage:'ໜ້າ',
    qaSettingsSub:'ຈັດການບັນຊີ ແລະ ຄວາມປອດໄພ',
    dashDefaultAddr:'ຫຼັກ', dashNoAddr:'ຍັງບໍ່ມີທີ່ຢູ່ຈັດສົ່ງ', dashAddressesCard:'ທີ່ຢູ່ຈັດສົ່ງ',
    sideOverview:'ພາບລວມ', sideMyAccount:'ບັນຊີຂອງຂ້ອຍ', sideRewards:'ລາງວັນ',
    acctSettings:'ການຕັ້ງຄ່າບັນຊີ', acctMenu:'ເມນູ', acctMember:'ສະມາຊິກ',
    qaBrowseSub:'ຄົ້ນຫາສິນຄ້າ ແລະ ວິທີແກ້ໄຂ', qaProfileSub:'ຈັດການຂໍ້ມູນສ່ວນຕົວ',
    qaAddressSub:'ຈັດການທີ່ຢູ່ຈັດສົ່ງ', qaOrdersSub:'ເບິ່ງອໍເດີ້ທັງໝົດ',
    qaQuotesSub:'ເບິ່ງໃບສະເໜີລາຄາ', qaSavedSub:'ເບິ່ງລາຍການທີ່ມັກ',
    loyaltyPageTitle:'ຄະແນນສະສົມ', loyaltyNextTierHint:'ຄະແນນຕໍ່ໄປ', loyaltyNoHistory:'ຍັງບໍ່ມີປະຫວັດພິນທະ'
  },
  en: {
    home:'Home', products:'Products', login:'Login', register:'Register',
    cart:'Cart', logout:'Logout', account:'My Account',
    orders:'Order History', quotations:'Quote History',
    search:'Search products...', searchPh:'Search name, SKU, model...',
    categories:'Categories', brands:'Brands', filters:'Filters',
    allCategories:'All Categories', allBrands:'All Brands',
    priceRange:'Price Range', minPrice:'Min Price', maxPrice:'Max Price',
    inStock:'In Stock Only', sort:'Sort',
    newest:'Newest', oldest:'Oldest',
    priceLow:'Price: Low→High', priceHigh:'Price: High→Low',
    results:'items', page:'Page', of:'of', prev:'Prev', next:'Next',
    noResults:'No products found', loading:'Loading...',
    addToCart:'🛒 Add to Cart', requestQuote:'📄 Request Quote',
    qty:'Qty', stock:'In Stock', outOfStock:'Out of Stock',
    lowStock:'Low Stock', price:'Price', brand:'Brand',
    origin:'Origin', warranty:'Warranty', model:'Model',
    description:'Description', specifications:'Specifications',
    related:'Related', detail:'More Details',
    cartTitle:'Shopping Cart', emptyCart:'Your cart is empty',
    continueShopping:'Continue Shopping', total:'Total',
    noOrders:'No orders yet', noQuotations:'No quotations yet',
    checkout:'Checkout', requestAllQuote:'Request Quote for All',
    remove:'Remove', subtotal:'Subtotal',
    orderSuccess:'Order placed successfully!', quoteSuccess:'Quote request sent!',
    orderNumber:'Order No.', quoteNumber:'Quote No.',
    status:'Status', date:'Date', items:'Items',
    email:'Email', password:'Password', name:'Full Name',
    phone:'Phone', company:'Company',
    loginTitle:'Login', registerTitle:'Register',
    noAccount:"Don't have an account?", hasAccount:'Already have an account?',
    createAccount:'Create Account', loginHere:'Login here',
    pending:'Pending', confirmed:'Confirmed', shipped:'Shipped',
    delivered:'Delivered', cancelled:'Cancelled',
    reviewed:'Reviewed', quoted:'Quoted',
    accepted:'Accepted', rejected:'Rejected',
    orderHistory:'Order History', quoteHistory:'Quote History',
    viewDetail:'View Details', back:'Back',
    hello:'Hello', myAccount:'My Account',
    updateProfile:'Update Profile', saved:'Saved',
    perUnit:'/ unit', contactForPrice:'Contact for Price',
    requiredField:'This field is required', invalidEmail:'Invalid email',
    passwordMismatch:'Passwords do not match', passwordShort:'Password must be at least 8 characters',
    deactivated:'This account has been deactivated',
    adminAccessDenied:'Admin accounts cannot access the Customer Portal.',
    networkError:'Network error, please try again',
    electrical:'Electrical', mechanical:'Mechanical', tools:'Tools',
    safety:'Safety', motors:'Motors', water:'Water',
    services:'Services', about:'About', contact:'Contact', servicesDesc:'Our services', aboutDesc:'About NB LAO Company', contactDesc:'Contact us',
    heroTitle:'Complete Industrial & Electrical Equipment',
    heroDesc:'Search, compare, and request quotes from leading brands',
    promo1:'New Year Promo — 15% Off', promo1sub:'For direct orders and RFQ',
    promo2:'Nationwide Delivery', promo2sub:'For orders over 5,000,000 LAK',
    featuredProducts:'Featured Products',
    confirmOrder:'Place Order', confirmOrderDesc:'Please review your items before confirming',
    addedToCart:'Added to cart',
    // Stock filters
    allStock:'Stock Status', stockAvailable:'In Stock', stockLowStock:'Low Stock', stockOutOfStock:'Out of Stock', stockPreOrder:'Pre-Order',
    // How to Order
    menu:'Menu', language:'Language',
    howToOrder:'How to Order', step1Title:'Choose Products', step1Desc:'Search or browse categories, add items to cart or request a quote',
    step2Title:'Submit Request', step2Desc:'Fill in contact info and delivery address, or confirm your order directly',
    step3Title:'Get Confirmation', step3Desc:'Our team contacts you within 24 hours to confirm pricing and delivery',
    step4Title:'Receive Goods', step4Desc:'Nationwide delivery with a dedicated team tracking your order',
    // Partners
    partners:'Business Partners / Authorized Dealers',
    // Tabs
    tabDesc:'Description', tabSpecs:'Specifications', tabDocs:'Documents', tabHowTo:'How to Use', tabRelated:'Related Products',
    noDocs:'No documents available yet', noHowTo:'No usage information available yet', quotedPrice:'Quoted Price', subtotal:'Subtotal',
    // Cart
    clearCart:'Clear Cart', confirmClear:'Clear all items from cart?',
    // Checkout
    deliveryInfo:'Delivery Address', orderNotes:'Notes', notesPlaceholder:'Optional notes...',
    submitOrder:'Confirm Order', submitting:'Submitting...',
    orderConfirmed:'Order Confirmed!', viewOrder:'View Order Details',
    // Quotation
    quoteNotes:'Notes', quoteNotesPlaceholder:'Describe your specific requirements...',
    submitQuote:'Submit Quote Request', quoteRequested:'Quote Requested!', viewQuote:'View Quotation',
    // Sort
    sortBy:'Sort by:', nameAsc:'Name: A-Z', nameDesc:'Name: Z-A',
    // Loyalty
    loyalty:'Loyalty', availablePoints:'Available Points', currentTier:'Current Tier', lifetimePoints:'Lifetime Points',
    redeemed:'Redeemed', nextTier:'Next Tier', needed:'needed', tierDiscount:'Tier Discount',
    pointsHistory:'Points History', balance:'Balance', points:'Points', type:'Type',
    earned:'Earned', expired:'Expired', adjusted:'Adjusted', reversed:'Reversed',
    pointsEarnOnThisOrder:'Points earned from this order', loyaltyNotAvailable:'Loyalty system not yet available',
    noPointsHistory:'No points history yet', redeemPoints:'Redeem Points',
    // Password Reset
    forgotPassword:'Forgot Password', forgotPasswordTitle:'Forgot Password',
    forgotPasswordDesc:'Enter your email to receive a link to reset your password',
    sendResetLink:'Send Reset Link', resetSent:'Reset link sent!',
    resetSentDesc:'Check your email and click the link to reset your password',
    resetPasswordTitle:'Set New Password',
    newPassword:'New Password', confirmPassword:'Confirm Password',
    resetPassword:'Reset Password', resetSuccess:'Password reset successful!',
    resetExpired:'This link has expired or is invalid',
    changePasswordTitle:'Change Password', currentPassword:'Current Password',
    changePassword:'Change Password', passwordChanged:'Password changed successfully!',
    forgotPasswordLink:'Forgot Password?',
    deliveryAddresses:'Delivery Addresses', addAddress:'Add Address', editAddress:'Edit Address', deleteAddress:'Delete Address',
    recipientName:'Recipient Name', addressLine1:'Address Line 1', addressLine2:'Address Line 2', province:'Province', district:'District',
    village:'Village', postalCode:'Postal Code', setDefault:'Set as Default', isDefault:'Default',
    noAddresses:'No addresses yet', addressSaved:'Address saved', addressDeleted:'Address deleted', confirmDelete:'Delete this address?',
    label:'Label', office:'Office', warehouse:'Warehouse', selectAddress:'Select Address',
    backToLogin:'Back to Login',
    // Phase 19: Reviews,
    tabReviews:'Reviews', writeReview:'Write a Review', editReview:'Edit Review', yourRating:'Your Rating',
    submitReview:'Submit Review', reviewSubmitted:'Review submitted for moderation', reviewUpdated:'Review updated',
    reviewDeleted:'Review deleted', noReviews:'No reviews yet. Be the first!', rating:'Rating', reviews:'reviews',
    basedOn:'Based on', stars:'stars', reviewPlaceholder:'Share your experience with this product...', reviewTitle:'Review Title',
    thankYouReview:'Thank you for your review!', purchaseRequired:'Purchase required to review this product',
    // Timeline
    statusTimeline:'Status History', noHistory:'No history yet',
    initialStatus:'Initial Status', byStaff:'by',
    // Phase 19: Coupons,
    couponCode:'Coupon Code', applyCoupon:'Apply', removeCoupon:'Remove', couponApplied:'Coupon applied!',
    couponInvalid:'Invalid coupon code', couponExpired:'Coupon expired', couponMinOrder:'Minimum order not met',
    couponMaxUses:'Coupon usage limit reached', couponNotActive:'Coupon is not active',
    discount:'Discount', couponDiscount:'Coupon Discount', totalAfterDiscount:'Total after discount',
    // Phase 19: Wishlist,
    wishlist:'Wishlist', addToWishlist:'Add to Wishlist', removeFromWishlist:'Remove from Wishlist',
    wishlistEmpty:'Your wishlist is empty', wishlistAdded:'Added to wishlist', wishlistRemoved:'Removed from wishlist',
    itemsInWishlist:'items in wishlist', moveTocart:'Move to Cart', notAvailable:'Product no longer available',
    max:'max', processing:'Confirmed',
    navHome:'Home',
    navProducts:'Products',
    navLogin:'Login',
    navRegister:'Register',
    navCart:'Cart',
    navLogout:'Logout',
    navAccount:'My Account',
    navOrders:'Order History',
    navQuotations:'Quote History',
    filterCategories:'Categories',
    filterBrands:'Brands',
    filterFilters:'Filters',
    filterAllCats:'All Categories',
    filterAllBrands:'All Brands',
    filterPriceRange:'Price Range',
    filterMinPrice:'Min Price',
    filterMaxPrice:'Max Price',
    filterInStock:'In Stock Only',
    filterSort:'Sort',
    filterNewest:'Newest',
    filterOldest:'Oldest',
    filterPage:'Page',
    filterPrev:'Prev',
    filterNext:'Next',
    cardQty:'Qty',
    cardPrice:'Price',
    cardBrand:'Brand',
    cardOrigin:'Origin',
    cardWarranty:'Warranty',
    cardModel:'Model',
    detailDesc:'Description',
    detailSpecs:'Specifications',
    detailRelated:'Related Products',
    detailMore:'Details',
    cartTitle2:'Shopping Cart',
    cartEmpty:'Your cart is empty',
    cartContinue:'Continue Shopping',
    cartTotal:'Total',
    cartCheckout:'Checkout',
    cartRequestAll:'Request All Quotes',
    cartRemove:'Remove',
    cartSubtotal:'Subtotal',
    orderSuccess2:'Order Placed!',
    quoteSuccess2:'Quote Requested!',
    orderNum:'Order Number',
    quoteNum:'Quote Number',
    orderStatus:'Status',
    orderDate:'Date',
    orderItems:'Items',
    authEmail:'Email',
    authPassword:'Password',
    authName:'Name',
    authPhone:'Phone',
    authCompany:'Company',
    authLoginTitle:'Login',
    authRegisterTitle:'Register',
    authNoAccount:'Don\'t have an account?',
    authHasAccount:'Already have an account?',
    authCreate:'Create Account',
    authLoginHere:'Login here',
    statusPending:'Pending',
    statusConfirmed:'Confirmed',
    statusShipped:'Shipped',
    statusDelivered:'Delivered',
    statusCancelled:'Cancelled',
    statusReviewed:'Reviewed',
    statusQuoted:'Quoted',
    statusAccepted:'Accepted',
    statusRejected:'Rejected',
    accountOrders:'Order History',
    accountQuotes:'Quote History',
    accountHistory:'Account History',
    accountView:'View Details',
    accountBack:'Back',
    accountHello:'Hello',
    accountMy:'My Account',
    accountUpdate:'Update Profile',
    accountSaved:'Saved',
    manageMyAccount:'Manage My Account',
    myProfile:'My Profile',
    addressBook:'Address Book',
    editProfile:'Edit Profile',
    changePassword:'Change Password',
    fullName:'Full Name',
    emailAddress:'Email Address',
    mobile:'Mobile',
    gender:'Gender',
    company:'Company',
    addNewAddress:'Add New Address',
    editAddress:'Edit Address',
    deleteAddress:'Delete Address',
    defaultShipping:'Default Shipping',
    defaultBilling:'Default Billing',
    addressBookTitle:'Delivery Addresses',
    saveChanges:'Save Changes',
    profileUpdated:'Profile updated successfully',
    addressAdded:'Address added successfully',
    addressUpdated:'Address updated successfully',
    confirmDeleteAddr:'Delete this address?',
    footerElectrical:'Electrical',
    footerMechanical:'Mechanical',
    footerTools:'Tools',
    footerSafety:'Safety',
    footerMotors:'Motors',
    footerWater:'Water',
    footerServices:'Services',
    footerAbout:'About',
    footerContact:'Contact',
    footerDelivery:'Nationwide Delivery',
    footerFeatured:'Featured Products',
    howStep1:'Choose Products',
    howStep2:'Submit Request',
    howStep3:'Get Confirmation',
    howStep4:'Receive Goods',
    tabDocs2:'Documents',
    checkoutDelivery:'Delivery Information',
    checkoutNotes:'Order Notes',
    checkoutView:'View Order Details',
    quoteNotes2:'Quotation Notes',
    quoteSubmit:'Submit Quote Request',
    quoteView:'View Quotation',
    loyaltyTitle:'Loyalty',
    loyaltyAvail:'Available Points',
    loyaltyTier:'Current Tier',
    loyaltyLifetime:'Lifetime Points',
    loyaltyRedeemed:'Redeemed',
    loyaltyNext:'Next Tier',
    loyaltyDiscount:'Tier Discount',
    loyaltyHistory:'Points History',
    loyaltyBalance:'Balance',
    loyaltyPoints2:'Points',
    loyaltyType:'Type',
    loyaltyRedeem:'Redeem Points',
    pwdForgot:'Forgot Password',
    pwdSend:'Send Reset Link',
    pwdSetTitle:'Set New Password',
    pwdNew:'New Password',
    pwdConfirm:'Confirm Password',
    pwdReset:'Reset Password',
    pwdChange:'Change Password',
    pwdCurrent:'Current Password',
    addrTitle:'Delivery Addresses',
    addrAdd:'Add New Address',
    addrEdit:'Edit Address',
    addrDelete:'Delete Address',
    addrRecipient:'Recipient Name',
    addrProvince:'Province',
    addrDistrict:'District',
    addrVillage:'Village',
    addrPostal:'Postal Code',
    addrDefault:'Default',
    addrLabel:'Label',
    addrOffice:'Office',
    addrWarehouse:'Warehouse',
    addrSelect:'Select Delivery Address',
    reviewTitle2:'Reviews',
    reviewEdit:'Edit Review',
    reviewRating:'Your Rating',
    reviewSubmit2:'Submit Review',
    reviewRating2:'Rating',
    reviewHeadline:'Review Title',
    timelineTitle:'Status History',
    timelineInit:'Initial Status',
    couponCode2:'Coupon Code',
    couponApply:'Apply',
    couponRemove:'Remove',
    couponDiscount2:'Coupon Discount',
    wishlistTitle:'Wishlist',
    miscBronze:'Bronze',
    miscDefault:'Default',
    miscEscape:'Close',
    miscPaid:'Paid',
    miscRefunded:'Refunded',
    miscApproved:'Approved',
    miscDraft:'Draft',
    miscInStock:'In Stock',
    miscLowStock:'Low Stock',
    miscDescription:'Description',
    miscSpecifications:'Specifications',
    miscDocuments:'Documents',
    miscRelatedProducts:'Related Products',
    miscQuotedPrice:'Quoted Price',
    miscSubtotal:'Subtotal',
    miscDeliveryInfo:'Delivery Information',
    miscOrderNotes:'Order Notes',
    miscConfirmOrder:'Confirm Order',
    miscViewOrderDetails:'View Order Details',
    miscQuotationNotes:'Quotation Notes',
    miscSubmitQuoteRequest:'Submit Quote Request',
    miscViewQuotation:'View Quotation',
    miscLoyalty:'Loyalty',
    miscAvailablePoints:'Available Points',
    miscCurrentTier:'Current Tier',
    miscLifetimePoints:'Lifetime Points',
    miscRedeemed:'Redeemed',
    miscNextTier:'Next Tier',
    miscTierDiscount:'Tier Discount',
    miscPointsHistory:'Points History',
    miscBalance:'Balance',
    miscPoints:'Points',
    miscType:'Type',
    miscRedeemPoints:'Redeem Points',
    miscForgotPassword:'Forgot Password',
    miscSendResetLink:'Send Reset Link',
    miscSetNewPassword:'Set New Password',
    miscNewPassword:'New Password',
    miscConfirmPassword:'Confirm Password',
    miscResetPassword:'Reset Password',
    miscChangePassword:'Change Password',
    miscCurrentPassword:'Current Password',
    miscDeliveryAddresses:'Delivery Addresses',
    miscAddAddress:'Add New Address',
    miscEditAddress:'Edit Address',
    miscDeleteAddress:'Delete Address',
    miscRecipientName:'Recipient Name',
    miscProvince:'Province',
    miscDistrict:'District',
    miscVillage:'Village',
    miscPostalCode:'Postal Code',
    miscDefault2:'Default',
    miscLabel:'Label',
    miscOffice:'Office',
    miscWarehouse:'Warehouse',
    miscSelectAddress:'Select Delivery Address',
    miscReviews:'Reviews',
    miscEditReview:'Edit Review',
    miscYourRating:'Your Rating',
    miscSubmitReview:'Submit Review',
    miscRating:'Rating',
    miscReviewTitle:'Review Title',
    miscStatusHistory:'Status History',
    miscInitialStatus:'Initial Status',
    miscCouponCode:'Coupon Code',
    miscApply:'Apply',
    miscRemove:'Remove',
    miscDiscount:'Discount',
    miscCouponDiscount:'Coupon Discount',
    miscWishlist:'Wishlist',
    miscProcessing:'Processing',
    miscCancel:'Cancel',
    ok:'OK', cancel:'Cancel',
    eyebrowSub:'Industrial Procurement Platform', loadingReviews:'Loading reviews...',
    shippingCompany:'Shipping Company', selectShipping:'Select Shipping Company',
    shippingBranch:'Shipping Branch', selectBranch:'Select Branch',
    paymentMethod:'Payment Method', selectPayment:'Select Payment Method',
    confirmYes:'Confirm', province:'Province', district:'District',
    village:'Village', postalCode:'Postal Code',
    orderStatusPending:'Pending', orderStatusConfirmed:'Confirmed',
    orderStatusProcessing:'Processing', orderStatusShipped:'Shipped',
    orderStatusDelivered:'Delivered', orderStatusCancelled:'Cancelled',
    orderStatusPaid:'Paid', orderStatusRefunded:'Refunded',
    orderStatusRejected:'Rejected', orderStatusApproved:'Approved',
    orderStatusQuoted:'Quoted', orderStatusDraft:'Draft',
    orderStatusReviewed:'Reviewed', orderStatusAccepted:'Accepted',
    confirmYesLabel:'Confirm',
    skuLabel:'SKU', options:'Options', tier:'Tier',
    category:'Category',
    cancelOrder:'Cancel Order', cancelOrderConfirm:'Are you sure you want to cancel this order?',
    cancelQuotation:'Cancel Quotation', cancelQuotationConfirm:'Are you sure you want to cancel this quotation?',
    deleteQuotation:'Delete Quotation', deleteQuotationConfirm:'This action cannot be undone. Are you sure?',
    orderCancelled:'Order cancelled', quoteCancelled:'Quotation cancelled',
    quoteDeleted:'Quotation deleted',
    loginWelcome:'Welcome Back', loginWelcomeSub:'Sign in to your NB LAO account',
    showPassword:'Show password', hidePassword:'Hide password',
    loginHeroTitle:'Powering Your Business with Trusted Solutions',
    loginHeroSub:'Full-service industrial and electrical equipment supplier for shops and projects',
    loginTag1:'Industrial Products', loginTag2:'Expert Support', loginTag3:'Sustainable Growth',
    dashboard:'Dashboard', welcomeBack:'Welcome back', dashSubtitle:'Here is an overview of your account',
    dashTotalOrders:'Total Orders', dashPendingOrders:'Pending Orders', dashActiveQuotations:'Active Quotations',
    dashLoyaltyPoints:'Loyalty Points', viewAll:'View All',
    recentOrders:'Recent Orders', recentQuotations:'Recent Quotations',
    quickActions:'Quick Actions', browseProducts:'Browse Products',
    dashDataError:'Unable to load data', dashRetry:'Retry',
    dashBannerTag:'Quality Products for a Sustainable Future',
    dashSavedItems:'Saved Items',
    dashFilters:'Filter Orders', dashDateRange:'Date Range', dashQuickFilter:'Quick Filter',
    dashSearchUnified:'Search Order or Quotation...', dashSearchUnifiedHeading:'Search Order or Quotation',
    dashAllTime:'All Time', dashLast7:'Last 7 Days', dashLast30:'Last 30 Days',
    dashLast90:'Last 90 Days', dashThisYear:'This Year', dashCustomRange:'Custom Range',
    dashOrderStatus:'Order Status', dashSearchOrder:'Search order number...', dashAllStatus:'All', dashSearchLabel:'Search',
    dashApplyFilters:'Apply Filters', dashReset:'Reset',
    dashNoMatch:'No orders match your filters', dashFrom:'From', dashTo:'To',
    dashShowing:'Showing',
    dashScopeShared:'Date Range (Orders & Quotations)', dashStartDate:'Start Date', dashEndDate:'End Date',
    dashQuoteStatus:'Quotation Status', dashSearchQuote:'Search quotation number...', dashNoQuotesMatch:'No quotations match your filters',
    dashOrdersSection:'Orders', dashQuotesSection:'Quotations',
    dashInvalidRange:'End Date cannot be earlier than Start Date', dashClearDates:'Clear dates',
    dashPrev:'Prev', dashNext:'Next', dashPage:'Page',
    qaSettingsSub:'Manage your account and security',
    dashDefaultAddr:'Default', dashNoAddr:'No delivery addresses yet', dashAddressesCard:'Delivery Addresses',
    sideOverview:'Overview', sideMyAccount:'My Account', sideRewards:'Rewards',
    acctSettings:'Account Settings', acctMenu:'Menu', acctMember:'Member',
    qaBrowseSub:'Find products and solutions', qaProfileSub:'Manage your personal information',
    qaAddressSub:'Manage your delivery addresses', qaOrdersSub:'View all your orders',
    qaQuotesSub:'View all your quotations', qaSavedSub:'View your saved items',
    loyaltyPageTitle:'Loyalty Points', loyaltyNextTierHint:'points to next tier', loyaltyNoHistory:'No points history yet'
  }
};
function t(key) { return (T[App.lang] || T.lo)[key] || key; }

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function priceFmt(n) { return n != null ? n.toLocaleString() + (App.lang === 'en' ? ' LAK' : ' ກີບ') : ''; }
function dateFmt(d) { return new Date(d).toLocaleDateString(App.lang === 'en' ? 'en-US' : 'lo-LA'); }
function statusColor(s) {
  const m = { pending:'yellow', confirmed:'green', shipped:'blue', delivered:'green', cancelled:'red', reviewed:'blue', quoted:'green', accepted:'green', rejected:'red' };
  return m[s] || 'gray';
}
function getParam(key) { return new URLSearchParams(location.hash.split('?')[1] || '').get(key); }
function setParams(obj) {
  const h = location.hash.split('?')[0];
  const s = new URLSearchParams(location.hash.split('?')[1] || '');
  for (const [k, v] of Object.entries(obj)) { if (v == null || v === '') s.delete(k); else s.set(k, v); }
  const qs = s.toString();
  history.replaceState(null, '', h + (qs ? '?' + qs : ''));
}

// Skeleton loaders for smooth transitions
function skeletonCards(n) {
  let h = '';
  for (let i = 0; i < n; i++) {
    h += `<div class="skel-card"><div class="skeleton skel-img"></div><div style="padding:12px 14px"><div class="skeleton skel-text w60" style="height:10px"></div><div class="skeleton skel-text w80 h20" style="margin-top:8px"></div><div class="skeleton skel-text w40" style="margin-top:6px"></div><div class="skeleton skel-text w60" style="margin-top:12px;height:16px"></div></div></div>`;
  }
  return h;
}
function skeletonSidebar() {
  return `<div style="padding:8px"><div class="skeleton skel-text w80" style="height:18px;margin-bottom:12px"></div><div class="skeleton skel-text w60" style="height:14px;margin-bottom:8px"></div><div class="skeleton skel-text w60" style="height:14px;margin-bottom:8px"></div><div class="skeleton skel-text w60" style="height:14px;margin-bottom:8px"></div><div class="skeleton skel-text w40" style="height:14px"></div></div>`;
}
function skeletonHome() {
  return `<div style="padding:0"><div class="skeleton" style="height:220px;border-radius:0"></div><div class="section"><div class="section-inner"><div class="skeleton skel-text" style="height:28px;width:200px;margin-bottom:20px"></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">${skeletonCards(6)}</div></div></div><div class="section"><div class="section-inner"><div class="skeleton skel-text" style="height:28px;width:200px;margin-bottom:20px"></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">${skeletonCards(4)}</div></div></div></div>`;
}

// ═══════════════════════════════════════════════
// ROUTER (with smooth transitions)
// ═══════════════════════════════════════════════
const routes = {
  '': 'home', '/': 'home', '/home': 'home',
  '/products': 'products', '/product': 'product',
  '/cart': 'cart', '/checkout': 'checkout',
  '/login': 'login', '/register': 'register',
  '/account': 'account', '/account/profile': 'accountProfile', '/account/address-book': 'accountAddressBook',
  '/account/loyalty': 'accountLoyalty',
  '/dashboard': 'dashboard',
  '/orders': 'orders', '/order': 'orderDetail',
  '/quotations': 'quotations', '/quotation': 'quotationDetail',
  '/forgot-password': 'forgotPassword', '/reset-password': 'resetPassword',
  '/change-password': 'changePassword', '/wishlist': 'wishlist',
  '/services': 'services', '/about': 'about', '/contact': 'contact'
};

function navigate(hash) { location.hash = hash; closeMobileNav(); }

function renderPlaceholderPage(main, titleKey, subtitleKey) {
  main.innerHTML = `<div class="empty-state" style="padding:80px 20px;text-align:center"><h2>${t(titleKey)}</h2><p style="color:var(--steel,#52677D);margin-top:12px">${t(subtitleKey)}</p></div>`;
}

let _lastPage = '';
async function router() {
  const hash = location.hash.slice(1) || '';
  const path = hash.split('?')[0];
  let page = routes[path] || 'home';
  if (path.startsWith('/product/')) page = 'product';
  if (path.startsWith('/order/')) page = 'orderDetail';
  if (path.startsWith('/quotation/')) page = 'quotationDetail';

  const main = $('#app-content');
  if (!main) return;

  // Smooth page transition — fade out old, fade in new
  const isPageChange = _lastPage && _lastPage !== page;
  _lastPage = page;

  if (isPageChange) {
    main.classList.add('page-out');
    await new Promise(r => setTimeout(r, 120));
  }

  main.classList.remove('page-out');
  main.classList.remove('page-in');

  // Show skeleton while loading
  if (page === 'home') main.innerHTML = skeletonHome();
  else if (page === 'products') main.innerHTML = `<div class="breadcrumb"><a href="#/">${t('home')}</a> / <span>${t('products')}</span></div><div class="listing-layout"><aside class="listing-sidebar" style="min-height:300px">${skeletonSidebar()}</aside><div class="listing-main"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">${skeletonCards(6)}</div></div></div>`;
  else main.innerHTML = `<div style="text-align:center;padding:80px 20px"><div class="skeleton skel-text" style="height:24px;width:200px;margin:0 auto 16px"></div><div class="skeleton skel-text" style="height:14px;width:300px;margin:0 auto"></div></div>`;

  try {
    switch (page) {
      case 'home': await renderHome(main); break;
      case 'products': await renderProducts(main); break;
      case 'product': await renderProductDetail(main); break;
      case 'cart': await renderCart(main); break;
      case 'checkout': await renderCheckout(main); break;
      case 'login': renderLogin(main); break;
      case 'register': renderRegister(main); break;
      case 'account': await renderAccount(main); break;
      case 'dashboard': await renderDashboard(main); break;
      case 'accountProfile': await renderAccountProfile(main); break;
      case 'accountAddressBook': await renderAccountAddressBook(main); break;
      case 'accountLoyalty': await renderLoyalty(main); break;
      case 'orders': await renderOrders(main); break;
      case 'orderDetail': await renderOrderDetail(main); break;
      case 'quotations': await renderQuotations(main); break;
      case 'quotationDetail': await renderQuotationDetail(main); break;
      case 'forgotPassword': renderForgotPassword(main); break;
      case 'resetPassword': renderResetPassword(main); break;
      case 'changePassword': renderChangePassword(main); break;
      case 'wishlist': await renderWishlist(main); break;
      case 'services': renderPlaceholderPage(main, 'services', 'servicesDesc'); break;
      case 'about': renderPlaceholderPage(main, 'about', 'aboutDesc'); break;
      case 'contact': renderPlaceholderPage(main, 'contact', 'contactDesc'); break;
      default: await renderHome(main);
    }
  } catch (err) {
    main.innerHTML = '<div class="empty-state"><h3>' + t('networkError') + '</h3><p>' + esc(String(err.message || err)) + '</p></div>';
  }

  // Fade in new content
  main.classList.add('page-in');
  updateHeaderAuth();
  updateNavActive();
}

// ═══════════════════════════════════════════════
// HEADER / FOOTER (reactive to language changes)
// ═══════════════════════════════════════════════
function renderHeader() {
  return `<header class="site-header">
    <div class="header-row1">    <div class="header-row1-inner">
      <button class="hamburger" aria-label="Menu" aria-expanded="false" onclick="toggleMobileNav()">☰</button>
      <a class="logo no-i18n" href="#/" onclick="event.preventDefault();navigate('#/')"><img src="/image/LOGO.png" alt="NB LAO" class="logo-img"></a>
      <div class="search-wrap"><div class="search-box">
        <input id="header-search" placeholder="${esc(t('searchPh'))}" onkeydown="if(event.key===t('authEmail')){navigate('#/products?q='+encodeURIComponent(this.value))}">
        <button onclick="navigate('#/products?q='+encodeURIComponent($('#header-search').value))">🔍</button>
      </div></div>
      <div class="header-actions">
        <a class="h-action" id="auth-link" href="#/login">👤 <span>${t('login')}</span></a>
        <a class="h-action" href="#/cart">🛒 <span>${t('cart')}</span> <span class="badge-cart" id="cart-badge" style="display:none">0</span></a>
        <div class="lang-dropdown">
          <button class="lang-btn" onclick="toggleLangMenu(this)">🌐 <span class="cur-lang">${App.lang==='lo'?'LAO':'EN'}</span> ▾</button>
          <div class="lang-menu">
            <div class="${App.lang==='lo'?'sel':''}" onclick="setLang('lo')">ພາສາລາວ</div>
            <div class="${App.lang==='en'?'sel':''}" onclick="setLang('en')">English</div>
          </div>
        </div>
      </div>
    </div></div>
    <div class="header-row2"><div class="nav2">
      <a href="#/" data-route="/" onclick="event.preventDefault();navigate('#/')">${t('home')}</a>
      <a href="#/products" data-route="/products" onclick="event.preventDefault();navigate('#/products')">${t('products')}</a>
      <a href="#/services" data-route="/services" onclick="event.preventDefault();navigate('#/services')">${t('services')}</a>
      <a href="#/about" data-route="/about" onclick="event.preventDefault();navigate('#/about')">${t('about')}</a>
      <a href="#/contact" data-route="/contact" onclick="event.preventDefault();navigate('#/contact')">${t('contact')}</a>
    </div></div>
    <div class="mobile-nav" id="mobile-nav">
      <div class="mnav-topbar">
        <div class="mnav-head">${t('menu')||'Menu'}</div>
        <img src="/image/LOGO.png" alt="NB LAO" class="mnav-logo no-i18n">
        <button class="mnav-close" aria-label="Close menu" onclick="closeMobileNav()">×</button>
      </div>
      <div class="mobile-nav-inner">
        <a class="mnav-link" href="#/" data-route="/" onclick="event.preventDefault();navigate('#/')">🏠 ${t('home')}</a>
        <a class="mnav-link" href="#/products" data-route="/products" onclick="event.preventDefault();navigate('#/products')">📦 ${t('products')}</a>
        <a class="mnav-link" href="#/services" data-route="/services" onclick="event.preventDefault();navigate('#/services')">🛠️ ${t('services')}</a>
        <a class="mnav-link" href="#/about" data-route="/about" onclick="event.preventDefault();navigate('#/about')">ℹ️ ${t('about')}</a>
        <a class="mnav-link" href="#/contact" data-route="/contact" onclick="event.preventDefault();navigate('#/contact')">📞 ${t('contact')}</a>
      </div>
    </div>
    <div class="mnav-overlay" id="mnav-overlay" onclick="closeMobileNav()"></div>
  </header>`;
}

function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mnav-overlay');
  const btn = document.querySelector('.hamburger');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show', open);
  document.body.style.overflow = open ? 'hidden' : '';   // lock background scroll while drawer is open
  if (btn) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? '✕' : '☰';
  }
}

function closeMobileNav() {
  const nav = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mnav-overlay');
  const btn = document.querySelector('.hamburger');
  if (nav && nav.classList.contains('open')) {
    nav.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';                   // restore background scroll
    if (btn) { btn.setAttribute('aria-expanded','false'); btn.textContent = '☰'; }
  }
}

// Escape closes the mobile drawer and the mobile filter drawer (independent components)
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeMobileNav(); if (window.closeMFilters) closeMFilters(); if (window.closeDashFilters) closeDashFilters(); } });

function renderFooter() {
  // Partners section — designed to be populated dynamically from admin
  const defaultPartners = [
    'SCHNEIDER ELECTRIC', 'SIEMENS', 'ABB', 'GRUNDFOS',
    'EDL — ໄຟຟ້າລາວ', 'LAO CHAMBER OF COMMERCE'
  ];
  const partners = window.__PARTNERS_DATA__ || defaultPartners;

  return `<footer class="footer">
    <div class="footer-grid">
      <div><h4>NB LAO</h4><p>${App.lang==='lo'?'ຜູ້ຈຳໜ່າຍອຸປະກອນອຸດສາຫະກຳ ແລະ ໄຟຟ້າ ຄົບວົງຈອນ ສຳລັບຮ້ານຄ້າ ແລະ ໂຄງການ.':'Full-service industrial and electrical equipment supplier.'}</p></div>
      <div><h4>${t('products')}</h4><a href="#/products?category=elec">⚡ ${t('electrical')}</a><br><a href="#/products?category=mech-valves">🔧 ${t('mechanical')}</a><br><a href="#/products?category=motor-electric-motors">🔩 ${t('motors')}</a></div>
      <div><h4>${t('about')||'Company'}</h4><a href="#">${t('about')||'About'}</a><br><a href="#">${t('contact')}</a></div>
      <div><h4>${t('contact')}</h4><p>${App.lang==='lo'?'ບ້ານໜອງບອນ, ນະຄອນຫລວງວຽງຈັນ<br>020 5555 8888':'Nongbon Village, Vientiane Capital<br>020 5555 8888'}</p></div>
    </div>
    <div class="footer-partners">
      <span class="fp-label">${t('partners')}</span>
      <div class="fp-logos">
        ${partners.map(p => `<div class="fp-logo">${esc(p)}</div>`).join('')}
      </div>
    </div>
    <div class="footer-bottom">© 2026 NB Lao</div>
  </footer>`;
}

function updateHeaderAuth() {
  const link = $('#auth-link');
  if (!link) return;
  if (App.token && App.customer) {
    // The primary account action is the Customer Dashboard, not the legacy account overview.
    link.href = '#/dashboard';
    link.innerHTML = '👤 <span>' + esc(App.customer.name || t('account')) + '</span>';
  } else {
    link.href = '#/login';
    link.innerHTML = '👤 <span>' + t('login') + '</span>';
  }
  // Update search placeholder
  const search = $('#header-search');
  if (search) search.placeholder = t('searchPh');
  // Update cart badge
  const badge = $('#cart-badge');
  if (badge) {
    if (App.cartCount > 0) { badge.style.display = ''; badge.textContent = App.cartCount; }
    else badge.style.display = 'none';
  }
  // Update nav links
  const nav2 = $('.nav2');
  if (nav2) {
    const links = nav2.querySelectorAll('a');
    const labels = [t('home'), t('products'), t('services'), t('about'), t('contact')];
    links.forEach((a, i) => { if (labels[i]) a.textContent = labels[i]; });
  }
  // Update mobile nav labels + language buttons
  const mnav = document.getElementById('mobile-nav');
  if (mnav) {
    const mlinks = mnav.querySelectorAll('a.mnav-link');
    const mlabels = [t('home'), t('products'), t('services'), t('about'), t('contact')];
    mlinks.forEach((a, i) => { if (mlabels[i]) { const ic = a.textContent.match(/^\S+\s/); a.textContent = (ic ? ic[0] : '') + mlabels[i]; } });
    const mhead = mnav.querySelector('.mnav-head');
    if (mhead) mhead.textContent = t('menu') || 'Menu';
  }
  updateNavActive();
}

function updateNavActive() {
  const path = (location.hash.split('?')[0] || '').slice(1) || '/';
  const apply = container => {
    if (!container) return;
    container.querySelectorAll('a[data-route]').forEach(a => {
      const route = a.getAttribute('data-route');
      const isActive = (route === '/' && (path === '/' || path === '' || path === '/home')) || (route !== '/' && path.startsWith(route));
      a.classList.toggle('active', isActive);
    });
  };
  apply(document.querySelector('.nav2'));
  apply(document.getElementById('mobile-nav'));
}

function toggleLangMenu(btn) {
  const menu = btn.nextElementSibling;
  document.querySelectorAll('.lang-menu').forEach(m => { if (m !== menu) m.classList.remove('open'); });
  menu.classList.toggle('open');
}

function setLang(lang) {
  App.lang = lang;
  localStorage.setItem('nblao_lang', lang);
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-menu').forEach(m => m.classList.remove('open'));
  // Re-render header, footer, and current page for full language switch
  // Re-render header directly in body
  var existingHdr = document.querySelector('.site-header');
  if (existingHdr) existingHdr.outerHTML = renderHeader();
  updateHeaderAuth();
  // Re-render footer
  const existingFooter = document.querySelector('.footer');
  if (existingFooter) {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderFooter();
    existingFooter.replaceWith(tmp.firstElementChild);
  }
  _lastPage = ''; // Force transition
  router();
}

// ═══════════════════════════════════════════════
// CATEGORY ACCORDION
// ═══════════════════════════════════════════════
function renderCategoryAccordion(categories, currentCategory) {
  if (!categories || !categories.length) return '<div style="padding:8px;color:#999;font-size:13px">' + t('loading') + '</div>';
  let h = '<div class="cat-acc-wrap">';
  h += `<a class="filter-link ${!currentCategory?'active':''}" href="#/products?${buildFilterParams({category:''})}" style="margin-bottom:6px;display:block;font-size:13px">${t('allCategories')}</a>`;
  for (const parent of categories) {
    const isActive = currentCategory === parent.slug;
    const hasActiveChild = parent.children && parent.children.some(c => c.slug === currentCategory);
    const open = isActive || hasActiveChild;
    h += `<div class="cat-acc-item">`;
    h += `<div class="cat-acc-head ${open ? 'on' : ''}">`;
    h += `<span class="ic">${esc(parent.icon || '📦')}</span>`;
    h += `<a class="cat-acc-parent-link ${isActive ? 'active' : ''}" href="#/products?${buildFilterParams({category:parent.slug})}" onclick="event.stopPropagation();navigate('#/products?${buildFilterParams({category:parent.slug})}')">${esc(parent.name)}</a>`;
    h += `<span class="cat-acc-count">${parent.count}</span>`;
    h += `<span class="chev" onclick="toggleCatAcc(this.parentElement)">▶</span>`;
    h += `</div>`;
    h += `<div class="cat-acc-body ${open ? 'open' : ''}">`;
    if (parent.children && parent.children.length) {
      for (const child of parent.children) {
        h += `<a class="cat-acc-child ${currentCategory === child.slug ? 'active' : ''}" href="#/products?${buildFilterParams({category:child.slug})}" onclick="event.preventDefault();navigate('#/products?${buildFilterParams({category:child.slug})}')">`;
        h += `<span>${esc(child.name)}</span>`;
        h += `<span class="cc-count">${child.count}</span>`;
        h += `</a>`;
      }
    }
    h += `</div></div>`;
  }
  h += '</div>';
  return h;
}

window.toggleCatAcc = function(headEl) {
  const body = headEl.nextElementSibling;
  const isOpen = body && body.classList.contains('open');
  // Close all others
  document.querySelectorAll('.cat-acc-body').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.cat-acc-head').forEach(h => h.classList.remove('on'));
  if (!isOpen && body) {
    body.classList.add('open');
    headEl.classList.add('on');
  }
};

// ═══════════════════════════════════════════════
// EXPANDED STOCK FILTER
// ═══════════════════════════════════════════════
function renderStockFilter(currentStock) {
  const options = [
    { value: '', label: t('allStock') },
    { value: 'available', label: t('stockAvailable') },
    { value: 'low', label: t('stockLowStock') },
    { value: 'out', label: t('stockOutOfStock') }
  ];
  return `<div class="filter-box">
    <h4>${t('status')}</h4>
    ${options.map(o => `<label class="filter-radio ${currentStock === o.value ? 'active' : ''}">
      <input type="radio" name="stock-filter" value="${o.value}" ${currentStock === o.value ? 'checked' : ''} onchange="applyStockOption(this.value)">
      ${esc(o.label)}
    </label>`).join('')}
  </div>`;
}

window.applyStockOption = function(value) {
  const obj = { page: 1 };
  if (value === 'available') { obj.inStock = 'true'; obj.stockFilter = ''; }
  else if (value === 'low') { obj.stockFilter = 'low'; obj.inStock = ''; }
  else if (value === 'out') { obj.stockFilter = 'out'; obj.inStock = ''; }
  else { obj.inStock = ''; obj.stockFilter = ''; }
  setParams(obj);
  router();
};

// ═══════════════════════════════════════════════
// PAGE: HOME
// ═══════════════════════════════════════════════
async function renderHome(el) {
  const [catRes, prodRes] = await Promise.all([
    API.get('/categories?locale=' + App.lang), API.get('/products?inStock=true&sort=newest&limit=8&locale=' + App.lang)
  ]);
  const cats = catRes.data || [];
  const prods = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.products || []);

  // Load payment methods
  var paymentMethods = [];
  try {
    var payRes = await API.get('/payment/methods');
    if (payRes.status >= 200 && payRes.status < 300) paymentMethods = payRes.data || [];
  } catch(e) {}

  el.innerHTML = `
  <div class="promo-slider">
    <div class="promo-track" id="promoTrack">
      <div class="promo-slide" style="background:#EAF4FF;"><div class="ptxt"><h3>${t('promo1')}</h3><p>${t('promo1sub')}</p><button class="btn-primary" onclick="navigate('#/products')">${t('products')} →</button></div><div class="pvis">⚡</div></div>
      <div class="promo-slide" style="background:#F5F7FA;"><div class="ptxt"><h3>${t('promo2')}</h3><p>${t('promo2sub')}</p><button class="btn-primary" onclick="navigate('#/products')">${t('products')} →</button></div><div class="pvis">🚚</div></div>
    </div>
    <div class="promo-dots" id="promoDots"></div>
  </div>
  <div class="hero"><div class="hero-inner">
    <div>
      <div class="eyebrow">${t('eyebrowSub')}</div>
      <h1>${t('heroTitle')}</h1>
      <p>${t('heroDesc')}</p>
      <div class="hero-actions">
        <button class="btn-primary" onclick="navigate('#/products')">${t('products')} →</button>
        <button class="btn-ghost" onclick="navigate('#/cart')">${t('cart')} →</button>
      </div>
    </div>
  </div></div>

  <div class="section"><div class="section-inner">
    <div class="section-head"><h2>${t('categories')}</h2><a href="#/products">${t('products')} →</a></div>
    <div class="cat-grid">
      ${cats.map(c => `<a class="cat-card" href="#/products?category=${c.slug}" onclick="event.preventDefault();navigate('#/products?category=${c.slug}')"><div class="ic">${c.icon||'📦'}</div><span>${esc(c.name || c['name_'+App.lang] || c.name_lo || c.name_en || '')}</span></a>`).join('')}
    </div>
  </div></div>

  <div class="section"><div class="section-inner">
    <div class="section-head"><h2>${t('featuredProducts')}</h2><a href="#/products">${t('products')} →</a></div>
    <div class="prod-grid" id="home-products">
      ${prods.map(p => productCard(p)).join('')}
    </div>
  </div></div>

  ${renderHowToOrder()}

  <div class="brand-strip"><div class="brand-track">
    ${['SIEMENS','SCHNEIDER ELECTRIC','GRUNDFOS','ABB','BOSCH','3M','MITSUBISHI','LEGRAND','HONEYWELL','DELTA'].map(b=>`<span class="b">${b}</span>`).join('')}
    ${['SIEMENS','SCHNEIDER ELECTRIC','GRUNDFOS','ABB','BOSCH','3M','MITSUBISHI','LEGRAND','HONEYWELL','DELTA'].map(b=>`<span class="b">${b}</span>`).join('')}
  </div></div>
  `;
  initPromoSlider();
}

// ═══════════════════════════════════════════════
// HOW TO ORDER SECTION
// ═══════════════════════════════════════════════
function renderHowToOrder() {
  // Professional line-style icons (inline SVG, consistent 24px stroke grid)
  const stepIcons = [
    // 01 search — magnifier
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.8-3.8"/></svg>`,
    // 02 submit — document with lines
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 16h5"/></svg>`,
    // 03 confirmation — shield with check
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4.5"/></svg>`,
    // 04 delivery — truck
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7h11v9H2z"/><path d="M13 10h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/></svg>`
  ];
  return `<div class="how-section">
    <div class="section-head" style="max-width:1200px;margin:0 auto 30px"><h2>${t('howToOrder')}</h2></div>
    <div class="how-grid">
      <div class="how-step"><div class="how-step-num">01</div><div class="how-step-icon">${stepIcons[0]}</div><h3>${t('step1Title')}</h3><p>${t('step1Desc')}</p></div>
      <div class="how-step"><div class="how-step-num">02</div><div class="how-step-icon">${stepIcons[1]}</div><h3>${t('step2Title')}</h3><p>${t('step2Desc')}</p></div>
      <div class="how-step"><div class="how-step-num">03</div><div class="how-step-icon">${stepIcons[2]}</div><h3>${t('step3Title')}</h3><p>${t('step3Desc')}</p></div>
      <div class="how-step"><div class="how-step-num">04</div><div class="how-step-icon">${stepIcons[3]}</div><h3>${t('step4Title')}</h3><p>${t('step4Desc')}</p></div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════
// PRODUCT CARD
// ═══════════════════════════════════════════════
function productCard(p) {
  const stockBadge = p.stock > 50 ? `<span class="badge badge-stock">${t('stock')}</span>`
    : p.stock > 0 ? `<span class="badge badge-low">${t('lowStock')}</span>`
    : `<span class="badge badge-out">${t('outOfStock')}</span>`;
  const priceHtml = p.price ? `<span class="prod-price">${priceFmt(p.price)}</span>` : `<span class="prod-price ask">${t('contactForPrice')}</span>`;
  const img = p.images && p.images[0];
  const imgCount = p.image_count || (p.images ? p.images.length : 0);
  const imgCountBadge = imgCount > 1 ? `<span class="prod-img-badge">📷 ${imgCount}</span>` : '';
  // Phase 22: rating stars
  let ratingHtml = '';
  if (p.average_rating && p.review_count > 0) {
    const full = Math.floor(p.average_rating);
    const half = p.average_rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    ratingHtml = `<div class="prod-rating"><span class="stars">${'★'.repeat(full)}${half ? '½' : ''}${'☆'.repeat(empty)}</span><span class="review-count">(${p.review_count})</span></div>`;
  }
  return `<a class="prod-card" href="#/product/${p.slug}" onclick="event.preventDefault();navigate('#/product/${p.slug}')">
    <div class="prod-img bracket">${img ? `<img src="${esc(img.url)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" style="width:100%;height:100%;object-fit:contain"><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:#eef1f5;color:#999;font-size:11px">${esc(p.category_name || t('products'))}</div>` : (p.category_name || t('products'))}${imgCountBadge}</div>
    <div class="prod-body">
      <div class="prod-content">
        <div class="prod-sku">SKU: ${esc(p.sku)}</div>
        <div class="prod-name">${esc(p.name)}</div>
        ${p.brand ? `<div class="prod-brand">${esc(p.brand.name||'')}</div>` : ''}
        ${ratingHtml}
      </div>
      <div class="prod-foot">${priceHtml}${stockBadge}</div>
    </div>
  </a>`;
}

// ═══════════════════════════════════════════════
// PAGE: PRODUCTS (listing with filters)
// ═══════════════════════════════════════════════
async function renderProducts(el) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const brand = params.get('brand') || '';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const inStock = params.get('inStock') || '';
  const stockFilter = params.get('stockFilter') || '';
  const sort = params.get('sort') || 'newest';
  const page = params.get('page') || '1';

  // Build API URL
  const apiUrl = new URLSearchParams();
  if (q) apiUrl.set('q', q);
  if (category) apiUrl.set('category', category);
  if (brand) apiUrl.set('brand', brand);
  if (minPrice) apiUrl.set('minPrice', minPrice);
  if (maxPrice) apiUrl.set('maxPrice', maxPrice);
  // Map stock filters to API params (server-side)
  if (stockFilter === 'available' || inStock === 'true') apiUrl.set('inStock', 'true');
  if (stockFilter === 'low') apiUrl.set('stockFilter', 'low');
  if (stockFilter === 'out') apiUrl.set('stockFilter', 'out');
  apiUrl.set('sort', sort);
  apiUrl.set('page', page);
  apiUrl.set('limit', '12');
  apiUrl.set('locale', App.lang);

  const [prodRes, filterRes] = await Promise.all([
    API.get('/products?' + apiUrl.toString()),
    API.get('/products/filters?locale=' + App.lang)
  ]);

  const data = prodRes.data || {};
  const products = Array.isArray(data) ? data : (data.products || []);
  const total = data.total || products.length;
  const totalPages = data.totalPages || 1;
  const currentPage = data.page || 1;
  const filters = filterRes.data || { categories: [], brands: [], priceRange: { min: 0, max: 0 } };

  // Server handles low/out-of-stock filtering
  const filteredProducts = products;

  // Resolve the localized category name for the breadcrumb (fallback to slug only if not found)
  let categoryName = '';
  if (category) {
    const catMatch = (filters.categories || [])
      .flatMap(p => [p, ...(p.children || [])])
      .find(c => c.slug === category);
    categoryName = catMatch && catMatch.name ? catMatch.name : category;
  }

  if (window.cleanupOrphanMFilters) cleanupOrphanMFilters();   // drop stranded drawers from prior renders

  el.innerHTML = `
  <div class="breadcrumb"><a href="#/">${t('home')}</a> / <span>${t('products')}</span>${category ? ' / ' + esc(categoryName) : ''}${q ? ' — ' + esc(q) : ''}</div>
  <div class="listing-layout">
    <div class="mfilter-bar">
      <button type="button" class="mfilter-btn" onclick="toggleMFilters()" aria-expanded="false" aria-controls="mfilter-panel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
        ${t('filters')}
      </button>
      <span class="mfilter-count">${total} ${t('results')}</span>
      <label class="mfilter-sortwrap">
        <span>${t('sort')}</span>
        <select id="sort-select" onchange="applySort(this.value)">
          <option value="newest" ${sort==='newest'?'selected':''}>${t('newest')}</option>
          <option value="price_asc" ${sort==='price_asc'?'selected':''}>${t('priceLow')}</option>
          <option value="price_desc" ${sort==='price_desc'?'selected':''}>${t('priceHigh')}</option>
          <option value="oldest" ${sort==='oldest'?'selected':''}>${t('oldest')}</option>
          <option value="name_asc" ${sort==='name_asc'?'selected':''}>${t('nameAsc')}</option>
          <option value="name_desc" ${sort==='name_desc'?'selected':''}>${t('nameDesc')}</option>
        </select>
      </label>
    </div>
    <div class="mfilter-panel" id="mfilter-panel" hidden role="dialog" aria-modal="true" aria-label="${t('filters')}">
      <div class="mfilter-head">
        <div class="mfilter-title">${t('filters')}</div>
        <button type="button" class="mfilter-close" aria-label="${t('miscEscape')}" onclick="closeMFilters()">×</button>
      </div>
      <div class="mfilter-body" id="mfilter-body"></div>
      <div class="mfilter-foot">
        <button type="button" class="btn-ghost" onclick="closeMFilters()">${t('cancel')}</button>
        <button type="button" class="btn-primary" onclick="applyMFilters()">${t('couponApply')}</button>
      </div>
    </div>
    <div class="mfilter-overlay" id="mfilter-overlay" onclick="closeMFilters()"></div>
    <aside class="listing-sidebar">
      <div class="filter-box">
        <h4>${t('categories')}</h4>
        ${renderCategoryAccordion(filters.categories, category)}
      </div>
      <div class="filter-box">
        <h4>${t('brands')}</h4>
        <a class="filter-link ${!brand?'active':''}" href="#/products?${buildFilterParams({q,category,minPrice,maxPrice,stockFilter,sort,brand:''})}">${t('allBrands')}</a>
        ${filters.brands.map(b => `<a class="filter-link ${brand===b.slug?'active':''}" href="#/products?${buildFilterParams({q,category,minPrice,maxPrice,stockFilter,sort,brand:b.slug})}">${esc(b.name)} (${b.count})</a>`).join('')}
      </div>
      <div class="filter-box">
        <h4>${t('priceRange')}</h4>
        <div class="price-filter">
          <input type="number" id="filter-min" placeholder="${t('minPrice')}" value="${minPrice}" min="0">
          <span>—</span>
          <input type="number" id="filter-max" placeholder="${t('maxPrice')}" value="${maxPrice}" min="0">
          <button class="btn-sm" onclick="applyPriceFilter()">${t('ok')}</button>
        </div>
      </div>
      ${renderStockFilter(stockFilter === 'low' ? 'low' : stockFilter === 'out' ? 'out' : inStock === 'true' ? 'available' : '')}
    </aside>
    <div class="listing-main">
      <div class="listing-top">
        <span class="result-count">${total} ${t('results')}</span>
        <label class="listing-sort">
          <span>${t('sort')}</span>
          <select id="sort-select-d" onchange="applySort(this.value)">
            <option value="newest" ${sort==='newest'?'selected':''}>${t('newest')}</option>
            <option value="price_asc" ${sort==='price_asc'?'selected':''}>${t('priceLow')}</option>
            <option value="price_desc" ${sort==='price_desc'?'selected':''}>${t('priceHigh')}</option>
            <option value="oldest" ${sort==='oldest'?'selected':''}>${t('oldest')}</option>
            <option value="name_asc" ${sort==='name_asc'?'selected':''}>${t('nameAsc')}</option>
            <option value="name_desc" ${sort==='name_desc'?'selected':''}>${t('nameDesc')}</option>
          </select>
        </label>
      </div>
      <div class="listing-grid" id="product-grid">
        ${filteredProducts.length ? filteredProducts.map(p => productCard(p)).join('') : `<div class="empty-state"><h3>${t('noResults')}</h3></div>`}
      </div>
      ${totalPages > 1 ? renderPagination(currentPage, totalPages, {q,category,brand,minPrice,maxPrice,stockFilter,sort}) : ''}
    </div>
  </div>`;
}

function buildFilterParams({q,category,brand,minPrice,maxPrice,inStock,stockFilter,sort}) {
  const s = new URLSearchParams();
  if (q) s.set('q', q);
  if (category) s.set('category', category);
  if (brand) s.set('brand', brand);
  if (minPrice) s.set('minPrice', minPrice);
  if (maxPrice) s.set('maxPrice', maxPrice);
  if (stockFilter) s.set('stockFilter', stockFilter);
  else if (inStock) s.set('inStock', inStock);
  if (sort) s.set('sort', sort);
  return s.toString();
}

// Mobile filter drawer: move the real sidebar into the fixed panel while open (desktop untouched)
// Note: panel + overlay are re-parented to <body> while open because #app-content's page
// transition transform would otherwise become the containing block for position:fixed.
window.toggleMFilters = function() {
  const panel = document.getElementById('mfilter-panel');
  const overlay = document.getElementById('mfilter-overlay');
  const body = document.getElementById('mfilter-body');
  const sidebar = document.querySelector('.listing-sidebar');
  const btn = document.querySelector('.mfilter-btn');
  if (!panel || !sidebar) return;
  if (panel.classList.contains('open')) { closeMFilters(); return; }
  if (body && sidebar.parentElement !== body) body.appendChild(sidebar);   // move the live filter DOM into the drawer
  if (panel.parentElement !== document.body) {
    panel.__home = panel.parentElement;                                    // remember original position
    if (overlay) overlay.__home = overlay.parentElement;
    document.body.appendChild(panel);
    if (overlay) document.body.appendChild(overlay);
  }
  // Draft state = current applied state (URL params). Draft edits stay local until Apply.
  window._mfilterDraft = {
    q: getParam('q') || '', category: getParam('category') || '', brand: getParam('brand') || '',
    minPrice: getParam('minPrice') || '', maxPrice: getParam('maxPrice') || '',
    stockFilter: getParam('stockFilter') || '', inStock: getParam('inStock') || '',
    sort: getParam('sort') || ''
  };
  panel.hidden = false;
  setTimeout(function() {                    // next tick (rAF can be throttled in background webviews)
    panel.classList.add('open');
    if (overlay) overlay.classList.add('show');
  }, 20);
  document.body.style.overflow = 'hidden';                                 // lock background scroll while open
  if (btn) { btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open'); }
};

window.closeMFilters = function() {
  const panel = document.getElementById('mfilter-panel');
  const overlay = document.getElementById('mfilter-overlay');
  const sidebar = document.querySelector('.listing-sidebar');
  const layout = document.querySelector('.listing-layout');
  const main = layout ? layout.querySelector('.listing-main') : null;
  const btn = document.querySelector('.mfilter-btn');
  if (!panel) return;
  // Discard-path state cleanup must happen synchronously — even if the open animation tick
  // hasn't applied the 'open' class yet (pending 20ms timer). Draft, scroll lock and button
  // state are reset NOW; only the visual class/panel restoration may wait for the retry.
  window._mfilterDraft = null;                                             // discard any un-applied draft edits
  document.body.style.overflow = '';                                       // restore background scroll
  if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('open'); }
  // If the open class hasn't been applied yet (pending 20ms timer), finish opening state cleanup safely
  if (!panel.classList.contains('open') && !panel.hidden) {
    setTimeout(function() { closeMFilters(); }, 30);   // retry once the open transition has started
    return;
  }
  if (!panel.classList.contains('open')) { panel.hidden = true; return; }
  panel.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  mfilterResetVisuals();                                                   // drawer visuals return to APPLIED state
  setTimeout(function() {
    if (panel && sidebar && layout && main && sidebar.parentElement !== layout) layout.insertBefore(sidebar, main); // restore sidebar position
    if (panel && panel.__home && panel.parentElement === document.body) panel.__home.insertBefore(panel, panel.__home.firstChild);   // restore panel to page
    if (overlay && overlay.__home && overlay.parentElement === document.body) overlay.__home.appendChild(overlay);                   // restore overlay to page
    if (panel) panel.hidden = true;
  }, 220);
};

// Remove orphaned filter drawers/overlays left on <body> by previous page renders
// (each renderProducts creates a fresh panel; re-parenting during open can strand older copies)
window.cleanupOrphanMFilters = function() {
  const orphans = document.querySelectorAll('body > .mfilter-panel, body > .mfilter-overlay');
  if (!orphans.length) return;
  orphans.forEach(function(el) { el.remove(); });
  document.body.style.overflow = '';   // an open drawer re-rendered away must never leave scroll locked
};
document.addEventListener('DOMContentLoaded', cleanupOrphanMFilters);

// Clear = existing reset behavior: navigate to clean products URL (existing routing/filter semantics)
window.clearAllFiltersM = function() { closeMFilters(); navigate('#/products'); };

// Apply: commit the draft filters through the EXISTING URL/query system (no second filter implementation).
window.applyMFilters = function() {
  const d = window._mfilterDraft || {};
  const qs = buildFilterParams({ q: d.q, category: d.category, brand: d.brand, minPrice: d.minPrice, maxPrice: d.maxPrice, stockFilter: d.stockFilter, inStock: d.inStock, sort: d.sort });
  window._mfilterDraft = null;
  document.body.style.overflow = '';                       // scroll restore before the re-render replaces the drawer
  navigate('#/products' + (qs ? '?' + qs : ''));           // existing router renders the committed state
};

// ── Draft-stage interceptor: while the drawer is open, filter controls inside it must NOT commit —
// they only update the draft + drawer visuals. Capture phase blocks the inline commit handlers.
document.addEventListener('click', function(e) {
  const panel = document.getElementById('mfilter-panel');
  // panel.hidden is cleared synchronously by toggleMFilters; the 'open' class arrives ~20ms later
  // (animation tick). hidden alone is the reliable open-signal — using the class check here would
  // let clicks landing inside that 20ms window bypass the draft stage and commit immediately.
  if (!panel || panel.hidden) return;
  const body = document.getElementById('mfilter-body');
  if (!body || !body.contains(e.target)) return;
  const d = window._mfilterDraft;
  if (!d) return;
  // Price OK button → stage price only
  const okBtn = e.target.closest('.price-filter .btn-sm');
  if (okBtn) {
    e.preventDefault(); e.stopPropagation();
    const box = okBtn.closest('.price-filter');
    const mn = box.querySelector('#filter-min'), mx = box.querySelector('#filter-max');
    d.minPrice = mn ? mn.value : '';
    d.maxPrice = mx ? mx.value : '';
    return;
  }
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (href.indexOf('#/products') !== 0) return;
  e.preventDefault(); e.stopPropagation();                 // block immediate navigation — stage instead
  const p = new URLSearchParams(href.split('?')[1] || '');
  if (a.closest('.cat-acc-wrap')) d.category = p.get('category') || '';   // category dimension
  else d.brand = p.get('brand') || '';                                     // brand dimension
  const scope = a.closest('.cat-acc-wrap') || a.closest('.filter-box');
  if (scope) scope.querySelectorAll('a.filter-link, .cat-acc-parent-link, .cat-acc-child').forEach(function(x) { x.classList.remove('active'); });
  a.classList.add('active');
}, true);

document.addEventListener('change', function(e) {
  const panel = document.getElementById('mfilter-panel');
  if (!panel || panel.hidden) return;
  const body = document.getElementById('mfilter-body');
  if (!body || !body.contains(e.target) || e.target.name !== 'stock-filter') return;
  e.stopPropagation();                                      // block inline applyStockOption commit
  const d = window._mfilterDraft;
  if (!d) return;
  const v = e.target.value;
  if (v === 'available') { d.inStock = 'true'; d.stockFilter = ''; }
  else if (v === 'low') { d.stockFilter = 'low'; d.inStock = ''; }
  else if (v === 'out') { d.stockFilter = 'out'; d.inStock = ''; }
  else { d.inStock = ''; d.stockFilter = ''; }
  const box = e.target.closest('.filter-box');
  if (box) box.querySelectorAll('.filter-radio').forEach(function(l) { l.classList.remove('active'); });
  const lbl = e.target.closest('.filter-radio');
  if (lbl) lbl.classList.add('active');
}, true);

// Discard-path visual reset: drawer controls return to the APPLIED state (current URL)
function mfilterResetVisuals() {
  const body = document.getElementById('mfilter-body');
  if (!body) return;
  const cat = getParam('category') || '', brand = getParam('brand') || '';
  const sf = getParam('stockFilter') || '', is = getParam('inStock') || '';
  const cur = sf === 'low' ? 'low' : sf === 'out' ? 'out' : is === 'true' ? 'available' : '';
  body.querySelectorAll('.cat-acc-wrap a').forEach(function(a) {
    const p = new URLSearchParams((a.getAttribute('href') || '').split('?')[1] || '');
    a.classList.toggle('active', (p.get('category') || '') === cat);
  });
  body.querySelectorAll('.filter-box').forEach(function(box) {
    if (box.querySelector('.cat-acc-wrap')) return;        // category box handled above
    box.querySelectorAll('a.filter-link').forEach(function(a) {
      const p = new URLSearchParams((a.getAttribute('href') || '').split('?')[1] || '');
      a.classList.toggle('active', (p.get('brand') || '') === brand);
    });
  });
  body.querySelectorAll('input[name="stock-filter"]').forEach(function(r) {
    r.checked = r.value === cur;
    const lbl = r.closest('.filter-radio');
    if (lbl) lbl.classList.toggle('active', r.value === cur);
  });
  const mn = body.querySelector('#filter-min'), mx = body.querySelector('#filter-max');
  if (mn) mn.value = getParam('minPrice') || '';
  if (mx) mx.value = getParam('maxPrice') || '';
}

function renderPagination(current, total, filters) {
  let h = '<div class="pagination">';
  if (current > 1) h += `<button onclick="goPage(${current-1},'${esc(JSON.stringify(filters).replace(/'/g,"\\'"))}')">${t('prev')}</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
      h += `<button class="${i===current?'active':''}" onclick="goPage(${i},'${esc(JSON.stringify(filters).replace(/'/g,"\\'"))}')">${i}</button>`;
    } else if (i === current - 3 || i === current + 3) {
      h += `<span>…</span>`;
    }
  }
  if (current < total) h += `<button onclick="goPage(${current+1},'${esc(JSON.stringify(filters).replace(/'/g,"\\'"))}')">${t('next')}</button>`;
  h += '</div>';
  return h;
}

window.goPage = function(page, filters) {
  const s = new URLSearchParams(filters || '');
  s.set('page', page);
  navigate('#/products?' + s.toString());
};

window.applySort = function(sort) {
  setParams({ sort, page: 1 });
  router();
};

window.applyPriceFilter = function() {
  const min = $('#filter-min')?.value || '';
  const max = $('#filter-max')?.value || '';
  setParams({ minPrice: min, maxPrice: max, page: 1 });
  router();
};

// ═══════════════════════════════════════════════
// PAGE: PRODUCT DETAIL
// ═══════════════════════════════════════════════
async function renderProductDetail(el) {
  const slug = location.hash.split('/product/')[1]?.split('?')[0];
  if (!slug) { navigate('#/products'); return; }
  const res = await API.get('/products/' + encodeURIComponent(slug) + '?locale=' + App.lang);
  if (res.status === 404) { el.innerHTML = '<div class="empty-state"><h3>' + t('noResults') + '</h3><a href="#/products">' + t('back') + '</a></div>'; return; }
  const p = res.data;
  if (!p) { el.innerHTML = '<div class="empty-state"><h3>' + t('networkError') + '</h3></div>'; return; }

  // Fetch product variants
  const varRes = await API.get('/products/' + p.id + '/variants');
  const variants = (varRes.status >= 200 && varRes.status < 300) ? (varRes.data || []) : [];
  window._productVariants = variants;
  window._selectedVariant = null;

  const stockText = p.stock > 0 ? `${t('stock')}: ${p.stock}` : t('outOfStock');
  const stockClass = p.stock > 50 ? 'badge-stock' : p.stock > 0 ? 'badge-low' : 'badge-out';
  const priceHtml = p.price ? `${priceFmt(p.price)} <span class="per-unit">${t('perUnit')}</span>` : `<span class="ask-price">${t('contactForPrice')}</span>`;

  // Image gallery
  const images = p.images || [];
  const mainImg = images.find(i => i.is_primary) || images[0];
  const mainImgSrc = mainImg ? mainImg.url : null;
  const galleryMain = mainImgSrc
    ? `<img src="${esc(mainImgSrc)}" alt="${esc((App.lang==='lo'?mainImg.alt_lo:mainImg.alt_en) || mainImg.alt_lo || mainImg.alt_en || p.name)}" id="gallery-main" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:var(--steel,#999);font-size:14px">${esc(p.category?.name || t('products'))}</div>`
    : `<span>${esc(p.category?.name || t('products'))}</span>`;
  const thumbsHtml = images.length > 1 ? `<div class="gallery-thumbs" id="gallery-thumbs">
    ${images.map((img, i) => `<div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setGalleryImage(${i})" data-src="${esc(img.url)}" data-alt="${esc((App.lang==='lo'?img.alt_lo:img.alt_en) || img.alt_lo || img.alt_en || p.name)}"><img src="${esc(img.url)}" alt="${esc(img.alt_lo || '')}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`).join('')}
  </div>` : '';
  const navHtml = images.length > 1 ? `<button class="gallery-nav prev" onclick="galleryNav(-1)">‹</button><button class="gallery-nav next" onclick="galleryNav(1)">›</button>` : '';
  // Store images globally for nav
  window._galleryImages = images;
  window._galleryIndex = 0;

  // Phase 22: init gallery swipe after render
  setTimeout(function() { initGallerySwipe(); }, 100);

  // Tabs
  const hasDesc = !!p.description;
  const hasSpecs = p.specifications?.length > 0;
  const hasDocs = p.documents?.length > 0;
  const hasHowTo = !!p.how_to_use;
  const hasRelated = p.related_products?.length > 0;

  el.innerHTML = `
  <div class="breadcrumb"><a href="#/">${t('home')}</a> / <a href="#/products">${t('products')}</a> / ${esc(p.name)}</div>
  <div class="detail-layout">
    <div>
      <div class="gallery-wrap">
        <div class="gallery-main-img" onclick="openLightbox(window._galleryIndex||0)">${galleryMain}</div>
        ${navHtml}
      </div>
      ${thumbsHtml}
    </div>
    <div>
      ${p.brand ? `<div class="detail-brand">${esc(p.brand.name)}</div>` : ''}
      <div class="detail-title">${esc(p.name)}</div>
      <div class="detail-sku">SKU: ${esc(p.sku)}${p.model_number ? ' • ' + t('model') + ': ' + esc(p.model_number) : ''}</div>
      <div class="detail-price-row">
        <div class="detail-price">${priceHtml}</div>
        <span class="badge ${stockClass}">${stockText}</span>
      </div>
      ${variants.length > 0 ? '<div style="margin-bottom:12px"><div class="info-row"><b>' + t('options') + ':</b></div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">' + variants.map(function(v){var opts=v.options||[];var label=opts.length>0?opts.map(function(o){return o.optionValue}).join(' / '):(v.name||v.sku);return '<button type="button" class="variant-opt" data-vid="'+v.id+'" onclick="selectVariant('+v.id+')" style="padding:6px 14px;border:2px solid var(--steel,#ccc);border-radius:6px;background:white;cursor:pointer;font-size:13px">'+esc(label)+'</button>';}).join('') + '</div></div>' : ''}
      <div class="qty-row">
        <div class="stepper">
          <button onclick="stepQty(-1)">−</button>
          <input id="qty-input" type="number" value="1" min="1" max="${p.stock || 9999}" class="mono">
          <button onclick="stepQty(1)">+</button>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary" id="add-cart-btn" onclick="addToCart(${p.id})" ${p.stock<=0?'disabled':''}>${t('addToCart')}</button>
        <button class="btn-quote" onclick="addQuoteItem(${p.id},$('#qty-input').value)">${t('requestQuote')}</button>
      </div>
      <div class="detail-info">
        ${p.brand ? `<div class="info-row"><b>${t('brand')}</b><span>${esc(p.brand.name)}</span></div>` : ''}
        ${p.origin ? `<div class="info-row"><b>${t('origin')}</b><span>${esc(p.origin)}</span></div>` : ''}
        ${p.warranty ? `<div class="info-row"><b>${t('warranty')}</b><span>${esc(p.warranty)}</span></div>` : ''}
      </div>
    </div>
  </div>
  <div class="section"><div class="section-inner">
    <div class="detail-tabs" id="detail-tabs">
      <div class="detail-tab active" onclick="switchDetailTab('desc')">${t('tabDesc')}</div>
      <div class="detail-tab" onclick="switchDetailTab('specs')">${t('tabSpecs')}</div>
      <div class="detail-tab" onclick="switchDetailTab('docs')">${t('tabDocs')}</div>
      <div class="detail-tab" onclick="switchDetailTab('howto')">${t('tabHowTo')}</div>
      <div class="detail-tab" onclick="switchDetailTab('related')">${t('tabRelated')}</div>
      <div class="detail-tab" onclick="switchDetailTab('reviews')">${t('tabReviews')}</div>
    </div>
    <div class="tab-panel active" id="tab-desc">
      ${hasDesc ? `<p>${esc(p.description)}</p>` : `<p class="empty-tab">${t('noResults')}</p>`}
    </div>
    <div class="tab-panel" id="tab-specs">
      ${hasSpecs ? `<div class="spec-table"><table>${p.specifications.map(s => `<tr><td>${esc(s.label)}</td><td>${esc(s.value)}</td></tr>`).join('')}</table></div>` : `<p class="empty-tab">${t('noResults')}</p>`}
    </div>
    <div class="tab-panel" id="tab-docs">
      ${hasDocs ? `<div class="doc-list">${p.documents.map(d => `<div class="doc-item"><span class="doc-icon">📄</span><span class="doc-title">${esc(d.title)}</span><span class="doc-type">${esc(d.file_type || 'PDF')}</span></div>`).join('')}</div>` : `<p class="empty-tab">${t('noDocs')}</p>`}
    </div>
    <div class="tab-panel" id="tab-howto">
      ${hasHowTo ? `<p>${esc(p.how_to_use)}</p>` : `<p class="empty-tab">${t('noHowTo')}</p>`}
    </div>
    <div class="tab-panel" id="tab-reviews"><div id="reviews-container">${t('loadingReviews')}</div></div>
    <div class="tab-panel" id="tab-related">
      ${hasRelated ? `<div class="related-grid">${p.related_products.map(rp => `<a class="related-card" href="#/product/${esc(rp.slug)}" onclick="event.preventDefault();navigate('#/product/${esc(rp.slug)}')"><div class="rc-img">${rp.image ? `<img src="${esc(rp.image)}" alt="${esc(rp.name)}">` : (rp.category_name || t('products'))}</div><div class="rc-body"><div class="rc-name">${esc(rp.name)}</div>${rp.price ? `<div class="rc-price">${priceFmt(rp.price)}</div>` : ''}</div></a>`).join('')}</div>` : `<p class="empty-tab">${t('noResults')}</p>`}
    </div>
  </div></div>
  `;
}

window.switchDetailTab = function(tab) {
  document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  // Find the clicked tab and activate it + corresponding panel
  const tabs = document.querySelectorAll('.detail-tab');
  const panelIds = ['desc', 'specs', 'docs', 'howto', 'related', 'reviews'];
  const idx = panelIds.indexOf(tab);
  if (idx >= 0 && tabs[idx]) tabs[idx].classList.add('active');
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('active');
  if (tab === 'reviews') {
    const slug = location.hash.split('/product/')[1] || '';
    if (slug) loadProductReviews(slug.split('?')[0]);
  }
};

window.setGalleryImage = function(idx) {
  const images = window._galleryImages || [];
  if (!images[idx]) return;
  window._galleryIndex = idx;
  const main = document.getElementById('gallery-main');
  if (main) { main.src = images[idx].url; main.alt = images[idx].alt_lo || images[idx].alt_en || ''; }
  document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
};

window.galleryNav = function(dir) {
  const images = window._galleryImages || [];
  if (images.length <= 1) return;
  let idx = (window._galleryIndex || 0) + dir;
  if (idx < 0) idx = images.length - 1;
  if (idx >= images.length) idx = 0;
  window.setGalleryImage(idx);
};

// ═══════════════════════════════════════════════
// PHASE 22: LIGHTBOX MODAL
// ═══════════════════════════════════════════════
window.openLightbox = function(startIdx) {
  const images = window._galleryImages || [];
  if (!images.length) return;
  window._lbIndex = startIdx || 0;
  window._lbZoomed = false;
  var overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = '<button class="lightbox-close" onclick="closeLightbox()">✕</button>' +
      '<button class="lightbox-nav lb-prev" onclick="lbNav(-1)">‹</button>' +
      '<button class="lightbox-nav lb-next" onclick="lbNav(1)">›</button>' +
      '<div class="lightbox-content"><img class="lightbox-main" id="lb-main" onclick="lbToggleZoom()"><div class="lightbox-thumbs" id="lb-thumbs"></div><div class="lightbox-counter" id="lb-counter"></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeLightbox(); });
  }
  document.getElementById('lb-main').classList.remove('zoomed');
  window._lbZoomed = false;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  lbRender();
  lbInitTouch();
};

window.closeLightbox = function() {
  var overlay = document.getElementById('lightbox-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  window._lbZoomed = false;
};

window.lbNav = function(dir) {
  var images = window._galleryImages || [];
  if (images.length <= 1) return;
  var idx = (window._lbIndex || 0) + dir;
  if (idx < 0) idx = images.length - 1;
  if (idx >= images.length) idx = 0;
  window._lbIndex = idx;
  window._lbZoomed = false;
  lbRender();
};

window.lbSetIndex = function(idx) {
  window._lbIndex = idx;
  window._lbZoomed = false;
  lbRender();
};

window.lbToggleZoom = function() {
  var main = document.getElementById('lb-main');
  if (!main) return;
  window._lbZoomed = !window._lbZoomed;
  main.classList.toggle('zoomed', window._lbZoomed);
};

function lbRender() {
  var images = window._galleryImages || [];
  var idx = window._lbIndex || 0;
  var img = images[idx];
  if (!img) return;
  var main = document.getElementById('lb-main');
  if (main) { main.src = img.url; main.alt = img.alt_lo || img.alt_en || ''; }
  var thumbsEl = document.getElementById('lb-thumbs');
  if (thumbsEl) {
    thumbsEl.innerHTML = images.map(function(im, i) {
      return '<div class="lightbox-thumb ' + (i === idx ? 'active' : '') + '" onclick="lbSetIndex(' + i + ')"><img src="' + esc(im.url) + '" alt=""></div>';
    }).join('');
  }
  var counter = document.getElementById('lb-counter');
  if (counter) counter.textContent = (idx + 1) + ' / ' + images.length;
  // Update gallery main + thumbs too
  window.setGalleryImage(idx);
}

// ── Touch / Swipe ──
function lbInitTouch() {
  var overlay = document.getElementById('lightbox-overlay');
  if (!overlay || overlay._touchInit) return;
  overlay._touchInit = true;
  var startX = 0, startY = 0, moved = false;
  overlay.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved = false;
  }, { passive: true });
  overlay.addEventListener('touchmove', function(e) {
    var dx = e.touches[0].clientX - startX;
    var dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) moved = true;
  }, { passive: true });
  overlay.addEventListener('touchend', function(e) {
    if (!moved) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (dx < -40) lbNav(1);
    else if (dx > 40) lbNav(-1);
  }, { passive: true });
}

// Also init swipe on gallery main image (non-lightbox)
function initGallerySwipe() {
  var wrap = document.querySelector('.gallery-wrap');
  if (!wrap || wrap._swipeInit) return;
  wrap._swipeInit = true;
  var startX = 0, moved = false;
  wrap.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; moved = false; }, { passive: true });
  wrap.addEventListener('touchmove', function(e) {
    if (Math.abs(e.touches[0].clientX - startX) > 40) moved = true;
  }, { passive: true });
  wrap.addEventListener('touchend', function(e) {
    if (!moved) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (dx < -40) window.galleryNav(1);
    else if (dx > 40) window.galleryNav(-1);
  }, { passive: true });
}

// ── Keyboard navigation ──
document.addEventListener('keydown', function(e) {
  var overlay = document.getElementById('lightbox-overlay');
  if (overlay && overlay.classList.contains('open')) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') lbNav(-1);
    else if (e.key === 'ArrowRight') lbNav(1);
  } else {
    // Gallery keyboard nav when detail page is visible
    var galleryEl = document.getElementById('gallery-main');
    if (galleryEl && document.activeElement && document.activeElement.tagName !== 'INPUT') {
      if (e.key === 'ArrowLeft') window.galleryNav(-1);
      else if (e.key === 'ArrowRight') window.galleryNav(1);
    }
  }
});

// ── Image zoom on main gallery ──
window.toggleGalleryZoom = function() {
  var main = document.getElementById('gallery-main');
  if (!main) return;
  main.classList.toggle('zoomed');
};

window.stepQty = function(dir) {
  const inp = $('#qty-input');
  if (!inp) return;
  const max = parseInt(inp.max) || 9999;
  const v = Math.max(1, Math.min(max, parseInt(inp.value || '1') + dir));
  inp.value = v;
};

window.selectVariant = function(vid) {
  window._selectedVariant = vid;
  document.querySelectorAll('.variant-opt').forEach(function(btn) {
    btn.style.borderColor = btn.dataset.vid == vid ? 'var(--primary,#0099FF)' : 'var(--steel,#ccc)';
    btn.style.background = btn.dataset.vid == vid ? 'var(--primary,#0099FF)' : 'white';
    btn.style.color = btn.dataset.vid == vid ? 'white' : 'inherit';
  });
  var variants = window._productVariants || [];
  var v = variants.find(function(x){return x.id===vid;});
  if (v) {
    var priceEl = document.querySelector('.detail-price');
    if (priceEl && v.price) priceEl.innerHTML = priceFmt(v.price) + ' <span class="per-unit">' + t('perUnit') + '</span>';
    var stockEl = document.querySelector('.badge');
    if (stockEl) {
      stockEl.textContent = v.stock > 0 ? t('stock') + ': ' + v.stock : t('outOfStock');
      stockEl.className = 'badge ' + (v.stock > 50 ? 'badge-stock' : v.stock > 0 ? 'badge-low' : 'badge-out');
    }
    var qtyInput = document.getElementById('qty-input');
    if (qtyInput) qtyInput.max = v.stock || 9999;
    var addBtn = document.getElementById('add-cart-btn');
    if (addBtn) addBtn.disabled = v.stock <= 0;
  }
};

window.addToCart = async function(productId) {
  if (!App.token) { navigate('#/login'); return; }
  const btn = $('#add-cart-btn');
  if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }
  const qty = parseInt($('#qty-input')?.value || '1');
  var variantId = window._selectedVariant || null;
  const res = await API.post('/cart/items', { productId, quantity: qty, variantId });
  if (res.status >= 200 && res.status < 300) {
    App.cart = res.data;
    App.cartCount = res.data.items?.length || 0;
    updateHeaderAuth();
    showToast(t('addedToCart'));
  } else {
    showToast(res.data?.error || t('networkError'), true);
  }
  if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
};

window.addQuoteItem = async function(productId, qty) {
  if (!App.token) { navigate('#/login'); return; }
  const q = parseInt(qty) || 1;
  const res = await API.post('/cart/items', { productId, quantity: q });
  if (res.status >= 200 && res.status < 300) {
    App.cart = res.data;
    App.cartCount = res.data.items?.length || 0;
    updateHeaderAuth();
    navigate('#/cart');
  } else {
    showToast(res.data?.error || t('networkError'), true);
  }
};

// ═══════════════════════════════════════════════
// PAGE: CART
// ═══════════════════════════════════════════════
async function renderCart(el) {
  if (!App.token) { navigate('#/login'); return; }
  const res = await API.get('/cart');
  const cart = res.data || { items: [] };
  App.cart = cart;
  App.cartCount = cart.items?.length || 0;

  if (!cart.items || cart.items.length === 0) {
    el.innerHTML = `
    <div class="breadcrumb"><a href="#/">${t('home')}</a> / ${t('cart')}</div>
    <div class="empty-state"><h3>🛒 ${t('emptyCart')}</h3><a class="btn-primary" href="#/products" onclick="event.preventDefault();navigate('#/products')">${t('continueShopping')}</a></div>`;
    return;
  }

  const total = cart.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  el.innerHTML = `
  <div class="breadcrumb"><a href="#/">${t('home')}</a> / ${t('cart')}</div>
  <div class="section"><div class="section-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2>🛒 ${t('cartTitle')} <span style="font-size:14px;font-weight:400;color:var(--steel,#666)">(${itemCount} ${t('results')})</span></h2>
      <button class="btn-clear" onclick="clearCart()">${t('clearCart')}</button>
    </div>
    <div class="cart-layout">
      <div class="cart-items">
        ${cart.items.map(i => `
        <div class="cart-item">
          <div class="cart-item-thumb">${i.thumbnail_url ? `<img src="${esc(i.thumbnail_url)}" alt="${esc(i.name)}">` : esc(i.sku || '').substring(0,8)}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${esc(i.name)}</div>
            <div class="cart-item-sku">SKU: ${esc(i.sku || '')}${i.variant_name ? ' \u2022 ' + esc(i.variant_name) : ''}</div>
            <div class="cart-item-price">${i.price ? priceFmt(i.price) : t('contactForPrice')}</div>
          </div>
          <div class="cart-item-qty">
            <div class="stepper">
              <button onclick="updateCartItem(${i.id},${i.quantity-1})">−</button>
              <input value="${i.quantity}" class="mono" id="cart-qty-${i.id}" onchange="updateCartItemDirect(${i.id},this.value)" type="number" min="1">
              <button onclick="updateCartItem(${i.id},${i.quantity+1})">+</button>
            </div>
          </div>
          <div class="cart-item-subtotal" data-label="${esc(t('subtotal'))}">${i.price ? priceFmt(i.price * i.quantity) : '—'}</div>
          <button class="btn-remove" onclick="removeCartItem(${i.id})">${t('remove')}</button>
        </div>`).join('')}
      </div>
      <div class="cart-summary">
        <h3>${t('total')}</h3>
        <div class="cart-total">${priceFmt(total)}</div>
        <button class="btn-primary" onclick="navigate('#/checkout')" style="width:100%">${t('checkout')}</button>
        <button class="btn-quote" onclick="submitQuote()" style="width:100%">${t('requestAllQuote')}</button>
        <a href="#/products" onclick="event.preventDefault();navigate('#/products')" class="link">${t('continueShopping')}</a>
      </div>
    </div>
  </div></div>`;
}

window.updateCartItem = async function(id, qty) {
  if (qty < 1) { await removeCartItem(id); return; }
  const res = await API.put('/cart/items/' + id, { quantity: qty });
  if (res.status >= 200 && res.status < 300) {
    App.cart = res.data;
    App.cartCount = res.data.items?.length || 0;
    updateHeaderAuth();
    router();
  } else {
    showToast(res.data?.error || t('networkError'), true);
  }
};

window.updateCartItemDirect = function(id, val) {
  const qty = parseInt(val) || 1;
  if (qty < 1) { removeCartItem(id); return; }
  window.updateCartItem(id, qty);
};

window.clearCart = async function() {
  if (!confirm(t('confirmClear'))) return;
  await API.del('/cart');
  App.cartCount = 0;
  updateHeaderAuth();
  router();
};

window.removeCartItem = async function(id) {
  await API.del('/cart/items/' + id);
  router();
};

// ═══════════════════════════════════════════════
// PAGE: CHECKOUT
// ═══════════════════════════════════════════════
async function renderCheckout(el) {
  if (!App.token) { navigate('#/login'); return; }
  if (!App.customer) {
    const meRes = await API.get('/auth/me');
    if (meRes.status === 200) App.customer = meRes.data;
  }
  const res = await API.get('/cart');
  const cart = res.data || { items: [] };
  if (!cart.items || cart.items.length === 0) { navigate('#/cart'); return; }

  const total = cart.items.reduce((s,i) => s + (i.price||0)*i.quantity, 0);
  const c = App.customer || {};

  // Load shipping companies
  let shippingCompanies = [];
  try {
    const shipRes = await API.get('/shipping/companies');
    if (shipRes.status >= 200 && shipRes.status < 300) shippingCompanies = shipRes.data || [];
  } catch(e) {}
  window._shippingCompanies = shippingCompanies;

  // Load payment methods
  let paymentMethods = [];
  try {
    const payRes = await API.get('/payment/methods');
    if (payRes.status >= 200 && payRes.status < 300) paymentMethods = payRes.data || [];
  } catch(e) {}

  // Load delivery addresses
  let addresses = [];
  try {
    const addrRes = await API.get('/addresses');
    addresses = addrRes.data || [];
  } catch(e) {}
  const defaultAddr = addresses.find(a => a.is_default) || addresses[0] || null;

  // Load loyalty info
  let appliedCoupon = null;
  let loyaltyInfo = null;
  try {
    const loyaltyRes = await API.get('/loyalty/summary');
    if (loyaltyRes.status === 200) loyaltyInfo = loyaltyRes.data;
  } catch(e) {}

  // Calculate max redeemable points (50% of order)
  const maxRedeemKip = total * 0.5;
  const maxRedeemPts = loyaltyInfo ? Math.floor(maxRedeemKip / (loyaltyInfo.config?.redemptionRate || 1000)) : 0;
  const actualRedeemPts = loyaltyInfo ? Math.min(loyaltyInfo.pointsBalance, maxRedeemPts) : 0;
  const tierDiscountPct = loyaltyInfo?.currentTier?.discount || 0;
  const tierDiscountKip = Math.floor(total * tierDiscountPct / 100);

  el.innerHTML = `
  <div class="breadcrumb"><a href="#/">${t('home')}</a> / <a href="#/cart">${t('cart')}</a> / ${t('checkout')}</div>
  <div class="section"><div class="section-inner">
    <h2>${t('checkout')}</h2>
    <div class="checkout-layout">
      <div class="form-card">
        <h3>${t('cartTitle')}</h3>
        ${cart.items.map(i => `<div class="cart-item"><div class="cart-item-info"><div class="cart-item-name">${esc(i.name)}</div><div class="cart-item-sku">SKU: ${esc(i.sku || '')}${i.variant_name ? ' \u2022 ' + esc(i.variant_name) : ''} • ×${i.quantity}</div></div><div class="cart-item-subtotal">${i.price ? priceFmt(i.price * i.quantity) : '—'}</div></div>`).join('')}
        <div class="cart-total-row"><b>${t('subtotal')}</b><b>${priceFmt(total)}</b></div>
        ${tierDiscountKip > 0 ? `<div class="cart-total-row" style="color:var(--green)"><b>${t('tierDiscount')} (${tierDiscountPct}%)</b><b>-${priceFmt(tierDiscountKip)}</b></div>` : ''}
        ${loyaltyInfo ? `<div style="margin-top:12px;padding:12px;background:var(--bg,#f8f9fa);border-radius:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>⭐ ${t('availablePoints')}: <b>${loyaltyInfo.pointsBalance.toLocaleString()}</b></span><span>${t('tier')}: <b>${loyaltyInfo.currentTier?.name || t('miscBronze')}</b></span></div>
          ${actualRedeemPts > 0 ? `<div style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <label style="font-weight:600">${t('redeemPoints')}:</label>
            <input type="number" id="redeem-points" min="0" max="${actualRedeemPts}" value="0" style="width:80px;padding:4px 8px;border:1px solid var(--border,#ddd);border-radius:4px" onchange="updateRedeemDiscount(${loyaltyInfo.config?.redemptionRate || 1000}, ${tierDiscountKip})">
            <span style="color:var(--steel)" id="redeem-hint">/ ${actualRedeemPts} ${t('max')}</span>
          </div>
          <div id="redeem-discount" style="margin-top:4px;color:var(--green);font-weight:600"></div>
          <div style="margin-top:4px;color:var(--steel);font-size:12px">${t('pointsEarnOnThisOrder')}: <b>+${Math.floor((total / 1000) * (loyaltyInfo.config?.earningRate || 1) * (loyaltyInfo.currentTier?.multiplier || 1))}</b> pts</div>
        </div></div>` : ''}
      </div>` : ''}
      <div class="form-card">
        <h3>${t('confirmOrder')}</h3>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--steel,#666)">${t('selectAddress')}</label>
          <select id="checkout-address" style="width:100%;padding:8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:13px">
            ${addresses.length ? addresses.map(a => '<option value="' + a.id + '"' + (defaultAddr && a.id === defaultAddr.id ? ' selected' : '') + '>' + esc(a.label ? a.label + ': ' : '') + esc(a.recipient_name) + ' — ' + esc(a.district) + ', ' + esc(a.province) + '</option>').join('') : '<option value="">' + (c.phone || '') + ' — ' + (c.company || t('miscDefault')) + '</option>'}
          </select>
        </div>
        <div class="checkout-customer">
          <div><div class="cc-label">${t('name')}</div><div class="cc-value">${esc(c.name || '')}</div></div>
          <div><div class="cc-label">${t('email')}</div><div class="cc-value">${esc(c.email || '')}</div></div>
          <div><div class="cc-label">${t('phone')}</div><div class="cc-value">${esc(c.phone || '—')}</div></div>
          <div><div class="cc-label">${t('company')}</div><div class="cc-value">${esc(c.company || '—')}</div></div>
        </div>
        <div class="checkout-notes">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--steel,#666)">${t('orderNotes')}</label>
          <textarea id="order-notes" placeholder="${t('notesPlaceholder')}"></textarea>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--steel,#666)">${t('shippingCompany')}</label>
          <select id="checkout-shipping-company" style="width:100%;padding:8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:13px" onchange="loadBranches(this.value)">
            <option value="">${t('selectShipping')}</option>
            ${shippingCompanies.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('')}
          </select>
        </div>
        <div id="branch-section" style="display:none;margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--steel,#666)">${t('shippingBranch')}</label>
          <select id="checkout-shipping-branch" style="width:100%;padding:8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:13px">
            <option value="">${t('selectBranch')}</option>
          </select>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--steel,#666)">${t('paymentMethod')}</label>
          <select id="checkout-payment-method" style="width:100%;padding:8px;border:1px solid var(--border,#ddd);border-radius:4px;font-size:13px">
            <option value="">${t('selectPayment')}</option>
            ${paymentMethods.map(m => '<option value="' + m.code + '">' + esc(App.lang==='lo' ? m.name_lo : m.name_en) + '</option>').join('')}
          </select>
        </div>
        <button class="btn-primary" id="confirm-order-btn" onclick="confirmOrder()" style="width:100%;margin-top:16px">✅ ${t('submitOrder')}</button>
      </div>
    </div>
  </div></div>`;
}

window.loadBranches = function(companyId) {
  var branchSection = document.getElementById('branch-section');
  var branchSelect = document.getElementById('checkout-shipping-branch');
  if (!companyId || !branchSection || !branchSelect) return;
  var companies = window._shippingCompanies || [];
  var company = companies.find(function(c){return String(c.id) === String(companyId);});
  branchSection.style.display = company && company.branches && company.branches.length > 0 ? 'block' : 'none';
  if (company && company.branches) {
    branchSelect.innerHTML = '<option value="">' + t('selectBranch') + '</option>' + company.branches.map(function(b){return '<option value="'+b.id+'">'+b.name+'</option>';}).join('');
  }
};

window.updateRedeemDiscount = function(redemptionRate, tierDiscountKip) {
  var input = document.getElementById('redeem-points');
  var hint = document.getElementById('redeem-discount');
  if (!input || !hint) return;
  var pts = parseInt(input.value) || 0;
  var kip = pts * redemptionRate;
  hint.textContent = pts > 0 ? '-' + priceFmt(kip) : '';
};
let _orderSubmitting = false;
window.confirmOrder = async function() {
  if (_orderSubmitting) return;
  // Confirmation step
  if (!window._orderConfirmed) {
    var btn = document.getElementById('confirm-order-btn');
    if (btn) {
      btn.textContent = t('confirmYes');
      btn.style.background = 'var(--red,#e53935)';
      window._orderConfirmed = true;
      setTimeout(function() { window._orderConfirmed = false; if(btn){btn.textContent='\u2705 '+t('submitOrder');btn.style.background='';} }, 5000);
    }
    return;
  }
  window._orderConfirmed = false;
  _orderSubmitting = true;
  const submitBtn = $('#confirm-order-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = t('submitting'); submitBtn.classList.add('btn-loading'); }
  const redeemInput = $('#redeem-points');
  const redeemPoints = redeemInput ? parseInt(redeemInput.value) || 0 : 0;
  const couponInput = $('#coupon-input');
  const couponCode = couponInput ? couponInput.value.trim() : '';
  // Collect delivery/shipping info
  var deliveryAddressEl = document.getElementById('checkout-address');
  var shippingCompanyEl = document.getElementById('checkout-shipping-company');
  var shippingBranchEl = document.getElementById('checkout-shipping-branch');
  var deliveryAddressId = deliveryAddressEl ? parseInt(deliveryAddressEl.value) || null : null;
  var shippingCompanyId = shippingCompanyEl ? parseInt(shippingCompanyEl.value) || null : null;
  var shippingBranchId = shippingBranchEl ? parseInt(shippingBranchEl.value) || null : null;
  var payMethodEl = document.getElementById('checkout-payment-method');
  var paymentMethod = payMethodEl ? payMethodEl.value : '';
  var body = { redeemPoints, deliveryAddressId, shippingCompanyId, shippingBranchId, paymentMethod };
  if (couponCode) body.couponCode = couponCode;
  const res = await API.post('/orders', body);
  _orderSubmitting = false;
  if (res.status === 201) {
    App.cartCount = 0;
    updateHeaderAuth();
    // Show success page
    const main = $('#app-content');
    main.innerHTML = `
      <div class="success-page">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <h2>${t('orderConfirmed')}</h2>
        <div class="order-num">${esc(res.data.order_number || '')}</div>
        <p>${t('orderNumber')}: ${esc(res.data.order_number || '')}</p>
        <a class="btn-primary" href="#/order/${res.data.id}" onclick="event.preventDefault();navigate('#/order/${res.data.id}')">${t('viewOrder')} →</a>
        <a href="#/products" onclick="event.preventDefault();navigate('#/products')" class="link" style="margin-left:16px">${t('continueShopping')}</a>
      </div>`;
  } else {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✅ ' + t('submitOrder'); submitBtn.classList.remove('btn-loading'); }
    showToast(res.data?.error || t('networkError'), true);
  }
};

// ═══════════════════════════════════════════════
// PAGE: LOGIN
// ═══════════════════════════════════════════════
function renderLogin(el) {
  el.innerHTML = `
  <div class="auth-page login-split">
    <div class="login-hero no-i18n">
      <div class="login-hero-top">
        <img src="/image/LOGO.png" alt="NB LAO" class="login-hero-logo">
      </div>
      <div class="login-hero-body">
        <h2 class="login-hero-title">${t('loginHeroTitle')}</h2>
        <p class="login-hero-sub">${t('loginHeroSub')}</p>
        <div class="login-hero-tags">
          <span class="login-tag">📦 ${t('loginTag1')}</span>
          <span class="login-tag">🛠️ ${t('loginTag2')}</span>
          <span class="login-tag">📈 ${t('loginTag3')}</span>
        </div>
        <div class="login-hero-foot">NB LAO — ${App.lang==='lo'?'ຄູ່ຄ້າທີ່ເຊື່ອຖືໄດ້':'Your Trusted Partner'}</div>
      </div>
    </div>
    <div class="auth-card login-card">
      <div class="login-card-head">
        <img src="/image/LOGO.png" alt="NB LAO" class="login-card-logo">
      </div>
      <h2>${t('loginWelcome')}</h2>
      <p class="login-welcome-sub">${t('loginWelcomeSub')}</p>
      <form onsubmit="event.preventDefault();doLogin()">
        <div class="field"><label>${t('email')}</label><input id="login-email" type="email" autocomplete="email" required></div>
        <div class="field"><label>${t('password')}</label>
          <div class="pw-wrap">
            <input id="login-pass" type="password" autocomplete="current-password" required>
            <button type="button" class="pw-toggle" aria-label="${t('showPassword')}" title="${t('showPassword')}" onclick="toggleLoginPw()">👁</button>
          </div>
        </div>
        <div class="login-row-between">
          <a href="#/forgot-password" class="login-forgot">${t('forgotPasswordLink')}</a>
        </div>
        <div id="login-error" class="error-msg" style="display:none"></div>
        <button class="btn-primary" type="submit" id="login-btn" style="width:100%">${t('login')}</button>
      </form>
      <a class="login-register-btn" href="#/register">${t('createAccount')}</a>
      <a class="login-back-home" href="#/" onclick="event.preventDefault();navigate('#/')">← ${t('home')}</a>
    </div>
  </div>`;
}

window.toggleLoginPw = function() {
  const input = document.getElementById('login-pass');
  const btn = input?.parentElement?.querySelector('.pw-toggle');
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (btn) {
    btn.textContent = show ? '🙈' : '👁';
    btn.title = show ? t('hidePassword') : t('showPassword');
    btn.setAttribute('aria-label', btn.title);
  }
};

window.doLogin = async function() {
  const email = $('#login-email')?.value;
  const pass = $('#login-pass')?.value;
  const errEl = $('#login-error');
  const btn = $('#login-btn');
  if (!email || !pass) { if (errEl) { errEl.textContent = t('requiredField'); errEl.style.display = ''; } return; }
  if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); btn.textContent = t('loading'); }

  const res = await API.post('/auth/login', { email, password: pass });
  if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); btn.textContent = t('login'); }
  if (res.status === 200 && res.data?.token) {
    // Customer Portal accepts ONLY customer-role accounts.
    if (res.data?.customer?.role !== 'customer') {
      errEl.textContent = t('adminAccessDenied');
      errEl.style.display = '';
      return;
    }
    App.token = res.data.token;
    App.customer = res.data.customer;
    localStorage.setItem('nblao_token', App.token);
    updateHeaderAuth();
    await loadCart();
    navigate('#/dashboard');
  } else {
    const msg = res.data?.error || t('networkError');
    if (msg.includes('deactivated')) errEl.textContent = t('deactivated');
    else errEl.textContent = msg;
    errEl.style.display = '';
  }
};

// ═══════════════════════════════════════════════
// PAGE: REGISTER
// ═══════════════════════════════════════════════
function renderRegister(el) {
  el.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h2>${t('registerTitle')}</h2>
      <form onsubmit="event.preventDefault();doRegister()">
        <div class="field"><label>${t('name')} *</label><input id="reg-name" type="text" required></div>
        <div class="field"><label>${t('email')} *</label><input id="reg-email" type="email" required></div>
        <div class="field"><label>${t('password')} *</label><input id="reg-pass" type="password" required minlength="8"></div>
        <div class="field"><label>${t('phone')}</label><input id="reg-phone" type="tel"></div>
        <div class="field"><label>${t('company')}</label><input id="reg-company" type="text"></div>
        <div id="reg-error" class="error-msg" style="display:none"></div>
        <button class="btn-primary" type="submit" style="width:100%">${t('register')}</button>
      </form>
      <p class="auth-switch">${t('hasAccount')} <a href="#/login">${t('loginHere')}</a></p>
    </div>
  </div>`;
}

window.doRegister = async function() {
  const name = $('#reg-name')?.value;
  const email = $('#reg-email')?.value;
  const pass = $('#reg-pass')?.value;
  const phone = $('#reg-phone')?.value;
  const company = $('#reg-company')?.value;
  const errEl = $('#reg-error');

  if (!name || !email || !pass) { errEl.textContent = t('requiredField'); errEl.style.display = ''; return; }
  if (pass.length < 8) { errEl.textContent = t('passwordShort'); errEl.style.display = ''; return; }

  const res = await API.post('/auth/register', { email, password: pass, name, phone, company });
  if (res.status === 201 && res.data?.token) {
    App.token = res.data.token;
    App.customer = res.data.customer;
    localStorage.setItem('nblao_token', App.token);
    updateHeaderAuth();
    navigate('#/');
  } else {
    errEl.textContent = res.data?.error || t('networkError');
    errEl.style.display = '';
  }
};

// ═══════════════════════════════════════════════

// ========= FORGOT PASSWORD =========
function renderForgotPassword(el) {
  el.innerHTML = `
    <div class="auth-page"><div class="auth-card">
      <h2>${t("forgotPasswordTitle")}</h2>
      <p style="color:#6B7280;font-size:14px;margin-bottom:16px">${t("forgotPasswordDesc")}</p>
      <form onsubmit="event.preventDefault();doForgotPassword()">
        <div class="field"><label>${t("email")}</label><input id="fp-email" type="email" required></div>
        <div id="fp-error" class="error-msg" style="display:none"></div>
        <div id="fp-success" style="display:none;color:#059669;font-size:14px;margin:12px 0"></div>
        <button class="btn-primary" type="submit" id="fp-btn" style="width:100%">${t("sendResetLink")}</button>
      </form>
      <p class="auth-switch"><a href="#/login">${t("backToLogin")}</a></p>
    </div></div>`;
}
window.doForgotPassword = async function() {
  var email = document.querySelector("#fp-email").value;
  var errEl = document.querySelector("#fp-error"), sucEl = document.querySelector("#fp-success"), btn = document.querySelector("#fp-btn");
  if (!email) { errEl.textContent = t("requiredField"); errEl.style.display = ""; return; }
  btn.disabled = true; btn.textContent = t("processing");
  var res = await API.post("/auth/forgot-password", { email: email });
  btn.disabled = false; btn.textContent = t("sendResetLink");
  if (res.status === 200) { errEl.style.display = "none"; sucEl.textContent = t("resetSent"); sucEl.style.display = ""; }
  else { errEl.textContent = res.data.error || t("networkError"); errEl.style.display = ""; }
};

// ========= RESET PASSWORD =========
function renderResetPassword(el) {
  var params = new URLSearchParams(location.hash.split("?")[1] || "");
  var token = params.get("token");
  el.innerHTML = `
    <div class="auth-page"><div class="auth-card">
      <h2>${t("resetPasswordTitle")}</h2>
      <form onsubmit="event.preventDefault();doResetPassword()">
        <input type="hidden" id="rp-token" value="${esc(token)}">
        <div class="field"><label>${t("newPassword")}</label><input id="rp-pass" type="password" required minlength="8"></div>
        <div class="field"><label>${t("confirmPassword")}</label><input id="rp-pass2" type="password" required minlength="8"></div>
        <div id="rp-error" class="error-msg" style="display:none"></div>
        <div id="rp-success" style="display:none;color:#059669;font-size:14px;margin:12px 0"></div>
        <button class="btn-primary" type="submit" id="rp-btn" style="width:100%">${t("resetPassword")}</button>
      </form>
      <p class="auth-switch"><a href="#/login">${t("backToLogin")}</a></p>
    </div></div>`;
}
window.doResetPassword = async function() {
  var token = document.querySelector("#rp-token").value, pass = document.querySelector("#rp-pass").value, pass2 = document.querySelector("#rp-pass2").value;
  var errEl = document.querySelector("#rp-error"), sucEl = document.querySelector("#rp-success"), btn = document.querySelector("#rp-btn");
  if (!pass || !pass2) { errEl.textContent = t("requiredField"); errEl.style.display = ""; return; }
  if (pass !== pass2) { errEl.textContent = t("passwordMismatch"); errEl.style.display = ""; return; }
  if (pass.length < 8) { errEl.textContent = t("passwordShort"); errEl.style.display = ""; return; }
  btn.disabled = true; btn.textContent = t("processing");
  var res = await API.post("/auth/reset-password", { token: token, password: pass });
  btn.disabled = false; btn.textContent = t("resetPassword");
  if (res.status === 200 && res.data && res.data.message) {
    errEl.style.display = "none"; sucEl.textContent = t("resetSuccess"); sucEl.style.display = "";
    setTimeout(function() { location.hash = "#/login"; }, 2000);
  } else { errEl.textContent = (res.data && res.data.error) || t("resetExpired"); errEl.style.display = ""; }
};

// ========= CHANGE PASSWORD =========
function renderChangePassword(el) {
  if (!App.token) { location.hash = "#/login"; return; }
  el.innerHTML = `
    <div class="auth-page"><div class="auth-card">
      <h2>${t("changePasswordTitle")}</h2>
      <form onsubmit="event.preventDefault();doChangePassword()">
        <div class="field"><label>${t("currentPassword")}</label><input id="cp-current" type="password" required></div>
        <div class="field"><label>${t("newPassword")}</label><input id="cp-new" type="password" required minlength="8"></div>
        <div class="field"><label>${t("confirmPassword")}</label><input id="cp-new2" type="password" required minlength="8"></div>
        <div id="cp-error" class="error-msg" style="display:none"></div>
        <div id="cp-success" style="display:none;color:#059669;font-size:14px;margin:12px 0"></div>
        <button class="btn-primary" type="submit" id="cp-btn" style="width:100%">${t("changePassword")}</button>
      </form>
      <p class="auth-switch"><a href="#/account">${t("back")}</a></p>
    </div></div>`;
}
window.doChangePassword = async function() {
  var current = document.querySelector("#cp-current").value, newPass = document.querySelector("#cp-new").value, newPass2 = document.querySelector("#cp-new2").value;
  var errEl = document.querySelector("#cp-error"), sucEl = document.querySelector("#cp-success"), btn = document.querySelector("#cp-btn");
  if (!current || !newPass || !newPass2) { errEl.textContent = t("requiredField"); errEl.style.display = ""; return; }
  if (newPass !== newPass2) { errEl.textContent = t("passwordMismatch"); errEl.style.display = ""; return; }
  if (newPass.length < 8) { errEl.textContent = t("passwordShort"); errEl.style.display = ""; return; }
  btn.disabled = true; btn.textContent = t("processing");
  var res = await API.put("/auth/change-password", { currentPassword: current, newPassword: newPass });
  btn.disabled = false; btn.textContent = t("changePassword");
  if (res.status === 200 && res.data && res.data.message) {
    errEl.style.display = "none"; sucEl.textContent = t("passwordChanged"); sucEl.style.display = "";
    setTimeout(function() { location.hash = "#/account"; }, 2000);
  } else { errEl.textContent = (res.data && res.data.error) || t("networkError"); errEl.style.display = ""; }
};

// ═══════════════════════════════════════════════
// PAGE: CUSTOMER DASHBOARD (post-login overview)
// ═══════════════════════════════════════════════
// Quotation lifecycle: pending → reviewed → quoted → accepted/rejected/cancelled.
// "Active" = still moving through that flow (terminal states excluded).
const DASH_ACTIVE_QUOTE_STATUSES = ['pending', 'reviewed', 'quoted'];

function _dashCard(icon, label, value, route, cls, sub) {
  return `<a class="dash-card ${cls || ''}" href="${route}">
    <span class="dash-card-icon">${icon}</span>
    <span class="dash-card-info">
      <span class="dash-card-value">${esc(value)}</span>
      <span class="dash-card-label">${esc(label)}</span>
      ${sub ? `<span class="dash-card-sub">${esc(sub)}</span>` : ''}
    </span>
    <span class="dash-card-arrow">›</span>
  </a>`;
}

function _dashErrPanel(retryFn) {
  return `<div class="dash-error">${t('dashDataError')} <button class="btn-sm" onclick="${retryFn}">${t('dashRetry')}</button></div>`;
}

// Canonical order lifecycle for the dashboard filters (mirrors the Admin Portal list).
const DASH_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const ORDER_STATUS_I18N = {
  pending:'orderStatusPending', confirmed:'orderStatusConfirmed', processing:'orderStatusProcessing',
  shipped:'orderStatusShipped', delivered:'orderStatusDelivered', cancelled:'orderStatusCancelled'
};

// Canonical quotation lifecycle (mirrors the Admin Portal status select).
const DASH_QUOTE_STATUSES = ['pending', 'reviewed', 'quoted', 'accepted', 'rejected', 'cancelled'];
const QUOTE_STATUS_I18N = {
  pending:'orderStatusPending', reviewed:'orderStatusReviewed', quoted:'orderStatusQuoted',
  accepted:'orderStatusAccepted', rejected:'orderStatusRejected', cancelled:'orderStatusCancelled'
};

// ── Dashboard filters: APPLIED state lives in the URL (like the Products filters).
//    ONE centralized search + ONE shared date range drive BOTH panels:
//      q (matches order OR quotation number)  ·  range, from, to
//    DRAFT state lives in window._dashDraft only while the drawer is open. ──
function _dashFilters() {
  const range = getParam('range') || '';
  return {
    q: getParam('q') || '',
    range: range,
    from: getParam('from') || '',
    to: getParam('to') || '',
  };
}
function _dashActiveCount(f) {
  let n = 0;
  if (f.q) n++;
  if (f.range) n++;
  return n;
}
// Resolve the applied date range to concrete YYYY-MM-DD bounds for the API.
function _dashRangeBounds(f) {
  const iso = d => d.toISOString().slice(0, 10);
  const today = new Date();
  if (f.range === '7' || f.range === '30' || f.range === '90') {
    const days = parseInt(f.range, 10);
    const start = new Date(today.getTime() - (days - 1) * 86400000);
    return { from: iso(start), to: iso(today) };
  }
  if (f.range === 'year') return { from: today.getFullYear() + '-01-01', to: iso(today) };
  if (f.range === 'custom') return { from: f.from || '', to: f.to || '' };
  return { from: '', to: '' };
}
function _dashOrdersQuery(f, limit) {
  const s = new URLSearchParams();
  s.set('limit', String(limit));
  if (f.q) s.set('q', f.q);
  const b = _dashRangeBounds(f);
  if (b.from) s.set('from', b.from);
  if (b.to) s.set('to', b.to);
  return '/orders?' + s.toString();
}
// Same unified search + shared date range as Orders — the backend matches each scope's own number.
function _dashQuotesQuery(f, limit) {
  const s = new URLSearchParams();
  s.set('limit', String(limit));
  if (f.q) s.set('q', f.q);
  const b = _dashRangeBounds(f);
  if (b.from) s.set('from', b.from);
  if (b.to) s.set('to', b.to);
  return '/quotations?' + s.toString();
}

// Serialise a filter set into the dashboard hash — the single commit path for both scopes.
function _dashHash(f) {
  const s = new URLSearchParams();
  if (f.q) s.set('q', f.q);
  if (f.range) s.set('range', f.range);
  if (f.range === 'custom') {
    if (f.from) s.set('from', f.from);
    if (f.to) s.set('to', f.to);
  }
  const qs = s.toString();
  return '#/dashboard' + (qs ? '?' + qs : '');
}
// A custom range whose end precedes its start is rejected outright — never silently swapped.
function _dashRangeError(f) {
  if (f.range !== 'custom' || !f.from || !f.to) return '';
  return f.to < f.from ? t('dashInvalidRange') : '';
}
// Validation is reported inline; Apply stays clickable so the refusal is always explained
// (a disabled button silently swallows the click and hides the reason).
function _dashShowRangeError(msg) {
  const els = document.querySelectorAll('[data-range-err]');
  els.forEach(function(el) { el.hidden = !msg; if (msg) el.textContent = msg; });
  const apply = document.querySelectorAll('[data-dash-apply]');
  apply.forEach(function(b) { b.classList.toggle('is-invalid', !!msg); });
}

// Desktop inline controls commit straight to the URL (same pattern as the Products listing).
// `range` stays committed by the Apply button so an inverted custom range is never stored.

// Unified search placeholder (one field searches both order and quotation numbers).
function _dashSearchPlaceholder() { return t('dashSearchUnified'); }

// Desktop toolbar: the date-range + unified search group stages in the DOM and
//    commits only through Apply / Reset. Status filtering intentionally lives on the
//    Order History / Quote History pages, not on the Dashboard. ──
window.dashToolRangeChange = function(value) {
  const dates = document.getElementById('dash-dates');
  if (dates) dates.hidden = (value !== 'custom');
  if (value !== 'custom') {
    const fr = document.getElementById('dash-from'); if (fr) fr.value = '';
    const to = document.getElementById('dash-to'); if (to) to.value = '';
  }
  _dashShowRangeError('');
};
window.applyDashToolbar = function() {
  const f = _dashFilters();
  const val = id => { const el = document.getElementById(id); return el ? (el.value || '') : ''; };
  const d = {
    q: val('dash-search').trim(),
    range: val('dash-range'),
    from: val('dash-from'),
    to: val('dash-to'),
  };
  if (d.range !== 'custom') { d.from = ''; d.to = ''; }
  const err = _dashRangeError(d);
  if (err) { _dashShowRangeError(err); return; }
  _dashShowRangeError('');
  navigate(_dashHash(d));
};
window.resetDashFiltersAll = function() { navigate('#/dashboard'); };

// Compact profile + delivery-address summary shown above the toolbar (desktop mockup).
function _dashIdentityCards(c, addresses) {
  const name = c.name || '';
  const initial = esc((name.trim() || (c.email || '').trim() || '?').charAt(0).toUpperCase());
  const tier = (App.loyaltyTier && App.loyaltyTier.name) || (c.tier && c.tier.name) || '';
  const addr = (addresses || [])[0];
  const addrLine = addr
    ? [addr.address, addr.district, addr.province, addr.postalCode].filter(Boolean).join(', ')
    : '';
  return `<div class="dash-idgrid">
    <section class="acct-card dash-idcard">
      <div class="dash-idhead">
        <span class="acct-avatar">${initial}</span>
        <div class="dash-idtext">
          <span class="dash-idname">${esc(name || t('myProfile'))}</span>
          <span class="dash-idsub">${esc(t('qaProfileSub'))}</span>
          ${tier ? `<span class="acct-id-tier">${acctIcon('loyalty')}${esc(tier)} ${esc(t('acctMember'))}</span>` : ''}
        </div>
        <a class="dash-idaction" href="#/account/profile">${esc(t('editProfile'))} →</a>
      </div>
      <dl class="dash-idfields">
        <div><dt>${esc(t('fullName'))}</dt><dd>${esc(name || '—')}</dd></div>
        <div><dt>${esc(t('email'))}</dt><dd>${esc(c.email || '—')}</dd></div>
        <div><dt>${esc(t('phone'))}</dt><dd>${esc(c.phone || '—')}</dd></div>
        <div><dt>${esc(t('company'))}</dt><dd>${esc(c.company || '—')}</dd></div>
      </dl>
    </section>
    <section class="acct-card dash-idcard">
      <div class="dash-idhead">
        <span class="dash-idicon">${acctIcon('address')}</span>
        <div class="dash-idtext">
          <span class="dash-idname">${esc(t('dashAddressesCard'))}</span>
          <span class="dash-idsub">${esc(t('qaAddressSub'))}</span>
        </div>
        <a class="dash-idaction" href="#/account/address-book">${esc(t('addressBook'))} →</a>
      </div>
      ${addr ? `<div class="dash-addr">
        <div class="dash-addr-top"><b>${esc(addr.recipientName || addr.label || name)}</b>${addr.isDefault ? `<span class="dash-addr-tag">${esc(t('dashDefaultAddr'))}</span>` : ''}</div>
        <div class="dash-addr-phone">${esc(addr.phone || '')}</div>
        <div class="dash-addr-line">${esc(addrLine)}</div>
      </div>` : `<p class="dash-addr-empty">${esc(t('dashNoAddr'))}</p>`}
    </section>
  </div>`;
}

// Desktop inline toolbar. The drawer trigger is a sibling and the two swap at 1024px,
// so only one control surface is ever visible — the DOM keeps a single filter state.
async function renderDashboard(el) {
  if (!App.token) { navigate('#/login'); return; }
  const meRes = await API.get('/auth/me');
  if (meRes.status !== 200) { navigate('#/login'); return; }
  App.customer = meRes.data;
  const c = App.customer;
  const fallbackName = App.lang === 'lo' ? 'ລູກຄ້າ' : 'Customer';
  const f = _dashFilters();
  const activeCount = _dashActiveCount(f);
  const rangeErr = _dashRangeError(f);
  const addrRes = await API.get('/addresses').catch(function() { return null; });
  const addresses = (addrRes && addrRes.status === 200 && Array.isArray(addrRes.data)) ? addrRes.data : [];

  if (window.cleanupOrphanMFilters) cleanupOrphanMFilters();   // drop stranded drawers from prior renders

  el.innerHTML = _accountShell('dashboard', `
    <section class="dash-banner">
      <div class="dash-banner-text">
        <h2 class="dash-hello">${t('welcomeBack')}, <span class="dash-name">${esc(c.name || fallbackName)}</span> 👋</h2>
        <p class="dash-banner-sub">${t('dashSubtitle')}</p>
      </div>
      <div class="dash-banner-tag">${esc(t('dashBannerTag'))}</div>
    </section>

    <div class="dash-cards" id="dash-cards">
      <div style="text-align:center;padding:24px"><div class="spinner"></div></div>
    </div>

    ${_dashIdentityCards(c, addresses)}

    <div class="dash-toolbar">
      <button type="button" class="dash-fbtn" onclick="toggleDashFilters()" aria-expanded="false" aria-controls="dfilter-panel">
        <svg class="acct-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
        <span>${esc(t('dashFilters'))}</span>
        ${activeCount ? `<span class="dash-fbtn-n">${activeCount}</span>` : ''}
      </button>
      <div class="dash-tool-right">
        <label class="dash-range-wrap">
          <span class="dash-range-label">${esc(t('dashScopeShared'))}</span>
          <select class="dash-range" id="dash-range" onchange="dashToolRangeChange(this.value)">
            <option value="" ${!f.range ? 'selected' : ''}>${esc(t('dashAllTime'))}</option>
            <option value="7" ${f.range === '7' ? 'selected' : ''}>${esc(t('dashLast7'))}</option>
            <option value="30" ${f.range === '30' ? 'selected' : ''}>${esc(t('dashLast30'))}</option>
            <option value="90" ${f.range === '90' ? 'selected' : ''}>${esc(t('dashLast90'))}</option>
            <option value="year" ${f.range === 'year' ? 'selected' : ''}>${esc(t('dashThisYear'))}</option>
            <option value="custom" ${f.range === 'custom' ? 'selected' : ''}>${esc(t('dashCustomRange'))}</option>
          </select>
        </label>
        <div class="dash-dates" id="dash-dates" ${f.range === 'custom' ? '' : 'hidden'}>
          <label><span>${esc(t('dashStartDate'))}</span><input type="date" id="dash-from" value="${esc(f.from)}" oninput="_dashShowRangeError('')" onchange="_dashShowRangeError('')"></label>
          <label><span>${esc(t('dashEndDate'))}</span><input type="date" id="dash-to" value="${esc(f.to)}" oninput="_dashShowRangeError('')" onchange="_dashShowRangeError('')"></label>
        </div>
        <div class="dash-search">
          <input id="dash-search" type="search" value="${esc(f.q)}" placeholder="${esc(_dashSearchPlaceholder())}"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();applyDashToolbar()}">
          <button type="button" class="dash-search-btn" onclick="applyDashToolbar()" aria-label="${esc(t('dashSearchLabel'))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
          </button>
        </div>
        <button type="button" class="dash-apply-btn${rangeErr ? ' is-invalid' : ''}" data-dash-apply onclick="applyDashToolbar()">${esc(t('dashApplyFilters'))}</button>
        <button type="button" class="dash-reset-btn" onclick="resetDashFiltersAll()">${esc(t('dashReset'))}</button>
      </div>
    </div>
    <p class="dash-range-err" data-range-err ${rangeErr ? '' : 'hidden'}>${esc(rangeErr)}</p>

    <div class="dash-grid">
      <section class="acct-card dash-panel">
        <div class="acct-card-header"><h3>${t('recentOrders')}</h3><a class="dash-viewall" href="#/orders">${t('viewAll')} ›</a></div>
        <div id="dash-orders"><div style="text-align:center;padding:20px"><div class="spinner"></div></div></div>
      </section>
      <section class="acct-card dash-panel">
        <div class="acct-card-header"><h3>${t('recentQuotations')}</h3><a class="dash-viewall" href="#/quotations">${t('viewAll')} ›</a></div>
        <div id="dash-quotes"><div style="text-align:center;padding:20px"><div class="spinner"></div></div></div>
      </section>
      <section class="acct-card dash-panel dash-quick-panel">
        <div class="acct-card-header"><h3>${t('quickActions')}</h3></div>
        <div class="dash-quick">
          <a class="dash-quick-item" href="#/products">${acctIcon('saved')}<span class="dq-text"><span class="dq-label">${t('browseProducts')}</span><span class="dq-sub">${t('qaBrowseSub')}</span></span></a>
          <a class="dash-quick-item" href="#/account/profile">${acctIcon('profile')}<span class="dq-text"><span class="dq-label">${t('myProfile')}</span><span class="dq-sub">${t('qaProfileSub')}</span></span></a>
          <a class="dash-quick-item" href="#/account/address-book">${acctIcon('address')}<span class="dq-text"><span class="dq-label">${t('addressBook')}</span><span class="dq-sub">${t('qaAddressSub')}</span></span></a>
          <a class="dash-quick-item" href="#/orders">${acctIcon('orders')}<span class="dq-text"><span class="dq-label">${t('accountOrders')}</span><span class="dq-sub">${t('qaOrdersSub')}</span></span></a>
          <a class="dash-quick-item" href="#/quotations">${acctIcon('quotes')}<span class="dq-text"><span class="dq-label">${t('accountQuotes')}</span><span class="dq-sub">${t('qaQuotesSub')}</span></span></a>
          <a class="dash-quick-item" href="#/account">${acctIcon('settings')}<span class="dq-text"><span class="dq-label">${t('acctSettings')}</span><span class="dq-sub">${t('qaSettingsSub')}</span></span></a>
        </div>
      </section>
    </div>

    <div class="mfilter-panel" id="dfilter-panel" hidden role="dialog" aria-modal="true" aria-label="${esc(t('dashFilters'))}">
      <div class="mfilter-head">
        <div class="mfilter-title">${esc(t('dashFilters'))}</div>
        <button type="button" class="mfilter-reset" onclick="resetDashFilters()">${esc(t('dashReset'))}</button>
        <button type="button" class="mfilter-close" aria-label="${esc(t('miscEscape'))}" onclick="closeDashFilters()">×</button>
      </div>
      <div class="mfilter-body" id="dfilter-body"></div>
      <p class="dash-range-err" data-range-err hidden></p>
      <div class="mfilter-foot">
        <button type="button" class="btn-ghost" onclick="closeDashFilters()">${esc(t('cancel'))}</button>
        <button type="button" class="btn-primary" data-dash-apply onclick="applyDashFilters()">${esc(t('dashApplyFilters'))}</button>
      </div>
    </div>
    <div class="mfilter-overlay" id="dfilter-overlay" onclick="closeDashFilters()"></div>
  `, t('dashboard'));
  loadDashboardData();
}

// ── Dashboard filter drawer (mobile + tablet): staged draft, committed only by Apply ──
// Drawer body: ONE shared scope — the same unified search + date range drive both panels.
function _dashFilterBody(d) {
  const ranges = [['', 'dashAllTime'], ['7', 'dashLast7'], ['30', 'dashLast30'], ['90', 'dashLast90'], ['year', 'dashThisYear'], ['custom', 'dashCustomRange']];
  const rng = ranges.map(([v, k]) => `<label class="filter-radio ${d.range === v ? 'active' : ''}"><input type="radio" name="dash-range" value="${v}" ${d.range === v ? 'checked' : ''}>${esc(t(k))}</label>`).join('');
  const custom = d.range === 'custom';
  const b = _dashRangeBounds({ range: d.range, from: d.from, to: d.to, });
  const rangeText = (b.from && b.to) ? `${dateFmt(b.from)} — ${dateFmt(b.to)}` : (d.range === 'custom' ? '—' : t('dashAllTime'));
  const err = _dashRangeError(d);
  return `
    <div class="filter-box">
      <h4>${esc(t('dashScopeShared'))}</h4>
      <p class="dash-range-hint">📅 ${esc(rangeText)}</p>
      <div class="dash-range-dates" ${custom ? '' : 'hidden'}>
        <label><span>${esc(t('dashStartDate'))}</span><input type="date" name="dash-from" value="${esc(d.from)}"></label>
        <label><span>${esc(t('dashEndDate'))}</span><input type="date" name="dash-to" value="${esc(d.to)}"></label>
      </div>
      <p class="filter-sub">${esc(t('dashQuickFilter'))}</p>
      ${rng}
    </div>
    <div class="filter-box">
      <h4>${esc(t('dashSearchUnifiedHeading'))}</h4>
      <input type="search" class="acct-input" name="dash-q" value="${esc(d.q)}" placeholder="${esc(_dashSearchPlaceholder())}" aria-label="${esc(t('dashSearchUnified'))}">
    </div>`;
}

window.toggleDashFilters = function() {
  const panel = document.getElementById('dfilter-panel');
  const overlay = document.getElementById('dfilter-overlay');
  const bodyEl = document.getElementById('dfilter-body');
  const btn = document.querySelector('.dash-fbtn');
  if (!panel) return;
  if (panel.classList.contains('open')) { closeDashFilters(); return; }
  window._dashDraft = _dashFilters();                       // draft starts from the APPLIED state
  _dashShowRangeError('');
  if (bodyEl) bodyEl.innerHTML = _dashFilterBody(window._dashDraft);
  // Re-parent to <body>: #app-content's page-transition transform would otherwise anchor position:fixed.
  if (panel.parentElement !== document.body) {
    panel.__home = panel.parentElement;
    if (overlay) overlay.__home = overlay.parentElement;
    document.body.appendChild(panel);
    if (overlay) document.body.appendChild(overlay);
  }
  panel.hidden = false;
  setTimeout(function() { panel.classList.add('open'); if (overlay) overlay.classList.add('show'); }, 20);
  document.body.style.overflow = 'hidden';
  if (btn) { btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open'); }
};

window.closeDashFilters = function() {
  const panel = document.getElementById('dfilter-panel');
  const overlay = document.getElementById('dfilter-overlay');
  const btn = document.querySelector('.dash-fbtn');
  if (!panel) return;
  window._dashDraft = null;                                 // discard any un-applied draft
  document.body.style.overflow = '';                        // restore background scroll
  if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('open'); }
  if (!panel.classList.contains('open') && !panel.hidden) { setTimeout(function() { closeDashFilters(); }, 30); return; }
  if (!panel.classList.contains('open')) { panel.hidden = true; return; }
  panel.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  setTimeout(function() {
    if (panel.__home && panel.parentElement === document.body) panel.__home.insertBefore(panel, panel.__home.firstChild);
    if (overlay && overlay.__home && overlay.parentElement === document.body) overlay.__home.appendChild(overlay);
    panel.hidden = true;
  }, 220);
};

// Apply is the ONLY action that commits staged dashboard filters (through the existing router).
window.applyDashFilters = function() {
  const d = window._dashDraft || _dashFilters();
  const err = _dashRangeError(d);
  if (err) { _dashShowRangeError(err); return; }
  window._dashDraft = null;
  _dashShowRangeError('');
  document.body.style.overflow = '';
  navigate(_dashHash(d));
};

// Reset clears the DRAFT only — nothing is committed until Apply (staging is preserved).
window.resetDashFilters = function() {
  window._dashDraft = { q: '', range: '', from: '', to: '' };
  _dashShowRangeError('');
  const bodyEl = document.getElementById('dfilter-body');
  if (bodyEl) bodyEl.innerHTML = _dashFilterBody(window._dashDraft);
};

// Draft edits: dates / unified search inside the drawer never navigate — they only stage.
document.addEventListener('change', function(e) {
  const panel = document.getElementById('dfilter-panel');
  if (!panel || panel.hidden) return;
  const bodyEl = document.getElementById('dfilter-body');
  if (!bodyEl || !bodyEl.contains(e.target)) return;
  const d = window._dashDraft;
  if (!d) return;
  const el = e.target;
  if (el.name === 'dash-range') {
    d.range = el.value;
    const dates = bodyEl.querySelector('.dash-range-dates');
    if (dates) dates.hidden = d.range !== 'custom';
    if (d.range !== 'custom') { d.from = ''; d.to = ''; }
    bodyEl.querySelectorAll('input[name="dash-range"]').forEach(function(r) {
      const lbl = r.closest('.filter-radio');
      if (lbl) lbl.classList.toggle('active', r.value === d.range);
    });
  }
  else if (el.name === 'dash-from') d.from = el.value;
  else if (el.name === 'dash-to') d.to = el.value;
  else if (el.name === 'dash-q') d.q = (el.value || '').trim();
  _dashShowRangeError(_dashRangeError(d));
}, true);
document.addEventListener('input', function(e) {
  const panel = document.getElementById('dfilter-panel');
  if (!panel || panel.hidden) return;
  const bodyEl = document.getElementById('dfilter-body');
  if (!bodyEl || !bodyEl.contains(e.target)) return;
  const d = window._dashDraft;
  if (!d) return;
  if (e.target.name === 'dash-q') d.q = (e.target.value || '').trim();
  else if (e.target.name === 'dash-from') d.from = e.target.value;
  else if (e.target.name === 'dash-to') d.to = e.target.value;
  _dashShowRangeError(_dashRangeError(d));
}, true);

// Read-only loaders — every value comes from the authenticated customer's real APIs.
async function loadDashboardData() {
  const f = _dashFilters();
  const [sumRes, ordRes, qsumRes, quotRes, loyRes, wishRes] = await Promise.all([
    API.get('/orders/summary'),
    API.get(_dashOrdersQuery(f, 5)),
    API.get('/quotations/summary').catch(() => null),
    API.get(_dashQuotesQuery(f, 5)),
    API.get('/loyalty/summary').catch(() => null),
    API.get('/wishlist').catch(() => null),
  ]);
  const qsum0 = (qsumRes && qsumRes.status === 200) ? qsumRes.data : null;

  const cardsEl = document.getElementById('dash-cards');
  if (cardsEl) {
    const sum = sumRes.status === 200 ? sumRes.data : null;
    // "Active" = quotations still moving through the lifecycle, from the real per-status summary.
    const activeQuotes = qsum0 && qsum0.byStatus
      ? DASH_ACTIVE_QUOTE_STATUSES.reduce((n, s) => n + (qsum0.byStatus[s] || 0), 0)
      : null;
    const loy = (loyRes && loyRes.status === 200) ? loyRes.data : null;
    // /wishlist returns { items, total } (not a bare array).
    const wish = (wishRes && wishRes.status === 200 && wishRes.data) ? (wishRes.data.items || []) : null;
    if (loy && loy.currentTier) { App.loyaltyTier = loy.currentTier; _dashPaintTier(); }
    if (!sum && !qsum0 && !loy) {
      cardsEl.innerHTML = _dashErrPanel('loadDashboardData()');
    } else {
      cardsEl.innerHTML =
        _dashCard('📦', t('dashTotalOrders'), sum ? sum.total.toLocaleString() : '—', '#/orders', 'c-blue') +
        _dashCard('⏳', t('dashPendingOrders'), sum && sum.byStatus ? (sum.byStatus.pending || 0).toLocaleString() : '—', '#/orders', 'c-amber') +
        _dashCard('📄', t('dashActiveQuotations'), activeQuotes != null ? activeQuotes.toLocaleString() : '—', '#/quotations', 'c-purple') +
        _dashCard('⭐', t('dashLoyaltyPoints'), loy ? loy.pointsBalance.toLocaleString() : '—', '#/account/loyalty', 'c-gold', loy && loy.currentTier ? loy.currentTier.name : '') +
        _dashCard('❤️', t('dashSavedItems'), wish ? wish.length.toLocaleString() : '—', '#/wishlist', 'c-red');
    }
  }

  const ordEl = document.getElementById('dash-orders');
  if (ordEl) {
    if (ordRes.status !== 200) {
      ordEl.innerHTML = _dashErrPanel('loadDashboardData()');
    } else {
      const orders = ordRes.data?.orders || [];
      ordEl.innerHTML = orders.length ? `<div class="order-list">
        ${orders.map(o => `
        <a class="dash-row" href="#/order/${o.id}">
          <span class="dash-row-ic">${acctIcon('orders')}</span>
          <span class="dash-row-main">
            <span class="dash-row-num">${esc(o.order_number)}</span>
            <span class="dash-row-date">${dateFmt(o.createdAt)}</span>
          </span>
          <span class="badge badge-${statusColor(o.status)}">${esc(t(ORDER_STATUS_I18N[o.status]) || o.status)}</span>
          ${o.total != null ? `<span class="dash-row-amt">${priceFmt(o.total)}</span>` : ''}
          <span class="dash-row-chev" aria-hidden="true">›</span>
        </a>`).join('')}
      </div>` : `<div class="empty-state"><p>${t('dashNoMatch')}</p><a class="btn-sm" href="#/dashboard">${t('dashReset')}</a></div>`;
    }
  }

  const qEl = document.getElementById('dash-quotes');
  if (qEl) {
    const qdata = quotRes.status === 200 ? quotRes.data : null;
    const quotes = qdata && Array.isArray(qdata.quotations) ? qdata.quotations : (Array.isArray(qdata) ? qdata : null);
    if (!quotes) {
      qEl.innerHTML = _dashErrPanel('loadDashboardData()');
    } else if (!quotes.length) {
      const filtered = !!f.q;
      qEl.innerHTML = `<div class="empty-state"><p>${filtered ? t('dashNoQuotesMatch') : t('noQuotations')}</p>${
        filtered ? `<button type="button" class="btn-sm" onclick="resetDashFiltersAll()">${t('dashReset')}</button>`
                 : `<a class="btn-sm" href="#/products">${t('browseProducts')}</a>`}</div>`;
    } else {
      qEl.innerHTML = `<div class="order-list">
        ${quotes.map(q => `
        <a class="dash-row" href="#/quotation/${q.id}">
          <span class="dash-row-ic">${acctIcon('quotes')}</span>
          <span class="dash-row-main">
            <span class="dash-row-num">${esc(q.quotation_number)}</span>
            <span class="dash-row-date">${dateFmt(q.createdAt)}</span>
          </span>
          <span class="badge badge-${statusColor(q.status)}">${esc(t(QUOTE_STATUS_I18N[q.status]) || t(q.status) || q.status)}</span>
          <span class="dash-row-chev" aria-hidden="true">›</span>
        </a>`).join('')}
      </div>`;
    }
  }
}
window.loadDashboardData = loadDashboardData;

// Loyalty tier badge appears in the account identity card as soon as the data arrives.
function _dashPaintTier() {
  const tier = (App.loyaltyTier && App.loyaltyTier.name) || '';
  const host = document.querySelector('.acct-id-text');
  if (!tier || !host || host.querySelector('.acct-id-tier')) return;
  const s = document.createElement('span');
  s.className = 'acct-id-tier';
  s.innerHTML = acctIcon('loyalty') + esc(tier) + ' ' + esc(t('acctMember'));
  host.appendChild(s);
}

// ═══════════════════════════════════════════════
// PAGE: LOYALTY POINTS (real /loyalty/summary data)
// ═══════════════════════════════════════════════
function _loyStat(icon, value, label, cls, sub) {
  return `<div class="loy-stat ${cls || ''}">
    <span class="dash-card-icon">${icon}</span>
    <span class="dash-card-info">
      <span class="dash-card-value">${esc(value)}</span>
      <span class="dash-card-label">${esc(label)}</span>
      ${sub ? `<span class="dash-card-sub">${esc(sub)}</span>` : ''}
    </span>
  </div>`;
}

async function renderLoyalty(el) {
  if (!App.token) { navigate('#/login'); return; }
  const meRes = await API.get('/auth/me');
  if (meRes.status !== 200) { navigate('#/login'); return; }
  App.customer = meRes.data;

  const loyRes = await API.get('/loyalty/summary').catch(() => null);
  const loy = (loyRes && loyRes.status === 200) ? loyRes.data : null;
  if (loy && loy.currentTier) App.loyaltyTier = loy.currentTier;
  const ledger = (loy && Array.isArray(loy.ledger)) ? loy.ledger : [];

  el.innerHTML = _accountShell('loyalty', `
    <section class="acct-card">
      <div class="acct-card-header"><h3>${esc(t('loyaltyTitle'))}</h3>
        ${loy && loy.currentTier ? `<span class="badge badge-green">${esc(loy.currentTier.name)}</span>` : ''}
      </div>
      ${!loy ? _dashErrPanel('renderLoyalty(document.getElementById(\'app-content\'))') : `
      <div class="loy-grid">
        ${_loyStat('⭐', loy.pointsBalance.toLocaleString(), t('loyaltyAvail'), 'c-gold')}
        ${_loyStat('🏅', loy.currentTier ? loy.currentTier.name : '—', t('loyaltyTier'), 'c-blue', loy.currentTier && loy.currentTier.discount ? '-' + loy.currentTier.discount + '%' : '')}
        ${_loyStat('📈', (loy.lifetimePoints || 0).toLocaleString(), t('loyaltyLifetime'), 'c-purple')}
        ${_loyStat('🎁', (loy.totalRedeemed || 0).toLocaleString(), t('loyaltyRedeemed'), 'c-amber')}
      </div>
      ${loy.nextTier ? `<p class="loy-next">${esc(t('loyaltyNext'))}: <b>${esc(loy.nextTier.name)}</b></p>` : ''}`}
    </section>
    <section class="acct-card" style="margin-top:16px">
      <div class="acct-card-header"><h3>${esc(t('loyaltyHistory'))}</h3></div>
      ${ledger.length ? `<div class="loy-list">
        ${ledger.slice(0, 25).map(l => `
        <div class="loy-row">
          <span class="loy-row-main">
            <span class="loy-row-reason">${esc(l.reason || l.type)}</span>
            <span class="loy-row-date">${dateFmt(l.createdAt)}</span>
          </span>
          <span class="loy-row-pts ${l.points < 0 ? 'neg' : 'pos'}">${l.points > 0 ? '+' : ''}${l.points.toLocaleString()}</span>
        </div>`).join('')}
      </div>` : `<div class="empty-state"><p>${esc(t('loyaltyNoHistory'))}</p></div>`}
    </section>
  `, t('loyaltyPageTitle'));
}
window.renderLoyalty = renderLoyalty;

// PAGE: ACCOUNT — Sidebar Shell
// ═══════════════════════════════════════════════
// Inline stroke icons for the account navigation (corporate navy rail look).
const ACCT_ICONS = {
  dashboard:'<rect x="3" y="3" width="7.5" height="8.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.6"/><rect x="13.5" y="11" width="7.5" height="10" rx="1.6"/><rect x="3" y="14.5" width="7.5" height="6.5" rx="1.6"/>',
  orders:'<path d="M4.5 8h15l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H7.2a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8V5.6a3 3 0 0 1 6 0V8"/>',
  quotes:'<path d="M7 3h7.5L19 7.5V21H7z"/><path d="M14 3v5h5"/><path d="M10.5 13h6M10.5 17h4"/>',
  profile:'<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.5c1.3-3.8 4-5.7 7.2-5.7s5.9 1.9 7.2 5.7"/>',
  address:'<path d="M4 10.6 12 4l8 6.6"/><path d="M6.2 10v10.5h11.6V10"/><path d="M10.2 20.5v-5h3.6v5"/>',
  settings:'<circle cx="12" cy="12" r="3.1"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.7 5.7l1.7 1.7M16.6 16.6l1.7 1.7M18.3 5.7l-1.7 1.7M7.4 16.6l-1.7 1.7"/>',
  loyalty:'<path d="m12 4 2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/>',
  saved:'<path d="M12 20.4s-7.3-4.6-7.3-9.4A3.9 3.9 0 0 1 12 8.6a3.9 3.9 0 0 1 7.3 2.4c0 4.8-7.3 9.4-7.3 9.4z"/>',
  logout:'<path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5"/><path d="M9.5 12H20"/><path d="m13 8.2-3.8 3.8 3.8 3.8"/>'
};
function acctIcon(name) {
  return `<svg class="acct-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACCT_ICONS[name] || ''}</svg>`;
}

// Mobile account menu toggle (the identity card stays visible; the link list collapses).
window.toggleAcctMenu = function(btn) {
  const sb = document.querySelector('.acct-sidebar');
  if (!sb) return;
  const open = sb.classList.toggle('menu-open');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
};

function _accountSidebar(active) {
  const c = App.customer || {};
  const name = c.name || '';
  const email = c.email || '';
  const fallbackName = App.lang === 'lo' ? 'ລູກຄ້າ' : 'Customer';
  const initial = esc((name.trim() || email.trim() || '?').charAt(0).toUpperCase());
  const tier = (App.loyaltyTier && App.loyaltyTier.name) || (c.tier && c.tier.name) || '';
  const groups = [
    { key: 'overview', section: t('sideOverview'), children: [
      { key: 'dashboard', ic: 'dashboard', label: t('dashboard'), route: '#/dashboard' },
      { key: 'orderHistory', ic: 'orders', label: t('accountOrders'), route: '#/orders' },
      { key: 'quoteHistory', ic: 'quotes', label: t('accountQuotes'), route: '#/quotations' },
    ]},
    // Account Settings deliberately lives in the Dashboard quick actions, not the sidebar.
    { key: 'myAccount', section: t('sideMyAccount'), children: [
      { key: 'profile', ic: 'profile', label: t('myProfile'), route: '#/account/profile' },
      { key: 'addressBook', ic: 'address', label: t('addressBook'), route: '#/account/address-book' },
    ]},
    { key: 'rewards', section: t('sideRewards'), children: [
      { key: 'loyalty', ic: 'loyalty', label: t('loyaltyPageTitle'), route: '#/account/loyalty' },
      { key: 'wishlist', ic: 'saved', label: t('dashSavedItems'), route: '#/wishlist' },
    ]},
  ];
  // Pages reached from outside the sidebar (Account Settings) still label themselves correctly.
  const routeLabels = { account: { label: t('acctSettings'), ic: 'settings' } };
  let currentLabel = t('dashboard');
  let currentIcon = 'dashboard';
  for (const g of groups) for (const ch of g.children) if (ch.key === active) { currentLabel = ch.label; currentIcon = ch.ic; }
  if (routeLabels[active]) { currentLabel = routeLabels[active].label; currentIcon = routeLabels[active].ic; }

  let h = `<div class="acct-identity">`;
  h += `<span class="acct-avatar">${initial}</span>`;
  h += `<span class="acct-id-text">`;
  h += `<span class="acct-id-name">${esc(name || fallbackName)}</span>`;
  if (email) h += `<span class="acct-id-email">${esc(email)}</span>`;
  if (tier) h += `<span class="acct-id-tier">${acctIcon('loyalty')}${esc(tier)} ${esc(t('acctMember'))}</span>`;
  h += `</span></div>`;

  h += `<button type="button" class="acct-menu-toggle" aria-expanded="false" aria-controls="acct-side-nav" onclick="toggleAcctMenu(this)">`;
  h += `${acctIcon(currentIcon)}<span class="acct-toggle-text">${esc(currentLabel)}</span><span class="acct-toggle-caret" aria-hidden="true">▾</span>`;
  h += `</button>`;

  h += `<nav class="acct-side-nav" id="acct-side-nav">`;
  for (const g of groups) {
    h += `<div class="acct-side-section">`;
    h += `<div class="acct-side-heading">${esc(g.section)}</div>`;
    for (const child of g.children) {
      h += `<a class="acct-side-link ${active === child.key ? 'active' : ''}" href="${child.route}" title="${esc(child.label)}">${acctIcon(child.ic)}<span class="acct-side-label">${esc(child.label)}</span></a>`;
    }
    h += `</div>`;
  }
  h += `<div class="acct-side-foot">`;
  h += `<a class="acct-side-link acct-side-logout" href="#" title="${esc(t('logout'))}" onclick="event.preventDefault();doLogout()">${acctIcon('logout')}<span class="acct-side-label">${esc(t('logout'))}</span></a>`;
  h += `</div></nav>`;
  return h;
}

function _accountShell(active, content, crumbLabel) {
  return `
  <div class="breadcrumb"><a href="#/">${t('home')}</a> / ${esc(crumbLabel || t('account'))}</div>
  <div class="section"><div class="section-inner">
    <div class="acct-wrap">
      <aside class="acct-sidebar">${_accountSidebar(active)}</aside>
      <main class="acct-main">${content}</main>
    </div>
  </div></div>`;
}

async function renderAccount(el) {
  if (!App.token) { navigate('#/login'); return; }
  const meRes = await API.get('/auth/me');
  if (meRes.status !== 200) { navigate('#/login'); return; }
  App.customer = meRes.data;
  const c = App.customer;
  // Load addresses for overview
  let addresses = [];
  try {
    const addrRes = await API.get('/addresses');
    addresses = addrRes.data || [];
  } catch(e) {}
  const defaultAddr = addresses.find(a => a.is_default) || null;

  el.innerHTML = _accountShell('account', `
    <div class="acct-card">
      <div class="acct-card-header">
        <h3>${t('myAccount') || t('accountMy')}</h3>
      </div>
      <div class="acct-overview-grid">
        <div class="acct-overview-card">
          <h4>${t('myProfile')}</h4>
          <div class="acct-field"><span class="acct-label">${t('fullName')}</span><span class="acct-value">${esc(c.name || '—')}</span></div>
          <div class="acct-field"><span class="acct-label">${t('emailAddress')}</span><span class="acct-value">${esc(c.email || '—')}</span></div>
          <div class="acct-field"><span class="acct-label">${t('mobile')}</span><span class="acct-value">${esc(c.phone || '—')}</span></div>
          <div class="acct-field"><span class="acct-label">${t('company')}</span><span class="acct-value">${esc(c.company || '—')}</span></div>
          <div class="acct-field"><span class="acct-label">${t('account')}</span><span class="acct-value" style="font-size:12px;color:var(--steel)">${esc(c.email)}${c.createdAt ? ' \u2022 ' + new Date(c.createdAt).toLocaleDateString() : ''}</span></div>
          <div class="acct-actions" style="border-top:none;padding-top:8px">
            <a class="btn-sm" href="#/account/profile">${t('editProfile')} →</a>
          </div>
        </div>
        <div class="acct-overview-card">
          <h4>${t('addressBookTitle')}</h4>
          ${defaultAddr ? `
            <div style="padding:8px 0">
              <div style="font-size:13px;color:var(--steel);margin-bottom:4px">${t('defaultShipping')}</div>
              <div style="font-weight:600;font-size:14px">${esc(defaultAddr.recipient_name)}</div>
              <div style="font-size:13px;color:var(--steel)">${esc(defaultAddr.address_line1)}<br>${esc(defaultAddr.district)}, ${esc(defaultAddr.province)}${defaultAddr.postal_code ? ' ' + esc(defaultAddr.postal_code) : ''}</div>
            </div>
          ` : `<p style="color:var(--steel);font-size:13px">${t('noAddresses') || 'No addresses yet'}</p>`}
          <div class="acct-actions" style="border-top:none;padding-top:8px">
            <a class="btn-sm" href="#/account/address-book">${t('addressBook')} →</a>
          </div>
        </div>
      </div>
    </div>
    <div id="loyalty-section" class="acct-card" style="margin-top:16px">
      <div class="acct-card-header">
        <h3>⭐ ${t('loyalty')}</h3>
      </div>
      <div id="loyalty-content"><div style="text-align:center;padding:16px"><div class="spinner"></div></div></div>
    </div>
  `, t('account'));
  loadAccountLoyalty();
}

// PAGE: ACCOUNT — MY PROFILE
// ═══════════════════════════════════════════════
async function renderAccountProfile(el) {
  if (!App.token) { navigate('#/login'); return; }
  const meRes = await API.get('/auth/me');
  if (meRes.status !== 200) { navigate('#/login'); return; }
  App.customer = meRes.data;
  const c = App.customer;
  el.innerHTML = _accountShell('profile', `
    <div class="acct-card">
      <div class="acct-card-header">
        <h3>${t('myProfile')}</h3>
        <div style="display:flex;gap:8px">
          <button class="btn-sm" id="prof-edit-btn" onclick="toggleProfileEdit()">${t('editProfile')}</button>
          <button class="btn-sm" id="pw-toggle-btn" onclick="togglePwSection()">${t('changePassword')}</button>
        </div>
      </div>
      <div id="prof-view" class="prof-grid">
        <div class="acct-field"><span class="acct-label">${t('fullName')}</span><span class="acct-value">${esc(c.name || '—')}</span></div>
        <div class="acct-field"><span class="acct-label">${t('emailAddress')}</span><span class="acct-value">${esc(c.email || '—')}</span></div>
        <div class="acct-field"><span class="acct-label">${t('mobile')}</span><span class="acct-value">${esc(c.phone || '—')}</span></div>
        <div class="acct-field"><span class="acct-label">${t('company')}</span><span class="acct-value">${esc(c.company || '—')}</span></div>
      </div>
      <div id="prof-edit" style="display:none" class="prof-grid">
        <div class="acct-field"><label class="acct-label">${t('fullName')} *</label><input id="prof-name" class="acct-input" value="${esc(c.name || '')}"></div>
        <div class="acct-field"><label class="acct-label">${t('emailAddress')}</label><input class="acct-input" value="${esc(c.email || '')}" readonly style="background:#f9fafb;cursor:not-allowed"></div>
        <div class="acct-field"><label class="acct-label">${t('mobile')}</label><input id="prof-phone" class="acct-input" value="${esc(c.phone || '')}"></div>
        <div class="acct-field"><label class="acct-label">${t('company')}</label><input id="prof-company" class="acct-input" value="${esc(c.company || '')}"></div>
        <div class="acct-actions">
          <button class="btn-ghost" onclick="toggleProfileEdit()">${t('cancel')}</button>
          <button class="btn-primary" onclick="saveProfile()">${t('saveChanges')}</button>
        </div>
        <div id="prof-msg" class="acct-msg" style="display:none"></div>
      </div>
    </div>

    <div id="loyalty-section" class="acct-card" style="margin-top:16px">
      <div class="acct-card-header">
        <h3>⭐ ${t('loyalty')}</h3>
      </div>
      <div id="loyalty-content"><div style="text-align:center;padding:16px"><div class="spinner"></div></div></div>
    </div>
  `, t('myProfile'));
  loadAccountLoyalty();
}

window.toggleProfileEdit = function() {
  const view = document.getElementById('prof-view');
  const edit = document.getElementById('prof-edit');
  const btn = document.getElementById('prof-edit-btn');
  if (!view || !edit) return;
  const showing = edit.style.display !== 'none';
  view.style.display = showing ? '' : 'none';
  edit.style.display = showing ? 'none' : '';
  if (btn) btn.textContent = showing ? t('editProfile') : t('cancel');
};

window.togglePwSection = function() {
  let overlay = document.getElementById('pw-modal-overlay');
  if (overlay) { overlay.remove(); return; }
  overlay = document.createElement('div');
  overlay.id = 'pw-modal-overlay';
  overlay.className = 'acct-modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="acct-modal">
    <div class="acct-modal-header">
      <h3>🔒 ${t('changePassword')}</h3>
      <button class="acct-modal-close" onclick="document.getElementById('pw-modal-overlay').remove()">✕</button>
    </div>
    <div class="acct-modal-body">
      <div class="acct-field"><label class="acct-label">${t('currentPassword')}</label><input id="pw-old" class="acct-input" type="password" autocomplete="current-password"></div>
      <div class="acct-field"><label class="acct-label">${t('newPassword')}</label><input id="pw-new" class="acct-input" type="password" autocomplete="new-password"></div>
      <div class="acct-field"><label class="acct-label">${t('confirmPassword')}</label><input id="pw-confirm" class="acct-input" type="password" autocomplete="new-password"></div>
      <div id="pw-msg" class="acct-msg" style="display:none"></div>
    </div>
    <div class="acct-modal-footer">
      <button class="btn-ghost" onclick="document.getElementById('pw-modal-overlay').remove()">${t('cancel')}</button>
      <button class="btn-primary" onclick="changeMyPassword()">${t('changePassword')}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
};

window.saveProfile = async function() {
  const name = document.getElementById('prof-name').value.trim();
  if (!name) { _profMsg(t('requiredField'), true); return; }
  const body = {
    name: name,
    phone: document.getElementById('prof-phone').value.trim() || null,
    company: document.getElementById('prof-company').value.trim() || null,
  };
  try {
    const res = await API.put('/auth/me', body);
    if (res.status === 200) {
      App.customer = Object.assign(App.customer, res.data);
      _profMsg(t('profileUpdated'), false);
      toggleProfileEdit();
    } else {
      _profMsg((res.data && res.data.error) || t('networkError'), true);
    }
  } catch(e) { _profMsg(t('networkError'), true); }
};

function _profMsg(msg, isError) {
  const el = document.getElementById('prof-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = '';
  el.className = 'acct-msg ' + (isError ? 'acct-msg-err' : 'acct-msg-ok');
  if (!isError) setTimeout(() => { el.style.display = 'none'; }, 3000);
}

window.changeMyPassword = async function() {
  const oldPw = document.getElementById('pw-old').value;
  const newPw = document.getElementById('pw-new').value;
  const confirmPw = document.getElementById('pw-confirm').value;
  const el = document.getElementById('pw-msg');
  if (!oldPw || !newPw) { _pwMsg(t('requiredField'), true); return; }
  if (newPw !== confirmPw) { _pwMsg(t('passwordMismatch'), true); return; }
  try {
    const res = await API.put('/auth/change-password', { currentPassword: oldPw, newPassword: newPw });
    if (res.status === 200) {
      _pwMsg(t('passwordChanged'), false);
      document.getElementById('pw-old').value = '';
      document.getElementById('pw-new').value = '';
      document.getElementById('pw-confirm').value = '';
      setTimeout(() => { const ov = document.getElementById('pw-modal-overlay'); if (ov) ov.remove(); }, 1500);
    } else {
      _pwMsg((res.data && res.data.error) || t('networkError'), true);
    }
  } catch(e) { _pwMsg(t('networkError'), true); }
};

function _pwMsg(msg, isError) {
  const el = document.getElementById('pw-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = '';
  el.className = 'acct-msg ' + (isError ? 'acct-msg-err' : 'acct-msg-ok');
  if (!isError) setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// PAGE: ACCOUNT — ADDRESS BOOK
// ═══════════════════════════════════════════════
async function renderAccountAddressBook(el) {
  if (!App.token) { navigate('#/login'); return; }
  const meRes = await API.get('/auth/me');
  if (meRes.status !== 200) { navigate('#/login'); return; }
  App.customer = meRes.data;
  el.innerHTML = _accountShell('addressBook', `
    <div class="acct-card">
      <div class="acct-card-header">
        <h3>${t('addressBookTitle')}</h3>
        <button class="btn-primary" onclick="showAddressForm()">+ ${t('addNewAddress')}</button>
      </div>
      <div id="addresses-content"><div style="text-align:center;padding:24px"><div class="spinner"></div></div></div>
    </div>
    <div id="address-form-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center">
      <div style="background:#fff;border-radius:12px;padding:28px;max-width:520px;width:92%;max-height:90vh;overflow-y:auto">
        <h3 id="address-form-title" style="margin-bottom:16px">${t('addNewAddress')}</h3>
        <input type="hidden" id="addr-id" value="">
        <div class="acct-field"><label class="acct-label">${t('label')}</label><input id="addr-label" class="acct-input" placeholder="${t('office')}/${t('warehouse')}"></div>
        <div class="acct-field"><label class="acct-label">${t('recipientName')} *</label><input id="addr-recipient" class="acct-input" required></div>
        <div class="acct-field"><label class="acct-label">${t('phone')} *</label><input id="addr-phone" class="acct-input" type="tel" required></div>
        <div class="acct-field"><label class="acct-label">${t('addressLine1')} *</label><input id="addr-line1" class="acct-input" required></div>
        <div class="acct-field"><label class="acct-label">${t('addressLine2')}</label><input id="addr-line2" class="acct-input"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="acct-field"><label class="acct-label">${t('province')} *</label><input id="addr-province" class="acct-input" required></div>
          <div class="acct-field"><label class="acct-label">${t('district')} *</label><input id="addr-district" class="acct-input" required></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="acct-field"><label class="acct-label">${t('village')}</label><input id="addr-village" class="acct-input"></div>
          <div class="acct-field"><label class="acct-label">${t('postalCode')}</label><input id="addr-postal" class="acct-input"></div>
        </div>
        <div style="margin:14px 0"><label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="addr-default"> ${t('setDefault')}</label></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn-ghost" onclick="hideAddressForm()">${t('cancel')}</button>
          <button class="btn-primary" onclick="saveAddress()">${t('saveChanges')}</button>
        </div>
      </div>
    </div>
  `, t('addressBook'));
  loadAddresses();
}

async function loadAccountLoyalty() {
  const el = document.getElementById('loyalty-content');
  if (!el) return;
  try {
    const res = await API.get('/loyalty/summary');
    if (res.status !== 200) { el.innerHTML = '<p style="color:var(--steel)">' + t('loyaltyNotAvailable') + '</p>'; return; }
    const d = res.data;
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:var(--primary)">${d.pointsBalance.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--steel)">${t('availablePoints')}</div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:var(--accent)">${d.currentTier ? d.currentTier.name : t('miscBronze')}</div>
          <div style="font-size:12px;color:var(--steel)">${t('currentTier')}</div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:24px;font-weight:700">${d.lifetimePoints.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--steel)">${t('lifetimePoints')}</div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center">
          <div style="font-size:24px;font-weight:700">${d.totalRedeemed.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--steel)">${t('redeemed')}</div>
        </div>
      </div>
      ${d.nextTier ? `<div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:var(--steel)">${t('nextTier')}: ${d.nextTier.name}</span><span style="font-size:13px;font-weight:600">${d.nextTier.pointsNeeded.toLocaleString()} pts ${t('needed')}</span></div>
        <div style="background:var(--border);height:8px;border-radius:4px"><div style="background:var(--primary);height:100%;width:${Math.min(100, (d.lifetimePoints / d.nextTier.minPoints) * 100)}%;border-radius:4px"></div></div>
      </div>` : ''}
      ${d.currentTier && d.currentTier.discount > 0 ? `<p style="font-size:13px;color:var(--green);margin-bottom:12px">🎉 ${t('tierDiscount')}: ${d.currentTier.discount}%</p>` : ''}
      <h4 style="margin-bottom:8px">${t('pointsHistory')}</h4>
      ${d.ledger.length ? `<div style="max-height:300px;overflow-y:auto"><table style="width:100%;font-size:13px;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:6px">${t('date')}</th><th style="text-align:left;padding:6px">${t('type')}</th><th style="text-align:right;padding:6px">${t('points')}</th><th style="text-align:right;padding:6px">${t('balance')}</th></tr></thead>
        <tbody>${d.ledger.map(e => `<tr style="border-bottom:1px solid var(--bg)"><td style="padding:6px;font-size:12px">${dateFmt(e.createdAt)}</td><td style="padding:6px"><span class="badge badge-${e.type === 'earned' ? 'active' : e.type === 'redeemed' ? 'review' : 'pending'}" style="font-size:11px">${t(e.type)}</span></td><td style="padding:6px;text-align:right;color:${e.points > 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${e.points > 0 ? '+' : ''}${e.points}</td><td style="padding:6px;text-align:right">${e.balanceAfter.toLocaleString()}</td></tr>`).join('')}</tbody>
      </table></div>` : '<p style="color:var(--steel);font-size:13px">' + t('noPointsHistory') + '</p>'}
    `;
  } catch (e) { el.innerHTML = '<p style="color:var(--steel)">' + t('loyaltyNotAvailable') + '</p>'; }
}
// ═══════════════════════════════════════════════
// DELIVERY ADDRESS MANAGEMENT
// ═══════════════════════════════════════════════

async function loadAddresses() {
  const el = document.getElementById('addresses-content');
  if (!el) return;
  try {
    const res = await API.get('/addresses');
    const addresses = res.data || [];
    if (addresses.length === 0) {
      el.innerHTML = '<p style="color:var(--steel);font-size:13px">' + t('noAddresses') + '</p>';
      return;
    }
    el.innerHTML = addresses.map(a => '<div style="border:1px solid var(--border,#ddd);border-radius:6px;padding:12px;margin-bottom:8px;position:relative">' +
      (a.is_default ? '<span style="position:absolute;top:8px;right:8px;background:var(--primary,#0099FF);color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">' + t('isDefault') + '</span>' : '') +
      (a.label ? '<div style="font-weight:600;margin-bottom:4px">' + esc(a.label) + '</div>' : '') +
      '<div style="font-size:13px"><b>' + esc(a.recipient_name) + '</b> — ' + esc(a.phone) + '</div>' +
      '<div style="font-size:12px;color:var(--steel)">' + esc(a.address_line1) + (a.address_line2 ? ', ' + esc(a.address_line2) : '') + '<br>' +
      esc(a.district) + ', ' + esc(a.province) + (a.village ? ', ' + esc(a.village) : '') + (a.postal_code ? ' ' + esc(a.postal_code) : '') + '</div>' +
      '<div style="margin-top:8px;display:flex;gap:8px">' +
      (!a.is_default ? '<button class="btn-sm" onclick="setDefaultAddress(' + a.id + ')">' + t('setDefault') + '</button>' : '') +
      '<button class="btn-sm" onclick="editAddress(' + a.id + ')">' + t('editAddress') + '</button>' +
      '<button class="btn-sm" style="color:var(--red,#dc2626)" onclick="deleteAddress(' + a.id + ')">' + t('deleteAddress') + '</button>' +
      '</div></div>').join('');
  } catch(e) { el.innerHTML = '<p style="color:var(--steel)">' + t('networkError') + '</p>'; }
}

window.showAddressForm = function(addr) {
  const modal = document.getElementById('address-form-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('addr-id').value = addr ? addr.id : '';
  document.getElementById('addr-label').value = addr ? (addr.label || '') : '';
  document.getElementById('addr-recipient').value = addr ? addr.recipient_name : (App.customer ? App.customer.name : '');
  document.getElementById('addr-phone').value = addr ? addr.phone : (App.customer ? App.customer.phone || '' : '');
  document.getElementById('addr-line1').value = addr ? addr.address_line1 : '';
  document.getElementById('addr-line2').value = addr ? (addr.address_line2 || '') : '';
  document.getElementById('addr-province').value = addr ? addr.province : '';
  document.getElementById('addr-district').value = addr ? addr.district : '';
  document.getElementById('addr-village').value = addr ? (addr.village || '') : '';
  document.getElementById('addr-postal').value = addr ? (addr.postal_code || '') : '';
  document.getElementById('addr-default').checked = addr ? addr.is_default : false;
  document.getElementById('address-form-title').textContent = addr ? t('editAddress') : t('addAddress');
};

window.hideAddressForm = function() {
  const modal = document.getElementById('address-form-modal');
  if (modal) modal.style.display = 'none';
};

window.editAddress = async function(id) {
  try {
    const res = await API.get('/addresses');
    const addr = (res.data || []).find(a => a.id === id);
    if (addr) showAddressForm(addr);
  } catch(e) { showToast(t('networkError'), true); }
};

window.saveAddress = async function() {
  const id = document.getElementById('addr-id').value;
  const body = {
    label: document.getElementById('addr-label').value || null,
    recipient_name: document.getElementById('addr-recipient').value,
    phone: document.getElementById('addr-phone').value,
    address_line1: document.getElementById('addr-line1').value,
    address_line2: document.getElementById('addr-line2').value || null,
    province: document.getElementById('addr-province').value,
    district: document.getElementById('addr-district').value,
    village: document.getElementById('addr-village').value || null,
    postal_code: document.getElementById('addr-postal').value || null,
    is_default: document.getElementById('addr-default').checked
  };
  if (!body.recipient_name || !body.phone || !body.address_line1 || !body.province || !body.district) {
    showToast(t('requiredField'), true); return;
  }
  try {
    if (id) { await API.put('/addresses/' + id, body); }
    else { await API.post('/addresses', body); }
    hideAddressForm();
    loadAddresses();
    showToast(t('addressSaved'));
  } catch(e) { showToast(t('networkError'), true); }
};

window.deleteAddress = async function(id) {
  if (!confirm(t('confirmDelete'))) return;
  try {
    await API.del('/addresses/' + id);
    loadAddresses();
    showToast(t('addressDeleted'));
  } catch(e) { showToast(t('networkError'), true); }
};

window.setDefaultAddress = async function(id) {
  try {
    await API.put('/addresses/' + id + '/default', {});
    loadAddresses();
  } catch(e) { showToast(t('networkError'), true); }
};

window.updateProfile = async function() {
  const name = $('#acct-name')?.value;
  const phone = $('#acct-phone')?.value;
  const company = $('#acct-company')?.value;
  const res = await API.put('/auth/me', { name, phone, company });
  if (res.status === 200) {
    App.customer = { ...App.customer, ...res.data };
    const msg = $('#acct-msg');
    if (msg) { msg.style.display = ''; setTimeout(() => msg.style.display = 'none', 2000); }
  }
};

window.doLogout = function() {
  App.token = null;
  App.customer = null;
  App.cartCount = 0;
  localStorage.removeItem('nblao_token');
  updateHeaderAuth();
  navigate('#/');
};

// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// CONFIRMATION MODAL HELPER
// ═══════════════════════════════════════════════
function _showConfirmModal(title, message, confirmLabel, onConfirm) {
  var existing = document.getElementById('acct-confirm-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'acct-confirm-modal';
  overlay.className = 'acct-modal-overlay';
  overlay.innerHTML = `<div class="acct-modal" style="max-width:400px">
    <div class="acct-modal-header"><h3>${esc(title)}</h3><button class="acct-modal-close" onclick="this.closest('.acct-modal-overlay').remove()">✕</button></div>
    <div class="acct-modal-body"><p style="margin:0;color:var(--steel,#52677D);font-size:14px">${esc(message)}</p></div>
    <div class="acct-modal-footer" style="padding:16px 24px;border-top:1px solid var(--border,#D9E2EC);display:flex;gap:10px;justify-content:flex-end">
      <button class="acct-btn-secondary" onclick="this.closest('.acct-modal-overlay').remove()">${t('cancel')}</button>
      <button class="acct-btn-danger" id="acct-confirm-btn">${esc(confirmLabel)}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  overlay.addEventListener('keydown', function(e) { if (e.key === 'Escape') overlay.remove(); });
  document.getElementById('acct-confirm-btn').addEventListener('click', function() {
    overlay.remove();
    onConfirm();
  });
}

// ═══════════════════════════════════════════════
// ORDER CANCEL
// ═══════════════════════════════════════════════
window.cancelOrder = function(orderId, orderNumber) {
  _showConfirmModal(t('cancelOrder'), t('cancelOrderConfirm'), t('confirmYesLabel'), async function() {
    try {
      var res = await API.patch('/orders/' + orderId + '/cancel');
      if (res.status === 200) {
        showToast(t('orderCancelled'));
        var main = document.getElementById('main') || document.querySelector('main');
        if (main) await renderOrders(main);
      } else {
        showToast(res.data && res.data.error ? res.data.error : 'Error', true);
      }
    } catch(e) { showToast('Error', 'error'); }
  });
};

// ═══════════════════════════════════════════════
// QUOTATION CANCEL
// ═══════════════════════════════════════════════
window.cancelQuotation = function(quoteId, quoteNumber) {
  _showConfirmModal(t('cancelQuotation'), t('cancelQuotationConfirm'), t('confirmYesLabel'), async function() {
    try {
      var res = await API.patch('/quotations/' + quoteId + '/cancel');
      if (res.status === 200) {
        showToast(t('quoteCancelled'));
        var main = document.getElementById('main') || document.querySelector('main');
        if (main) await renderQuotations(main);
      } else {
        showToast(res.data && res.data.error ? res.data.error : 'Error', true);
      }      } catch(e) { showToast('Error', true); }
  });
};

// ═══════════════════════════════════════════════
// QUOTATION DELETE
// ═══════════════════════════════════════════════
window.deleteQuotation = function(quoteId, quoteNumber) {
  _showConfirmModal(t('deleteQuotation'), t('deleteQuotationConfirm'), t('deleteQuotation'), async function() {
    try {
      var res = await API.del('/quotations/' + quoteId);
      if (res.status === 200) {
        showToast(t('quoteDeleted'));
        var main = document.getElementById('main') || document.querySelector('main');
        if (main) await renderQuotations(main);
      } else {
        showToast(res.data && res.data.error ? res.data.error : 'Error', true);
      }
    } catch(e) { showToast('Error', 'error'); }
  });
};

// ═══════════════════════════════════════════════
// PAGE: ORDERS
// ═══════════════════════════════════════════════

function orderStatusBadge(status) {
  var colors = {pending:"#F59E0B",confirmed:"#3B82F6",processing:"#8B5CF6",shipped:"#06B6D4",delivered:"#10B981",cancelled:"#EF4444",paid:"#10B981",refunded:"#F59E0B",rejected:"#EF4444",approved:"#10B981",quoted:"#3B82F6",draft:"#9CA3AF"};
  var labelMap = {pending:"orderStatusPending",confirmed:"orderStatusConfirmed",processing:"orderStatusProcessing",shipped:"orderStatusShipped",delivered:"orderStatusDelivered",cancelled:"orderStatusCancelled",paid:"orderStatusPaid",refunded:"orderStatusRefunded",rejected:"orderStatusRejected",approved:"orderStatusApproved",quoted:"orderStatusQuoted",draft:"orderStatusDraft"};
  var color = colors[status] || "#6B7280";
  var labelKey = labelMap[status];
  var label = labelKey ? t(labelKey) : status;
  return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:#fff;background:' + color + '">'+label+'</span>';
}
// ═══════════════════════════════════════════════
// SHARED HISTORY FILTER BAR (Order History / Quote History)
// ═══════════════════════════════════════════════
// Filters live in the URL so pagination, refreshes and back/forward all keep them.
const HIST_LIMIT = 10;

function _histState() {
  const f = _dashFilters();
  // History pages keep their own per-scope status/search keys in the URL (the
  // Dashboard only carries the unified q + shared range).
  f.status = getParam('status') || '';
  f.qstatus = getParam('qstatus') || '';
  f.qq = getParam('qq') || '';
  f.page = Math.max(1, parseInt(getParam('page') || '1', 10) || 1);
  return f;
}
function _histHash(basePath, f) {
  const s = new URLSearchParams();
  if (f.status) s.set('status', f.status);
  if (f.q) s.set('q', f.q);
  if (f.qstatus) s.set('qstatus', f.qstatus);
  if (f.qq) s.set('qq', f.qq);
  if (f.range) s.set('range', f.range);
  if (f.range === 'custom') {
    if (f.from) s.set('from', f.from);
    if (f.to) s.set('to', f.to);
  }
  if (f.page && f.page > 1) s.set('page', String(f.page));
  const qs = s.toString();
  return basePath + (qs ? '?' + qs : '');
}
function _histScope() {
  const bar = document.querySelector('.hist-bar');
  return bar && bar.getAttribute('data-scope') === 'quotes' ? 'quotes' : 'orders';
}
function _histBase() { return _histScope() === 'quotes' ? '#/quotations' : '#/orders'; }
function _histShowErr(msg) {
  const el = document.querySelector('[data-hist-err]');
  if (el) { el.hidden = !msg; if (msg) el.textContent = msg; }
  const btn = document.querySelector('[data-hist-apply]');
  if (btn) btn.classList.toggle('is-invalid', !!msg);
}
window.histRangeChange = function(value) {
  const dates = document.getElementById('hist-dates');
  if (dates) dates.hidden = (value !== 'custom');
  if (value !== 'custom') {
    const fr = document.getElementById('hist-from'); if (fr) fr.value = '';
    const to = document.getElementById('hist-to'); if (to) to.value = '';
  }
  _histShowErr('');
};
window.histApply = function() {
  const val = id => { const el = document.getElementById(id); return el ? (el.value || '') : ''; };
  const cur = _histState();
  const isQuote = _histScope() === 'quotes';
  const f = {
    status: isQuote ? '' : val('hist-status'),
    q: isQuote ? '' : val('hist-q').trim(),
    qstatus: isQuote ? val('hist-status') : '',
    qq: isQuote ? val('hist-q').trim() : '',
    range: val('hist-range'),
    from: val('hist-from'),
    to: val('hist-to'),
    page: 1,                                   // a new filter always returns to page 1
  };
  if (f.range !== 'custom') { f.from = ''; f.to = ''; }
  const err = _dashRangeError(f);
  if (err) { _histShowErr(err); return; }
  _histShowErr('');
  navigate(_histHash(_histBase(), f));
};
window.histReset = function() { navigate(_histBase()); };
window.histGoPage = function(p) {
  const cur = _histState();
  cur.page = Math.max(1, parseInt(p, 10) || 1);
  navigate(_histHash(_histBase(), cur));
};

function _histFilterBar(isQuote, f) {
  const statuses = isQuote ? DASH_QUOTE_STATUSES : DASH_ORDER_STATUSES;
  const i18n = isQuote ? QUOTE_STATUS_I18N : ORDER_STATUS_I18N;
  const cur = isQuote ? f.qstatus : f.status;
  const ranges = [['', 'dashAllTime'], ['7', 'dashLast7'], ['30', 'dashLast30'], ['90', 'dashLast90'], ['year', 'dashThisYear'], ['custom', 'dashCustomRange']];
  const err = _dashRangeError(f);
  const searchPh = isQuote ? t('dashSearchQuote') : t('dashSearchOrder');
  return `<div class="hist-bar" data-scope="${isQuote ? 'quotes' : 'orders'}">
    <div class="hist-row">
      <label class="hist-f"><span>${esc(isQuote ? t('dashQuoteStatus') : t('dashOrderStatus'))}</span>
        <select id="hist-status">
          <option value="">${esc(t('dashAllStatus'))}</option>
          ${statuses.map(s => `<option value="${esc(s)}"${cur === s ? ' selected' : ''}>${esc(t(i18n[s]))}</option>`).join('')}
        </select>
      </label>
      <label class="hist-f"><span>${esc(t('dashDateRange'))}</span>
        <select id="hist-range" onchange="histRangeChange(this.value)">
          ${ranges.map(([v, k]) => `<option value="${esc(v)}"${f.range === v ? ' selected' : ''}>${esc(t(k))}</option>`).join('')}
        </select>
      </label>
      <div class="hist-dates" id="hist-dates" ${f.range === 'custom' ? '' : 'hidden'}>
        <label class="hist-f"><span>${esc(t('dashStartDate'))}</span><input type="date" id="hist-from" value="${esc(f.from)}" onchange="_histShowErr('')"></label>
        <label class="hist-f"><span>${esc(t('dashEndDate'))}</span><input type="date" id="hist-to" value="${esc(f.to)}" onchange="_histShowErr('')"></label>
      </div>
      <div class="hist-search">
        <input id="hist-q" type="search" value="${esc(isQuote ? f.qq : f.q)}" placeholder="${esc(searchPh)}" aria-label="${esc(searchPh)}"
               onkeydown="if(event.key==='Enter'){event.preventDefault();histApply()}">
        <button type="button" class="dash-search-btn" onclick="histApply()" aria-label="${esc(t('dashSearchLabel'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
        </button>
      </div>
      <button type="button" class="dash-apply-btn${err ? ' is-invalid' : ''}" data-hist-apply onclick="histApply()">${esc(t('dashApplyFilters'))}</button>
      <button type="button" class="dash-reset-btn" onclick="histReset()">${esc(t('dashReset'))}</button>
    </div>
    <p class="dash-range-err" data-hist-err ${err ? '' : 'hidden'}>${esc(err)}</p>
  </div>`;
}

function _histPager(f, total) {
  const pages = Math.max(1, Math.ceil((total || 0) / HIST_LIMIT));
  if (pages <= 1) return '';
  return `<div class="hist-pager">
    <button type="button" class="hist-pg" ${f.page <= 1 ? 'disabled' : ''} onclick="histGoPage(${f.page - 1})">‹ ${esc(t('dashPrev'))}</button>
    <span class="hist-pg-info">${esc(t('dashPage'))} ${f.page} / ${pages} · ${(total || 0).toLocaleString()}</span>
    <button type="button" class="hist-pg" ${f.page >= pages ? 'disabled' : ''} onclick="histGoPage(${f.page + 1})">${esc(t('dashNext'))} ›</button>
  </div>`;
}

async function renderOrders(el) {
  if (!App.token) { navigate('#/login'); return; }
  const f = _histState();
  const qs = new URLSearchParams();
  qs.set('page', String(f.page));
  qs.set('limit', String(HIST_LIMIT));
  if (f.status) qs.set('status', f.status);
  if (f.q) qs.set('q', f.q);
  const rb = _dashRangeBounds(f);
  if (rb.from) qs.set('from', rb.from);
  if (rb.to) qs.set('to', rb.to);
  const res = await API.get('/orders?' + qs.toString());
  const data = (res.status === 200 && res.data) ? res.data : {};
  const orders = data.orders || (Array.isArray(data) ? data : []);
  const total = typeof data.total === 'number' ? data.total : orders.length;
  const hasFilters = !!(f.status || f.q || f.range);

  el.innerHTML = _accountShell('orderHistory', `
    <div class="acct-card">
      <div class="acct-card-header"><h3>${t('accountOrders')}</h3>${total ? `<span class="hist-total">${total.toLocaleString()}</span>` : ''}</div>
      ${_histFilterBar(false, f)}
      ${orders.length ? `<div class="order-list">
        ${orders.map(o => `
        <div class="order-card" style="cursor:pointer" onclick="navigate('#/order/${o.id}')">
          <div class="order-card-head"><span class="order-num">${esc(o.order_number)}</span><span class="badge badge-${statusColor(o.status)}">${t(o.status)||o.status}</span>${o.status === 'pending' ? '<button class="acct-btn-cancel" onclick="event.stopPropagation();cancelOrder('+o.id+',\''+esc(o.order_number)+'\')">' + t('cancelOrder') + '</button>' : ''}</div>
          <div class="order-card-date">${dateFmt(o.createdAt)} ${o.status ? orderStatusBadge(o.status) : ''}${o.total != null ? ' — ' + priceFmt(o.total) : ''}${o.discount_applied > 0 ? ' <span style="color:var(--green,#059669)">(-' + priceFmt(o.discount_applied) + ')</span>' : ''}</div>
        </div>`).join('')}
      </div>` : `<div class="empty-state"><h3>${hasFilters ? t('dashNoMatch') : (t('noOrders') || t('noResults'))}</h3>${
        hasFilters ? `<button type="button" class="btn-sm" onclick="histReset()">${t('dashReset')}</button>`
                   : `<a href="#/products">${t('continueShopping')}</a>`}</div>`}
      ${_histPager(f, total)}
    </div>
  `, t('accountOrders'));
}

// ═══════════════════════════════════════════════
// PAGE: ORDER DETAIL
// ═══════════════════════════════════════════════
async function renderOrderDetail(el) {
  if (!App.token) { navigate('#/login'); return; }
  const id = location.hash.split('/order/')[1]?.split('?')[0];
  const res = await API.get('/orders/' + id);
  if (res.status !== 200) { el.innerHTML = '<div class="empty-state"><h3>' + t('noResults') + '</h3></div>'; return; }
  const o = res.data;
  const subtotal = o.subtotal || 0;
  const discount = o.discount_applied || 0;
  const total = o.total != null ? o.total : subtotal - discount;

  el.innerHTML = `
  <div class="breadcrumb"><a href="#/">${t('home')}</a> / <a href="#/orders">${t('orders')}</a> / ${esc(o.order_number)}</div>
  <div class="section"><div class="section-inner">
    <div class="detail-header"><h2>${esc(o.order_number)}</h2><span class="badge badge-${statusColor(o.status)}">${t(o.status)||o.status}</span></div>
    <p class="detail-date">${dateFmt(o.createdAt)}</p>
    <div class="order-items">
      ${(o.items||[]).map(i => `<div class="cart-item"><div class="cart-item-info"><div class="cart-item-name">${esc(i.product_name)}</div><div class="cart-item-sku">×${i.quantity} @ ${i.unit_price ? priceFmt(i.unit_price) : '—'}</div></div><div class="cart-item-subtotal">${i.line_total ? priceFmt(i.line_total) : (i.unit_price ? priceFmt(i.unit_price * i.quantity) : '—')}</div></div>`).join('')}
    </div>
    <div class="cart-total-row"><b>${t('subtotal')}</b><b>${priceFmt(subtotal)}</b></div>
    ${discount > 0 ? `<div class="cart-total-row" style="color:var(--green,#059669)"><b>${t('discount')} ${o.coupon_code ? '(' + esc(o.coupon_code) + ')' : ''}</b><b>-${priceFmt(discount)}</b></div>` : ''}
    ${o.points_redeemed > 0 ? `<div class="cart-total-row" style="color:#2563EB"><b>⭐ ${t('redeemed')}</b><b>-${o.points_redeemed} pts</b></div>` : ''}
    <div class="cart-total-row" style="font-size:18px;border-top:2px solid var(--border,#ddd);padding-top:12px"><b>${t('total')}</b><b>${priceFmt(total)}</b></div>
    ${o.points_earned > 0 ? `<div style="margin-top:8px;color:var(--steel);font-size:13px">⭐ +${o.points_earned} pts ${t('pointsEarnOnThisOrder')}</div>` : ''}
    <div id="order-timeline" style="margin-top:24px"><div class="loading"><div class="spinner"></div></div></div>
    <a href="#/orders" class="link" style="display:inline-block;margin-top:16px">${t('back')}</a>
  </div></div>`;
  loadOrderTimeline(id);
}

async function loadOrderTimeline(orderId) {
  const el = document.getElementById('order-timeline');
  if (!el) return;
  try {
    const res = await API.get('/orders/' + orderId + '/history');
    const history = Array.isArray(res.data) ? res.data : [];
    if (history.length === 0) { el.innerHTML = ''; return; }
    let html = '<h4 style="margin-bottom:12px">📋 ' + t('statusTimeline') + '</h4>';
    html += '<div style="position:relative;padding-left:20px;border-left:2px solid var(--border,#ddd)">';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      html += '<div style="margin-bottom:16px;position:relative">';
      html += '<div style="position:absolute;left:-25px;top:2px;width:10px;height:10px;border-radius:50%;background:var(--accent,#D4AF37);border:2px solid #fff"></div>';
      html += '<div style="font-size:13px;font-weight:600">' + esc(t(h.from_status) || h.from_status) + ' → ' + esc(t(h.to_status) || h.to_status) + '</div>';
      if (h.notes) html += '<div style="font-size:12px;color:var(--steel)">' + esc(h.notes) + '</div>';
      if (h.staff_name) html += '<div style="font-size:11px;color:#999">' + t('byStaff') + ' ' + esc(h.staff_name) + (h.position_name ? ' (' + esc(h.position_name) + ')' : '') + '</div>';
      html += '<div style="font-size:11px;color:#999">' + dateFmt(h.createdAt) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  } catch (e) { el.innerHTML = ''; }
}

// ═══════════════════════════════════════════════
// PAGE: QUOTATIONS
// ═══════════════════════════════════════════════
async function renderQuotations(el) {
  if (!App.token) { navigate('#/login'); return; }
  const f = _histState();
  const res = await API.get(_dashQuotesQuery(f, HIST_LIMIT) + `&page=${f.page}`);
  const data = (res.status === 200 && res.data) ? res.data : {};
  const quotes = Array.isArray(data.quotations) ? data.quotations : (Array.isArray(data) ? data : []);
  const total = typeof data.total === 'number' ? data.total : quotes.length;
  const hasFilters = !!(f.qstatus || f.qq || f.range);

  el.innerHTML = _accountShell('quoteHistory', `
    <div class="acct-card">
      <div class="acct-card-header"><h3>${t('accountQuotes')}</h3>${total ? `<span class="hist-total">${total.toLocaleString()}</span>` : ''}</div>
      ${_histFilterBar(true, f)}
      ${quotes.length ? `<div class="order-list">
        ${quotes.map(q => `
        <div class="order-card" style="cursor:pointer" onclick="navigate('#/quotation/${q.id}')">
          <div class="order-card-head"><span class="order-num">${esc(q.quotation_number)}</span><span class="badge badge-${statusColor(q.status)}">${t(QUOTE_STATUS_I18N[q.status])||t(q.status)||q.status}</span>${q.status === 'pending' ? '<button class="acct-btn-cancel" onclick="event.stopPropagation();cancelQuotation('+q.id+',\''+esc(q.quotation_number)+'\')">' + t('cancelQuotation') + '</button><button class="acct-btn-delete" onclick="event.stopPropagation();deleteQuotation('+q.id+',\''+esc(q.quotation_number)+'\')">' + t('deleteQuotation') + '</button>' : ''}</div>
          <div class="order-card-date">${dateFmt(q.createdAt)} ${q.status ? orderStatusBadge(q.status) : ''}${q.quoted_amount ? ' — ' + priceFmt(q.quoted_amount) : ''}</div>
        </div>`).join('')}
      </div>` : `<div class="empty-state"><h3>${hasFilters ? t('dashNoQuotesMatch') : (t('noQuotations') || t('noResults'))}</h3>${
        hasFilters ? `<button type="button" class="btn-sm" onclick="histReset()">${t('dashReset')}</button>`
                   : `<a href="#/products">${t('continueShopping')}</a>`}</div>`}
      ${_histPager(f, total)}
    </div>
  `, t('accountQuotes'));
}

// ═══════════════════════════════════════════════
// PAGE: QUOTATION DETAIL
// ═══════════════════════════════════════════════
async function renderQuotationDetail(el) {
  if (!App.token) { navigate('#/login'); return; }
  const id = location.hash.split('/quotation/')[1]?.split('?')[0];
  const res = await API.get('/quotations/' + id);
  if (res.status !== 200) { el.innerHTML = '<div class="empty-state"><h3>' + t('noResults') + '</h3></div>'; return; }
  const q = res.data;
  const total = (q.items || []).reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);

  el.innerHTML = `
  <div class="breadcrumb"><a href="#/">${t('home')}</a> / <a href="#/quotations">${t('quotations')}</a> / ${esc(q.quotation_number)}</div>
  <div class="section"><div class="section-inner">
    <div class="detail-header"><h2>${esc(q.quotation_number)}</h2><span class="badge badge-${statusColor(q.status)}">${t(q.status)||q.status}</span></div>
    <p class="detail-date">${dateFmt(q.createdAt)}</p>
    <div class="order-items">
      ${(q.items||[]).map(i => `<div class="cart-item"><div class="cart-item-info"><div class="cart-item-name">${esc(i.product_name)}</div><div class="cart-item-sku">×${i.quantity}</div></div><div class="cart-item-subtotal">${i.unit_price ? priceFmt(i.unit_price * i.quantity) : '—'}</div></div>`).join('')}
    </div>
    ${total > 0 ? `<div class="cart-total-row"><b>${t('subtotal')}</b><b>${priceFmt(total)}</b></div>` : ''}
    ${q.quoted_amount ? `<div class="cart-total-row" style="font-size:18px;border-top:2px solid var(--border,#ddd);padding-top:12px;color:var(--primary,#0099FF)"><b>${t('quotedPrice') || 'Quoted Price'}</b><b>${priceFmt(q.quoted_amount)}</b></div>` : ''}
    <div id="quotation-timeline" style="margin-top:24px"><div class="loading"><div class="spinner"></div></div></div>
    <a href="#/quotations" class="link">${t('back')}</a>
  </div></div>`;
  loadQuotationTimeline(id);
}

async function loadQuotationTimeline(quotationId) {
  const el = document.getElementById('quotation-timeline');
  if (!el) return;
  try {
    const res = await API.get('/quotations/' + quotationId + '/history');
    const history = Array.isArray(res.data) ? res.data : [];
    if (history.length === 0) { el.innerHTML = ''; return; }
    let html = '<h4 style="margin-bottom:12px">📋 ' + t('statusTimeline') + '</h4>';
    html += '<div style="position:relative;padding-left:20px;border-left:2px solid var(--border,#ddd)">';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      html += '<div style="margin-bottom:16px;position:relative">';
      html += '<div style="position:absolute;left:-25px;top:2px;width:10px;height:10px;border-radius:50%;background:var(--accent,#D4AF37);border:2px solid #fff"></div>';
      html += '<div style="font-size:13px;font-weight:600">' + esc(t(h.from_status) || h.from_status) + ' → ' + esc(t(h.to_status) || h.to_status) + '</div>';
      if (h.notes) html += '<div style="font-size:12px;color:var(--steel)">' + esc(h.notes) + '</div>';
      if (h.staff_name) html += '<div style="font-size:11px;color:#999">' + t('byStaff') + ' ' + esc(h.staff_name) + (h.position_name ? ' (' + esc(h.position_name) + ')' : '') + '</div>';
      html += '<div style="font-size:11px;color:#999">' + dateFmt(h.createdAt) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  } catch (e) { el.innerHTML = ''; }
}

// ═══════════════════════════════════════════════
// CART QUOTE SUBMISSION
// ═══════════════════════════════════════════════
let _quoteSubmitting = false;
window.submitQuote = async function() {
  if (!App.token) { navigate('#/login'); return; }
  if (_quoteSubmitting) return;
  _quoteSubmitting = true;
  const btn = document.querySelector('.btn-quote[onclick="submitQuote()"]');
  if (btn) { btn.disabled = true; btn.textContent = t('submitting'); btn.classList.add('btn-loading'); }
  const res = await API.post('/quotations', {});
  _quoteSubmitting = false;
  if (res.status === 201) {
    App.cartCount = 0;
    updateHeaderAuth();
    const main = $('#app-content');
    main.innerHTML = `
      <div class="success-page">
        <div style="font-size:48px;margin-bottom:16px">📄</div>
        <h2>${t('quoteRequested')}</h2>
        <div class="order-num">${esc(res.data.quotation_number || '')}</div>
        <p>${t('quoteNumber')}: ${esc(res.data.quotation_number || '')}</p>
        <a class="btn-primary" href="#/quotation/${res.data.id}" onclick="event.preventDefault();navigate('#/quotation/${res.data.id}')">${t('viewQuote')} →</a>
        <a href="#/products" onclick="event.preventDefault();navigate('#/products')" class="link" style="margin-left:16px">${t('continueShopping')}</a>
      </div>`;
  } else {
    showToast(res.data?.error || t('networkError'), true);
  }
};

// ═══════════════════════════════════════════════
// LOAD CART
// ═══════════════════════════════════════════════
async function loadCart() {
  if (!App.token) { App.cartCount = 0; return; }
  const res = await API.get('/cart');
  if (res.status === 200 && res.data) {
    App.cart = res.data;
    App.cartCount = res.data.items?.length || 0;
  }
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function showToast(msg, isError) {
  let toast = $('#toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; document.body.appendChild(toast); }
  toast.textContent = msg;
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3000);
}

// ═══════════════════════════════════════════════
// PROMO SLIDER (home page)
// ═══════════════════════════════════════════════
function initPromoSlider() {
  const track = $('#promoTrack');
  const dots = $('#promoDots');
  if (!track || !dots) return;
  const slides = track.children;
  let idx = 0;
  function render() {
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.innerHTML = [...slides].map((_, i) => `<span class="${i===idx?'on':''}" onclick="this.dataset.i=${i}"></span>`).join('');
  }
  render();
  setInterval(() => { idx = (idx + 1) % slides.length; render(); }, 4500);
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function loadProductReviews(slug) {
  var container = document.getElementById("reviews-container");
  if (!container) return;
  try {
    var res = await API.get("/products/" + slug + "/reviews");
    var data = res.data || {};
    var reviews = data.reviews || [];
    var avg = data.average_rating;
    var count = data.total_reviews || 0;
    var html = "<div style=\"margin-bottom:16px\">";
    if (avg !== null) {
      html += "<div style=\"font-size:24px;color:var(--accent,#D4AF37)\">" + "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg)) + "</div>";
      html += "<div style=\"color:var(--steel);font-size:13px\">" + avg.toFixed(1) + " " + t("basedOn") + " " + count + " " + t("reviews") + "</div>";
    }
    html += "</div>";
    html += "<div style=\"background:var(--bg,#f8f9fa);padding:16px;border-radius:8px;margin-bottom:16px\"><h4 style=\"margin:0 0 12px\">" + t("writeReview") + "</h4>";
    html += "<div style=\"margin-bottom:8px\"><label>" + t("yourRating") + ": </label>";
    for (var i = 1; i <= 5; i++) html += "<span class=\"star-rating\" onclick=\"submitReviewRating(" + i + ")\" style=\"cursor:pointer;font-size:20px;color:#ccc\" data-star=\"" + i + "\">★</span>";
    html += "</div>";
    html += "<input type=\"text\" id=\"review-title\" placeholder=\"" + t("reviewTitle") + "\" style=\"width:100%;padding:8px;border:1px solid var(--border,#ddd);border-radius:4px;margin-bottom:8px\" />";
    html += "<textarea id=\"review-comment\" placeholder=\"" + t("reviewPlaceholder") + "\" style=\"width:100%;padding:8px;border:1px solid var(--border,#ddd);border-radius:4px;min-height:80px;margin-bottom:8px\"></textarea>";
    html += "<button onclick=\"submitProductReview(\\\"" + slug + "\\\")\" class=\"btn-primary\" style=\"padding:8px 20px\">" + t("submitReview") + "</button></div>";
    if (reviews.length === 0) html += "<p style=\"color:var(--steel)\">" + t("noReviews") + "</p>";
    else { for (var j = 0; j < reviews.length; j++) { var rv = reviews[j];
      html += "<div style=\"border-bottom:1px solid var(--border,#eee);padding:12px 0\">";
      html += "<div style=\"font-size:16px;color:var(--accent,#D4AF37)\">" + "★".repeat(rv.rating) + "☆".repeat(5 - rv.rating) + "</div>";
      html += "<div style=\"font-weight:600\">" + esc(rv.title || "") + "</div>";
      html += "<div style=\"color:var(--steel);font-size:13px\">" + esc(rv.comment || "") + "</div>";
      html += "<div style=\"color:#999;font-size:12px\">" + esc(rv.customer_name || "") + " &middot; " + new Date(rv.created_at).toLocaleDateString() + "</div></div>";
    }}
    container.innerHTML = html;
  } catch (e) { container.innerHTML = "<p style=\"color:var(--steel)\">" + t("noReviews") + "</p>"; }
}
window.submitReviewRating = function(star) {
  window._reviewRating = star;
  document.querySelectorAll(".star-rating").forEach(function(el) {
    el.style.color = parseInt(el.dataset.star) <= star ? "var(--accent,#D4AF37)" : "#ccc";
  });
};
window.submitProductReview = async function(slug) {
  var rating = window._reviewRating;
  if (!rating || rating < 1 || rating > 5) { showToast(t("yourRating") + "!", true); return; }
  var title = (document.getElementById("review-title") || {}).value || "";
  var comment = (document.getElementById("review-comment") || {}).value || "";
  try {
    await API.post("/products/" + slug + "/reviews", { rating: rating, title: title, comment: comment });
    showToast(t("reviewSubmitted"));
    loadProductReviews(slug);
  } catch (e) { showToast(e.message || t("networkError"), true); }
};
window.applyCoupon = async function() {
  var input = document.getElementById("coupon-input");
  var msg = document.getElementById("coupon-message");
  if (!input || !input.value.trim()) return;
  try {
    var cartRes = await API.get("/cart");
    var cart = cartRes.data || {};
    var items = cart.items || [];
    var subtotal = items.reduce(function(s, i) { return s + (i.price || 0) * i.quantity; }, 0);
    var res = await API.post("/coupons/validate", { code: input.value.trim(), orderSubtotal: subtotal });
    if (res.status === 200 && res.data && res.data.valid) {
      window._appliedCoupon = res.data;
      if (msg) msg.innerHTML = "<span style=\"color:var(--green,#059669)\">✓ " + t("couponApplied") + " — " + res.data.code + " (-" + priceFmt(res.data.discount_amount) + ")</span>";
    }
  } catch (e) {
    window._appliedCoupon = null;
    if (msg) msg.innerHTML = "<span style=\"color:var(--red,#dc2626)\">" + esc(e.message || t("couponInvalid")) + "</span>";
  }
};
async function renderWishlist(el) {
  if (!App.token) { navigate("#/login"); return; }
  const meRes = await API.get('/auth/me');
  if (meRes.status !== 200) { navigate("#/login"); return; }
  App.customer = meRes.data;
  // Rendered inside the shared account shell so the portal keeps ONE navigation system.
  // The saved-item card markup below is unchanged from the previous standalone page.
  let body = '';
  try {
    var res = await API.get("/wishlist?locale=" + App.lang);
    var items = (res.data && res.data.items) || [];
    if (items.length === 0) {
      body += `<div class="empty-state"><p>${t("wishlistEmpty")}</p>
        <a href="#/products" class="btn-primary" style="display:inline-block;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">${t("products")}</a></div>`;
    } else {
      body += `<p style="color:var(--steel);margin-bottom:16px">${items.length} ${t("itemsInWishlist")}</p>`;
      body += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">`;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        body += `<div class="product-card" style="position:relative">`;
        if (!item.status || item.status !== "active") body += `<div style="background:var(--red,#dc2626);color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;position:absolute;top:8px;left:8px">${t("notAvailable")}</div>`;
        body += `<a href="#/product/${item.slug || ""}" style="text-decoration:none;color:inherit"><div style="height:160px;background:var(--bg,#f8f9fa);display:flex;align-items:center;justify-content:center;border-radius:6px;overflow:hidden">`;
        if (item.image) body += `<img src="${esc(item.image)}" style="max-height:100%;max-width:100%;object-fit:contain" />`;
        else body += `<span style="font-size:40px">📦</span>`;
        body += `</div></a><div style="padding:12px"><div style="font-weight:600;font-size:14px">${esc(item.name || "")}</div>`;
        if (item.brand) body += `<div style="color:var(--steel);font-size:12px">${esc(item.brand.name || "")}</div>`;
        body += `<div style="margin-top:8px;font-weight:700;color:var(--accent,#D4AF37)">${priceFmt(item.price)}</div>`;
        body += `<div style="margin-top:8px;display:flex;gap:8px">`;
        if (item.status === "active") body += `<button onclick="addWishToCart(${item.product_id})" style="flex:1;padding:6px;background:var(--accent,#D4AF37);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">${t("moveTocart")}</button>`;
        body += `<button onclick="removeFromWishlist(${item.product_id})" style="padding:6px 12px;background:var(--bg,#f8f9fa);border:1px solid var(--border,#ddd);border-radius:4px;cursor:pointer;font-size:12px">✖</button>`;
        body += `</div></div></div>`;
      }
      body += `</div>`;
    }
  } catch (e) { body += `<div class="empty-state"><p>${t("networkError")}</p></div>`; }
  el.innerHTML = _accountShell("wishlist", `<div class="acct-card">
      <div class="acct-card-header"><h3>♡ ${esc(t('dashSavedItems'))}</h3></div>
      ${body}
    </div>`, t("dashSavedItems"));
}

window.addWishToCart = async function(pid) {
  try { await API.post("/cart/items", { productId: pid, quantity: 1 }); showToast(t("addedToCart")); App.cartCount++; updateHeaderAuth();
  } catch (e) { showToast(e.message || t("networkError"), true); }
};
window.removeFromWishlist = async function(pid) {
  try { await API.delete("/wishlist/" + pid); showToast(t("wishlistRemoved")); renderWishlist(document.getElementById("app-content"));
  } catch (e) { showToast(e.message || t("networkError"), true); }
};
window.toggleWishlist = async function(pid) {
  if (!App.token) { navigate("#/login"); return; }
  try {
    var check = await API.get("/wishlist/check/" + pid);
    if (check.data && check.data.wishlisted) { await API.delete("/wishlist/" + pid); showToast(t("wishlistRemoved")); }
    else { await API.post("/wishlist", { productId: pid }); showToast(t("wishlistAdded")); }
  } catch (e) { showToast(e.message || t("networkError"), true); }
};
async function init() {
  // Apply language font
  document.documentElement.setAttribute('data-lang', App.lang);
  document.documentElement.lang = App.lang;
  // Try to restore session
  if (App.token) {
    const res = await API.get('/auth/me');
    if (res.status === 200 && res.data && res.data.role === 'customer') App.customer = res.data;
    else { App.token = null; App.customer = null; localStorage.removeItem('nblao_token'); }
  }
  await loadCart();
  updateHeaderAuth();

  // Setup — header directly in body for sticky to work
  document.body.innerHTML = `
    ${renderHeader()}
    <main id="app-content"></main>
    ${renderFooter()}
  `;

  window.addEventListener('hashchange', router);
  router();

  // Sticky header shadow on scroll
  window.addEventListener('scroll', function() {
    var hdr = document.querySelector('.site-header');
    if (hdr) {
      if (window.scrollY > 2) hdr.classList.add('nav-scrolled');
      else hdr.classList.remove('nav-scrolled');
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', init);
