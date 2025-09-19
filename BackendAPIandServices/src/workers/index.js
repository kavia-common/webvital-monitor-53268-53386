require('dotenv').config();
const { Worker } = require('bullmq');
const logger = require('../utils/logger');
const prisma = require('../utils/prisma');
const { runPageSpeedCheck, runUptimeCheck, runSSLCheck, runSEOScanBasic } = require('../services/monitoring');
const { evaluateAndAlertForWebsite } = require('../services/alerting');

const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } };

function createWorker(name, processor) {
  const worker = new Worker(name, processor, connection);
  worker.on('completed', (job) => logger.info('%s job %s completed', name, job.id));
  worker.on('failed', (job, err) => logger.error('%s job %s failed: %s', name, job?.id, err.message));
  return worker;
}

createWorker('pageSpeed', async (job) => {
  const { websiteId } = job.data;
  await runPageSpeedCheck(websiteId, 'mobile');
  await evaluateAndAlertForWebsite(websiteId);
});

createWorker('uptime', async (job) => {
  const { websiteId } = job.data;
  await runUptimeCheck(websiteId);
  await evaluateAndAlertForWebsite(websiteId);
});

createWorker('ssl', async (job) => {
  const { websiteId } = job.data;
  await runSSLCheck(websiteId);
  await evaluateAndAlertForWebsite(websiteId);
});

createWorker('seo', async (job) => {
  const { websiteId } = job.data;
  await runSEOScanBasic(websiteId);
  await evaluateAndAlertForWebsite(websiteId);
});

// Keep process alive if executed directly
if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log('Workers started...');
}
