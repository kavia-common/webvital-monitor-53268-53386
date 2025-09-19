const prisma = require('../utils/prisma');
const { authorizeAgencyRoles } = require('../middleware/auth');

// PUBLIC_INTERFACE
async function createAgency(req, res) {
  /** Create an agency with current user as owner and member */
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });

  const agency = await prisma.agency.create({
    data: { name, ownerId: req.user.id },
  });
  await prisma.agencyMember.create({
    data: { agencyId: agency.id, userId: req.user.id, role: 'OWNER' },
  });
  return res.status(201).json({ agency });
}

// PUBLIC_INTERFACE
async function listAgencies(req, res) {
  /** List agencies where user is a member */
  const memberships = await prisma.agencyMember.findMany({
    where: { userId: req.user.id },
    include: { agency: true },
  });
  return res.json({ agencies: memberships.map((m) => m.agency) });
}

// PUBLIC_INTERFACE
async function addMember(req, res) {
  /** Invite/add member by userId (simplified) */
  const { agencyId } = req.params;
  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  // Only OWNER/ADMIN
  const member = await prisma.agencyMember.findFirst({ where: { userId: req.user.id, agencyId } });
  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) return res.status(403).json({ message: 'Forbidden' });

  const created = await prisma.agencyMember.upsert({
    where: { agencyId_userId: { agencyId, userId } },
    update: { role: role || 'VIEWER' },
    create: { agencyId, userId, role: role || 'VIEWER' },
  });
  return res.status(201).json({ member: created });
}

// PUBLIC_INTERFACE
async function listMembers(req, res) {
  /** List members of an agency */
  const { agencyId } = req.params;
  const members = await prisma.agencyMember.findMany({
    where: { agencyId },
    include: { user: true },
  });
  return res.json({ members: members.map((m) => ({ id: m.id, role: m.role, user: { id: m.user.id, email: m.user.email, name: m.user.name } })) });
}

module.exports = { createAgency, listAgencies, addMember, listMembers };
