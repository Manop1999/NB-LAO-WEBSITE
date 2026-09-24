const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { generateOrderPDF, generateQuotationPDF } = require('../../services/pdf');

const router = Router();

// ═══════════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════════

router.get('/orders/:id/pdf', async (req, res) => {
  try {
    var oid = safeParseInt(req.params.id);
    if (!oid) return res.status(400).json({error:'Invalid order ID'});
    var order = await prisma.order.findUnique({where:{id:oid},include:{items:true,customer:true}});
    if (!order) return res.status(404).json({error:'Order not found'});
    var pdf = generateOrderPDF(order, order.items, order.customer);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename=' + order.orderNumber + '.pdf');
    res.send(pdf);
  } catch(e) { res.status(500).json({error:'Failed to generate PDF'}); }
});

router.get('/quotations/:id/pdf', async (req, res) => {
  try {
    var qid = safeParseInt(req.params.id);
    if (!qid) return res.status(400).json({error:'Invalid quotation ID'});
    var qt = await prisma.quotation.findUnique({where:{id:qid},include:{items:true,customer:true}});
    if (!qt) return res.status(404).json({error:'Quotation not found'});
    var pdf = generateQuotationPDF(qt, qt.items, qt.customer);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename=' + qt.quotationNumber + '.pdf');
    res.send(pdf);
  } catch(e) { res.status(500).json({error:'Failed to generate PDF'}); }
});

module.exports = router;
