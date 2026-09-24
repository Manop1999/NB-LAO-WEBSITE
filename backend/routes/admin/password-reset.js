const { Router } = require('express');
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const { safeParseInt } = require('../../middleware/security');
const { auditLog } = require('../../middleware/rbac');

const router = Router();

// Helper: extract audit context from request
function auditCtx(req) {
  return { staffId: req.user?.staffId || null, customerId: req.user?.id || null, ipAddress: req.ip || null };
}

// Helper: non-blocking audit write (matches ./customers.js convention)
function logAudit(req, action, module, targetId, details) {
  auditLog({ ...auditCtx(req), action, module, targetId: targetId || null, details: details ? JSON.stringify(details) : null }).catch(() => {});
}

// ═══════════════════════════════════════════════
// PASSWORD RESET BY ADMIN
// ═══════════════════════════════════════════════

router.post('/customers/:id/reset-password', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.customer.update({ where: { id }, data: { passwordHash } });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ═══════════════════════════════════════════════
// SEND PASSWORD RESET LINK BY ADMIN
// Preferred flow: Admin → send link → Customer chooses new password.
// Reuses the proven PasswordResetToken architecture (hashed, single-use, 1h expiry).
// Never returns the raw token or passwordHash.
// ═══════════════════════════════════════════════

router.post('/customers/:id/send-password-reset', async (req, res) => {
  try {
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    // This action is for customer accounts only — never a path to reset admin/staff passwords.
    if (customer.role !== 'customer') {
      return res.status(403).json({ error: 'Password reset links can only be sent to customer accounts' });
    }

    // Invalidate any outstanding (unused, unexpired) tokens for this customer
    await prisma.passwordResetToken.updateMany({
      where: { customerId: id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    // Create a fresh hashed token (same scheme as the customer forgot-password flow)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.passwordResetToken.create({
      data: { customerId: id, tokenHash, expiresAt: new Date(Date.now() + 3600000) },
    });

    const protocol = req.protocol || 'http';
    const baseUrl = (process.env.APP_URL || ((req.protocol || 'http') + '://' + (req.get('host') || 'localhost:3001'))).replace(/\/$/, '');
    const resetLink = baseUrl + '/customer.html#/reset-password?token=' + rawToken;
    const { notifyPasswordReset } = require('../../services/notifications');
    notifyPasswordReset(customer, resetLink).catch(() => {});

    logAudit(req, 'send_password_reset', 'customers', id, { email: customer.email });
    res.json({ message: 'Password reset link sent' });
  } catch (err) {
    console.error('Admin send password reset error:', err);
    res.status(500).json({ error: 'Failed to send password reset link' });
  }
});

module.exports = router;