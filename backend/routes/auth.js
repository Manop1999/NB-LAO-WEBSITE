const { Router } = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken, authMiddleware } = require('../lib/auth');
const crypto = require('crypto');
const { isValidEmail, isValidPassword, maxLength, sanitizeString } = require('../middleware/security');

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    let { email, password, name, phone, company } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }
    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' });
    }
    // Validate field lengths
    if (!maxLength(name, 200)) {
      return res.status(400).json({ error: 'Name too long (max 200 characters)' });
    }
    // Normalize email to lowercase
    email = email.toLowerCase().trim();
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: { email, passwordHash, name: sanitizeString(name), phone: phone || null, company: company || null },
    });
    const token = signToken(customer);
    res.status(201).json({
      token,
      customer: { id: customer.id, email: customer.email, name: customer.name, role: customer.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    // Normalize email
    email = email.toLowerCase().trim();
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (customer.active === false) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }
    // Look up staff record if exists
    let staff = null;
    if (customer.role === 'admin' || customer.role === 'staff') {
      staff = await prisma.staff.findUnique({ where: { customerId: customer.id } });
    }
    const token = signToken(customer, staff);
    res.json({
      token,
      customer: { id: customer.id, email: customer.email, name: customer.name, role: customer.role },
      staff: staff ? { id: staff.id, isSuperAdmin: staff.isSuperAdmin, positionId: staff.positionId } : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true, company: true, role: true, createdAt: true },
    });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/auth/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, phone, company } = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
      },
      select: { id: true, email: true, name: true, phone: true, company: true },
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});



// ──────────────────────────────────────────────
// PASSWORD RESET — Phase 17
// ──────────────────────────────────────────────

const _forgotPasswordBuckets = new Map();
router.post('/forgot-password', async (req, res) => {
  try {
    let { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    email = email.toLowerCase().trim();
    const now = Date.now();
    const bucket = _forgotPasswordBuckets.get(email) || [];
    const recent = bucket.filter(t => t > now - 3600000);
    if (recent.length >= 3 && process.env.NODE_ENV !== "test") {
      return res.json({ message: 'If an account exists with that email, a reset link has been sent' });
    }
    recent.push(now);
    _forgotPasswordBuckets.set(email, recent);
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (customer) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 3600000);
      await prisma.passwordResetToken.create({ data: { customerId: customer.id, tokenHash, expiresAt } });
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3001';
      const resetLink = protocol + '://' + host + '/customer.html#/reset-password?token=' + rawToken;
      const { notifyPasswordReset } = require('../services/notifications');
      notifyPasswordReset(customer, resetLink).catch(() => {});
    }
    res.json({ message: 'If an account exists with that email, a reset link has been sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

const _resetPasswordBuckets = new Map();
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = _resetPasswordBuckets.get(ip) || [];
    const recent = bucket.filter(t => t > now - 3600000);
    if (recent.length >= 5 && process.env.NODE_ENV !== "test") {
      return res.status(429).json({ error: 'Too many attempts, please try again later' });
    }
    recent.push(now);
    _resetPasswordBuckets.set(ip, recent);
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.customer.update({ where: { id: resetToken.customerId }, data: { passwordHash, passwordChangedAt: new Date() } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);
    const customer = await prisma.customer.findUnique({ where: { id: resetToken.customerId } });
    if (customer) {
      const { notifyPasswordChanged } = require('../services/notifications');
      notifyPasswordChanged(customer).catch(() => {});
    }
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

const _changePasswordBuckets = new Map();
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    const uid = 'user:' + req.user.id;
    const now = Date.now();
    const bucket = _changePasswordBuckets.get(uid) || [];
    const recent = bucket.filter(t => t > now - 3600000);
    if (recent.length >= 10 && process.env.NODE_ENV !== "test") {
      return res.status(429).json({ error: 'Too many attempts, please try again later' });
    }
    recent.push(now);
    _changePasswordBuckets.set(uid, recent);
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' });
    }
    const customer = await prisma.customer.findUnique({ where: { id: req.user.id } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const valid = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const samePassword = await bcrypt.compare(newPassword, customer.passwordHash);
    if (samePassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.customer.update({ where: { id: req.user.id }, data: { passwordHash, passwordChangedAt: new Date() } });
    const { notifyPasswordChanged } = require('../services/notifications');
    notifyPasswordChanged(customer).catch(() => {});
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
