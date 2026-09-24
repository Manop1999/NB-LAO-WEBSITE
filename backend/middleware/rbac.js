/**
 * RBAC Middleware — permission-based access control
 * Format: module:action (e.g., 'products:view', 'orders:approve')
 * Special: 'all' grants everything (super admin)
 */
const prisma = require('../lib/prisma');

// Parse permissions from JSON string
function parsePermissions(permStr) {
  try {
    return JSON.parse(permStr || '[]');
  } catch {
    return [];
  }
}

// Check if staff has a specific permission
function hasPermission(permissions, perm) {
  if (permissions.includes('all')) return true;
  return permissions.includes(perm);
}

// Middleware: require specific permission(s)
// Usage: requirePermission('products:view'), requirePermission('products:edit')
function requirePermission(...perms) {
  return async (req, res, next) => {
    // Must be authenticated first
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Super admin bypass
    if (req.user.isSuperAdmin) return next();

    // Old-style admin check (backward compat)
    if (req.user.role === 'admin' && !req.user.staffId) return next();

    // Check staff permissions
    if (!req.user.staffId) {
      return res.status(403).json({ error: 'Staff access required' });
    }

    try {
      const staff = await prisma.staff.findUnique({ where: { id: req.user.staffId } });
      if (!staff || !staff.active) {
        return res.status(403).json({ error: 'Staff account inactive' });
      }
      const permissions = parsePermissions(staff.permissions);

      // Check if any of the required permissions are granted
      const granted = perms.some(p => hasPermission(permissions, p));
      if (!granted) {
        return res.status(403).json({ error: 'Insufficient permissions: ' + perms.join(' or ') });
      }
      next();
    } catch (err) {
      console.error('RBAC check error:', err);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

// Middleware: require ALL of the specified permissions
function requireAllPermissions(...perms) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    if (req.user.isSuperAdmin) return next();
    if (req.user.role === 'admin' && !req.user.staffId) return next();

    if (!req.user.staffId) {
      return res.status(403).json({ error: 'Staff access required' });
    }

    try {
      const staff = await prisma.staff.findUnique({ where: { id: req.user.staffId } });
      if (!staff || !staff.active) {
        return res.status(403).json({ error: 'Staff account inactive' });
      }
      const permissions = parsePermissions(staff.permissions);
      const granted = perms.every(p => hasPermission(permissions, p));
      if (!granted) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch (err) {
      console.error('RBAC check error:', err);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

// Middleware: require super admin only
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  if (req.user.isSuperAdmin) return next();
  return res.status(403).json({ error: 'Super Admin access required' });
}

// Helper: log audit event
async function auditLog({ staffId, customerId, action, module, targetId, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        staffId: staffId || null,
        customerId: customerId || null,
        action,
        module,
        targetId: targetId || null,
        details: details || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = {
  requirePermission,
  requireAllPermissions,
  requireSuperAdmin,
  hasPermission,
  parsePermissions,
  auditLog,
};
