const prisma = require('../utils/prisma');
const { scheduleRecurringJobs, enqueueMonitoringJobsForWebsite } = require('../queues');

// PUBLIC_INTERFACE
async function list(req, res) {
  /** List websites of current user */
  const websites = await prisma.website.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ websites });
}

// PUBLIC_INTERFACE
async function create(req, res) {
  /** Create website and schedule monitoring */
  const { url, monitoringIntervalMinutes } = req.body;
  if (!url) return res.status(400).json({ message: 'url required' });

  const website = await prisma.website.create({
    data: {
      url,
      userId: req.user.id,
      monitoringIntervalMinutes: monitoringIntervalMinutes || 5,
    },
  });

  await scheduleRecurringJobs(website.id, website.monitoringIntervalMinutes);
  await enqueueMonitoringJobsForWebsite(website.id);

  return res.status(201).json({ website });
}

// PUBLIC_INTERFACE
async function update(req, res) {
  /** Update website settings */
  const { id } = req.params;
  const { monitoringIntervalMinutes, isActive } = req.body;
  const website = await prisma.website.findFirst({ where: { id, userId: req.user.id } });
  if (!website) return res.status(404).json({ message: 'Not found' });

  const updated = await prisma.website.update({
    where: { id: website.id },
    data: {
      monitoringIntervalMinutes: monitoringIntervalMinutes ?? website.monitoringIntervalMinutes,
      isActive: isActive ?? website.isActive,
    },
  });

  if (monitoringIntervalMinutes) {
    await scheduleRecurringJobs(updated.id, updated.monitoringIntervalMinutes);
  }

  return res.json({ website: updated });
}

// PUBLIC_INTERFACE
async function remove(req, res) {
  /** Delete website */
  const { id } = req.params;
  const website = await prisma.website.findFirst({ where: { id, userId: req.user.id } });
  if (!website) return res.status(404).json({ message: 'Not found' });
  await prisma.website.delete({ where: { id: website.id } });
  return res.status(204).send();
}

// PUBLIC_INTERFACE
async function results(req, res) {
  /** Get metrics history for website */
  const { id } = req.params;
  const website = await prisma.website.findFirst({ where: { id, userId: req.user.id } });
  if (!website) return res.status(404).json({ message: 'Not found' });

  const [perf, uptime, ssl, seo] = await Promise.all([
    prisma.performanceResult.findMany({ where: { websiteId: website.id }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.uptimeCheck.findMany({ where: { websiteId: website.id }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.sslCheck.findMany({ where: { websiteId: website.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.sEOScan.findMany({ where: { websiteId: website.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  return res.json({ performance: perf, uptime, ssl, seo });
}

module.exports = { list, create, update, remove, results };
