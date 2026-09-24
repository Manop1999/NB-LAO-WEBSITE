const { sendEmail, logNotification } = require('./email');

// ── Brand constants ─────────────────────────────────
const BRAND = {
  name: 'NB LAO',
  tagline: 'ອຸປະກອນອຸດສາຫະກຳ & ໄຟຟ້າ',
  phone: '020 5555 8888',
  email: 'info@nblao.la',
  website: 'http://localhost:3001',
};

// ── Status labels ───────────────────────────────────
const ORDER_STATUS_LABELS = {
  pending: { en: 'Pending', lo: 'ລໍຖ້າ', color: '#6B7280' },
  confirmed: { en: 'Confirmed', lo: 'ຢືນຢັນແລ້ວ', color: '#059669' },
  processing: { en: 'Processing', lo: 'ກຳລັງດຳເນີນການ', color: '#D97706' },
  shipped: { en: 'Shipped', lo: 'ຈັດສົ່ງແລ້ວ', color: '#2563EB' },
  delivered: { en: 'Delivered', lo: 'ໄດ້ຮັບແລ້ວ', color: '#059669' },
  cancelled: { en: 'Cancelled', lo: 'ຍົກເລີກ', color: '#DC2626' },
};

const QUOTE_STATUS_LABELS = {
  pending: { en: 'Pending Review', lo: 'ລໍຖ້າກວດສອບ', color: '#6B7280' },
  reviewed: { en: 'Reviewed', lo: 'ກວດສອບແລ້ວ', color: '#2563EB' },
  quoted: { en: 'Quote Offered', lo: 'ສະເໜີລາຄາແລ້ວ', color: '#D97706' },
  accepted: { en: 'Accepted', lo: 'ຍອມຮັບແລ້ວ', color: '#059669' },
  rejected: { en: 'Rejected', lo: 'ປະຕິເສດ', color: '#DC2626' },
};

// ── Base email wrapper ──────────────────────────────
function wrapEmail(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px;">
  <div style="background:#0E2743;padding:24px 30px;">
    <span style="font-family:'Courier New',monospace;font-weight:700;font-size:20px;color:#fff;">NB LAO</span>
    <span style="display:inline-block;width:8px;height:8px;background:#E85C24;margin-left:6px;vertical-align:middle;"></span>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#0E2743;font-size:18px;margin:0 0 20px;">${title}</h2>
    ${bodyHtml}
  </div>
  <div style="background:#f8f9fa;padding:20px 30px;border-top:1px solid #e5e7eb;">
    <p style="color:#6B7280;font-size:12px;margin:0 0 6px;">${BRAND.name} — ${BRAND.tagline}</p>
    <p style="color:#6B7280;font-size:12px;margin:0 0 6px;">📞 ${BRAND.phone} &nbsp;|&nbsp; ✉️ ${BRAND.email}</p>
    <p style="color:#9CA3AF;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

function textWrap(title, bodyText) {
  return `${title}\n\n${bodyText}\n\n---\n${BRAND.name} — ${BRAND.tagline}\n📞 ${BRAND.phone} | ✉️ ${BRAND.email}`;
}

function itemsTable(items) {
  if (!items || !items.length) return '';
  let html = '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">';
  html += '<tr style="background:#f8f9fa;"><th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Product</th><th style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb;">Qty</th><th style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb;">Price</th></tr>';
  for (const item of items) {
    html += `<tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;">${item.name || ''}</td><td style="text-align:right;padding:8px;border-bottom:1px solid #f3f4f6;">${item.quantity}</td><td style="text-align:right;padding:8px;border-bottom:1px solid #f3f4f6;">${(item.price || 0).toLocaleString()} KIP</td></tr>`;
  }
  html += '</table>';
  return html;
}

function itemsText(items) {
  if (!items || !items.length) return '';
  let txt = '';
  for (const item of items) {
    txt += `  - ${item.name || 'Item'} x${item.quantity} @ ${(item.price || 0).toLocaleString()} KIP\n`;
  }
  return txt;
}

// ══════════════════════════════════════════════════════
// ORDER NOTIFICATIONS
// ══════════════════════════════════════════════════════

async function notifyOrderCreated(customer, order, items) {
  const html = wrapEmail('Order Confirmed — ' + order.orderNumber, `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your order has been successfully placed.</p>
    <div style="background:#f0fdf4;border-left:3px solid #059669;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Order #:</strong> ${order.orderNumber}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Status:</strong> ${ORDER_STATUS_LABELS[order.status]?.en || order.status}</p>
    </div>
    ${itemsTable(items)}
    <p style="color:#374151;font-size:14px;">We will notify you when your order status changes.</p>
  `);
  const text = textWrap('Order Confirmed — ' + order.orderNumber,
    `Dear ${customer.name},\n\nYour order has been successfully placed.\nOrder: ${order.orderNumber}\nStatus: ${ORDER_STATUS_LABELS[order.status]?.en || order.status}\n\n${itemsText(items)}We will notify you when your order status changes.`);
  return await sendAndLog({ to: customer.email, subject: `Order Confirmed — ${order.orderNumber} | ${BRAND.name}`, html, text, type: 'order_created', customerId: customer.id, orderId: order.id });
}

async function notifyOrderStatusChanged(customer, order, oldStatus, newStatus, items) {
  const label = ORDER_STATUS_LABELS[newStatus] || { en: newStatus, lo: newStatus };
  const html = wrapEmail(`Order ${label.en} — ${order.orderNumber}`, `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your order status has been updated.</p>
    <div style="background:#f8f9fa;border-left:3px solid ${label.color};padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Order #:</strong> ${order.orderNumber}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Status:</strong> <span style="color:${label.color};font-weight:600;">${label.en}</span></p>
    </div>
    ${items ? itemsTable(items) : ''}
    <p style="color:#374151;font-size:14px;">If you have questions, please contact us at ${BRAND.email}.</p>
  `);
  const text = textWrap(`Order ${label.en} — ${order.orderNumber}`,
    `Dear ${customer.name},\n\nYour order status has been updated.\nOrder: ${order.orderNumber}\nStatus: ${label.en}\n\n${items ? itemsText(items) : ''}If you have questions, please contact us at ${BRAND.email}.`);
  return await sendAndLog({ to: customer.email, subject: `Order ${label.en} — ${order.orderNumber} | ${BRAND.name}`, html, text, type: 'order_status_changed', customerId: customer.id, orderId: order.id });
}

// ══════════════════════════════════════════════════════
// QUOTATION NOTIFICATIONS
// ══════════════════════════════════════════════════════

async function notifyQuotationCreated(customer, quotation, items) {
  const html = wrapEmail('Quotation Request Received — ' + quotation.quotationNumber, `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">We have received your quotation request. Our team will review it shortly.</p>
    <div style="background:#EFF6FF;border-left:3px solid #2563EB;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Quotation #:</strong> ${quotation.quotationNumber}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Status:</strong> ${QUOTE_STATUS_LABELS[quotation.status]?.en || quotation.status}</p>
    </div>
    ${itemsTable(items)}
    <p style="color:#374151;font-size:14px;">You will receive a notification when we have prepared your quote.</p>
  `);
  const text = textWrap('Quotation Request Received — ' + quotation.quotationNumber,
    `Dear ${customer.name},\n\nWe have received your quotation request.\nQuotation: ${quotation.quotationNumber}\nStatus: ${QUOTE_STATUS_LABELS[quotation.status]?.en || quotation.status}\n\n${itemsText(items)}You will receive a notification when we have prepared your quote.`);
  return await sendAndLog({ to: customer.email, subject: `Quotation Request Received — ${quotation.quotationNumber} | ${BRAND.name}`, html, text, type: 'quotation_created', customerId: customer.id, quotationId: quotation.id });
}

async function notifyQuotationStatusChanged(customer, quotation, oldStatus, newStatus, items) {
  const label = QUOTE_STATUS_LABELS[newStatus] || { en: newStatus, lo: newStatus };
  const html = wrapEmail(`Quotation ${label.en} — ${quotation.quotationNumber}`, `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your quotation status has been updated.</p>
    <div style="background:#f8f9fa;border-left:3px solid ${label.color};padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Quotation #:</strong> ${quotation.quotationNumber}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Status:</strong> <span style="color:${label.color};font-weight:600;">${label.en}</span></p>
    </div>
    ${items ? itemsTable(items) : ''}
    ${quotation.notes ? `<p style="color:#6B7280;font-size:13px;font-style:italic;margin:12px 0;">Note: ${quotation.notes}</p>` : ''}
    <p style="color:#374151;font-size:14px;">If you have questions, please contact us at ${BRAND.email}.</p>
  `);
  const text = textWrap(`Quotation ${label.en} — ${quotation.quotationNumber}`,
    `Dear ${customer.name},\n\nYour quotation status has been updated.\nQuotation: ${quotation.quotationNumber}\nStatus: ${label.en}\n\n${quotation.notes ? 'Note: ' + quotation.notes + '\n\n' : ''}If you have questions, please contact us at ${BRAND.email}.`);
  return await sendAndLog({ to: customer.email, subject: `Quotation ${label.en} — ${quotation.quotationNumber} | ${BRAND.name}`, html, text, type: 'quotation_status_changed', customerId: customer.id, quotationId: quotation.id });
}

// ══════════════════════════════════════════════════════
// ACCOUNT NOTIFICATIONS
// ══════════════════════════════════════════════════════

async function notifyAccountActivated(customer) {
  const html = wrapEmail('Account Activated', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your account has been activated. You can now log in and access all features.</p>
    <div style="background:#f0fdf4;border-left:3px solid #059669;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Email:</strong> ${customer.email}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Status:</strong> <span style="color:#059669;font-weight:600;">Active</span></p>
    </div>
    <p style="color:#374151;font-size:14px;">If you did not expect this, please contact us immediately at ${BRAND.email}.</p>
  `);
  const text = textWrap('Account Activated',
    `Dear ${customer.name},\n\nYour account has been activated.\nEmail: ${customer.email}\nStatus: Active\n\nIf you did not expect this, please contact us immediately at ${BRAND.email}.`);
  return await sendAndLog({ to: customer.email, subject: `Account Activated | ${BRAND.name}`, html, text, type: 'account_activated', customerId: customer.id });
}

async function notifyAccountDeactivated(customer) {
  const html = wrapEmail('Account Deactivated', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your account has been deactivated. You will no longer be able to log in.</p>
    <div style="background:#FEF2F2;border-left:3px solid #DC2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Email:</strong> ${customer.email}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Status:</strong> <span style="color:#DC2626;font-weight:600;">Deactivated</span></p>
    </div>
    <p style="color:#374151;font-size:14px;">If you believe this was a mistake, please contact us at ${BRAND.email}.</p>
  `);
  const text = textWrap('Account Deactivated',
    `Dear ${customer.name},\n\nYour account has been deactivated.\nEmail: ${customer.email}\nStatus: Deactivated\n\nIf you believe this was a mistake, please contact us at ${BRAND.email}.`);
  return await sendAndLog({ to: customer.email, subject: `Account Deactivated | ${BRAND.name}`, html, text, type: 'account_deactivated', customerId: customer.id });
}

// ══════════════════════════════════════════════════════
// LOYALTY NOTIFICATIONS
// ══════════════════════════════════════════════════════

async function notifyPointsEarned(customer, points, orderId, tierName) {
  const html = wrapEmail('Points Earned!', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">You have earned <strong style="color:#059669;font-size:16px;">${points} points</strong> from your recent order.</p>
    <div style="background:#f0fdf4;border-left:3px solid #059669;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Points Earned:</strong> +${points}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Order:</strong> #${orderId}</p>
      ${tierName ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Tier:</strong> ${tierName}</p>` : ''}
    </div>
    <p style="color:#374151;font-size:14px;">Use your points at checkout for discounts on future orders!</p>
  `);
  const text = textWrap('Points Earned!',
    `Dear ${customer.name},\n\nYou have earned ${points} points from your recent order.\nOrder: #${orderId}${tierName ? '\nTier: ' + tierName : ''}\n\nUse your points at checkout for discounts!`);
  return await sendAndLog({ to: customer.email, subject: `+${points} Points Earned | ${BRAND.name}`, html, text, type: 'points_earned', customerId: customer.id, orderId });
}

async function notifyTierUpgraded(customer, oldTierName, newTierName, discount) {
  const html = wrapEmail('Tier Upgraded!', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Congratulations! You have been upgraded to <strong style="color:#D97706;font-size:16px;">${newTierName}</strong> tier.</p>
    <div style="background:#FFFBEB;border-left:3px solid #D97706;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Previous Tier:</strong> ${oldTierName || 'Bronze'}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>New Tier:</strong> ${newTierName}</p>
      ${discount > 0 ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Discount:</strong> ${discount}% off all orders</p>` : ''}
    </div>
    <p style="color:#374151;font-size:14px;">Enjoy your new benefits and keep earning points!</p>
  `);
  const text = textWrap('Tier Upgraded!',
    `Dear ${customer.name},\n\nCongratulations! You have been upgraded to ${newTierName} tier.\nPrevious: ${oldTierName || 'Bronze'}\nNew: ${newTierName}${discount > 0 ? '\nDiscount: ' + discount + '% off' : ''}\n\nEnjoy your new benefits!`);
  return await sendAndLog({ to: customer.email, subject: `Tier Upgraded to ${newTierName} | ${BRAND.name}`, html, text, type: 'tier_upgraded', customerId: customer.id });
}

async function notifyPointsRedeemed(customer, points, discountKip, orderId) {
  const html = wrapEmail('Points Redeemed', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">You have redeemed <strong style="color:#2563EB;">${points} points</strong> for a discount of <strong>${discountKip.toLocaleString()} KIP</strong>.</p>
    <div style="background:#EFF6FF;border-left:3px solid #2563EB;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Points Used:</strong> -${points}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Discount:</strong> ${discountKip.toLocaleString()} KIP</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Order:</strong> #${orderId}</p>
    </div>
  `);
  const text = textWrap('Points Redeemed',
    `Dear ${customer.name},\n\nYou have redeemed ${points} points for a discount of ${discountKip.toLocaleString()} KIP.\nOrder: #${orderId}`);
  return await sendAndLog({ to: customer.email, subject: `Points Redeemed | ${BRAND.name}`, html, text, type: 'points_redeemed', customerId: customer.id, orderId });
}

// ── Helper: send + log ──────────────────────────────
async function sendAndLog({ to, subject, html, text, type, orderId, quotationId, customerId }) {
  const result = await sendEmail({ to, subject, html, text });
  await logNotification({
    recipientEmail: to,
    subject,
    type,
    orderId: orderId || null,
    quotationId: quotationId || null,
    customerId: customerId || null,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error || null,
  });
  return result;
}



// ══════════════════════════════════════════════════════
// PASSWORD RESET NOTIFICATIONS — Phase 17
// ══════════════════════════════════════════════════════

async function notifyPasswordReset(customer, resetLink) {
  const html = wrapEmail('Password Reset Request', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">We received a request to reset your password for your NB LAO account.</p>
    <div style="background:#EFF6FF;border-left:3px solid #2563EB;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Click the button below to set a new password:</strong></p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${resetLink}" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
    </div>
    <p style="color:#6B7280;font-size:13px;">This link expires in <strong>1 hour</strong> and can only be used once.</p>
    <p style="color:#6B7280;font-size:13px;">If you didn't request this reset, please ignore this email. Your password will remain unchanged.</p>
  `);
  const text = textWrap('Password Reset Request',
    `Dear ${customer.name},

We received a request to reset your password.

Reset link: ${resetLink}

This link expires in 1 hour and can only be used once.

If you didn't request this, please ignore this email.`);
  return await sendAndLog({ to: customer.email, subject: 'Password Reset Request | ' + BRAND.name, html, text, type: 'password_reset', customerId: customer.id });
}

async function notifyPasswordChanged(customer) {
  const html = wrapEmail('Password Changed Successfully', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your password has been changed successfully.</p>
    <div style="background:#f0fdf4;border-left:3px solid #059669;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Status:</strong> <span style="color:#059669;">Password Updated</span></p>
    </div>
    <p style="color:#6B7280;font-size:13px;">If you didn't make this change, please contact us immediately at ${BRAND.email}.</p>
  `);
  const text = textWrap('Password Changed Successfully',
    `Dear ${customer.name},

Your password has been changed successfully.

If you didn't make this change, please contact us immediately at ${BRAND.email}.`);
  return await sendAndLog({ to: customer.email, subject: 'Password Changed | ' + BRAND.name, html, text, type: 'password_changed', customerId: customer.id });
}

// ══════════════════════════════════════════════════════
// REVIEW NOTIFICATIONS — Phase 19
// ══════════════════════════════════════════════════════

async function notifyReviewSubmitted(adminEmail, customer, product, rating) {
  const html = wrapEmail('New Product Review Submitted', `
    <p style="color:#374151;font-size:14px;">A new review has been submitted for <strong>${product.name}</strong>.</p>
    <div style="background:#EFF6FF;border-left:3px solid #2563EB;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Customer:</strong> ${customer.name} (${customer.email})</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
    </div>
    <p style="color:#6B7280;font-size:13px;">Please review and approve or reject this review from the admin dashboard.</p>
  `);
  const text = textWrap('New Product Review Submitted',
    `A new review has been submitted for ${product.name}.\nCustomer: ${customer.name} (${customer.email})\nRating: ${rating}/5\n\nPlease review from the admin dashboard.`);
  return await sendAndLog({ to: adminEmail, subject: `New Review for ${product.name} | ${BRAND.name}`, html, text, type: 'review_submitted', customerId: customer.id });
}

async function notifyReviewApproved(customer, product) {
  const html = wrapEmail('Your Review Has Been Approved!', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your review for <strong>${product.name}</strong> has been approved and is now visible to other customers.</p>
    <div style="background:#f0fdf4;border-left:3px solid #059669;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Status:</strong> <span style="color:#059669;">Approved</span></p>
    </div>
    <p style="color:#374151;font-size:14px;">Thank you for sharing your feedback!</p>
  `);
  const text = textWrap('Your Review Has Been Approved!',
    `Dear ${customer.name},\n\nYour review for ${product.name} has been approved and is now visible.\n\nThank you for your feedback!`);
  return await sendAndLog({ to: customer.email, subject: `Review Approved — ${product.name} | ${BRAND.name}`, html, text, type: 'review_approved', customerId: customer.id });
}

async function notifyReviewRejected(customer, product, reason) {
  const html = wrapEmail('Your Review Was Not Approved', `
    <p style="color:#374151;font-size:14px;">Dear <strong>${customer.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;">Your review for <strong>${product.name}</strong> was not approved.</p>
    ${reason ? `<div style="background:#FEF2F2;border-left:3px solid #DC2626;padding:12px 16px;margin:16px 0;border-radius:4px;"><p style="margin:0;font-size:13px;color:#374151;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
    <p style="color:#374151;font-size:14px;">If you have questions, please contact us at ${BRAND.email}.</p>
  `);
  const text = textWrap('Your Review Was Not Approved',
    `Dear ${customer.name},\n\nYour review for ${product.name} was not approved.${reason ? '\nReason: ' + reason : ''}\n\nIf you have questions, please contact us at ${BRAND.email}.`);
  return await sendAndLog({ to: customer.email, subject: `Review Not Approved — ${product.name} | ${BRAND.name}`, html, text, type: 'review_rejected', customerId: customer.id });
}

module.exports = {
  notifyOrderCreated,
  notifyOrderStatusChanged,
  notifyQuotationCreated,
  notifyQuotationStatusChanged,
  notifyAccountActivated,
  notifyAccountDeactivated,
  notifyPointsEarned,
  notifyTierUpgraded,
  notifyPointsRedeemed,
  notifyPasswordReset,
  notifyPasswordChanged,
  notifyReviewSubmitted,
  notifyReviewApproved,
  notifyReviewRejected,
};
