const jwt = require('jsonwebtoken');

const INSECURE_DEFAULT = 'nblao-dev-secret-change-in-production';
const JWT_EXPIRES = '7d';

// Validate JWT_SECRET at module load time
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === INSECURE_DEFAULT) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET is missing or insecure. Set a strong JWT_SECRET in your environment.');
    console.error('[FATAL] Generate one with: node -e "console.log(require(\"crypto\").randomBytes(64).toString(\"hex\"))"');
    process.exit(1);
  } else if (!JWT_SECRET) {
    JWT_SECRET = INSECURE_DEFAULT;
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[WARN] JWT_SECRET not set. Using insecure development default. Do NOT use in production.');
    }
  }
}

function signToken(customer, staff) {
  const payload = {
    id: customer.id,
    email: customer.email,
    role: customer.role,
    name: customer.name,
  };
  if (staff) {
    payload.staffId = staff.id;
    payload.isSuperAdmin = staff.isSuperAdmin;
    payload.positionId = staff.positionId;
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signToken, verifyToken, authMiddleware, JWT_SECRET };
