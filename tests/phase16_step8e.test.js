const {describe,it}=require("node:test");const assert=require("node:assert/strict");const fs2=require("fs");const crypto=require("crypto");
const a=fs2.readFileSync("admin.html","utf8"),c=fs2.readFileSync("js/customer.js","utf8"),h=fs2.readFileSync("customer.html","utf8"),s=fs2.readFileSync("styles/nblao.css","utf8");
function md5(x){return crypto.createHash("md5").update(x).digest("hex");}
describe("Phase16 Step8e UI",()=>{
describe("AdminSidebar",()=>{
it("loyalty link",()=>{assert.ok(a.includes("loyalty"));});
it("icon",()=>{assert.ok(a.includes("⭐"));});
it("navigateTo",()=>{assert.ok(a.includes('case "loyalty":'));});
});
describe("AdminFns",()=>{
it("loadLoyalty",()=>{assert.ok(a.includes("async function loadLoyalty"));});
it("loadLoyaltyCustomers",()=>{assert.ok(a.includes("async function loadLoyaltyCustomers"));});
it("adjustPoints",()=>{assert.ok(a.includes("function adjustPoints"));});
it("submitAdjust",()=>{assert.ok(a.includes("async function submitAdjust"));});
it("viewCustomerLoyalty",()=>{assert.ok(a.includes("async function viewCustomerLoyalty"));});
it("createTier",()=>{assert.ok(a.includes("function createTier"));});
it("submitCreateTier",()=>{assert.ok(a.includes("async function submitCreateTier"));});
it("editTier",()=>{assert.ok(a.includes("function editTier"));});
it("submitEditTier",()=>{assert.ok(a.includes("async function submitEditTier"));});
it("saveLoyaltyConfig",()=>{assert.ok(a.includes("async function saveLoyaltyConfig"));});
it("runExpiration",()=>{assert.ok(a.includes("async function runExpiration"));});
});
describe("AdminAPI",()=>{
it("/loyalty/stats",()=>{assert.ok(a.includes("/loyalty/stats"));});
it("/loyalty/config",()=>{assert.ok(a.includes("/loyalty/config"));});
it("/loyalty/tiers",()=>{assert.ok(a.includes("/loyalty/tiers"));});
it("/loyalty/customers",()=>{assert.ok(a.includes("/loyalty/customers"));});
it("/adjust",()=>{assert.ok(a.includes("/adjust"));});
it("/loyalty/expire",()=>{assert.ok(a.includes("/loyalty/expire"));});
});
describe("AdminTabs",()=>{
it("loyaltyTab",()=>{assert.ok(a.includes("loyaltyTab"));});
it("stats",()=>{assert.ok(a.includes('loyaltyTab === "stats"'));});
it("tiers",()=>{assert.ok(a.includes('loyaltyTab === "tiers"'));});
it("customers",()=>{assert.ok(a.includes('loyaltyTab === "customers"'));});
it("config",()=>{assert.ok(a.includes('loyaltyTab === "config"'));});
it("modals",()=>{assert.ok(a.includes("showModal"));assert.ok(a.includes("hideModal"));});
});
describe("CustAccount",()=>{
it("loadAccountLoyalty",()=>{assert.ok(c.includes("loadAccountLoyalty"));});
it("loyalty-section",()=>{assert.ok(c.includes("loyalty-section"));});
it("loyalty-content",()=>{assert.ok(c.includes("loyalty-content"));});
it("/loyalty/summary",()=>{assert.ok(c.includes("/loyalty/summary"));});
it("pointsBalance",()=>{assert.ok(c.includes("pointsBalance"));});
it("currentTier",()=>{assert.ok(c.includes("currentTier"));});
it("lifetimePoints",()=>{assert.ok(c.includes("lifetimePoints"));});
it("nextTier",()=>{assert.ok(c.includes("nextTier"));});
it("pointsHistory",()=>{assert.ok(c.includes("pointsHistory"));});
});
describe("CustCheckout",()=>{
it("loyaltyInfo",()=>{assert.ok(c.includes("loyaltyInfo"));});
it("redeem-points",()=>{assert.ok(c.includes("redeem-points"));});
it("tierDiscount",()=>{assert.ok(c.includes("tierDiscount"));});
it("pointsEarnOnThisOrder",()=>{assert.ok(c.includes("pointsEarnOnThisOrder"));});
it("redeemPoints",()=>{assert.ok(c.includes("redeemPoints"));});
});
describe("i18n",()=>{
var keys=["loyalty","loyaltyNotAvailable","availablePoints","currentTier","lifetimePoints","redeemed","nextTier","needed","tierDiscount","pointsHistory","noPointsHistory","redeemPoints","pointsEarnOnThisOrder","max","balance"];
it("Lao",()=>{var lo=c.substring(c.indexOf("lo: {"),c.indexOf("en: {"));for(var k of keys)assert.ok(lo.includes(k+":")||lo.includes(k+"':"),"missing:"+k);});
it("English",()=>{var en=c.substring(c.indexOf("en: {"),c.indexOf("// HELPERS", c.indexOf("en: {")-1));for(var k of keys)assert.ok(en.includes(k+":")||en.includes(k+"':"),"missing:"+k);});
});
describe("Preserve",()=>{
it("wireframe",()=>{assert.equal(md5(fs2.readFileSync("nb_lao_wireframes_v2_updated.html")),"aebe02f72a5852289b1a7ad27c7dd657");});
it("CSS",()=>{assert.equal(md5(fs2.readFileSync("styles/nblao.css")),"ad86eea2c740140705b8c06b2419d1a4");});
it("JS",()=>{assert.equal(md5(fs2.readFileSync("js/nblao.js")),"b53a5966017bdd3fb7794e58822aeb98");});
it("admin",()=>{assert.equal(md5(fs2.readFileSync("admin.html")),"bf1c012c4d21b699817846e1f80f47c5");});
});
describe("Routes",()=>{
it("server",()=>{assert.ok(fs2.readFileSync("backend/server.js","utf8").includes("/api/loyalty"));});
it("admin/loyalty/stats",()=>{assert.ok(fs2.readFileSync("backend/routes/admin/loyalty.js","utf8").includes("/loyalty/stats"));});
it("admin/loyalty/config",()=>{assert.ok(fs2.readFileSync("backend/routes/admin/loyalty.js","utf8").includes("/loyalty/config"));});
it("admin/loyalty/tiers",()=>{assert.ok(fs2.readFileSync("backend/routes/admin/loyalty.js","utf8").includes("/loyalty/tiers"));});
it("admin/loyalty/customers",()=>{assert.ok(fs2.readFileSync("backend/routes/admin/loyalty.js","utf8").includes("/loyalty/customers"));});
it("admin/loyalty/expire",()=>{assert.ok(fs2.readFileSync("backend/routes/admin/loyalty.js","utf8").includes("/loyalty/expire"));});
it("auth",()=>{assert.ok(fs2.readFileSync("backend/routes/loyalty.js","utf8").includes("authMiddleware"));});
it("adminMw",()=>{assert.ok(fs2.readFileSync("backend/routes/admin.js","utf8").includes("adminMiddleware"));});
});
describe("Liveness",()=>{
var http=require("http");
function get(p){return new Promise(function(ok,no){http.get("http://localhost:3001"+p,function(r){var d="";r.on("data",function(c){d+=c});r.on("end",function(){ok({s:r.statusCode,b:d})});}).on("error",no);});}
it("health",async function(){var r=await get("/api/health");assert.equal(r.s,200);});
it("tiers",async function(){var r=await get("/api/loyalty/tiers");assert.equal(r.s,200);assert.ok(JSON.parse(r.b).length>=4);});
it("config",async function(){var r=await get("/api/loyalty/config");assert.equal(r.s,200);assert.ok(JSON.parse(r.b).enabled!==undefined);});
it("admin",async function(){var r=await get("/admin.html");assert.equal(r.s,200);assert.ok(r.b.includes("loadLoyalty"));});
it("customer",async function(){var r=await get("/customer.html");assert.equal(r.s,200);assert.ok(r.b.includes("customer.js"));});
});
});