const prisma = require('../utils/prisma');
const { sendAlertNotifications } = require('./notification');
const logger = require('../utils/logger');

// PUBLIC_INTERFACE
async function evaluateAndAlertForWebsite(websiteId) {
  /** Evaluate latest records vs preferences and create alerts and notifications */
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: { user: true },
  });
  if (!website) throw new Error('Website not found');

  const prefs = await prisma.alertPreference.findUnique({ where: { userId: website.userId } });

  // Uptime
  const lastUp = await prisma.uptimeCheck.findFirst({
    where: { websiteId },
    orderBy: { createdAt: 'desc' },
  });

  if (lastUp && !lastUp.ok) {
    await createAndNotify(website, 'downtime', `Site appears down (status ${lastUp.statusCode})`, 'critical');
  }

  // SSL
  const lastSSL = await prisma.sslCheck.findFirst({
    where: { websiteId },
    orderBy: { createdAt: 'desc' },
  });

  if (lastSSL && lastSSL.daysLeft != null && lastSSL.daysLeft <= 14) {
    await createAndNotify(website, 'ssl_expiring', `SSL certificate expiring in ${lastSSL.daysLeft} days`, 'warning');
  }

  // Performance
  const lastPerf = await prisma.performanceResult.findFirst({
    where: { websiteId },
    orderBy: { createdAt: 'desc' },
  });

  if (prefs && lastPerf && prefs.perfThreshold != null && lastPerf.performanceScore != null) {
    if (lastPerf.performanceScore < prefs.perfThreshold) {
      await createAndNotify(website, 'performance_degradation', `Performance score ${lastPerf.performanceScore} below threshold ${prefs.perfThreshold}`, 'warning');
    }
  }

  async function createAndNotify(website, type, message, severity) {
    const alert = await prisma.alert.create({
      data: {
        websiteId: website.id,
        type,
        message,
        severity,
      },
    });
    await sendAlertNotifications({ alert, user: website.user });
  }
}

module.exports = { evaluateAndAlertForWebsite };
