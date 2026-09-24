const { Router } = require('express');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');

const router = Router();

// ═══════════════════════════════════════════════
// EMAIL NOTIFICATION LOG
// ═══════════════════════════════════════════════

// GET /api/admin/emails — list email notifications
router.get('/emails', async (req, res) => {
  try {
    const emails = await prisma.emailNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(emails.map(e => ({
      id: e.id,
      recipient: e.recipientEmail,
      subject: e.subject,
      type: e.type,
      order_id: e.orderId,
      quotation_id: e.quotationId,
      customer_id: e.customerId,
      status: e.status,
      error: e.errorMessage,
      sent_at: e.sentAt,
      created_at: e.createdAt,
    })));
  } catch (err) {
    console.error('Admin GET emails error:', err);
    res.status(500).json({ error: 'Failed to fetch email notifications' });
  }
});

module.exports = router;
