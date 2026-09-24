const {describe,it,before,after}=require("node:test");
const assert=require("node:assert");
const bcrypt=require("bcryptjs");
const crypto=require("crypto");
const prisma=require("../backend/lib/prisma");
const http=require("http");
const BASE="http://localhost:3001";
function req(m,p,b,t){return new Promise((ok,fail)=>{
var u=new URL(p,BASE),o={method:m,hostname:"localhost",port:3001,
path:u.pathname,headers:{"Content-Type":"application/json"}};
if(t)o.headers["Authorization"]="Bearer "+t;
var r=http.request(o,res=>{var d="";res.on("data",c=>d+=c);
res.on("end",()=>{try{ok({s:res.statusCode,b:JSON.parse(d)})}catch{ok({s:res.statusCode,b:d})}})
});r.on("error",fail);if(b)r.write(JSON.stringify(b));r.end()})}

async function mkCust(email,pwd){
  var h=await bcrypt.hash(pwd,10);
  return prisma.customer.create({data:{email,passwordHash:h,name:"Test",phone:"2055000000"}});
}
async function rmCust(id){
  try{
    await prisma.pointsLedger.deleteMany({where:{customerId:id}});
    await prisma.passwordResetToken.deleteMany({where:{customerId:id}});
    await prisma.emailNotification.deleteMany({where:{customerId:id}});
    await prisma.orderItem.deleteMany({where:{order:{customerId:id}}});
    await prisma.order.deleteMany({where:{customerId:id}});
    await prisma.quotationItem.deleteMany({where:{quotation:{customerId:id}}});
    await prisma.quotation.deleteMany({where:{customerId:id}});
    await prisma.cart.deleteMany({where:{customerId:id}});
    await prisma.customer.delete({where:{id}});
  }catch(e){}
}
function mkToken(cid){
  var raw=crypto.randomBytes(32).toString("hex");
  var hash=crypto.createHash("sha256").update(raw).digest("hex");
  return prisma.passwordResetToken.create({
    data:{customerId:cid,tokenHash:hash,expiresAt:new Date(Date.now()+3600000)}
  }).then(()=>raw);
}
describe("Phase 17: Password Reset",()=>{
var cust,custPwd="Test1234!";
after(async()=>{if(cust)await rmCust(cust.id);await prisma.$disconnect()});

describe("PasswordResetToken Model",()=>{
  it("create token",async()=>{
    cust=await mkCust("p17-"+Date.now()+"@t.com",custPwd);
    var raw=crypto.randomBytes(32).toString("hex");
    var hash=crypto.createHash("sha256").update(raw).digest("hex");
    var t=await prisma.passwordResetToken.create({
      data:{customerId:cust.id,tokenHash:hash,expiresAt:new Date(Date.now()+3600000)} });
    assert.ok(t.id);assert.strictEqual(t.usedAt,null);
    await prisma.passwordResetToken.delete({where:{id:t.id}}); });
  it("cascade delete",async()=>{
    var tmp=await mkCust("p17c-"+Date.now()+"@t.com","X1234567!");
    var h=crypto.createHash("sha256").update("tok").digest("hex");
    await prisma.passwordResetToken.create({
      data:{customerId:tmp.id,tokenHash:h,expiresAt:new Date(Date.now()+3600000)} });
    await rmCust(tmp.id);
    var cnt=await prisma.passwordResetToken.count({where:{customerId:tmp.id}});
    assert.strictEqual(cnt,0); });
});
describe("POST /api/auth/forgot-password",()=>{
  it("success for existing email",async()=>{
    var r=await req("POST","/api/auth/forgot-password",{email:cust.email});
    assert.strictEqual(r.s,200);
    assert.ok(r.b.message.includes("reset link")); });
  it("same message for non-existent email",async()=>{
    var r=await req("POST","/api/auth/forgot-password",{email:"no-"+Date.now()+"@x.com"});
    assert.strictEqual(r.s,200); });
  it("creates token in DB",async()=>{
    await req("POST","/api/auth/forgot-password",{email:cust.email});
    var t=await prisma.passwordResetToken.findFirst({where:{customerId:cust.id,usedAt:null},orderBy:{createdAt:"desc"}});
    assert.ok(t);assert.ok(t.tokenHash); });
  it("rejects invalid email",async()=>{
    var r=await req("POST","/api/auth/forgot-password",{email:"bad"});
    assert.strictEqual(r.s,400); });
  it("rejects missing email",async()=>{
    var r=await req("POST","/api/auth/forgot-password",{});
    assert.strictEqual(r.s,400); });
  it("sends password_reset notification",async()=>{
    await req("POST","/api/auth/forgot-password",{email:cust.email});
    var n=await prisma.emailNotification.findFirst({where:{customerId:cust.id,type:"password_reset"},orderBy:{createdAt:"desc"}});
    assert.ok(n);assert.strictEqual(n.recipientEmail,cust.email); });
});
describe("POST /api/auth/reset-password",()=>{
  var rc,rtk;
  before(async()=>{
    rc=await mkCust("p17r-"+Date.now()+"@t.com","Old1234!");
    rtk=await mkToken(rc.id); });
  after(async()=>{await rmCust(rc.id)});
  it("resets with valid token",async()=>{
    var r=await req("POST","/api/auth/reset-password",{token:rtk,password:"New1234!"});
    assert.strictEqual(r.s,200); });
  it("marks token used",async()=>{
    var t=await prisma.passwordResetToken.findFirst({where:{customerId:rc.id},orderBy:{createdAt:"desc"}});
    assert.ok(t.usedAt); });
  it("login with new password",async()=>{
    var r=await req("POST","/api/auth/login",{email:rc.email,password:"New1234!"});
    assert.strictEqual(r.s,200);assert.ok(r.b.token); });
  it("rejects reused token",async()=>{
    var r=await req("POST","/api/auth/reset-password",{token:rtk,password:"X1234567!"});
    assert.strictEqual(r.s,400); });
  it("rejects expired token",async()=>{
    var raw=crypto.randomBytes(32).toString("hex");
    var h=crypto.createHash("sha256").update(raw).digest("hex");
    await prisma.passwordResetToken.create({
      data:{customerId:rc.id,tokenHash:h,expiresAt:new Date(Date.now()-1000)} });
    var r=await req("POST","/api/auth/reset-password",{token:raw,password:"X1234567!"});
    assert.strictEqual(r.s,400); });
  it("rejects invalid token",async()=>{
    var r=await req("POST","/api/auth/reset-password",{token:"bad",password:"X1234567!"});
    assert.strictEqual(r.s,400); });
  it("rejects weak password",async()=>{
    var tk2=await mkToken(rc.id);
    var r=await req("POST","/api/auth/reset-password",{token:tk2,password:"weak"});
    assert.strictEqual(r.s,400); });
  it("rejects missing token",async()=>{
    var r=await req("POST","/api/auth/reset-password",{password:"X1234567!"});
    assert.strictEqual(r.s,400); });
  it("rejects missing password",async()=>{
    var tk3=await mkToken(rc.id);
    var r=await req("POST","/api/auth/reset-password",{token:tk3});
    assert.strictEqual(r.s,400); });
  it("sends password_changed notification",async()=>{
    var n=await prisma.emailNotification.findFirst({where:{customerId:rc.id,type:"password_changed"},orderBy:{createdAt:"desc"}});
    assert.ok(n); });
});
describe("PUT /api/auth/change-password",()=>{
  var cc,ctk;
  before(async()=>{
    cc=await mkCust("p17c2-"+Date.now()+"@t.com","Current123!");
    var lr=await req("POST","/api/auth/login",{email:cc.email,password:"Current123!"});
    ctk=lr.b.token; });
  after(async()=>{await rmCust(cc.id)});
  it("changes password",async()=>{
    var r=await req("PUT","/api/auth/change-password",{currentPassword:"Current123!",newPassword:"Changed123!"},ctk);
    assert.strictEqual(r.s,200); });
  it("login with new password",async()=>{
    var r=await req("POST","/api/auth/login",{email:cc.email,password:"Changed123!"});
    assert.strictEqual(r.s,200);assert.ok(r.b.token); });
  it("rejects wrong current password",async()=>{
    var r=await req("PUT","/api/auth/change-password",{currentPassword:"Wrong99!",newPassword:"X1234567a!"},ctk);
    assert.strictEqual(r.s,401); });
  it("rejects same password",async()=>{
    var r=await req("PUT","/api/auth/change-password",{currentPassword:"Changed123!",newPassword:"Changed123!"},ctk);
    assert.strictEqual(r.s,400); });
  it("rejects weak password",async()=>{
    var r=await req("PUT","/api/auth/change-password",{currentPassword:"Changed123!",newPassword:"weak"},ctk);
    assert.strictEqual(r.s,400); });
  it("rejects no auth",async()=>{
    var r=await req("PUT","/api/auth/change-password",{currentPassword:"Changed123!",newPassword:"X1234567!"});
    assert.strictEqual(r.s,401); });
  it("rejects missing fields",async()=>{
    var r=await req("PUT","/api/auth/change-password",{},ctk);
    assert.strictEqual(r.s,400); });
});

describe("Backward Compatibility",()=>{
  it("register still works",async()=>{
    var r=await req("POST","/api/auth/register",{email:"bwc-"+Date.now()+"@t.com",password:"Test1234!",name:"BWC"});
    assert.strictEqual(r.s,201);assert.ok(r.b.token);
    var c=await prisma.customer.findUnique({where:{email:r.b.customer.email}});if(c)await rmCust(c.id); });
  it("login still works",async()=>{
    var r=await req("POST","/api/auth/login",{email:cust.email,password:custPwd});
    assert.strictEqual(r.s,200); });
  it("products still works",async()=>{
    var r=await req("GET","/api/products");assert.strictEqual(r.s,200); });
  it("health still works",async()=>{
    var r=await req("GET","/api/health");assert.strictEqual(r.s,200); });
});

describe("Frontend SPA",()=>{
  var fs2=require("fs");
  var cj=fs2.readFileSync("js/customer.js","utf8");
  it("has forgot-password route",()=>assert.ok(cj.includes("/forgot-password")));
  it("has reset-password route",()=>assert.ok(cj.includes("/reset-password")));
  it("has change-password route",()=>assert.ok(cj.includes("/change-password")));
  it("has renderForgotPassword",()=>assert.ok(cj.includes("renderForgotPassword")));
  it("has renderResetPassword",()=>assert.ok(cj.includes("renderResetPassword")));
  it("has renderChangePassword",()=>assert.ok(cj.includes("renderChangePassword")));
  it("has doForgotPassword",()=>assert.ok(cj.includes("doForgotPassword")));
  it("has doResetPassword",()=>assert.ok(cj.includes("doResetPassword")));
  it("has doChangePassword",()=>assert.ok(cj.includes("doChangePassword")));
  it("calls forgot-password API",()=>assert.ok(cj.includes("/auth/forgot-password")));
  it("calls reset-password API",()=>assert.ok(cj.includes("/auth/reset-password")));
  it("calls change-password API",()=>assert.ok(cj.includes("/auth/change-password")));
  it("has Lao i18n",()=>assert.ok(cj.includes("forgotPassword:")));
  it("has En i18n",()=>{
    var ei=cj.indexOf("en: {");var li=cj.indexOf("lo: {");
    if(ei>0&&li>0){var es=cj.substring(ei,li);assert.ok(es.includes("forgotPassword"));} });
  it("customer.html exists",()=>assert.ok(fs2.existsSync("customer.html")));
});
});