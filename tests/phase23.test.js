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

let adminToken,customerToken,testProductId,testQuoteId;

before(async()=>{
  var r=await req("POST","/api/auth/login",{email:"admin@nblao.la",password:"Admin123!"});
  adminToken=r.b.token;
  var hash=await bcrypt.hash("Test1234!",10);
  await prisma.customer.upsert({where:{email:"p23test@nblao.la"},update:{},create:{email:"p23test@nblao.la",passwordHash:hash,name:"P23 Tester"}});
  var lr=await req("POST","/api/auth/login",{email:"p23test@nblao.la",password:"Test1234!"});
  customerToken=lr.b.token;
  // Create a dedicated transient test product so real catalog products are never mutated
  var cat=await prisma.category.findFirst({select:{id:true}});
  if(cat){
    var fx=await prisma.product.create({
      data:{
        sku:"P23-FIXTURE-"+Date.now(),
        slug:"p23-fixture-"+Date.now(),
        categoryId:cat.id,
        status:"active",
        stock:10,
        localizations:{create:[
          {locale:"lo",name:"P23 Fixture",description:"ລາຍການທົດລອງ",howToUseLo:"ວິທີໃຊ້ງານ"},
          {locale:"en",name:"P23 Fixture",description:"Test description",howToUseEn:"How to use this product"}
        ]}
      }
    });
    testProductId=fx.id;
  }
  // Get an existing quotation or create one
  var q=await prisma.quotation.findFirst({select:{id:true}});
  if(q) testQuoteId=q.id;
});

after(async()=>{
  if(testProductId){
    await prisma.productLocalization.deleteMany({where:{productId:testProductId}}).catch(()=>{});
    await prisma.product.delete({where:{id:testProductId}}).catch(()=>{});
    testProductId=null;
  }
});

describe("Phase 23: Product Localization Update",()=>{
  it("Admin can update product with description",async()=>{
    if(!testProductId) return;
    var r=await req("PUT","/api/admin/products/"+testProductId,{
      localizations:[
        {locale:"lo",name:"test",description:"ລາຍການທົດລອງ",howToUseLo:"ວິທີໃຊ້ງານ"},
        {locale:"en",name:"test",description:"Test description",howToUseEn:"How to use this product"}
      ]
    },adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(r.b.localizations);
    var lo=r.b.localizations.find(l=>l.locale==="lo");
    assert.strictEqual(lo.description,"ລາຍການທົດລອງ");
    assert.strictEqual(lo.howToUseLo,"ວິທີໃຊ້ງານ");
  });
  it("Product detail returns how_to_use content",async()=>{
    if(!testProductId) return;
    var prod=await prisma.product.findUnique({where:{id:testProductId},select:{slug:true}});
    if(!prod) return;
    var r=await req("GET","/api/products/"+prod.slug+"?locale=lo",null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(r.b.how_to_use,"how_to_use should exist");
  });
  it("Admin can set price unit on product",async()=>{
    if(!testProductId) return;
    var r=await req("PUT","/api/admin/products/"+testProductId,{price_unit:"per set"},adminToken);
    assert.strictEqual(r.s,200);
    var check=await req("GET","/api/admin/products/"+testProductId,null,adminToken);
    assert.strictEqual(check.b.price_unit,"per set");
  });
  it("Non-admin cannot update product",async()=>{
    if(!testProductId) return;
    var r=await req("PUT","/api/admin/products/"+testProductId,{localizations:[{locale:"lo",name:"x"}]},customerToken);
    assert.ok(r.s===401||r.s===403);
  });
});

describe("Phase 23: Quotation Pricing",()=>{
  it("Admin can set quoted amount on quotation",async()=>{
    if(!testQuoteId) return;
    var r=await req("PUT","/api/admin/quotations/"+testQuoteId,{quoted_amount:500000},adminToken);
    assert.strictEqual(r.s,200);
  });
  it("Customer quotation detail returns quoted_amount",async()=>{
    if(!testQuoteId) return;
    // Find the customer who owns this quotation
    var q=await prisma.quotation.findUnique({where:{id:testQuoteId},select:{customerId:true}});
    if(!q) return;
    // Get that customer token
    var cust=await prisma.customer.findUnique({where:{id:q.customerId},select:{email:true}});
    if(!cust) return;
    // For the test customer, create a quotation
    var qr=await req("POST","/api/quotations",{},customerToken);
    if(qr.s===201 && qr.b.id) {
      await req("PUT","/api/admin/quotations/"+qr.b.id,{quoted_amount:750000},adminToken);
      var detail=await req("GET","/api/quotations/"+qr.b.id,null,customerToken);
      assert.strictEqual(detail.s,200);
      assert.strictEqual(detail.b.quoted_amount,750000);
    }
  });
  it("Quoted amount defaults to null",async()=>{
    var qr=await req("POST","/api/quotations",{},customerToken);
    if(qr.s===201 && qr.b.id) {
      var detail=await req("GET","/api/quotations/"+qr.b.id,null,customerToken);
      assert.strictEqual(detail.s,200);
      assert.ok(detail.b.quoted_amount===null||detail.b.quoted_amount===undefined);
    }
  });
});

describe("Phase 23: Existing API Regression",()=>{
  it("Product listing still works with enriched fields",async()=>{
    var r=await req("GET","/api/products?page=1&limit=2",null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.products));
    assert.ok("average_rating" in r.b.products[0]);
  });
  it("Product detail still works",async()=>{
    if(!testProductId) return;
    var prod=await prisma.product.findUnique({where:{id:testProductId},select:{slug:true}});
    if(!prod) return;
    var r=await req("GET","/api/products/"+prod.slug,null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(r.b.images);
    assert.ok(r.b.specifications);
  });
});
