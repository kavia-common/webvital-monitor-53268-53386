const prisma = require('../utils/prisma');

// PUBLIC_INTERFACE
async function addNote(req, res) {
  /** Add note to a website */
  const { websiteId } = req.params;
  const { content } = req.body;
  const website = await prisma.website.findFirst({ where: { id: websiteId, userId: req.user.id } });
  if (!website) return res.status(404).json({ message: 'Website not found' });

  const note = await prisma.note.create({
    data: {
      websiteId,
      authorId: req.user.id,
      content,
    },
  });
  return res.status(201).json({ note });
}

// PUBLIC_INTERFACE
async function listNotes(req, res) {
  /** List notes for a website */
  const { websiteId } = req.params;
  const website = await prisma.website.findFirst({ where: { id: websiteId, userId: req.user.id } });
  if (!website) return res.status(404).json({ message: 'Website not found' });

  const notes = await prisma.note.findMany({
    where: { websiteId },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
  });
  return res.json({
    notes: notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
      author: { id: n.author.id, email: n.author.email, name: n.author.name },
    })),
  });
}

module.exports = { addNote, listNotes };
