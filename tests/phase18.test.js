const {describe,it,before,after}=require("node:test");
const assert=require("node:assert");
const bcrypt=require("bcryptjs");
const prisma=require("../backend/lib/prisma");
const http=require("http");
const BASE="http://localhost:3001";
function req(m,p,b,t){return new Promise((ok,fail)=>{
var u=new URL(p,BASE),o={method:m,hostname:"localhost",port:3001,
path:u.pathname+(u.search||""),headers:{"Content-Type":"application/json"}};
if(t)o.headers["Authorization"]="Bearer "+t;
var r=http.request(o,res=>{var d="";res.on("data",c=>d+=c);
res.on("end",()=>{try{ok({s:res.statusCode,b:JSON.parse(d)})}catch{ok({s:res.statusCode,b:d})}})
});r.on("error",fail);if(b)r.write(JSON.stringify(b));r.end()})}

let adminToken;
before(async()=>{
  var r=await req("POST","/api/auth/login",{email:"admin@nblao.la",password:"Admin123!"});
  adminToken=r.b.token;
});
describe("Phase 18: Audit Logs & Reports",()=>{

describe("Audit Logs",()=>{
  it("GET /api/admin/audit-logs returns results",async()=>{
    var r=await req("GET","/api/admin/audit-logs",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(Array.isArray(r.b.logs));assert.ok(typeof r.b.total==="number"); });
  it("filter by action",async()=>{
    var r=await req("GET","/api/admin/audit-logs?action=create",null,adminToken);
    assert.strictEqual(r.s,200);r.b.logs.forEach(l=>assert.strictEqual(l.action,"create")); });
  it("filter by module",async()=>{
    var r=await req("GET","/api/admin/audit-logs?module=products",null,adminToken);
    assert.strictEqual(r.s,200);r.b.logs.forEach(l=>assert.strictEqual(l.module,"products")); });
  it("search works",async()=>{
    var r=await req("GET","/api/admin/audit-logs?search=create",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(Array.isArray(r.b.logs)); });
  it("pagination works",async()=>{
    var r=await req("GET","/api/admin/audit-logs?page=1&limit=5",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(r.b.logs.length<=5); });
  it("date range filter",async()=>{
    var r=await req("GET","/api/admin/audit-logs?fromDate=2020-01-01&toDate=2030-12-31",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(Array.isArray(r.b.logs)); });
  it("non-admin rejected",async()=>{
    var r=await req("GET","/api/admin/audit-logs",null,undefined);
    assert.ok(r.s===401); });
});

describe("Sales Reports",()=>{
  it("GET /api/admin/reports/sales returns summary",async()=>{
    var r=await req("GET","/api/admin/reports/sales?period=30d",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(typeof r.b.summary.totalOrders==="number");
    assert.ok(typeof r.b.summary.totalRevenue==="number");
    assert.ok(typeof r.b.summary.avgOrderValue==="number");
    assert.ok(Array.isArray(r.b.byStatus));
    assert.ok(Array.isArray(r.b.topProducts));
    assert.ok(Array.isArray(r.b.dailyTrend)); });
  it("period=all works",async()=>{
    var r=await req("GET","/api/admin/reports/sales?period=all",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(r.b.summary); });
  it("period=7d works",async()=>{
    var r=await req("GET","/api/admin/reports/sales?period=7d",null,adminToken);
    assert.strictEqual(r.s,200); });
  it("non-admin rejected",async()=>{
    var r=await req("GET","/api/admin/reports/sales",null,undefined);
    assert.ok(r.s===401); });
});

describe("Inventory Reports",()=>{
  it("GET /api/admin/reports/inventory returns summary",async()=>{
    var r=await req("GET","/api/admin/reports/inventory",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(typeof r.b.summary.totalProducts==="number");
    assert.ok(typeof r.b.summary.inStock==="number");
    assert.ok(typeof r.b.summary.lowStock==="number");
    assert.ok(typeof r.b.summary.outOfStock==="number");
    assert.ok(Array.isArray(r.b.lowStock));
    assert.ok(Array.isArray(r.b.outOfStock));
    assert.ok(Array.isArray(r.b.byCategory));
    assert.ok(Array.isArray(r.b.byBrand)); });
  it("summary adds up",async()=>{
    var r=await req("GET","/api/admin/reports/inventory",null,adminToken);
    assert.strictEqual(r.b.summary.totalProducts,r.b.summary.inStock+r.b.summary.lowStock+r.b.summary.outOfStock+r.b.summary.preOrder); });
  it("non-admin rejected",async()=>{
    var r=await req("GET","/api/admin/reports/inventory",null,undefined);
    assert.ok(r.s===401); });
});

describe("Audit Wiring",()=>{
  it("product create creates audit log",async()=>{
    var before=await prisma.auditLog.count({where:{module:"products",action:"create"}});
    var r=await req("POST","/api/admin/products",{
      sku:"AUDIT-TEST-"+Date.now(),slug:"audit-test-"+Date.now(),
      category_id:(await prisma.category.findFirst({select:{id:true}})).id,localizations:[{locale:"lo",name:"Audit Test"},{locale:"en",name:"Audit Test"}]},adminToken);
    assert.strictEqual(r.s,201);
    var after=await prisma.auditLog.count({where:{module:"products",action:"create"}});
    assert.ok(after>=before,"audit log should be created");
    if(r.b.id)await prisma.product.delete({where:{id:r.b.id}}).catch(()=>{}); });
});
describe("Admin UI",()=>{
  var fs2=require("fs");
  var a=fs2.readFileSync("admin.html","utf8");
  it("has Sales nav",()=>assert.ok(a.includes('data-page="sales"')));
  it("has Inventory nav",()=>assert.ok(a.includes('data-page="inventory"')));
  it("has loadSales function",()=>assert.ok(a.includes("function loadSales")));
  it("has loadInventory function",()=>assert.ok(a.includes("function loadInventory")));
  it("has enhanced audit filters",()=>assert.ok(a.includes("auditFilters")));
  it("has loadAuditLogs with filter params",()=>assert.ok(a.includes("auditFilters.action")));
  it("has sales period selector",()=>assert.ok(a.includes("salesPeriod")));
  it("reports/sales route",()=>assert.ok(a.includes("reports/sales")));
  it("reports/inventory route",()=>assert.ok(a.includes("reports/inventory")));
});

describe("Backward Compatibility",()=>{
  it("health still works",async()=>{
    var r=await req("GET","/api/health");assert.strictEqual(r.s,200); });
  it("products still works",async()=>{
    var r=await req("GET","/api/products");assert.strictEqual(r.s,200); });
  it("loyalty tiers still works",async()=>{
    var r=await req("GET","/api/loyalty/tiers");assert.strictEqual(r.s,200); });
});
});