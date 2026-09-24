const { authMiddleware } = require('../lib/auth');
const prisma = require('../lib/prisma');

// Admin middleware — supports both old role-based AND new RBAC permission-based access
// If user has a staffId, check permissions. Otherwise, fall back to role check.
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, async function onAuthed() {
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    // Super admin bypass
    if (req.user.isSuperAdmin) {
      req.staff = req.user;
      return next();
    }
    // Old-style admin (no staff record) — backward compatible
    if (req.user.role === 'admin' && !req.user.staffId) {
      req.staff = req.user;
      return next();
    }
    // New RBAC: check staff record
    if (req.user.staffId) {
      try {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.staffId } });
        if (!staff || !staff.active) {
          return res.status(403).json({ error: 'Staff account inactive' });
        }
        req.staff = { ...req.user, staffRecord: staff };
        return next();
      } catch (err) {
        console.error('Admin middleware staff lookup error:', err);
      }
    }
    return res.status(403).json({ error: 'Admin access required' });
  });
}

module.exports = { adminMiddleware };
