const {describe,it,before,after}=require("node:test");
const assert=require("node:assert");
const bcrypt=require("bcryptjs");
const prisma=require("../backend/lib/prisma");
const http=require("http");
const BASE="http://localhost:3001";

function req(m,p,b,tok){return new Promise((ok,fail)=>{
  var u=new URL(p,BASE),o={method:m,hostname:"localhost",port:3001,
    path:u.pathname+(u.search||""),headers:{"Content-Type":"application/json"}};
  if(tok)o.headers["Authorization"]="Bearer "+tok;
  var r=http.request(o,res=>{var d="";res.on("data",c=>d+=c);
    res.on("end",()=>{try{ok({s:res.statusCode,b:JSON.parse(d)})}catch{ok({s:res.statusCode,b:d})}})
  });r.on("error",fail);if(b)r.write(JSON.stringify(b));r.end()})}

let adminToken,customerToken,testProductId,testProductId2;

before(async()=>{
  var r=await req("POST","/api/auth/login",{email:"admin@nblao.la",password:"Admin123!"});
  adminToken=r.b.token;
  var hash=await bcrypt.hash("Test1234!",10);
  await prisma.customer.upsert({where:{email:"p21test@nblao.la"},update:{},create:{email:"p21test@nblao.la",passwordHash:hash,name:"P21 Tester"}});
  var lr=await req("POST","/api/auth/login",{email:"p21test@nblao.la",password:"Test1234!"});
  customerToken=lr.b.token;
  var prods=await prisma.product.findMany({where:{status:"active"},select:{id:true},take:2,orderBy:{id:"asc"}});
  if(prods.length>0) testProductId=prods[0].id;
  if(prods.length>1) testProductId2=prods[1].id;
});

// ═══════════════════════════════════════════════
// PRODUCT IMAGES
// ═══════════════════════════════════════════════
describe("Phase 21: Product Images",()=>{
  it("Admin add image",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/images",{url:"https://example.com/img1.jpg",altLo:"ພາບ 1",altEn:"Image 1",isPrimary:true,sortOrder:0},adminToken);
    assert.strictEqual(r.s,201);assert.ok(r.b.id);assert.strictEqual(r.b.isPrimary,true);
  });
  it("Admin list images",async()=>{
    var r=await req("GET","/api/admin/products/"+testProductId+"/images",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(Array.isArray(r.b.images));assert.ok(r.b.images.length>0);
  });
  it("Admin update image",async()=>{
    var list=await req("GET","/api/admin/products/"+testProductId+"/images",null,adminToken);
    var imgId=list.b.images[0].id;
    var r=await req("PUT","/api/admin/products/"+testProductId+"/images/"+imgId,{altEn:"Updated"},adminToken);
    assert.strictEqual(r.s,200);assert.strictEqual(r.b.altEn,"Updated");
  });
  it("Non-admin cannot add images",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/images",{url:"https://x.com/bad.jpg"},customerToken);
    assert.ok(r.s===401||r.s===403);
  });
  it("Admin delete image",async()=>{
    var list=await req("GET","/api/admin/products/"+testProductId+"/images",null,adminToken);
    var imgId=list.b.images[0].id;
    var r=await req("DELETE","/api/admin/products/"+testProductId+"/images/"+imgId,null,adminToken);
    assert.strictEqual(r.s,200);
  });
  it("Invalid product ID returns 400",async()=>{
    var r=await req("GET","/api/admin/products/abc/images",null,adminToken);
    assert.strictEqual(r.s,400);
  });
  it("Missing URL returns 400",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/images",{},adminToken);
    assert.strictEqual(r.s,400);
  });
});

// ═══════════════════════════════════════════════
// PRODUCT SPECIFICATIONS
// ═══════════════════════════════════════════════
describe("Phase 21: Product Specifications",()=>{
  var specId;
  it("Admin add spec",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/specs",{specKey:"weight",specLabelLo:"ນ້ຳໜັກ",specLabelEn:"Weight",specValue:"2.5 kg",sortOrder:0},adminToken);
    assert.strictEqual(r.s,201);assert.ok(r.b.id);specId=r.b.id;
  });
  it("Admin list specs",async()=>{
    var r=await req("GET","/api/admin/products/"+testProductId+"/specs",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(Array.isArray(r.b.specifications));
  });
  it("Admin update spec",async()=>{
    var r=await req("PUT","/api/admin/products/"+testProductId+"/specs/"+specId,{specValue:"3.0 kg"},adminToken);
    assert.strictEqual(r.s,200);assert.strictEqual(r.b.specValue,"3.0 kg");
  });
  it("Duplicate spec key returns 409",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/specs",{specKey:"weight",specValue:"1 kg"},adminToken);
    assert.strictEqual(r.s,409);
  });
  it("Missing required fields returns 400",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/specs",{specKey:"color"},adminToken);
    assert.strictEqual(r.s,400);
  });
  it("Non-admin cannot add specs",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/specs",{specKey:"x",specValue:"y"},customerToken);
    assert.ok(r.s===401||r.s===403);
  });
  it("Admin delete spec",async()=>{
    var r=await req("DELETE","/api/admin/products/"+testProductId+"/specs/"+specId,null,adminToken);
    assert.strictEqual(r.s,200);
  });
});

// ═══════════════════════════════════════════════
// PRODUCT DOCUMENTS
// ═══════════════════════════════════════════════
describe("Phase 21: Product Documents",()=>{
  var docId;
  it("Admin add document",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/documents",{titleLo:"ເອກະສານ 1",titleEn:"Document 1",fileUrl:"https://example.com/doc1.pdf",fileType:"pdf",sortOrder:0},adminToken);
    assert.strictEqual(r.s,201);assert.ok(r.b.id);docId=r.b.id;
  });
  it("Admin list documents",async()=>{
    var r=await req("GET","/api/admin/products/"+testProductId+"/documents",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(Array.isArray(r.b.documents));
  });
  it("Admin update document",async()=>{
    var r=await req("PUT","/api/admin/products/"+testProductId+"/documents/"+docId,{titleEn:"Updated Doc"},adminToken);
    assert.strictEqual(r.s,200);assert.strictEqual(r.b.titleEn,"Updated Doc");
  });
  it("Missing required fields returns 400",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/documents",{titleLo:"X"},adminToken);
    assert.strictEqual(r.s,400);
  });
  it("Non-admin cannot add documents",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/documents",{titleLo:"X",titleEn:"Y",fileUrl:"http://x.com"},customerToken);
    assert.ok(r.s===401||r.s===403);
  });
  it("Admin delete document",async()=>{
    var r=await req("DELETE","/api/admin/products/"+testProductId+"/documents/"+docId,null,adminToken);
    assert.strictEqual(r.s,200);
  });
});

// ═══════════════════════════════════════════════
// PRODUCT RELATIONS
// ═══════════════════════════════════════════════
describe("Phase 21: Product Relations",()=>{
  var relId;
  it("Admin add relation",async()=>{
    if(!testProductId2)return;
    var r=await req("POST","/api/admin/products/"+testProductId+"/relations",{relatedProductId:testProductId2},adminToken);
    assert.strictEqual(r.s,201);relId=r.b.id;
  });
  it("Admin list relations",async()=>{
    var r=await req("GET","/api/admin/products/"+testProductId+"/relations",null,adminToken);
    assert.strictEqual(r.s,200);assert.ok(Array.isArray(r.b.relations));
  });
  it("Self-relation returns 400",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/relations",{relatedProductId:testProductId},adminToken);
    assert.strictEqual(r.s,400);
  });
  it("Duplicate relation returns 409",async()=>{
    if(!testProductId2)return;
    var r=await req("POST","/api/admin/products/"+testProductId+"/relations",{relatedProductId:testProductId2},adminToken);
    assert.strictEqual(r.s,409);
  });
  it("Non-admin cannot add relations",async()=>{
    var r=await req("POST","/api/admin/products/"+testProductId+"/relations",{relatedProductId:testProductId},customerToken);
    assert.ok(r.s===401||r.s===403);
  });
  it("Admin delete relation",async()=>{
    if(!relId)return;
    var r=await req("DELETE","/api/admin/products/"+testProductId+"/relations/"+relId,null,adminToken);
    assert.strictEqual(r.s,200);
  });
});

// ═══════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════
describe("Phase 21: CSV Export",()=>{
  it("Sales CSV export returns CSV data",async()=>{
    var r=await req("GET","/api/admin/reports/sales/export?period=30d",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(typeof r.b==="string");
    assert.ok(r.b.includes("Order Number"));
  });
  it("Inventory CSV export returns CSV data",async()=>{
    var r=await req("GET","/api/admin/reports/inventory/export",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(typeof r.b==="string");
    assert.ok(r.b.includes("SKU"));
  });
  it("Non-admin cannot export CSV",async()=>{
    var r=await req("GET","/api/admin/reports/sales/export",null,customerToken);
    assert.ok(r.s===401||r.s===403);
  });
});
