const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    if ((JWT_SECRET || '').length < 32) return res.status(503).json({ error: 'Secure authentication is not configured' });
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded.tenantId || !decoded.role) throw new Error('missing authorization context');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role hierarchy: admin > attorney > viewer
// admin:    full write access, user mgmt
// attorney: write access on case data (no user mgmt)
// viewer:   read-only
const ROLES = ['viewer', 'attorney', 'admin'];

function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role || 'viewer';
    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: `Forbidden: requires one of [${allowed.join(', ')}], got '${role}'`,
      });
    }
    next();
  };
}

// Convenience: any non-viewer write (admin or attorney)
const requireWriter = requireRole('admin', 'attorney');
// Convenience: admin-only
const requireAdmin = requireRole('admin');
// Back-compat alias (legacy code may import requireCommander)
const requireCommander = requireAdmin;

function withCrudRbac(router) {
  router.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return requireWriter(req, res, next);
    }
    return next();
  });
  return router;
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
  ROLES,
  requireRole,
  requireWriter,
  requireAdmin,
  requireCommander,
  withCrudRbac,
};
