const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
const twilio = require('twilio');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

const slackClient = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// PUBLIC_INTERFACE
async function sendAlertNotifications({ alert, user }) {
  /** Send notifications per user's AlertPreference over channels and persist Notification records */
  const prefs = await prisma.alertPreference.findUnique({ where: { userId: user.id } });
  const promises = [];

  if (prefs?.emailEnabled) {
    promises.push(sendEmail(user.email, `WebVital Monitor Alert: ${alert.type}`, alert.message)
      .then((ok) => record('email', ok))
      .catch((e) => record('email', false, e.message)));
  }

  if (prefs?.slackEnabled && slackClient && prefs.slackChannel) {
    promises.push(sendSlack(prefs.slackChannel, `Alert for ${alert.type}: ${alert.message}`)
      .then((ok) => record('slack', ok))
      .catch((e) => record('slack', false, e.message)));
  }

  if (prefs?.smsEnabled && twilioClient && prefs.phoneNumber) {
    promises.push(sendSMS(prefs.phoneNumber, `Alert: ${alert.type} - ${alert.message}`)
      .then((ok) => record('sms', ok))
      .catch((e) => record('sms', false, e.message)));
  }

  async function record(channel, success, error) {
    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          alertId: alert.id,
          channel,
          success: Boolean(success),
          error: error || null,
        },
      });
    } catch (err) {
      logger.error('Failed to record notification: %s', err.message);
    }
  }

  await Promise.all(promises);
}

async function sendEmail(to, subject, text) {
  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured, skipping email to %s', to);
    return false;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to, subject, text,
  });
  return true;
}

async function sendSlack(channel, text) {
  if (!slackClient) {
    logger.warn('Slack not configured, skipping to %s', channel);
    return false;
  }
  await slackClient.chat.postMessage({ channel, text });
  return true;
}

async function sendSMS(to, body) {
  if (!twilioClient) {
    logger.warn('Twilio not configured, skipping sms to %s', to);
    return false;
  }
  await twilioClient.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER, body });
  return true;
}

module.exports = { sendAlertNotifications };
