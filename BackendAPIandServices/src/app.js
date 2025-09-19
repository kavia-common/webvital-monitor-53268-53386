const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');

// Early diagnostics for common misconfigurations
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set. The API may start, but DB-backed routes will fail. Set DATABASE_URL in .env');
}
if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('JWT secrets are missing. Set JWT_SECRET and REFRESH_TOKEN_SECRET in .env for auth endpoints to work.');
}

// Initialize express app
const app = express();

// Security and logging
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.set('trust proxy', true);
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
}));

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host');
  let protocol = req.protocol;

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');
  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
     (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    openapi: '3.0.0',
    info: {
      title: 'WebVital Monitor API',
      version: '1.0.0',
      description: 'REST API for WebVital Monitor',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: [
      { url: `${protocol}://${fullHost}` },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

/**
 * Parse JSON request body
 */
app.use(express.json({ limit: '1mb' }));

/**
 * Mount routes
 * The routes module exports both rootRouter (for '/', '/__health/db') and apiRouter (for versioned API).
 */
const { rootRouter, apiRouter, listRegisteredRoutes } = routes;

// Root-level health and docs helpers
app.use('/', rootRouter);

// Versioned API
app.use('/api/v1', apiRouter);

// Not found handler with basic diagnostics to help identify wrong paths in clients
app.use((req, res, next) => {
  if (req.path === '/api/v1/auth/register' && req.method === 'POST') {
    // If we ever land here, something intercepted earlier; still respond 404 style hint
  }
  const registered = listRegisteredRoutes ? listRegisteredRoutes() : [];
  return res.status(404).json({
    status: 'not_found',
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    hint: 'Check that the frontend uses the correct base path and HTTP method.',
    exampleAuthRegister: 'POST /api/v1/auth/register',
    availableSample: registered.slice(0, 10), // show a few routes for quick orientation
  });
});

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
});

module.exports = app;
