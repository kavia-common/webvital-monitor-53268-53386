require('dotenv').config();
const app = require('./app');

// Prefer 3001 as default to align with container expectations; allow override via PORT env
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

// Helpful diagnostics on startup to aid container readiness investigations
function logStartupDiagnostics() {
  // eslint-disable-next-line no-console
  console.log('Backend startup diagnostics:');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
    port: PORT,
    host: HOST,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasRedisUrl: Boolean(process.env.REDIS_URL),
    hasJwtSecrets: Boolean(process.env.JWT_SECRET) && Boolean(process.env.REFRESH_TOKEN_SECRET),
  }, null, 2));
}

const server = app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://${HOST}:${PORT}`);
  logStartupDiagnostics();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
