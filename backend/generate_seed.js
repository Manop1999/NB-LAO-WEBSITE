const fs = require('fs');

// Read the CATS data from the frontend JS
const frontendJs = fs.readFileSync('js/nblao.js', 'utf8');
const catsMatch = frontendJs.match(/const CATS = (\[[\s\S]*?\]);/);
if (!catsMatch) { console.error('Could not find CATS array'); process.exit(1); }
const CATS = eval(catsMatch[1]);

// Build categories array for seed
const seedCats = CATS.map(c => ({
  slug: c.id,
  icon: c.icon,
  lo: c.name.lo,
  en: c.name.en,
  subs: c.sub.lo.map((loName, i) => ({
    slug: c.sub.en[i].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    lo: loName,
    en: c.sub.en[i],
  })),
}));

// Read I18N for product names
const i18nMatch = frontendJs.match(/const I18N = (\{[\s\S]*?\});/);
const I18N = eval('(' + i18nMatch[1] + ')');

function t(key, lang) { return I18N[key] ? I18N[key][lang] : ''; }

const seedProducts = [
  {
    sku: 'EL-CAB-2540', slug: 'thw-cable-2-5mm',
    catSlug: 'comm-power-cables', brandSlug: null,
    price: 850000, priceUnit: 'roll', stock: 50,
    loName: t('p_cable_thw25','lo'), enName: t('p_cable_thw25','en'),
    loDesc: null, enDesc: null, origin: null, warranty: null, modelNumber: null, specs: null,
  },
  {
    sku: 'MT-PMP-3P5', slug: 'motor-3-phase-5hp',
    catSlug: 'motor-electric-motors', brandSlug: null,
    price: null, priceUnit: null, stock: 0,
    loName: t('p_motor5hp_ind','lo'), enName: t('p_motor5hp_ind','en'),
    loDesc: null, enDesc: null, origin: null, warranty: null, modelNumber: null, specs: null,
  },
  {
    sku: 'VL-BL-2IN', slug: 'ball-valve-2-inch',
    catSlug: 'mech-valves', brandSlug: null,
    price: 185000, priceUnit: 'pcs', stock: 35,
    loName: t('p_ballvalve2in','lo'), enName: t('p_ballvalve2in','en'),
    loDesc: null, enDesc: null, origin: null, warranty: null, modelNumber: null, specs: null,
  },
  {
    sku: 'SF-HLM-CE', slug: 'safety-helmet-class-e',
    catSlug: 'safe-safety-helmets', brandSlug: null,
    price: 65000, priceUnit: 'pcs', stock: 300,
    loName: t('p_helmet_ce','lo'), enName: t('p_helmet_ce','en'),
    loDesc: null, enDesc: null, origin: null, warranty: null, modelNumber: null, specs: null,
  },
  {
    sku: 'EL-BRK-40A', slug: 'mcb-40a-1-pole',
    catSlug: 'elec-circuit-breakers', brandSlug: 'schneider-electric',
    price: 95000, priceUnit: 'pcs', stock: 240,
    loName: t('p_mcb40a','lo'), enName: t('p_mcb40a','en'),
    loDesc: t('tp_desc_txt','lo'), enDesc: t('tp_desc_txt','en'),
    origin: 'France', warranty: '12 months', modelNumber: 'iC60N-40A',
    specs: [
      { key: 'current_rating', loLabel: t('spec_current','lo'), enLabel: t('spec_current','en'), value: '40 A' },
      { key: 'poles', loLabel: t('spec_poles','lo'), enLabel: t('spec_poles','en'), value: '1P' },
      { key: 'voltage', loLabel: t('spec_voltage','lo'), enLabel: t('spec_voltage','en'), value: '230/400 V AC' },
      { key: 'breaking_capacity', loLabel: t('spec_breaking','lo'), enLabel: t('spec_breaking','en'), value: '6 kA' },
      { key: 'standard', loLabel: t('spec_standard','lo'), enLabel: t('spec_standard','en'), value: 'IEC 60898-1' },
      { key: 'weight', loLabel: t('spec_weight','lo'), enLabel: t('spec_weight','en'), value: '0.15 kg' },
    ],
  },
  {
    sku: 'EL-PNL-12W', slug: 'panel-board-12-way',
    catSlug: 'elec-panel-boards-mdb', brandSlug: null,
    price: 32000, priceUnit: 'pcs', stock: 15,
    loName: t('p_panel12','lo'), enName: t('p_panel12','en'),
    loDesc: null, enDesc: null, origin: null, warranty: null, modelNumber: null, specs: null,
  },
  {
    sku: 'EL-LED-18W', slug: 'led-bulb-18w-daylight',
    catSlug: 'elec-electrical-accessories', brandSlug: null,
    price: 28000, priceUnit: 'pcs', stock: 200,
    loName: t('p_led18','lo'), enName: t('p_led18','en'),
    loDesc: null, enDesc: null, origin: null, warranty: null, modelNumber: null, specs: null,
  },
  {
    sku: 'EL-SW-3G', slug: 'light-switch-3-gang',
    catSlug: 'elec-electrical-accessories', brandSlug: null,
    price: null, priceUnit: null, stock: 0,
    loName: t('p_switch3g','lo'), enName: t('p_switch3g','en'),
    loDesc: null, enDesc: null, origin: null, warranty: null, modelNumber: null, specs: null,
  },
];

const brandNames = [
  { slug: 'siemens', sortOrder: 1, name: 'SIEMENS' },
  { slug: 'schneider-electric', sortOrder: 2, name: 'SCHNEIDER ELECTRIC' },
  { slug: 'grundfos', sortOrder: 3, name: 'GRUNDFOS' },
  { slug: 'abb', sortOrder: 4, name: 'ABB' },
  { slug: 'bosch', sortOrder: 5, name: 'BOSCH' },
  { slug: '3m', sortOrder: 6, name: '3M' },
  { slug: 'mitsubishi-electric', sortOrder: 7, name: 'MITSUBISHI ELECTRIC' },
  { slug: 'legrand', sortOrder: 8, name: 'LEGRAND' },
  { slug: 'honeywell', sortOrder: 9, name: 'HONEYWELL' },
  { slug: 'delta', sortOrder: 10, name: 'DELTA' },
  { slug: 'panasonic', sortOrder: 11, name: 'PANASONIC' },
  { slug: 'ls-electric', sortOrder: 12, name: 'LS ELECTRIC' },
];

// Write JSON data files that seed.js can consume
fs.writeFileSync('backend/_seed_data.json', JSON.stringify({
  categories: seedCats,
  brands: brandNames,
  products: seedProducts,
}, null, 2), 'utf8');

console.log('Generated _seed_data.json with ' + seedCats.length + ' categories, ' + brandNames.length + ' brands, ' + seedProducts.length + ' products');
