const express = require('express');
const healthController = require('../controllers/health');
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const websiteController = require('../controllers/websites');
const prefController = require('../controllers/preferences');
const agencyController = require('../controllers/agencies');
const notesController = require('../controllers/notes');
const reportsController = require('../controllers/reports');

const router = express.Router();

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
router.get('/', healthController.check.bind(healthController));

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register user with email/password
 *     tags: [Auth]
 */
router.post('/api/v1/auth/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user with email/password
 *     tags: [Auth]
 */
router.post('/api/v1/auth/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Google OAuth login via id_token
 *     tags: [Auth]
 */
router.post('/api/v1/auth/google', authController.googleAuth);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post('/api/v1/auth/refresh', authController.refresh);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/auth/me', authenticate, authController.me);

/**
 * @swagger
 * /api/v1/websites:
 *   get:
 *     summary: List user websites
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/websites', authenticate, websiteController.list);

/**
 * @swagger
 * /api/v1/websites:
 *   post:
 *     summary: Create website and schedule monitoring
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
router.post('/api/v1/websites', authenticate, websiteController.create);

/**
 * @swagger
 * /api/v1/websites/{id}:
 *   put:
 *     summary: Update website settings
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
router.put('/api/v1/websites/:id', authenticate, websiteController.update);

/**
 * @swagger
 * /api/v1/websites/{id}:
 *   delete:
 *     summary: Delete website
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/api/v1/websites/:id', authenticate, websiteController.remove);

/**
 * @swagger
 * /api/v1/websites/{id}/results:
 *   get:
 *     summary: Get website monitoring results
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/websites/:id/results', authenticate, websiteController.results);

/**
 * @swagger
 * /api/v1/preferences:
 *   get:
 *     summary: Get alert preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/preferences', authenticate, prefController.getPreferences);

/**
 * @swagger
 * /api/v1/preferences:
 *   put:
 *     summary: Update alert preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 */
router.put('/api/v1/preferences', authenticate, prefController.updatePreferences);

/**
 * @swagger
 * /api/v1/agencies:
 *   get:
 *     summary: List agencies
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/agencies', authenticate, agencyController.listAgencies);

/**
 * @swagger
 * /api/v1/agencies:
 *   post:
 *     summary: Create agency
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
router.post('/api/v1/agencies', authenticate, agencyController.createAgency);

/**
 * @swagger
 * /api/v1/agencies/{agencyId}/members:
 *   get:
 *     summary: List agency members
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/agencies/:agencyId/members', authenticate, agencyController.listMembers);

/**
 * @swagger
 * /api/v1/agencies/{agencyId}/members:
 *   post:
 *     summary: Add/Invite member to agency
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 */
router.post('/api/v1/agencies/:agencyId/members', authenticate, agencyController.addMember);

/**
 * @swagger
 * /api/v1/websites/{websiteId}/notes:
 *   get:
 *     summary: List notes for website
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/websites/:websiteId/notes', authenticate, notesController.listNotes);

/**
 * @swagger
 * /api/v1/websites/{websiteId}/notes:
 *   post:
 *     summary: Add note for website
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/api/v1/websites/:websiteId/notes', authenticate, notesController.addNote);

/**
 * @swagger
 * /api/v1/websites/{id}/report.pdf:
 *   get:
 *     summary: Generate and download website PDF report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/api/v1/websites/:id/report.pdf', authenticate, reportsController.generateWebsiteReport);

module.exports = router;
