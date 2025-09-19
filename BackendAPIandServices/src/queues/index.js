const { Queue } = require('bullmq');

const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } };

const pageSpeedQueue = new Queue('pageSpeed', connection);
const uptimeQueue = new Queue('uptime', connection);
const sslQueue = new Queue('ssl', connection);
const seoQueue = new Queue('seo', connection);
const evaluateQueue = new Queue('evaluate', connection);

// PUBLIC_INTERFACE
async function enqueueMonitoringJobsForWebsite(websiteId) {
  /** Enqueue all monitoring jobs for a website with deduplication-friendly IDs */
  await pageSpeedQueue.add('pageSpeed', { websiteId }, { jobId: `ps-${websiteId}-${Date.now()}` });
  await uptimeQueue.add('uptime', { websiteId }, { jobId: `up-${websiteId}-${Date.now()}` });
  await sslQueue.add('ssl', { websiteId }, { jobId: `ssl-${websiteId}-${Date.now()}` });
  await seoQueue.add('seo', { websiteId }, { jobId: `seo-${websiteId}-${Date.now()}` });
}

// PUBLIC_INTERFACE
async function scheduleRecurringJobs(websiteId, intervalMinutes = 5) {
  /** Schedule repeatable jobs for monitoring */
  const repeat = { every: intervalMinutes * 60 * 1000 };
  await uptimeQueue.add('uptime', { websiteId }, { jobId: `up-${websiteId}`, repeat });
  const psEvery = Math.min(Math.max(intervalMinutes, 10), 15);
  await pageSpeedQueue.add('pageSpeed', { websiteId }, { jobId: `ps-${websiteId}`, repeat: { every: psEvery * 60 * 1000 } });
  await sslQueue.add('ssl', { websiteId }, { jobId: `ssl-${websiteId}`, repeat: { every: 60 * 60 * 1000 } }); // hourly
  await seoQueue.add('seo', { websiteId }, { jobId: `seo-${websiteId}`, repeat: { every: 6 * 60 * 60 * 1000 } }); // 6h
}

module.exports = {
  pageSpeedQueue,
  uptimeQueue,
  sslQueue,
  seoQueue,
  evaluateQueue,
  enqueueMonitoringJobsForWebsite,
  scheduleRecurringJobs,
};
