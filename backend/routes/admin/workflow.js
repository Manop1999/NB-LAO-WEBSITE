const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();

// Helper: extract audit context from request
function auditCtx(req) {
  return { staffId: req.user?.staffId || null, customerId: req.user?.id || null, ipAddress: req.ip || null };
}

// Helper: non-blocking audit write
function logAudit(req, action, module, targetId, details) {
  auditLog({ ...auditCtx(req), action, module, targetId: targetId || null, details: details ? JSON.stringify(details) : null }).catch(() => {});
}

// CUSTOMER ADDRESSES — Admin view
router.get("/customers/:id/addresses", async (req, res) => {
  try { const cid=safeParseInt(req.params.id); if(!cid)return res.status(400).json({error:"Invalid"}); const a=await prisma.deliveryAddress.findMany({where:{customerId:cid},orderBy:[{isDefault:"desc"},{createdAt:"desc"}]}); res.json(a.map(x=>({id:x.id,label:x.label,recipient_name:x.recipientName,phone:x.phone,address_line1:x.addressLine1,address_line2:x.addressLine2,province:x.province,district:x.district,village:x.village,postal_code:x.postalCode,is_default:x.isDefault}))); } catch(e){res.status(500).json({error:"Failed"});}
});

// STATUS HISTORY
router.get("/orders/:id/history", async (req, res) => {
  try { const oid=safeParseInt(req.params.id); if(!oid)return res.status(400).json({error:"Invalid"}); const h=await prisma.orderStatusHistory.findMany({where:{orderId:oid},orderBy:{createdAt:"desc"}}); res.json(h.map(x=>({id:x.id,from_status:x.fromStatus,to_status:x.toStatus,notes:x.notes,staff_name:x.staffName,position_name:x.positionName,createdAt:x.createdAt}))); } catch(e){res.status(500).json({error:"Failed"});}
});
router.get("/quotations/:id/history", async (req, res) => {
  try { const qid=safeParseInt(req.params.id); if(!qid)return res.status(400).json({error:"Invalid"}); const h=await prisma.quotationStatusHistory.findMany({where:{quotationId:qid},orderBy:{createdAt:"desc"}}); res.json(h.map(x=>({id:x.id,from_status:x.fromStatus,to_status:x.toStatus,notes:x.notes,staff_name:x.staffName,position_name:x.positionName,createdAt:x.createdAt}))); } catch(e){res.status(500).json({error:"Failed"});}
});

// APPROVAL WORKFLOW
router.post("/orders/:id/approve", async (req, res) => {
  try { const oid=safeParseInt(req.params.id); if(!oid)return res.status(400).json({error:"Invalid"}); const o=await prisma.order.findUnique({where:{id:oid}}); if(!o)return res.status(404).json({error:"Not found"}); const sn=req.user.name||"Admin"; await prisma.$transaction(async(tx)=>{await tx.orderStatusHistory.create({data:{orderId:oid,fromStatus:o.status,toStatus:"confirmed",staffId:req.user.staffId||null,staffName:sn,positionName:"Admin"}});await tx.order.update({where:{id:oid},data:{status:"confirmed",approvedById:req.user.id,approvedAt:new Date()}});}); logAudit(req,"approve","orders",oid,{}); res.json({message:"Approved",status:"confirmed"}); } catch(e){res.status(500).json({error:"Failed"});}
});
router.post("/orders/:id/reject", async (req, res) => {
  try { const oid=safeParseInt(req.params.id); if(!oid)return res.status(400).json({error:"Invalid"}); const o=await prisma.order.findUnique({where:{id:oid}}); if(!o)return res.status(404).json({error:"Not found"}); const{notes}=req.body; await prisma.$transaction(async(tx)=>{await tx.orderStatusHistory.create({data:{orderId:oid,fromStatus:o.status,toStatus:"cancelled",notes:notes||"Rejected",staffId:req.user.staffId||null,staffName:req.user.name||"Admin",positionName:"Admin"}});await tx.order.update({where:{id:oid},data:{status:"cancelled"}});}); logAudit(req,"reject","orders",oid,{}); res.json({message:"Rejected",status:"cancelled"}); } catch(e){res.status(500).json({error:"Failed"});}
});
router.post("/quotations/:id/approve", async (req, res) => {
  try { const qid=safeParseInt(req.params.id); if(!qid)return res.status(400).json({error:"Invalid"}); const q=await prisma.quotation.findUnique({where:{id:qid}}); if(!q)return res.status(404).json({error:"Not found"}); await prisma.$transaction(async(tx)=>{await tx.quotationStatusHistory.create({data:{quotationId:qid,fromStatus:q.status,toStatus:"accepted",staffId:req.user.staffId||null,staffName:req.user.name||"Admin",positionName:"Admin"}});await tx.quotation.update({where:{id:qid},data:{status:"accepted",approvedById:req.user.id,approvedAt:new Date()}});}); logAudit(req,"approve","quotations",qid,{}); res.json({message:"Approved",status:"accepted"}); } catch(e){res.status(500).json({error:"Failed"});}
});
router.post("/quotations/:id/reject", async (req, res) => {
  try { const qid=safeParseInt(req.params.id); if(!qid)return res.status(400).json({error:"Invalid"}); const q=await prisma.quotation.findUnique({where:{id:qid}}); if(!q)return res.status(404).json({error:"Not found"}); const{notes}=req.body; await prisma.$transaction(async(tx)=>{await tx.quotationStatusHistory.create({data:{quotationId:qid,fromStatus:q.status,toStatus:"rejected",notes:notes||"Rejected",staffId:req.user.staffId||null,staffName:req.user.name||"Admin",positionName:"Admin"}});await tx.quotation.update({where:{id:qid},data:{status:"rejected"}});}); logAudit(req,"reject","quotations",qid,{}); res.json({message:"Rejected",status:"rejected"}); } catch(e){res.status(500).json({error:"Failed"});}
});

module.exports = router;
