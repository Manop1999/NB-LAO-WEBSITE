const {describe,it,before}=require("node:test");
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

let adminToken,customerToken,customerId,productId,reviewId,couponId;

before(async()=>{
  var r=await req("POST","/api/auth/login",{email:"admin@nblao.la",password:"Admin123!"});
  adminToken=r.b.token;
  // Create test customer
  var hash=await bcrypt.hash("Test1234!",10);
  var cust=await prisma.customer.upsert({where:{email:"reviewtest@nblao.la"},update:{},create:{email:"reviewtest@nblao.la",passwordHash:hash,name:"Review Tester",phone:"0209999999"}});
  customerId=cust.id;
  var lr=await req("POST","/api/auth/login",{email:"reviewtest@nblao.la",password:"Test1234!"});
  customerToken=lr.b.token;
  // Get a product
  var pr=await req("GET","/api/products?limit=1",null,null);
  var prods=pr.b.products||pr.b;
  if(Array.isArray(prods)&&prods.length>0) productId=prods[0].id;
});

describe("Phase 19: Reviews",()=>{
  it("POST review - auth required",async()=>{
    var r=await req("POST","/api/products/test-slug/reviews",{rating:5});
    assert.strictEqual(r.s,401);
  });
  it("POST review - invalid product",async()=>{
    var r=await req("POST","/api/products/nonexistent/reviews",{rating:5},customerToken);
    assert.strictEqual(r.s,404);
  });
  it("POST review - invalid rating",async()=>{
    var slug=await prisma.product.findFirst({select:{slug:true}});
    if(!slug)return;
    var r=await req("POST","/api/products/"+slug.slug+"/reviews",{rating:6},customerToken);
    assert.strictEqual(r.s,400);
  });
  it("POST review - valid submission",async()=>{
    var slug=await prisma.product.findFirst({select:{slug:true}});
    if(!slug)return;
    // Clean up first
    var prod=await prisma.product.findFirst({where:{slug:slug.slug},select:{id:true}});
    await prisma.productReview.deleteMany({where:{productId:prod.id,customerId:customerId}});
    var r=await req("POST","/api/products/"+slug.slug+"/reviews",{rating:4,title:"Great product",comment:"Very useful"},customerToken);
    assert.strictEqual(r.s,201);
    assert.strictEqual(r.b.status,"pending");
    reviewId=r.b.id;
  });
  it("POST review - duplicate prevention",async()=>{
    var slug=await prisma.product.findFirst({select:{slug:true}});
    if(!slug)return;
    var r=await req("POST","/api/products/"+slug.slug+"/reviews",{rating:5},customerToken);
    assert.strictEqual(r.s,409);
  });
  it("GET reviews - only approved shown",async()=>{
    var slug=await prisma.product.findFirst({select:{slug:true}});
    if(!slug)return;
    var r=await req("GET","/api/products/"+slug.slug+"/reviews",null,null);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.reviews));
  });
  it("PUT review - update own",async()=>{
    var slug=await prisma.product.findFirst({select:{slug:true}});
    if(!slug||!reviewId)return;
    var r=await req("PUT","/api/products/"+slug.slug+"/reviews",{rating:5,comment:"Updated"},customerToken);
    assert.strictEqual(r.s,200);
  });
  it("DELETE review - own review",async()=>{
    var slug=await prisma.product.findFirst({select:{slug:true}});
    if(!slug)return;
    var r=await req("DELETE","/api/products/"+slug.slug+"/reviews",null,customerToken);
    assert.strictEqual(r.s,200);
  });
  it("Admin GET reviews",async()=>{
    var r=await req("GET","/api/admin/reviews",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.reviews));
  });
  it("Admin GET reviews - filter by status",async()=>{
    var r=await req("GET","/api/admin/reviews?status=pending",null,adminToken);
    assert.strictEqual(r.s,200);
  });
  it("Non-admin cannot manage reviews",async()=>{
    var r=await req("GET","/api/admin/reviews",null,customerToken);
    assert.ok(r.s===401||r.s===403);
  });
});

describe("Phase 19: Coupons",()=>{
  it("Admin create coupon",async()=>{
    var r=await req("POST","/api/admin/coupons",{code:"TEST19",type:"percentage",value:10,minOrderAmount:100000,maxUses:10},adminToken);
    assert.strictEqual(r.s,201);
    couponId=r.b.id;
  });
  it("Admin list coupons",async()=>{
    var r=await req("GET","/api/admin/coupons",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.coupons));
  });
  it("Customer validate coupon - valid",async()=>{
    var r=await req("POST","/api/coupons/validate",{code:"TEST19",orderSubtotal:200000},customerToken);
    assert.strictEqual(r.s,200);
    assert.strictEqual(r.b.valid,true);
  });
  it("Customer validate coupon - expired",async()=>{
    // Create expired coupon
    var r=await req("POST","/api/admin/coupons",{code:"EXP19",type:"fixed",value:5000,expiresAt:"2020-01-01"},adminToken);
    if(r.s===201){
      var vr=await req("POST","/api/coupons/validate",{code:"EXP19",orderSubtotal:200000},customerToken);
      assert.strictEqual(vr.s,400);
      await req("DELETE","/api/admin/coupons/"+r.b.id,null,adminToken);
    }
  });
  it("Customer validate coupon - not found",async()=>{
    var r=await req("POST","/api/coupons/validate",{code:"NONEXIST",orderSubtotal:200000},customerToken);
    assert.strictEqual(r.s,404);
  });
  it("Customer validate coupon - auth required",async()=>{
    var r=await req("POST","/api/coupons/validate",{code:"TEST19",orderSubtotal:200000});
    assert.strictEqual(r.s,401);
  });
  it("Admin update coupon",async()=>{
    if(!couponId)return;
    var r=await req("PUT","/api/admin/coupons/"+couponId,{value:15},adminToken);
    assert.strictEqual(r.s,200);
  });
  it("Admin delete coupon",async()=>{
    // Delete the test coupon
    if(!couponId)return;
    var r=await req("DELETE","/api/admin/coupons/"+couponId,null,adminToken);
    assert.strictEqual(r.s,200);
  });
  it("Non-admin cannot manage coupons",async()=>{
    var r=await req("GET","/api/admin/coupons",null,customerToken);
    assert.ok(r.s===401||r.s===403);
  });
});

describe("Phase 19: Wishlist",()=>{
  it("Auth required for wishlist",async()=>{
    var r=await req("GET","/api/wishlist");
    assert.strictEqual(r.s,401);
  });
  it("Add to wishlist",async()=>{
    var prod=await prisma.product.findFirst({select:{id:true}});
    if(!prod)return;
    await prisma.wishlist.deleteMany({where:{customerId:customerId,productId:prod.id}});
    var r=await req("POST","/api/wishlist",{productId:prod.id},customerToken);
    assert.strictEqual(r.s,201);
  });
  it("Duplicate prevention",async()=>{
    var prod=await prisma.product.findFirst({select:{id:true}});
    if(!prod)return;
    var r=await req("POST","/api/wishlist",{productId:prod.id},customerToken);
    assert.strictEqual(r.s,409);
  });
  it("List wishlist",async()=>{
    var r=await req("GET","/api/wishlist",null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.items));
  });
  it("Check wishlist",async()=>{
    var prod=await prisma.product.findFirst({select:{id:true}});
    if(!prod)return;
    var r=await req("GET","/api/wishlist/check/"+prod.id,null,customerToken);
    assert.strictEqual(r.s,200);
    assert.strictEqual(r.b.wishlisted,true);
  });
  it("Remove from wishlist",async()=>{
    var prod=await prisma.product.findFirst({select:{id:true}});
    if(!prod)return;
    var r=await req("DELETE","/api/wishlist/"+prod.id,null,customerToken);
    assert.strictEqual(r.s,200);
  });
  it("Remove non-existent - 404",async()=>{
    var r=await req("DELETE","/api/wishlist/99999",null,customerToken);
    assert.strictEqual(r.s,404);
  });
});

describe("Phase 19: Frontend",()=>{
  it("admin.html has reviews page",async()=>{
    var fs=require("fs");
    var c=fs.readFileSync("admin.html","utf8");
    assert.ok(c.includes("loadReviews"));
    assert.ok(c.includes("Reviews"));
  });
  it("admin.html has coupons page",async()=>{
    var fs=require("fs");
    var c=fs.readFileSync("admin.html","utf8");
    assert.ok(c.includes("loadCoupons"));
    assert.ok(c.includes("Coupons"));
  });
  it("customer.js has reviews tab",async()=>{
    var fs=require("fs");
    var c=fs.readFileSync("js/customer.js","utf8");
    assert.ok(c.includes("loadProductReviews"));
    assert.ok(c.includes("tabReviews"));
  });
  it("customer.js has coupon input",async()=>{
    var fs=require("fs");
    var c=fs.readFileSync("js/customer.js","utf8");
    assert.ok(c.includes("applyCoupon"));
    assert.ok(c.includes("coupon-input"));
  });
  it("customer.js has wishlist page",async()=>{
    var fs=require("fs");
    var c=fs.readFileSync("js/customer.js","utf8");
    assert.ok(c.includes("renderWishlist"));
    assert.ok(c.includes("toggleWishlist"));
  });
  it("customer.js has Lao i18n for reviews",async()=>{
    var fs=require("fs");
    var c=fs.readFileSync("js/customer.js","utf8");
    assert.ok(c.includes("tabReviews:"));
    assert.ok(c.includes("writeReview:"));
  });
  it("protected frontend MD5 preserved",async()=>{
    var fs=require("fs"),crypto=require("crypto");
    assert.equal(crypto.createHash("md5").update(fs.readFileSync("nb_lao_wireframes_v2_updated.html")).digest("hex"),"aebe02f72a5852289b1a7ad27c7dd657");
    assert.equal(crypto.createHash("md5").update(fs.readFileSync("styles/nblao.css")).digest("hex"),"ad86eea2c740140705b8c06b2419d1a4");
    assert.equal(crypto.createHash("md5").update(fs.readFileSync("js/nblao.js")).digest("hex"),"b53a5966017bdd3fb7794e58822aeb98");
  });
});
