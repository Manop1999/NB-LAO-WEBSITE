const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();

// ═══════════════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════════════

function auditCtx(req) {
  return { staffId: req.user?.staffId || null, customerId: req.user?.id || null, ipAddress: req.ip || null };
}

function logAudit(req, action, module, targetId, details) {
  auditLog({ ...auditCtx(req), action, module, targetId: targetId || null, details: details ? JSON.stringify(details) : null }).catch(() => {});
}

router.get("/payment-methods", async (req, res) => {
  try { const m=await prisma.paymentMethod.findMany({orderBy:{sortOrder:"asc"}}); res.json(m.map(x=>({id:x.id,code:x.code,name_lo:x.nameLo,name_en:x.nameEn,description:x.description,is_active:x.isActive,sort_order:x.sortOrder}))); } catch(e){res.status(500).json({error:"Failed"});}
});
router.post("/payment-methods", async (req, res) => {
  try { const{code,name_lo,name_en,description,sort_order}=req.body; if(!code||!name_lo||!name_en) return res.status(400).json({error:"Required"}); const m=await prisma.paymentMethod.create({data:{code,nameLo:name_lo,nameEn:name_en,description:description||null,sortOrder:sort_order||0}}); logAudit(req,"create","payment_methods",m.id,{code}); res.status(201).json({id:m.id,code:m.code}); } catch(e){if(e.code==="P2002")return res.status(409).json({error:"Exists"}); res.status(500).json({error:"Failed"});}
});
router.put("/payment-methods/:id", async (req, res) => {
  try { const id=safeParseInt(req.params.id); if(!id)return res.status(400).json({error:"Invalid"}); const{code,name_lo,name_en,description,is_active,sort_order}=req.body; const u=await prisma.paymentMethod.update({where:{id},data:{...(code!==undefined&&{code}),...(name_lo!==undefined&&{nameLo:name_lo}),...(name_en!==undefined&&{nameEn:name_en}),...(description!==undefined&&{description}),...(is_active!==undefined&&{isActive:is_active}),...(sort_order!==undefined&&{sortOrder:sort_order})}}); logAudit(req,"update","payment_methods",id,{code:u.code}); res.json({id:u.id,code:u.code}); } catch(e){if(e.code==="P2002")return res.status(409).json({error:"Exists"}); res.status(500).json({error:"Failed"});}
});
router.delete("/payment-methods/:id", async (req, res) => {
  try { const id=safeParseInt(req.params.id); if(!id)return res.status(400).json({error:"Invalid"}); await prisma.paymentMethod.delete({where:{id}}); logAudit(req,"delete","payment_methods",id,{}); res.json({message:"Deleted"}); } catch(e){res.status(500).json({error:"Failed"});}
});

module.exports = router;
