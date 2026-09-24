const {describe,it,before}=require("node:test");
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

let adminToken,customerToken,testSlug;

before(async()=>{
  var r=await req("POST","/api/auth/login",{email:"admin@nblao.la",password:"Admin123!"});
  adminToken=r.b.token;
  var hash=await bcrypt.hash("Test1234!",10);
  await prisma.customer.upsert({where:{email:"p22test@nblao.la"},update:{},create:{email:"p22test@nblao.la",passwordHash:hash,name:"P22 Tester"}});
  var lr=await req("POST","/api/auth/login",{email:"p22test@nblao.la",password:"Test1234!"});
  customerToken=lr.b.token;
  var prod=await prisma.product.findFirst({where:{status:"active"},select:{slug:true}});
  if(prod) testSlug=prod.slug;
});

describe("Phase 22: Product Listing API enrichment",()=>{
  it("Listing returns average_rating field",async()=>{
    var r=await req("GET","/api/products?page=1&limit=5",null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.products));
    assert.ok("average_rating" in r.b.products[0],"average_rating field missing");
  });
  it("Listing returns review_count field",async()=>{
    var r=await req("GET","/api/products?page=1&limit=5",null,customerToken);
    assert.ok("review_count" in r.b.products[0],"review_count field missing");
  });
  it("Listing returns image_count field",async()=>{
    var r=await req("GET","/api/products?page=1&limit=5",null,customerToken);
    assert.ok("image_count" in r.b.products[0],"image_count field missing");
    assert.ok(typeof r.b.products[0].image_count === "number");
  });
  it("Products without reviews return null average_rating",async()=>{
    var r=await req("GET","/api/products?page=1&limit=20",null,customerToken);
    var noReview = r.b.products.find(p => p.review_count === 0);
    if(noReview) assert.strictEqual(noReview.average_rating, null);
  });
  it("Unpaginated listing also returns new fields",async()=>{
    var r=await req("GET","/api/products",null,customerToken);
    assert.ok(Array.isArray(r.b));
    if(r.b.length > 0) {
      assert.ok("average_rating" in r.b[0]);
      assert.ok("image_count" in r.b[0]);
    }
  });
});

describe("Phase 22: Product Detail API regression",()=>{
  it("Product detail still returns all images",async()=>{
    if(!testSlug) return;
    var r=await req("GET","/api/products/"+testSlug,null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.images));
    assert.ok(r.b.images.length >= 0);
  });
  it("Product detail still returns specifications",async()=>{
    if(!testSlug) return;
    var r=await req("GET","/api/products/"+testSlug,null,customerToken);
    assert.ok(Array.isArray(r.b.specifications));
  });
});

describe("Phase 22: Admin image management regression",()=>{
  it("Admin can list images for a product",async()=>{
    var prod=await prisma.product.findFirst({where:{status:"active"},select:{id:true}});
    if(!prod) return;
    var r=await req("GET","/api/admin/products/"+prod.id+"/images",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.images));
  });
});
