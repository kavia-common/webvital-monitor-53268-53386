const prisma = require('../utils/prisma');

// PUBLIC_INTERFACE
async function getPreferences(req, res) {
  /** Get current user's alert preferences */
  const prefs = await prisma.alertPreference.findUnique({ where: { userId: req.user.id } });
  return res.json({ preferences: prefs });
}

// PUBLIC_INTERFACE
async function updatePreferences(req, res) {
  /** Update alert preferences */
  const { emailEnabled, slackEnabled, smsEnabled, slackChannel, phoneNumber, perfThreshold, lcpThresholdMs, responseTimeThresholdMs } = req.body;
  const prefs = await prisma.alertPreference.upsert({
    where: { userId: req.user.id },
    update: { emailEnabled, slackEnabled, smsEnabled, slackChannel, phoneNumber, perfThreshold, lcpThresholdMs, responseTimeThresholdMs },
    create: { userId: req.user.id, emailEnabled, slackEnabled, smsEnabled, slackChannel, phoneNumber, perfThreshold, lcpThresholdMs, responseTimeThresholdMs },
  });
  return res.json({ preferences: prefs });
}

module.exports = { getPreferences, updatePreferences };
