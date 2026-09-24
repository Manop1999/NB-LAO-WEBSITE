const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');

// ── Configuration from environment ──────────────────
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@nblao.la';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'NB LAO';

// ── Determine mode ──────────────────────────────────
const isDevMode = !SMTP_HOST || !SMTP_USER;

let transporter = null;

if (!isDevMode) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

// ── Validate email address ──────────────────────────
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── Send email ──────────────────────────────────────
async function sendEmail({ to, subject, html, text }) {
  // Validate
  if (!isValidEmail(to)) {
    console.error('[Email] Invalid recipient:', to);
    return { success: false, error: 'Invalid recipient email' };
  }
  if (!subject || (!html && !text)) {
    console.error('[Email] Missing subject or content');
    return { success: false, error: 'Missing subject or content' };
  }

  const from = `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`;

  // Dev mode: log to console
  if (isDevMode) {
    console.log('[Email:DEV] To:', to);
    console.log('[Email:DEV] Subject:', subject);
    console.log('[Email:DEV] ---');
    return { success: true, mode: 'dev' };
  }

  // Production mode: send via SMTP
  try {
    await transporter.sendMail({ from, to, subject, html, text });
    return { success: true, mode: 'smtp' };
  } catch (err) {
    console.error('[Email:SMTP] Failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Log notification to database ────────────────────
async function logNotification({ recipientEmail, subject, type, orderId, quotationId, customerId, status, errorMessage }) {
  try {
    return await prisma.emailNotification.create({
      data: {
        recipientEmail,
        subject,
        type,
        orderId: orderId || null,
        quotationId: quotationId || null,
        customerId: customerId || null,
        status: status || 'sent',
        errorMessage: errorMessage || null,
        sentAt: status === 'sent' ? new Date() : null,
      },
    });
  } catch (err) {
    console.error('[Email] Failed to log notification:', err.message);
    return null;
  }
}

// ── SMTP Configuration Status (safe, no secrets) ────
function getSmtpConfig() {
  return {
    mode: isDevMode ? 'dev' : 'smtp',
    host: SMTP_HOST ? '(configured)' : '(not set)',
    port: SMTP_PORT,
    user: SMTP_USER ? '(configured)' : '(not set)',
    from: SMTP_FROM,
    fromName: SMTP_FROM_NAME,
  };
}

// ── Production SMTP Validation ───────────────────
function validateSmtpConfig() {
  if (isDevMode) {
    return { valid: true, warnings: [], mode: 'dev' };
  }
  var warnings = [];
  if (!SMTP_HOST) warnings.push('SMTP_HOST not set');
  if (!SMTP_USER) warnings.push('SMTP_USER not set');
  if (!SMTP_PASSWORD) warnings.push('SMTP_PASSWORD not set');
  if (SMTP_PORT !== 465 && SMTP_PORT !== 587) {
    warnings.push('SMTP_PORT is ' + SMTP_PORT + ' (expected 587 or 465)');
  }
  return { valid: warnings.length === 0, warnings: warnings, mode: 'smtp' };
}

module.exports = { sendEmail, logNotification, isValidEmail, isDevMode, getSmtpConfig, validateSmtpConfig };
