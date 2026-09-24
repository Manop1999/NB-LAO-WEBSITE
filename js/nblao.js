/* ===================== PROMO SLIDER (auto-advance) ===================== */
let promoIdx = 0;
let promoTimer = null;
function promoRender(){
  const slides = document.querySelectorAll('.promo-slide');
  document.getElementById('promoTrack').style.transform = `translateX(-${promoIdx*100}%)`;
  const dots = document.getElementById('promoDots');
  dots.innerHTML = [...slides].map((_,i)=>`<span class="${i===promoIdx?'on':''}" onclick="promoSet(${i})"></span>`).join('');
}
function promoSet(i){ promoIdx = i; promoRender(); promoResetTimer(); }
function promoGo(dir){
  const total = document.querySelectorAll('.promo-slide').length;
  promoIdx = (promoIdx + dir + total) % total;
  promoRender(); promoResetTimer();
}
function promoResetTimer(){
  clearInterval(promoTimer);
  promoTimer = setInterval(()=>promoGo(1), 4500);
}
promoRender();
promoResetTimer();

/* ===================== DATA: 9 main categories ===================== */
let currentLang = 'lo';
const CATS = [
 {id:'elec', icon:'⚡', name:{lo:'ອຸປະກອນໄຟຟ້າ',en:'Electrical Equipment'}, sub:{
   lo:['ເບກເກີ (Circuit Breakers)','MCCB / MCB','Contactor & Relay','ສະວິດ & Disconnector','ຕູ້ໄຟ / MDB','ໝໍ້ແປງໄຟຟ້າ','ອຸປະກອນປ້ອງກັນຟ້າຜ່າ','ຟິວ ແລະ ອຸປະກອນປ້ອງກັນ','ເຄື່ອງມືວັດແທກໄຟຟ້າ','ອຸປະກອນເສີມໄຟຟ້າ'],
   en:['Circuit Breakers','MCCB / MCB','Contactor & Relay','Switches & Disconnectors','Panel Boards / MDB','Transformers','Surge Protection Devices','Fuses & Protection Devices','Electrical Measuring Tools','Electrical Accessories']}},
 {id:'mech', icon:'⚙️', name:{lo:'ອຸປະກອນກົນຈັກ',en:'Mechanical Components'}, sub:{
   lo:['ຕລັບລູກປືນ (Bearings)','ເກຍ & ກະປຸກເກຍ','Coupling','ວາວ (Valves)','ປັ໊ມ (Pumps)','ອຸປະກອນລົມ (Pneumatic)','ອຸປະກອນໄຮໂດຼລິກ','Mechanical Seal','ອຸປະກອນອຸດສາຫະກຳ','ອຸປະກອນໂຮງງານໄຟຟ້າ'],
   en:['Bearings','Gears & Gearboxes','Coupling','Valves','Pumps','Pneumatic Equipment','Hydraulic Equipment','Mechanical Seals','Industrial Equipment','Power Plant Equipment']}},
 {id:'tool', icon:'🛠️', name:{lo:'ເຄື່ອງມືວິສະວະກຳ',en:'Engineering Tools'}, sub:{
   lo:['ເຄື່ອງມືມື','ເຄື່ອງມືໄຟຟ້າ','ເຄື່ອງມືວັດແທກ','ເຄື່ອງມືຕັດ','ເຄື່ອງມືເຈາະ','ເຄື່ອງມືຂັດ','ເຄື່ອງມືເຊື່ອມ','ເຄື່ອງມືປັ້ນແຮງບິດ','ເຄື່ອງມືຫ້ອງກົນຈັກ','ອາໄຫລ່ເຄື່ອງມື'],
   en:['Hand Tools','Power Tools','Measuring Tools','Cutting Tools','Drilling Tools','Grinding Tools','Welding Tools','Torque Tools','Workshop Tools','Tool Spare Parts']}},
 {id:'safe', icon:'🦺', name:{lo:'ຄວາມປອດໄພ & ດັບເພີງ',en:'Safety & Fire Protection'}, sub:{
   lo:['ໝວກນິລະໄພ','ເກີບນິລະໄພ','ຖົງມືນິລະໄພ','ແວ່ນຕານິລະໄພ','ຊຸດປ້ອງກັນ','ອຸປະກອນປ້ອງກັນລະບົບຫາຍໃຈ','ອຸປະກອນປ້ອງກັນການຕົກ','ຖັງດັບເພີງ','ສາຍດັບເພີງ','ຫົວດັບເພີງ'],
   en:['Safety Helmets','Safety Shoes','Safety Gloves','Safety Glasses','Protective Clothing','Respiratory Protection','Fall Protection','Fire Extinguishers','Fire Hoses','Fire Sprinkler Heads']}},
 {id:'it', icon:'🖥️', name:{lo:'IT, ເຄື່ອງໃຊ້ໄຟຟ້າ & CCTV',en:'IT, Appliances & CCTV'}, sub:{
   lo:['ຄອມພິວເຕີ & ອຸປະກອນເສີມ','ອຸປະກອນເຄືອຂ່າຍ','ກ້ອງວົງຈອນປິດ','NVR / DVR','ຈໍມອນິເຕີ','ເຄື່ອງພິມ','UPS','ເຄື່ອງໃຊ້ໄຟຟ້າ','Access Control'],
   en:['Computers & Accessories','Network Equipment','CCTV Cameras','NVR / DVR','Monitors','Printers','UPS','Home Appliances','Access Control']}},
 {id:'comm', icon:'🔌', name:{lo:'ສາຍ & ອຸປະກອນສື່ສານ',en:'Cables & Communication'}, sub:{
   lo:['ສາຍໄຟກຳລັງ','ສາຍຄວບຄຸມ','ສາຍສັນຍານ','ສາຍໄຍແກ້ວ','ອຸປະກອນສື່ສານ','ອຸປະກອນເສີມເຄືອຂ່າຍ','Cable Gland','Cable Tray'],
   en:['Power Cables','Control Cables','Signal Cables','Fiber Optic Cables','Communication Equipment','Network Accessories','Cable Gland','Cable Tray']}},
 {id:'office', icon:'🗄️', name:{lo:'ເຟີນີເຈີ & ອຸປະກອນຫ້ອງການ',en:'Furniture & Office Supplies'}, sub:{
   lo:['ໂຕະການ','ຕັ່ງການ','ຕູ້ເກັບເອກະສານ','ເຄື່ອງພິມ & ໝຶກ','ອຸປະກອນຫ້ອງການ'],
   en:['Office Desks','Office Chairs','Filing Cabinets','Printers & Ink','Office Supplies']}},
 {id:'water', icon:'💧', name:{lo:'ນ້ຳ & ສານເຄມີ',en:'Water & Chemicals'}, sub:{
   lo:['ອຸປະກອນບຳບັດນ້ຳ','ເຄື່ອງວັດຄຸນນະພາບນ້ຳ','ເຄື່ອງກັ່ນນ້ຳ','ປັ໊ມ & ຕົວກອງ','ສານເຄມີອຸດສາຫະກຳ'],
   en:['Water Treatment Equipment','Water Quality Meters','Water Distillers','Pumps & Filters','Industrial Chemicals']}},
 {id:'motor', icon:'🔩', name:{lo:'ມອເຕີ, ປັ໊ມນ້ຳ & ສາຍພານ',en:'Motors, Pumps & Belts'}, sub:{
   lo:['ມອເຕີໄຟຟ້າ','ປັ໊ມນ້ຳ','ປັ໊ມຈຸ່ມ','ປັ໊ມ Centrifugal','ອາໄຫລ່ມອເຕີ','ສາຍພານ V-Belt','ສາຍພານ Timing','Pulley'],
   en:['Electric Motors','Water Pumps','Submersible Pumps','Centrifugal Pumps','Motor Spare Parts','V-Belts','Timing Belts','Pulleys']}}
];

/* ===================== MEGA MENU ===================== */
let megaCloseTimer = null;
function buildMega(activeId){
  const col1 = document.getElementById('megaCol1');
  const col2 = document.getElementById('megaCol2');
  const col3 = document.getElementById('megaCol3');
  if(!col1) return;
  col1.innerHTML = CATS.map(c=>`<div class="mega-cat-item ${c.id===activeId?'on':''}" onmouseenter="renderMegaCols('${c.id}')">
      <span class="ic">${c.icon}</span><span>${c.name[currentLang]}</span><span class="arrow">›</span></div>`).join('');
  renderMegaCols(activeId);
}
function renderMegaCols(id){
  document.querySelectorAll('.mega-cat-item').forEach(el=>el.classList.remove('on'));
  const cat = CATS.find(c=>c.id===id);
  if(!cat) return;
  [...document.querySelectorAll('.mega-cat-item')].forEach(el=>{
    if(el.textContent.includes(cat.name[currentLang])) el.classList.add('on');
  });
  const subList = cat.sub[currentLang];
  document.getElementById('megaCol2').innerHTML = `<h5>${cat.name[currentLang]}</h5>` + subList.map((s,i)=>
    `<div class="mega-sub-item"><span><span class="n">${String(i+1).padStart(2,'0')}</span>${s}</span><span>›</span></div>`).join('');
  const popularLabel = currentLang==='lo' ? 'ຍອດນິຍົມ' : 'Popular';
  const viewAllLabel = currentLang==='lo' ? `ເບິ່ງທັງໝົດໃນ ${cat.name[currentLang]} →` : `View all in ${cat.name[currentLang]} →`;
  document.getElementById('megaCol3').innerHTML = `<h5>${popularLabel}</h5>` + subList.slice(0,4).map(s=>
    `<div class="mega-sub-item"><span>${s}</span></div>`).join('') +
    `<a class="view-all" href="#">${viewAllLabel}</a>`;
}
function openMega(){
  clearTimeout(megaCloseTimer);
  buildMega(CATS[0].id);
  document.getElementById('megaPanel').classList.add('open');
  document.querySelector('.mega-trigger').classList.add('open');
}
function scheduleCloseMega(){
  megaCloseTimer = setTimeout(()=>{
    document.getElementById('megaPanel').classList.remove('open');
    document.querySelector('.mega-trigger').classList.remove('open');
  }, 200);
}
function cancelCloseMega(){ clearTimeout(megaCloseTimer); }

/* ===================== SIDEBAR CATEGORY ACCORDION ===================== */
function buildAccordion(){
  const wrap = document.getElementById('catAccordion');
  if(!wrap) return;
  wrap.innerHTML = CATS.map((c,ci)=>`
    <div class="cat-acc ${ci===0?'open':''}" id="acc-${c.id}">
      <div class="cat-acc-head" onclick="toggleAcc('${c.id}')"><span class="ic">${c.icon}</span><span>${c.name[currentLang]}</span><span class="chev">▸</span></div>
      <div class="cat-acc-body ${ci===0?'open':''}">${c.sub[currentLang].map(s=>`<div>${s}</div>`).join('')}</div>
    </div>`).join('');
}
function toggleAcc(id){
  const el = document.getElementById('acc-'+id);
  el.classList.toggle('open');
  el.querySelector('.cat-acc-body').classList.toggle('open');
}
buildAccordion();

/* ===================== LANGUAGE DROPDOWN ===================== */
function toggleLangMenu(btn){
  const menu = btn.nextElementSibling;
  document.querySelectorAll('.lang-menu').forEach(m=>{ if(m!==menu) m.classList.remove('open'); });
  menu.classList.toggle('open');
}
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.lang-dropdown')){
    document.querySelectorAll('.lang-menu').forEach(m=>m.classList.remove('open'));
  }
});

const I18N = {
  search_ph:{lo:'ຄົ້ນຫາສິນຄ້າ...', en:'Search products...'},
  login:{lo:'ເຂົ້າສູ່ລະບົບ', en:'Login'},
  cart:{lo:'ກະຕ່າ', en:'Cart'},
  nav_home:{lo:'ໜ້າຫຼັກ', en:'Home'},
  nav_products:{lo:'ສິນຄ້າ', en:'Products'},
  nav_services:{lo:'ບໍລິການ', en:'Services'},
  nav_about:{lo:'ກ່ຽວກັບເຮົາ', en:'About Us'},
  nav_contact:{lo:'ຕິດຕໍ່', en:'Contact'},
  nav_about2:{lo:'ກ່ຽວກັບພວກເຮົາ', en:'About Us'},
  nav_contact2:{lo:'ຕິດຕໍ່', en:'Contact'},
  hero_title:{lo:'ອຸປະກອນອຸດສາຫະກຳ ແລະ ໄຟຟ້າ ຄົບຊຸດ ສຳລັບໂຄງການ ແລະ ຮ້ານຄ້າ', en:'Complete Industrial & Electrical Equipment for Projects and Retailers'},
  hero_desc:{lo:'ຄົ້ນຫາ, ປຽບທຽບ ແລະ ຂໍລາຄາອຸປະກອນຈາກຫລາຍຍີ່ຫໍ້ຊັ້ນນຳ ພ້ອມທີມງານດູແລການສັ່ງຊື້ໂດຍກົງ', en:'Search, compare, and request quotes from leading brands — with a dedicated team supporting every order'},
  hero_btn1:{lo:'ເບິ່ງສິນຄ້າທັງໝົດ', en:'View All Products'},
  hero_btn2:{lo:'ຂໍລາຄາດ່ວນ →', en:'Quick Quote →'},
  hero_live:{lo:'ຄຳຂໍລ່າສຸດ / LIVE', en:'Latest Requests / LIVE'},
  ask_price:{lo:'ຂໍລາຄາ', en:'Ask Price'},
  cat_heading:{lo:'ໝວດໝູ່ສິນຄ້າ', en:'Product Categories'},
  featured_heading:{lo:'ສິນຄ້າແນະນຳ', en:'Featured Products'},
  steps_heading:{lo:'ວິທີສັ່ງຊື້', en:'How to Order'},
  view_all:{lo:'ເບິ່ງທັງໝົດ →', en:'View All →'},
  c_elec:{lo:'ອຸປະກອນໄຟຟ້າ', en:'Electrical Equipment'},
  c_elec2:{lo:'ອຸປະກອນໄຟຟ້າ', en:'Electrical Equipment'},
  c_mech:{lo:'ອຸປະກອນກົນຈັກ', en:'Mechanical Components'},
  c_tool:{lo:'ເຄື່ອງມືວິສະວະກຳ', en:'Engineering Tools'},
  c_safe:{lo:'ຄວາມປອດໄພ', en:'Safety Equipment'},
  c_motor:{lo:'ມອເຕີ / ປັ໊ມ', en:'Motors / Pumps'},
  c_motor2:{lo:'ມອເຕີ/ປັ໊ມ', en:'Motors/Pumps'},
  c_water:{lo:'ນ້ຳ / ສານເຄມີ', en:'Water / Chemicals'},
  f_valve:{lo:'ວາວ/ທໍ່ນ້ຳ', en:'Valves/Piping'},
  s1_t:{lo:'ເລືອກສິນຄ້າ', en:'Choose Products'},
  s1_d:{lo:'ຄົ້ນຫາ ຫລື ເລືອກຈາກໝວດໝູ່ ແລ້ວເລືອກໃສ່ກະຕ່າ ຫລື ຂໍໃບສະເໜີລາຄາ', en:'Search or browse categories, then add to cart or request a quotation'},
  s2_t:{lo:'ສົ່ງຄຳຂໍ', en:'Submit Request'},
  s2_d:{lo:'ໃສ່ຂໍ້ມູນຕິດຕໍ່ ແລະ ສະຖານທີ່ຈັດສົ່ງ', en:'Enter contact details and delivery location'},
  s3_t:{lo:'ຮັບການຢືນຢັນ', en:'Get Confirmation'},
  s3_d:{lo:'ທີມງານຕິດຕໍ່ກັບພາຍໃນ 24 ຊົ່ວໂມງ ເພື່ອຢືນຢັນລາຄາ ແລະ ຈັດສົ່ງ', en:'Our team contacts you within 24 hours to confirm pricing and delivery'},
  f_about:{lo:'NB LAO', en:'NB LAO'},
  f_about_p:{lo:'ຜູ້ຈຳໜ່າຍອຸປະກອນອຸດສາຫະກຳ ແລະ ໄຟຟ້າ ຄົບວົງຈອນ ສຳລັບຮ້ານຄ້າ ແລະ ໂຄງການ.', en:'Full-service industrial and electrical equipment supplier for retailers and projects.'},
  f_products:{lo:'ສິນຄ້າ', en:'Products'},
  f_company:{lo:'ບໍລິສັດ', en:'Company'},
  f_contact:{lo:'ຕິດຕໍ່', en:'Contact'},
  f_addr:{lo:'ບ້ານ​ໜອງ​ບອນ, ນະຄອນຫລວງວຽງຈັນ<br>020 5555 8888', en:'Nongbon Village, Vientiane Capital<br>020 5555 8888'},
  f_bottom:{lo:'© 2026 NB Lao — ຕົ້ນແບບ Wireframe, ຍັງບໍ່ແມ່ນຂໍ້ມູນຈິງ', en:'© 2026 NB Lao — Wireframe Prototype, not real data'},
  f_partners:{lo:'ຄູ່ຮ່ວມທຸລະກິດ / ຕົວແທນຈຳໜ່າຍ', en:'Business Partners / Distributors'},

  /* ---- listing filters ---- */
  filt_cat:{lo:'ໝວດໝູ່ສິນຄ້າ', en:'Product Categories'},
  filt_brand:{lo:'ຍີ່ຫໍ້', en:'Brand'},
  filt_volt:{lo:'ຂໍ້ມູນສະເພາະ — ແຮງດັນ', en:'Specification — Voltage'},
  filt_status:{lo:'ສະຖານະ', en:'Status'},
  filt_instock:{lo:'ມີສະຕັອກເທົ່ານັ້ນ', en:'In Stock Only'},
  filt_new:{lo:'ສິນຄ້າໃໝ່', en:'New Arrivals'},
  filt_promo:{lo:'ກຳລັງຫລຸດລາຄາ', en:'On Sale'},
  filt_bestseller:{lo:'ສິນຄ້າຂາຍດີ', en:'Best Sellers'},
  filt_quoteonly:{lo:'ສະເພາະຂໍລາຄາ (B2B)', en:'Quote Only (B2B)'},
  found_count:{lo:'ພົບ 48 ລາຍການ', en:'48 items found'},
  sort_newest:{lo:'ລຽງຕາມ: ໃໝ່ລ່າສຸດ', en:'Sort: Newest'},
  sort_price:{lo:'ລາຄາ ຕ່ຳ→ສູງ', en:'Price: Low to High'},
  sort_name:{lo:'ຊື່ ກ-ຮ', en:'Name: A-Z'},

  /* ---- product names / prices / badges shared across pages ---- */
  prod_img_ph:{lo:'ຮູບສິນຄ້າ', en:'Product Image'},
  gallery_main_ph:{lo:'ຮູບໃຫຍ່ສິນຄ້າ', en:'Main Product Image'},
  ask_price_contact:{lo:'ຕິດຕໍ່ຂໍລາຄາ', en:'Contact for Price'},
  badge_instock:{lo:'ມີສະຕັອກ', en:'In Stock'},
  badge_lowstock:{lo:'ເຫລືອໜ້ອຍ', en:'Low Stock'},
  p_cable_thw25:{lo:'ສາຍໄຟ THW 2.5mm² (ມ້ວນ 100m)', en:'THW Cable 2.5mm² (100m roll)'},
  p_cable_thw25_100m:{lo:'ສາຍໄຟ THW 2.5mm² (100m)', en:'THW Cable 2.5mm² (100m)'},
  p_cable_vaf40:{lo:'ສາຍໄຟ VAF 4.0mm² (ມ້ວນ 100m)', en:'VAF Cable 4.0mm² (100m roll)'},
  p_motor5hp_ind:{lo:'ມອເຕີ 3 ເຟສ 5HP ຮຸ່ນ Industrial', en:'3-Phase Motor 5HP Industrial Series'},
  p_motor5hp:{lo:'ມອເຕີ 3 ເຟສ 5HP', en:'3-Phase Motor 5HP'},
  p_ballvalve2in:{lo:'ວາວປິດເປີດ Ball Valve 2 ນິ້ວ', en:'Ball Valve 2 inch'},
  p_helmet_ce:{lo:'ໝວກນິລະໄພ Class E ມາດຕະຖານ', en:'Safety Helmet Class E Standard'},
  p_mcb40a:{lo:'ເບກເກີ MCB 40A 1 ໂພລ', en:'MCB Circuit Breaker 40A 1 Pole'},
  p_panel12:{lo:'ຕູ້ໄຟ Panel Board 12 ຊ່ອງ', en:'Panel Board 12-Way'},
  p_led18:{lo:'ຫລອດ LED 18W ແສງຂາວ', en:'LED Bulb 18W Daylight'},
  p_switch3g:{lo:'ສະວິດໄຟ 3 ຊ່ອງ', en:'Light Switch 3-Gang'},
  pr_850:{lo:'850,000 ກີບ', en:'850,000 LAK'},
  pr_95:{lo:'95,000 ກີບ', en:'95,000 LAK'},
  pr_185:{lo:'185,000 ກີບ', en:'185,000 LAK'},
  pr_65:{lo:'65,000 ກີບ', en:'65,000 LAK'},
  pr_28:{lo:'28,000 ກີບ', en:'28,000 LAK'},
  pr_32:{lo:'32,000 ກີບ', en:'32,000 LAK'},
  pr_1320:{lo:'1,320,000 ກີບ', en:'1,320,000 LAK'},
  unit_pcs:{lo:'ໜ່ວຍ', en:'unit'},
  unit_roll:{lo:'ມ້ວນ', en:'roll'},
  currency_kip:{lo:'ກີບ', en:'LAK'},

  /* ---- detail page ---- */
  d_title:{lo:'ເບກເກີ MCB 40A 1 ໂພລ ຮຸ່ນ Acti9', en:'MCB Circuit Breaker 40A 1 Pole — Acti9 Series'},
  d_model:{lo:'ຮຸ່ນ: iC60N-40A', en:'Model: iC60N-40A'},
  per_unit:{lo:'/ ໜ່ວຍ', en:'/ unit'},
  d_stock_240:{lo:'ມີສະຕັອກ 240 ໜ່ວຍ', en:'In stock: 240 units'},
  d_moq:{lo:'ຈຳນວນສັ່ງຊື້ຂັ້ນຕ່ຳ: 1 ໜ່ວຍ', en:'Minimum order: 1 unit'},
  d_addcart:{lo:'🛒 ໃສ່ກະຕ່າ', en:'🛒 Add to Cart'},
  d_askquote:{lo:'📄 ຂໍໃບສະເໜີລາຄາ', en:'📄 Request Quote'},
  d_brand_lbl:{lo:'ຍີ່ຫໍ້', en:'Brand'},
  d_origin_lbl:{lo:'ແຫລ່ງຜະລິດ', en:'Origin'},
  d_origin_val:{lo:'ຝຣັ່ງ (France)', en:'France'},
  d_warranty_lbl:{lo:'ການຮັບປະກັນ', en:'Warranty'},
  d_warranty_val:{lo:'12 ເດືອນ', en:'12 months'},
  d_unit_lbl:{lo:'ຫົວໜ່ວຍ', en:'Unit'},
  d_unit_val:{lo:'ຊິ້ນ (pcs)', en:'pcs'},
  tab_desc:{lo:'ລາຍລະອຽດ', en:'Description'},
  tab_spec:{lo:'ຂໍ້ມູນສະເພາະ', en:'Specifications'},
  tab_doc:{lo:'ເອກະສານ', en:'Documents'},
  tab_usage:{lo:'ວິທີການໃຊ້ງານ', en:'How to Use'},
  tab_rel:{lo:'ສິນຄ້າກ່ຽວຂ້ອງ', en:'Related Products'},
  tp_desc_txt:{lo:'ເບກເກີ MCB Acti9 ຈາກ Schneider Electric ອອກແບບສຳລັບປ້ອງກັນວົງຈອນໄຟຟ້າຂະໜາດນ້ອຍ-ກາງ ເໝາະສຳລັບຕູ້ໄຟທີ່ຢູ່ອາໃສ, ຮ້ານຄ້າ ແລະ ອາຄານພານິດ. ຜະລິດຕາມມາດຕະຖານສາກົນ IEC ໃຫ້ຄວາມທົນທານ ແລະ ຄວາມປອດໄພສູງ.', en:'The Acti9 MCB from Schneider Electric is designed to protect small to medium electrical circuits, suitable for residential, retail, and commercial buildings. Manufactured to international IEC standards for high durability and safety.'},
  spec_current:{lo:'ກະແສໄຟ (Current Rating)', en:'Current Rating'},
  spec_poles:{lo:'ຈຳນວນໂພລ (Poles)', en:'Poles'},
  spec_voltage:{lo:'ແຮງດັນໃຊ້ງານ (Voltage)', en:'Operating Voltage'},
  spec_breaking:{lo:'ຄວາມສາມາດຕັດວົງຈອນ (Breaking Capacity)', en:'Breaking Capacity'},
  spec_standard:{lo:'ມາດຕະຖານ (Standard)', en:'Standard'},
  spec_weight:{lo:'ນ້ຳໜັກ (Weight)', en:'Weight'},
  us1_t:{lo:'ຕິດຕັ້ງເຂົ້າ Panel', en:'Install into Panel'},
  us1_d:{lo:'ປິດແຫລ່ງໄຟກ່ອນ ແລ້ວຕິດຕັ້ງເບກເກີເຂົ້າ DIN Rail ພາຍໃນຕູ້ໄຟ', en:'Turn off the power supply first, then mount the breaker onto the DIN rail inside the panel'},
  us2_t:{lo:'ຕໍ່ສາຍໄຟ', en:'Connect Wiring'},
  us2_d:{lo:'ຕໍ່ສາຍເຂົ້າ-ອອກໃຫ້ຖືກຂົ້ວ ໂຕນຫັນແໜ້ນ ຕາມແຮງບິດທີ່ກຳນົດ', en:'Connect the in/out wires to the correct terminals and tighten to the specified torque'},
  us3_t:{lo:'ທົດສອບ', en:'Test'},
  us3_d:{lo:'ເປີດແຫລ່ງໄຟ ແລະ ທົດສອບການເຮັດວຽກຂອງເບກເກີກ່ອນໃຊ້ງານຈິງ', en:'Turn the power back on and test the breaker before actual use'},
  tp_rel_txt:{lo:'ຕູ້ໄຟ Panel Board 12 ຊ່ອງ &nbsp;•&nbsp; ສາຍໄຟ THW 2.5mm² &nbsp;•&nbsp; ຄອນແທັກເຕີ 40A', en:'Panel Board 12-Way &nbsp;•&nbsp; THW Cable 2.5mm² &nbsp;•&nbsp; Contactor 40A'},

  /* ---- breadcrumbs ---- */
  bc_quote:{lo:'ຟອມໃບສະເໜີລາຄາ', en:'Quotation Request Form'},
  bc_cart:{lo:'ກະຕ່າ', en:'Cart'},
  bc_order:{lo:'ຟອມສັ່ງຊື້', en:'Purchase Order Form'},

  /* ---- quote form ---- */
  tag_b2b_quote:{lo:'B2B QUOTATION REQUEST', en:'B2B QUOTATION REQUEST'},
  q_items_h:{lo:'ລາຍການສິນຄ້າ (2)', en:'Item List (2)'},
  q_contact_h:{lo:'ຂໍ້ມູນຜູ້ຕິດຕໍ່', en:'Contact Information'},
  q_project_h:{lo:'ລາຍລະອຽດໂຄງການ', en:'Project Details'},
  q_summary_h:{lo:'ສະຫລຸບໃບສະເໜີລາຄາ', en:'Quotation Summary'},
  q_row_panel:{lo:'ຕູ້ໄຟ Panel Board ×3', en:'Panel Board ×3'},
  q_row_motor:{lo:'ມອເຕີ 3 ເຟສ 5HP ×2', en:'3-Phase Motor 5HP ×2'},
  q_total_lbl:{lo:'ຍອດລວມ', en:'Total'},
  q_total_val:{lo:'ຈະແຈ້ງໃນໃບສະເໜີ', en:'To be confirmed in quotation'},
  q_submit_btn:{lo:'ສົ່ງໃບສະເໜີລາຄາ →', en:'Submit Quote Request →'},
  q_note:{lo:'* ນີ້ແມ່ນຄຳຂໍໃບສະເໜີລາຄາ (RFQ) — ທີມງານຈະຄິດໄລ່ ແລະ ສົ່ງໃບສະເໜີລາຄາຢ່າງເປັນທາງການໃຫ້ພາຍໃນ 24 ຊົ່ວໂມງ ຜ່ານເບີໂທ ຫລື ອີເມວທີ່ໃຫ້ໄວ້', en:'* This is a Request for Quotation (RFQ) — our team will calculate pricing and send an official quotation within 24 hours via the phone number or email provided'},
  ask_price:{lo:'ຂໍລາຄາ', en:'Ask Price'},

  /* ---- order form ---- */
  tag_direct_order:{lo:'DIRECT ORDER — ຈາກກະຕ່າ', en:'DIRECT ORDER — FROM CART'},
  o_items_h:{lo:'ລາຍການສັ່ງຊື້ (2)', en:'Order Items (2)'},
  o_recipient_h:{lo:'ຂໍ້ມູນຜູ້ຮັບ', en:'Recipient Information'},
  o_delivery_h:{lo:'ການຈັດສົ່ງ', en:'Delivery'},
  o_payment_h:{lo:'ການຊຳລະເງິນ', en:'Payment'},
  o_summary_h:{lo:'ສະຫລຸບອໍເດີ້', en:'Order Summary'},
  o_row_mcb:{lo:'ເບກເກີ MCB 40A ×5', en:'MCB Circuit Breaker 40A ×5'},
  o_row_cable:{lo:'ສາຍໄຟ THW 2.5mm ×2', en:'THW Cable 2.5mm ×2'},
  o_row_shipping:{lo:'ຄ່າຈັດສົ່ງ', en:'Shipping Fee'},
  o_total_lbl:{lo:'ຍອດລວມທັງໝົດ', en:'Grand Total'},
  o_confirm_btn:{lo:'ຢືນຢັນສັ່ງຊື້ →', en:'Confirm Order →'},
  o_note:{lo:'* ຫລັງຈາກສົ່ງອໍເດີ້ ທີມງານຈະຕິດຕໍ່ຢືນຢັນ ແລະ ແຈ້ງຂໍ້ມູນຊຳລະເງິນ (ຖ້າເລືອກໂອນ) ພາຍໃນ 24 ຊົ່ວໂມງ', en:'* After submitting your order, our team will contact you to confirm and provide payment details (if bank transfer is selected) within 24 hours'},

  /* ---- shared form fields ---- */
  f_fullname:{lo:'ຊື່ ແລະ ນາມສະກຸນ *', en:'Full Name *'},
  f_phone:{lo:'ເບີໂທ *', en:'Phone Number *'},
  f_company_lbl:{lo:'ບໍລິສັດ / ໂຄງການ', en:'Company / Project'},
  f_fb_email:{lo:'Facebook / ອີເມວ', en:'Facebook / Email'},
  f_quote_date:{lo:'ວັນທີ່ຕ້ອງການໃບສະເໜີລາຄາ', en:'Date Quote Needed'},
  f_province:{lo:'ແຂວງ / ນະຄອນຫລວງ', en:'Province / Capital'},
  f_city:{lo:'ເມືອງ', en:'District'},
  f_address:{lo:'ທີ່ຢູ່ລະອຽດ', en:'Detailed Address'},
  f_payment_method:{lo:'ວິທີຊຳລະເງິນ *', en:'Payment Method *'},
  ph_name:{lo:'ທ້າວ / ນາງ ...', en:'Mr. / Ms. ...'},
  ph_phone:{lo:'020 xxxxxxxx', en:'020 xxxxxxxx'},
  ph_company:{lo:'ຊື່ບໍລິສັດ ຫລື ໂຄງການ', en:'Company or project name'},
  ph_fb_email:{lo:'ລິ້ງ ຫລື ອີເມວ', en:'Link or email'},
  ph_date:{lo:'ວັນ/ເດືອນ/ປີ', en:'DD/MM/YYYY'},
  ph_notes:{lo:'ລາຍລະອຽດເພີ່ມເຕີມ ເຊັ່ນ ເງື່ອນໄຂການຈັດສົ່ງ, ມາດຕະຖານທີ່ຕ້ອງການ...', en:'Additional details such as delivery terms, required standards...'},
  ph_city:{lo:'ເມືອງ...', en:'District...'},
  ph_address:{lo:'ບ້ານ, ຖະໜົນ, ຈຸດສັງເກດ...', en:'Village, street, landmark...'},
  prov_vte:{lo:'ນະຄອນຫລວງວຽງຈັນ', en:'Vientiane Capital'},
  prov_lpb:{lo:'ຫລວງພະບາງ', en:'Luang Prabang'},
  pay_bank:{lo:'ໂອນຜ່ານທະນາຄານ (Bank Transfer)', en:'Bank Transfer'},
  pay_cod:{lo:'ຊຳລະປາຍທາງ (COD)', en:'Cash on Delivery (COD)'},

  /* ---- admin ---- */
  ad_dashboard:{lo:'Dashboard', en:'Dashboard'},
  ad_products:{lo:'ສິນຄ້າ', en:'Products'},
  ad_categories:{lo:'ໝວດໝູ່', en:'Categories'},
  ad_brands:{lo:'ຍີ່ຫໍ້', en:'Brands'},
  ad_quotes:{lo:'ໃບສະເໜີລາຄາ', en:'Quotations'},
  ad_orders:{lo:'ອໍເດີ້', en:'Orders'},
  ad_settings:{lo:'ຕັ້ງຄ່າ', en:'Settings'},
  ad_stat_new:{lo:'ຄຳຂໍໃໝ່ວັນນີ້', en:'New Requests Today'},
  ad_stat_pending:{lo:'ລໍຖ້າສະເໜີລາຄາ', en:'Awaiting Quotation'},
  ad_stat_revenue:{lo:'ຍອດເດືອນນີ້ (ກີບ)', en:'Revenue This Month (LAK)'},
  ad_stat_lowstock:{lo:'ສິນຄ້າໃກ້ໝົດສະຕັອກ', en:'Low Stock Items'},
  ad_col_code:{lo:'ລະຫັດ', en:'Code'},
  ad_col_customer:{lo:'ລູກຄ້າ', en:'Customer'},
  ad_col_type:{lo:'ປະເພດ', en:'Type'},
  ad_col_total:{lo:'ຍອດລວມ', en:'Total'},
  ad_col_status:{lo:'ສະຖານະ', en:'Status'},
  ad_col_date:{lo:'ວັນທີ', en:'Date'},
  ad_type_order:{lo:'ອໍເດີ້', en:'Order'},
  ad_type_quote:{lo:'ໃບສະເໜີລາຄາ', en:'Quotation'},
  ad_st_new:{lo:'ໃໝ່', en:'New'},
  ad_st_review:{lo:'ກຳລັງກວດ', en:'In Review'},
  ad_st_done:{lo:'ຢືນຢັນແລ້ວ', en:'Confirmed'}
};

function setLang(lang){
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(I18N[key]) el.innerHTML = I18N[key][lang];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    const key = el.getAttribute('data-i18n-ph');
    if(I18N[key]) el.setAttribute('placeholder', I18N[key][lang]);
  });
  document.querySelectorAll('.cur-lang').forEach(el=> el.textContent = lang==='lo' ? 'LAO' : 'EN');
  document.querySelectorAll('.lang-menu div').forEach(d=>d.classList.remove('sel'));
  document.querySelectorAll('.lang-menu').forEach(m=>{
    const target = lang==='lo' ? m.children[0] : m.children[1];
    if(target) target.classList.add('sel');
  });
  document.querySelectorAll('.lang-menu').forEach(m=>m.classList.remove('open'));
  buildAccordion();
  if(document.getElementById('megaPanel')) buildMega(CATS[0].id);
}

/* ===================== PROTOTYPE NAV ===================== */
const buttons = document.querySelectorAll('.proto-nav button');
buttons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    buttons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(btn.dataset.screen).classList.add('active');
    window.scrollTo(0,0);
  });
});

/* ===================== PRODUCT DETAIL TABS ===================== */
function setDetailTab(el, panelId){
  el.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('on'));
  document.getElementById(panelId).classList.add('on');
}
