const express = require('express');
const healthController = require('../controllers/health');
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const websiteController = require('../controllers/websites');
const prefController = require('../controllers/preferences');
const agencyController = require('../controllers/agencies');
const notesController = require('../controllers/notes');
const reportsController = require('../controllers/reports');
const prisma = require('../utils/prisma');

// Root router: non-versioned routes like health and db health probe
const rootRouter = express.Router();

// Swagger tags kept here for generator to pick up
/**
 * @swagger
 * tags:
 *   - name: Health
 *   - name: Auth
 *   - name: Websites
 *   - name: Preferences
 *   - name: Agencies
 *   - name: Notes
 *   - name: Reports
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service health check passed
 */
rootRouter.get('/', healthController.check.bind(healthController));

/**
 * Lightweight DB health probe (non-auth) to help diagnose startup issues.
 * Returns 200 if Prisma can reach the database.
 */
rootRouter.get('/__health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message });
  }
});

// API router (versioned): define endpoints without '/api/v1' prefix. App mounts this at '/api/v1'.
const apiRouter = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register user with email/password
 *     tags: [Auth]
 */
apiRouter.post('/auth/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user with email/password
 *     tags: [Auth]
 */
apiRouter.post('/auth/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Google OAuth login via id_token
 *     tags: [Auth]
 */
apiRouter.post('/auth/google', authController.googleAuth);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
apiRouter.post('/auth/refresh', authController.refresh);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/auth/me', authenticate, authController.me);

/**
 * @swagger
 * /api/v1/websites:
 *   get:
 *     summary: List user websites
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/websites', authenticate, websiteController.list);

/**
 * @swagger
 * /api/v1/websites:
 *   post:
 *     summary: Create website and schedule monitoring
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.post('/websites', authenticate, websiteController.create);

/**
 * @swagger
 * /api/v1/websites/{id}:
 *   put:
 *     summary: Update website settings
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.put('/websites/:id', authenticate, websiteController.update);

/**
 * @swagger
 * /api/v1/websites/{id}:
 *   delete:
 *     summary: Delete website
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.delete('/websites/:id', authenticate, websiteController.remove);

/**
 * @swagger
 * /api/v1/websites/{id}/results:
 *   get:
 *     summary: Get website monitoring results
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/websites/:id/results', authenticate, websiteController.results);

/**
 * @swagger
 * /api/v1/preferences:
 *   get:
 *     summary: Get alert preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/preferences', authenticate, prefController.getPreferences);

/**
 * @swagger
 * /api/v1/preferences:
 *   put:
 *     summary: Update alert preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.put('/preferences', authenticate, prefController.updatePreferences);

/**
 * @swagger
 * /api/v1/agencies:
 *   get:
 *     summary: List agencies
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/agencies', authenticate, agencyController.listAgencies);

/**
 * @swagger
 * /api/v1/agencies:
 *   post:
 *     summary: Create agency
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.post('/agencies', authenticate, agencyController.createAgency);

/**
 * @swagger
 * /api/v1/agencies/{agencyId}/members:
 *   get:
 *     summary: List agency members
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/agencies/:agencyId/members', authenticate, agencyController.listMembers);

/**
 * @swagger
 * /api/v1/agencies/{agencyId}/members:
 *   post:
 *     summary: Add/Invite member to agency
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.post('/agencies/:agencyId/members', authenticate, agencyController.addMember);

/**
 * @swagger
 * /api/v1/websites/{websiteId}/notes:
 *   get:
 *     summary: List notes for website
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/websites/:websiteId/notes', authenticate, notesController.listNotes);

/**
 * @swagger
 * /api/v1/websites/{websiteId}/notes:
 *   post:
 *     summary: Add note for website
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.post('/websites/:websiteId/notes', authenticate, notesController.addNote);

/**
 * @swagger
 * /api/v1/websites/{id}/report.pdf:
 *   get:
 *     summary: Generate and download website PDF report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
apiRouter.get('/websites/:id/report.pdf', authenticate, reportsController.generateWebsiteReport);

// Utility to list registered routes for diagnostics
function listRegisteredRoutes() {
  const out = [];
  const collect = (base, r) => {
    r.stack?.forEach((l) => {
      if (l.route && l.route.path) {
        const methods = Object.keys(l.route.methods || {}).map((m) => m.toUpperCase());
        out.push({ path: base + l.route.path, methods });
      }
    });
  };
  collect('/', rootRouter);
  collect('/api/v1', apiRouter);
  return out;
}

module.exports = { rootRouter, apiRouter, listRegisteredRoutes };
