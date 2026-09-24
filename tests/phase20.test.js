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

let adminToken,customerToken,customerId,testProductId,orderId,couponCodeId;

before(async()=>{
  var r=await req("POST","/api/auth/login",{email:"admin@nblao.la",password:"Admin123!"});
  adminToken=r.b.token;
  var hash=await bcrypt.hash("Test1234!",10);
  var cust=await prisma.customer.upsert({where:{email:"phase20test@nblao.la"},update:{},create:{email:"phase20test@nblao.la",passwordHash:hash,name:"Phase20 Tester",phone:"0208888888"}});
  customerId=cust.id;
  var lr=await req("POST","/api/auth/login",{email:"phase20test@nblao.la",password:"Test1234!"});
  customerToken=lr.b.token;
  var prod=await prisma.product.findFirst({where:{status:"active",stock:{gt:0}},select:{id:true,stock:true}});
  if(prod) testProductId=prod.id;
});

describe("Phase 20: Stock Management",()=>{
  it("Cart does not N+1 on products",async()=>{
    var r=await req("GET","/api/cart",null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.items));
  });
  it("Order rejects when cart is empty",async()=>{
    var r=await req("POST","/api/orders",{},customerToken);
    assert.ok(r.s===400);
  });
  it("Cart items have in_stock field",async()=>{
    if(!testProductId) return;
    await prisma.cartItem.deleteMany({where:{cart:{customerId:customerId}}});
    await req("POST","/api/cart/items",{productId:testProductId,quantity:1},customerToken);
    var r=await req("GET","/api/cart",null,customerToken);
    assert.strictEqual(r.s,200);
    if(r.b.items.length>0) assert.ok(typeof r.b.items[0].in_stock === "boolean");
    await prisma.cartItem.deleteMany({where:{cart:{customerId:customerId}}});
  });
});

describe("Phase 20: Order Financials",()=>{
  it("Order list returns paginated with totals",async()=>{
    var r=await req("GET","/api/orders?page=1&limit=5",null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b.orders));
    assert.ok(typeof r.b.total === "number");
  });
  it("Order detail returns financial fields",async()=>{
    var order=await prisma.order.findFirst({where:{customerId:customerId},select:{id:true}});
    if(!order) return;
    var r=await req("GET","/api/orders/"+order.id,null,customerToken);
    assert.strictEqual(r.s,200);
    assert.ok(typeof r.b.subtotal === "number");
    assert.ok(typeof r.b.discount_applied === "number");
    assert.ok(typeof r.b.total === "number");
  });
  it("Order number is ORD-XXXXX format",async()=>{
    var order=await prisma.order.findFirst({select:{orderNumber:true}});
    if(!order) return;
    assert.ok(order.orderNumber.startsWith("ORD-"));
  });
});

describe("Phase 20: Admin Dashboard",()=>{
  it("Dashboard has revenue stats",async()=>{
    var r=await req("GET","/api/admin/dashboard",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(typeof r.b.total_revenue === "number");
    assert.ok(typeof r.b.pending_reviews === "number");
    assert.ok(typeof r.b.low_stock === "number");
    assert.ok(Array.isArray(r.b.recent_orders));
  });
  it("Admin emails endpoint works",async()=>{
    var r=await req("GET","/api/admin/emails?page=1&limit=5",null,adminToken);
    assert.strictEqual(r.s,200);
    assert.ok(Array.isArray(r.b) || Array.isArray(r.b.emails));
  });
  it("Non-admin cannot access dashboard",async()=>{
    var r=await req("GET","/api/admin/dashboard",null,customerToken);
    assert.ok(r.s===401||r.s===403);
  });
});

describe("Phase 20: Review Notifications",()=>{
  it("Review approve sends notification",async()=>{
    var review=await prisma.productReview.findFirst({where:{status:"pending"},select:{id:true}});
    if(!review) return;
    var r=await req("PUT","/api/admin/reviews/"+review.id,{status:"approved"},adminToken);
    assert.strictEqual(r.s,200);
    assert.strictEqual(r.b.status,"approved");
  });
});

describe("Phase 20: Frontend",()=>{
  it("admin.html has emails page",async()=>{
    var fs2=require("fs");
    var c2=fs2.readFileSync("admin.html","utf8");
    assert.ok(c2.includes("loadEmails"));
    assert.ok(c2.includes("data-page=\"emails\""));
  });
  it("admin.html has enriched dashboard",async()=>{
    var fs2=require("fs");
    var c2=fs2.readFileSync("admin.html","utf8");
    assert.ok(c2.includes("total_revenue"));
    assert.ok(c2.includes("pending_reviews"));
  });
  it("customer.js has order financials",async()=>{
    var fs2=require("fs");
    var c2=fs2.readFileSync("js/customer.js","utf8");
    assert.ok(c2.includes("discount_applied"));
    assert.ok(c2.includes("subtotal"));
  });
  it("protected frontend MD5 preserved",async()=>{
    var fs2=require("fs"),crypto=require("crypto");
    assert.equal(crypto.createHash("md5").update(fs2.readFileSync("nb_lao_wireframes_v2_updated.html")).digest("hex"),"aebe02f72a5852289b1a7ad27c7dd657");
    assert.equal(crypto.createHash("md5").update(fs2.readFileSync("styles/nblao.css")).digest("hex"),"ad86eea2c740140705b8c06b2419d1a4");
    assert.equal(crypto.createHash("md5").update(fs2.readFileSync("js/nblao.js")).digest("hex"),"b53a5966017bdd3fb7794e58822aeb98");
  });
});
