/**
 * Loyalty & Points Service — Phase 16
 * Core business logic for earning, redeeming, adjusting, and expiring points.
 * All point mutations MUST go through this service for audit trail integrity.
 */

const { PrismaClient } = require('@prisma/client');
const { notifyPointsEarned, notifyTierUpgraded, notifyPointsRedeemed } = require('./notifications');

let prisma;
function getPrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

// ─── CONFIG HELPERS ────────────────────────────────────────────────

async function getConfig() {
  const row = await getPrisma().loyaltyConfig.findFirst();
  if (!row) return defaultConfig();
  return { ...defaultConfig(), ...JSON.parse(row.config) };
}

function defaultConfig() {
  return {
    enabled: true,
    earningRate: 1,            // points per 1000 KIP spent
    redemptionRate: 1000,      // KIP value per 1 point redeemed
    minRedeem: 100,            // minimum points to redeem
    maxRedeemPerOrder: 0.5,    // max fraction of order total redeemable
    minOrderForRedeem: 100000, // minimum order total (KIP) to allow redemption
    expirationDays: 365,       // points expire after N days (0 = never)
    eligibleStatuses: ['confirmed', 'processing', 'shipped', 'delivered'],
  };
}

async function updateConfig(data, staffId) {
  const current = await getConfig();
  const merged = { ...current, ...data };
  const row = await getPrisma().loyaltyConfig.findFirst();
  if (row) {
    await getPrisma().loyaltyConfig.update({ where: { id: row.id }, data: { config: JSON.stringify(merged), updatedAt: new Date() } });
  } else {
    await getPrisma().loyaltyConfig.create({ data: { config: JSON.stringify(merged) } });
  }
  return merged;
}

// ─── TIER HELPERS ──────────────────────────────────────────────────

async function getTiers() {
  return getPrisma().loyaltyTier.findMany({ orderBy: { sortOrder: 'asc' } });
}

async function getActiveTiers() {
  return getPrisma().loyaltyTier.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
}

async function calculateTier(customerId) {
  const customer = await getPrisma().customer.findUnique({ where: { id: customerId } });
  if (!customer) return null;
  const tiers = await getActiveTiers();
  let bestTier = null;
  for (const tier of tiers) {
    if (customer.lifetimePoints >= tier.minPoints || customer.lifetimeSpending >= tier.minSpending) {
      bestTier = tier;
    }
  }
  return bestTier;
}

async function upgradeCustomerTier(customerId, tx) {
  const client = tx || getPrisma();
  const customer = await client.customer.findUnique({ where: { id: customerId } });
  if (!customer) return null;
  const tiers = await client.loyaltyTier.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  let bestTier = null;
  for (const tier of tiers) {
    if (customer.lifetimePoints >= tier.minPoints || customer.lifetimeSpending >= tier.minSpending) {
      bestTier = tier;
    }
  }
  if (bestTier && bestTier.id !== customer.tierId) {
    await client.customer.update({ where: { id: customerId }, data: { tierId: bestTier.id } });
    return { oldTierId: customer.tierId, newTier: bestTier };
  }
  return null;
}

// ─── POINTS EARNING ────────────────────────────────────────────────

async function earnPoints(customerId, orderTotal, orderId, tx) {
  const config = await getConfig();
  if (!config.enabled) return null;

  // Check duplicate
  const existing = await (tx || getPrisma()).pointsLedger.findFirst({
    where: { customerId, orderId, type: 'earned' },
  });
  if (existing) return null;

  // Get customer for email notification
  const customerForEmail = await (tx || getPrisma()).customer.findUnique({ where: { id: customerId } });

  // Only earn on eligible statuses
  const customer = await (tx || getPrisma()).customer.findUnique({ where: { id: customerId } });
  if (!customer) return null;

  // Get tier multiplier
  const tier = await (tx || getPrisma()).loyaltyTier.findUnique({ where: { id: customer.tierId } }).catch(() => null);
  const multiplier = tier ? tier.multiplier : 1.0;

  // Calculate points: (orderTotal / 1000) * earningRate * multiplier
  const basePoints = Math.floor((orderTotal / 1000) * config.earningRate);
  const earnedPoints = Math.max(1, Math.floor(basePoints * multiplier));

  const balanceBefore = customer.pointsBalance;
  const balanceAfter = balanceBefore + earnedPoints;

  // Calculate expiration
  let expiresAt = null;
  if (config.expirationDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.expirationDays);
  }

  const client = tx || getPrisma();

  // Create ledger entry
  await client.pointsLedger.create({
    data: {
      customerId,
      type: 'earned',
      points: earnedPoints,
      balanceBefore,
      balanceAfter,
      orderId,
      reason: `Order #${orderId} completed`,
      metadata: JSON.stringify({ orderTotal, earningRate: config.earningRate, multiplier, tierName: tier ? tier.name : 'Bronze' }),
      expiresAt,
    },
  });

  // Update customer balance
  await client.customer.update({
    where: { id: customerId },
    data: {
      pointsBalance: balanceAfter,
      lifetimePoints: { increment: earnedPoints },
    },
  });

  // Send notification (non-blocking)
  if (customerForEmail && customerForEmail.email) {
    const customerUpdated = await (tx || getPrisma()).customer.findUnique({ where: { id: customerId }, include: { tier: true } });
    notifyPointsEarned(customerForEmail, earnedPoints, orderId, customerUpdated?.tier?.name).catch(() => {});
  }

  // Check for tier upgrade
  const tierUpgrade = await upgradeCustomerTier(customerId, tx);
  if (tierUpgrade && customerForEmail) {
    const oldTier = await (tx || getPrisma()).loyaltyTier.findUnique({ where: { id: tierUpgrade.oldTierId } }).catch(() => null);
    notifyTierUpgraded(customerForEmail, oldTier?.name, tierUpgrade.newTier.name, tierUpgrade.newTier.discount).catch(() => {});
  }

  return { points: earnedPoints, balanceAfter, expiresAt };
}

// ─── POINTS REDEMPTION ─────────────────────────────────────────────

async function redeemPoints(customerId, requestedPoints, orderTotal, orderId, tx) {
  const config = await getConfig();
  if (!config.enabled) return { error: 'Loyalty system is disabled' };

  const customer = await (tx || getPrisma()).customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: 'Customer not found' };

  // Minimum order total check
  if (orderTotal < config.minOrderForRedeem) {
    return { error: `Minimum order total of ${config.minOrderForRedeem} KIP required for redemption` };
  }

  // Balance check
  if (customer.pointsBalance < requestedPoints) {
    return { error: `Insufficient points. Available: ${customer.pointsBalance}` };
  }

  // Minimum redeem check
  if (requestedPoints < config.minRedeem) {
    return { error: `Minimum redemption is ${config.minRedeem} points` };
  }

  // Max redemption check (50% of order)
  const maxPoints = Math.floor((orderTotal * config.maxRedeemPerOrder) / config.redemptionRate);
  const pointsToRedeem = Math.min(requestedPoints, maxPoints);
  if (pointsToRedeem < config.minRedeem) {
    return { error: `Maximum redeemable for this order is ${pointsToRedeem} points, below minimum ${config.minRedeem}` };
  }

  const discountKip = pointsToRedeem * config.redemptionRate;
  const balanceBefore = customer.pointsBalance;
  const balanceAfter = balanceBefore - pointsToRedeem;

  const client = tx || getPrisma();

  await client.pointsLedger.create({
    data: {
      customerId,
      type: 'redeemed',
      points: -pointsToRedeem,
      balanceBefore,
      balanceAfter,
      orderId,
      reason: `Redeemed ${pointsToRedeem} points for order #${orderId}`,
      metadata: JSON.stringify({ discountKip, redemptionRate: config.redemptionRate }),
    },
  });

  await client.customer.update({
    where: { id: customerId },
    data: { pointsBalance: balanceAfter },
  });

  // Send notification (non-blocking)
  if (customer.email) {
    notifyPointsRedeemed(customer, pointsToRedeem, discountKip, orderId).catch(() => {});
  }

  return { pointsRedeemed: pointsToRedeem, discountKip, balanceAfter };
}

// ─── POINTS EXPIRATION ─────────────────────────────────────────────

async function expirePoints(customerId, tx) {
  const config = await getConfig();
  if (!config.enabled || config.expirationDays === 0) return { expired: 0 };

  const now = new Date();
  const client = tx || getPrisma();

  // Find all earned ledger entries that have expired and haven't been expired yet
  const expiredEntries = await client.pointsLedger.findMany({
    where: {
      customerId,
      type: 'earned',
      expiresAt: { not: null, lte: now },
      expiredAt: null,
    },
  });

  let totalExpired = 0;
  const customer = await client.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { expired: 0 };

  let runningBalance = customer.pointsBalance;

  for (const entry of expiredEntries) {
    if (entry.points <= 0) continue;

    totalExpired += entry.points;
    const balanceBefore = runningBalance;
    runningBalance = Math.max(0, runningBalance - entry.points);

    // Create expiration ledger entry
    await client.pointsLedger.create({
      data: {
        customerId,
        type: 'expired',
        points: -entry.points,
        balanceBefore,
        balanceAfter: runningBalance,
        orderId: entry.orderId,
        reason: `Points from order #${entry.orderId} expired`,
        metadata: JSON.stringify({ sourceLedgerId: entry.id, originalPoints: entry.points }),
        sourceLedgerId: entry.id,
      },
    });

    // Mark the original entry as expired
    await client.pointsLedger.update({
      where: { id: entry.id },
      data: { expiredAt: now },
    });
  }

  if (totalExpired > 0) {
    await client.customer.update({
      where: { id: customerId },
      data: { pointsBalance: runningBalance },
    });
  }

  return { expired: totalExpired };
}

// ─── MANUAL ADJUSTMENT ─────────────────────────────────────────────

async function adjustPoints(customerId, points, reason, staffId, tx) {
  if (points === 0) return { error: 'Points must be non-zero' };

  const customer = await (tx || getPrisma()).customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: 'Customer not found' };

  const balanceBefore = customer.pointsBalance;
  const balanceAfter = balanceBefore + points;

  if (balanceAfter < 0) {
    return { error: `Insufficient points. Available: ${balanceBefore}, trying to deduct: ${Math.abs(points)}` };
  }

  const client = tx || getPrisma();

  await client.pointsLedger.create({
    data: {
      customerId,
      type: 'adjusted',
      points,
      balanceBefore,
      balanceAfter,
      staffId,
      reason: reason || 'Manual adjustment by staff',
      metadata: JSON.stringify({ staffId }),
    },
  });

  await client.customer.update({
    where: { id: customerId },
    data: {
      pointsBalance: balanceAfter,
      ...(points > 0 ? { lifetimePoints: { increment: points } } : {}),
    },
  });

  return { points, balanceAfter };
}

// ─── ORDER STATUS CHANGE HANDLER ───────────────────────────────────

async function handleOrderStatusChange(orderId, newStatus, customerId, orderTotal, tx) {
  const config = await getConfig();
  if (!config.enabled) return null;

  // If status changed to an eligible status, earn points
  if (config.eligibleStatuses.includes(newStatus)) {
    const existing = await (tx || getPrisma()).pointsLedger.findFirst({
      where: { customerId, orderId, type: 'earned' },
    });
    if (!existing) {
      return await earnPoints(customerId, orderTotal, orderId, tx);
    }
  }

  // If status changed to cancelled, reverse earned points
  if (newStatus === 'cancelled') {
    return await reversePointsForOrder(orderId, customerId, tx);
  }

  return null;
}

async function reversePointsForOrder(orderId, customerId, tx) {
  const client = tx || getPrisma();
  const earnedEntry = await client.pointsLedger.findFirst({
    where: { customerId, orderId, type: 'earned' },
  });

  if (!earnedEntry) return null;

  const customer = await client.customer.findUnique({ where: { id: customerId } });
  if (!customer) return null;

  const balanceBefore = customer.pointsBalance;
  const balanceAfter = Math.max(0, balanceBefore - earnedEntry.points);

  await client.pointsLedger.create({
    data: {
      customerId,
      type: 'reversed',
      points: -earnedEntry.points,
      balanceBefore,
      balanceAfter,
      orderId,
      reason: `Points reversed for cancelled order #${orderId}`,
      metadata: JSON.stringify({ sourceLedgerId: earnedEntry.id, originalPoints: earnedEntry.points }),
      sourceLedgerId: earnedEntry.id,
    },
  });

  // Mark original as expired
  await client.pointsLedger.update({
    where: { id: earnedEntry.id },
    data: { expiredAt: new Date() },
  });

  await client.customer.update({
    where: { id: customerId },
    data: { pointsBalance: balanceAfter },
  });

  return { points: -earnedEntry.points, balanceAfter };
}

// ─── CUSTOMER SUMMARY ──────────────────────────────────────────────

async function getCustomerSummary(customerId) {
  const customer = await getPrisma().customer.findUnique({
    where: { id: customerId },
    include: { tier: true },
  });
  if (!customer) return null;

  const config = await getConfig();
  const tiers = await getActiveTiers();
  const ledger = await getPrisma().pointsLedger.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Find next tier
  let nextTier = null;
  for (const tier of tiers) {
    if (customer.lifetimePoints < tier.minPoints && (!nextTier || tier.minPoints < nextTier.minPoints)) {
      nextTier = tier;
    }
  }

  const totalEarned = ledger.filter(e => e.type === 'earned').reduce((s, e) => s + e.points, 0);
  const totalRedeemed = ledger.filter(e => e.type === 'redeemed').reduce((s, e) => s + Math.abs(e.points), 0);
  const totalExpired = ledger.filter(e => e.type === 'expired').reduce((s, e) => s + Math.abs(e.points), 0);

  return {
    customerId: customer.id,
    pointsBalance: customer.pointsBalance,
    lifetimePoints: customer.lifetimePoints,
    lifetimeSpending: customer.lifetimeSpending,
    currentTier: customer.tier ? {
      id: customer.tier.id,
      name: customer.tier.name,
      discount: customer.tier.discount,
      multiplier: customer.tier.multiplier,
    } : null,
    nextTier: nextTier ? {
      id: nextTier.id,
      name: nextTier.name,
      minPoints: nextTier.minPoints,
      minSpending: nextTier.minSpending,
      pointsNeeded: Math.max(0, nextTier.minPoints - customer.lifetimePoints),
      spendingNeeded: Math.max(0, nextTier.minSpending - customer.lifetimeSpending),
    } : null,
    totalEarned,
    totalRedeemed,
    totalExpired,
    config: {
      earningRate: config.earningRate,
      redemptionRate: config.redemptionRate,
      minRedeem: config.minRedeem,
    },
    ledger: ledger.map(e => ({
      id: e.id,
      type: e.type,
      points: e.points,
      balanceBefore: e.balanceBefore,
      balanceAfter: e.balanceAfter,
      orderId: e.orderId,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
  };
}

// ─── ADMIN STATS ───────────────────────────────────────────────────

async function getAdminStats() {
  const totalCustomers = await getPrisma().customer.count();
  const totalPointsIssued = await getPrisma().pointsLedger.aggregate({ _sum: { points: true }, where: { type: 'earned' } });
  const totalPointsRedeemed = await getPrisma().pointsLedger.aggregate({ _sum: { points: true }, where: { type: 'redeemed' } });
  const totalPointsExpired = await getPrisma().pointsLedger.aggregate({ _sum: { points: true }, where: { type: 'expired' } });
  const totalPointsAdjusted = await getPrisma().pointsLedger.aggregate({ _sum: { points: true }, where: { type: 'adjusted' } });
  const tierCounts = await getPrisma().customer.groupBy({ by: ['tierId'], _count: true });

  return {
    totalCustomers,
    totalPointsIssued: totalPointsIssued._sum.points || 0,
    totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
    totalPointsExpired: Math.abs(totalPointsExpired._sum.points || 0),
    totalPointsAdjusted: totalPointsAdjusted._sum.points || 0,
    tierDistribution: tierCounts.map(t => ({ tierId: t.tierId, count: t._count })),
  };
}

module.exports = {
  getConfig,
  updateConfig,
  getTiers,
  getActiveTiers,
  calculateTier,
  upgradeCustomerTier,
  earnPoints,
  redeemPoints,
  expirePoints,
  adjustPoints,
  handleOrderStatusChange,
  reversePointsForOrder,
  getCustomerSummary,
  getAdminStats,
  defaultConfig,
};
