const prisma = require('../utils/prisma');
const { verifyAccessToken } = require('../utils/jwt');

// PUBLIC_INTERFACE
async function authenticate(req, res, next) {
  /** Middleware to authenticate Bearer JWT token and attach user to req.user */
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
}

// PUBLIC_INTERFACE
function authorizeAgencyRoles(roles = []) {
  /** Require that the user has one of roles in a given agency (agencyId param). */
  return async (req, res, next) => {
    try {
      const agencyId = req.params.agencyId || req.body.agencyId || req.query.agencyId;
      if (!agencyId) return res.status(400).json({ message: 'agencyId required' });
      const membership = await prisma.agencyMember.findFirst({
        where: { agencyId, userId: req.user.id },
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
      if (roles.length && !roles.includes(membership.role)) {
        return res.status(403).json({ message: 'Insufficient role' });
      }
      req.membership = membership;
      next();
    } catch (e) {
      return res.status(403).json({ message: 'Forbidden', error: e.message });
    }
  };
}

module.exports = { authenticate, authorizeAgencyRoles };
