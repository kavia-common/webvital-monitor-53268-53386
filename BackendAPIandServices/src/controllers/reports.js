const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const prisma = require('../utils/prisma');

// PUBLIC_INTERFACE
async function generateWebsiteReport(req, res) {
  /** Generate a simple PDF report for a website with recent metrics */
  const { id } = req.params;
  const website = await prisma.website.findFirst({ where: { id, userId: req.user.id } });
  if (!website) return res.status(404).json({ message: 'Not found' });

  const perf = await prisma.performanceResult.findMany({ where: { websiteId: id }, orderBy: { createdAt: 'desc' }, take: 5 });
  const uptime = await prisma.uptimeCheck.findMany({ where: { websiteId: id }, orderBy: { createdAt: 'desc' }, take: 10 });
  const ssl = await prisma.sslCheck.findFirst({ where: { websiteId: id }, orderBy: { createdAt: 'desc' } });

  const reportsDir = path.join(__dirname, '../../storage/reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const filePath = path.join(reportsDir, `website-${id}-${Date.now()}.pdf`);

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(22).text('WebVital Monitor Report', { underline: true });
  doc.moveDown();
  doc.fontSize(14).text(`Website: ${website.url}`);
  doc.text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown();

  doc.fontSize(16).text('Performance (latest 5)');
  perf.forEach((p) => {
    doc.fontSize(12).text(`- ${p.createdAt.toISOString()} | Score: ${p.performanceScore ?? 'n/a'} | LCP: ${p.lcp ?? 'n/a'} | FID: ${p.fid ?? 'n/a'} | CLS: ${p.cls ?? 'n/a'}`);
  });

  doc.moveDown();
  doc.fontSize(16).text('Uptime (latest 10)');
  uptime.forEach((u) => {
    doc.fontSize(12).text(`- ${u.createdAt.toISOString()} | Status: ${u.statusCode} | Ok: ${u.ok} | Response: ${u.responseMs ?? 'n/a'}ms`);
  });

  doc.moveDown();
  doc.fontSize(16).text('SSL');
  if (ssl) {
    doc.fontSize(12).text(`- Valid until: ${ssl.validUntil ? ssl.validUntil.toISOString() : 'n/a'} | Days left: ${ssl.daysLeft ?? 'n/a'} | Ok: ${ssl.ok}`);
  }

  doc.end();

  stream.on('finish', () => {
    res.download(filePath);
  });
}

module.exports = { generateWebsiteReport };
