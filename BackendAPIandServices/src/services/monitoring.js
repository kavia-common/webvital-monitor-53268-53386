const axios = require('axios');
const dayjs = require('dayjs');
const https = require('https');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

// PUBLIC_INTERFACE
async function runPageSpeedCheck(websiteId, strategy = 'mobile') {
  /** Call Google PageSpeed Insights and store performance metrics */
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) throw new Error('Website not found');

  const params = {
    url: website.url,
    key: process.env.PAGESPEED_API_KEY,
    strategy,
    category: ['performance'],
  };

  const { data } = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', { params });
  const lighthouse = data.lighthouseResult;

  const lcp = lighthouse?.audits?.['largest-contentful-paint']?.numericValue;
  const fid = lighthouse?.audits?.['max-potential-fid']?.numericValue; // approximation
  const cls = lighthouse?.audits?.['cumulative-layout-shift']?.numericValue;
  const score = lighthouse?.categories?.performance?.score != null ? lighthouse.categories.performance.score * 100 : null;

  const perf = await prisma.performanceResult.create({
    data: {
      websiteId: website.id,
      strategy,
      lcp: lcp != null ? lcp : null,
      fid: fid != null ? fid : null,
      cls: cls != null ? cls : null,
      performanceScore: score,
      raw: data,
    },
  });

  return perf;
}

// PUBLIC_INTERFACE
async function runUptimeCheck(websiteId) {
  /** Perform HTTP status check and store result */
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) throw new Error('Website not found');

  const start = Date.now();
  let statusCode = 0;
  let ok = false;
  try {
    const resp = await axios.get(website.url, { timeout: 10000, validateStatus: () => true });
    statusCode = resp.status;
    ok = statusCode >= 200 && statusCode < 400;
  } catch (e) {
    statusCode = 0;
    ok = false;
  }
  const responseMs = Date.now() - start;

  const rec = await prisma.uptimeCheck.create({
    data: {
      websiteId: website.id,
      statusCode,
      responseMs,
      ok,
    },
  });

  await prisma.website.update({
    where: { id: website.id },
    data: { lastStatus: statusCode, lastCheckedAt: new Date() },
  });

  return rec;
}

// PUBLIC_INTERFACE
async function runSSLCheck(websiteId) {
  /** Fetch SSL cert info via TLS handshake and store summary */
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) throw new Error('Website not found');

  let validUntil = null;
  let ok = false;
  let daysLeft = null;

  try {
    const url = new URL(website.url);
    const host = url.hostname;
    const port = 443;
    const cert = await new Promise((resolve, reject) => {
      const req = https.request({ host, port, method: 'GET' }, (res) => {
        const certInfo = res.socket.getPeerCertificate();
        resolve(certInfo);
      });
      req.on('error', reject);
      req.end();
    });
    if (cert && cert.valid_to) {
      validUntil = dayjs(cert.valid_to, 'MMM D HH:mm:ss YYYY GMT').toDate();
      daysLeft = Math.ceil((validUntil - new Date()) / (1000 * 60 * 60 * 24));
      ok = daysLeft != null && daysLeft > 7; // OK if > 7 days remaining
    }
  } catch (e) {
    ok = false;
  }

  const rec = await prisma.sslCheck.create({
    data: {
      websiteId: website.id,
      validUntil,
      daysLeft,
      ok,
    },
  });

  return rec;
}

// PUBLIC_INTERFACE
async function runSEOScanBasic(websiteId) {
  /** Basic SEO scan: count broken links (simple GET 404 on root links) and meta tag presence (very light placeholder) */
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) throw new Error('Website not found');

  // Minimal placeholder SEO scan to satisfy interface; real crawling would be more complex
  let brokenLinks = 0;
  let metaIssues = 0;
  let raw = {};

  try {
    const { data } = await axios.get(website.url, { timeout: 10000 });
    raw.htmlLength = (data && typeof data === 'string') ? data.length : 0;
    // Very lightweight heuristics
    if (typeof data === 'string') {
      if (!data.includes('<meta name="description"')) metaIssues += 1;
      if (!data.includes('<title>')) metaIssues += 1;
    }
  } catch (e) {
    brokenLinks += 1;
  }

  const rec = await prisma.sEOScan.create({
    data: {
      websiteId: website.id,
      brokenLinks,
      metaIssues,
      raw,
    },
  });

  return rec;
}

module.exports = {
  runPageSpeedCheck,
  runUptimeCheck,
  runSSLCheck,
  runSEOScanBasic,
};
