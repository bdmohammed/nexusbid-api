import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { requirePermission } from '../../../middleware/permissions';
import * as controller from './audit.controller';

const router = Router();

// Guard all audit pathways
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       required: [id, action, userId, ipAddress, userAgent, createdAt]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "c3d4e5f6-a7b8-9012-cdef-345678901234"
 *         action:
 *           type: string
 *           example: "user.login"
 *         userId:
 *           type: string
 *           format: uuid
 *         ipAddress:
 *           type: string
 *           example: "192.168.1.1"
 *         userAgent:
 *           type: string
 *           example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 *         resourceType:
 *           type: string
 *           nullable: true
 *           example: "user"
 *         resourceId:
 *           type: string
 *           nullable: true
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         changes:
 *           type: object
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     RetentionPolicy:
 *       type: object
 *       required: [id, module, retentionDays]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         module:
 *           type: string
 *           example: "audit"
 *         retentionDays:
 *           type: integer
 *           example: 90
 */

/**
 * @swagger
 * /api/v1/audit:
 *   get:
 *     summary: Search system audit logs
 *     description: |
 *       Queries the full audit log repository with search filters.
 *       **Required Permission:** `audit.view`
 *     operationId: searchLogs
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         required: false
 *         schema: { type: string }
 *       - name: action
 *         in: query
 *         required: false
 *         schema: { type: string }
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Search results resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 */
router.get('/', requirePermission('audit.view'), controller.searchLogs);

/**
 * @swagger
 * /api/v1/audit/statistics:
 *   get:
 *     summary: Get audit statistics metrics
 *     description: |
 *       Resolves audit event counts, categories breakdown, and system event graphs.
 *       **Required Permission:** `audit.view`
 *     operationId: getAuditStatistics
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Audit statistics metrics resolved
 */
router.get('/statistics', requirePermission('audit.view'), controller.getStatistics);

/**
 * @swagger
 * /api/v1/audit/security:
 *   get:
 *     summary: Get security-critical audit events
 *     description: |
 *       Retrieves audit records flagged as high-risk security threats or permission violations.
 *       **Required Permission:** `audit.security`
 *     operationId: getSecurityEvents
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Security events resolved
 */
router.get('/security', requirePermission('audit.security'), controller.getSecurityEvents);

/**
 * @swagger
 * /api/v1/audit/retention:
 *   get:
 *     summary: Get log retention policy configurations
 *     description: |
 *       Retrieves the retention days limits for all database modules.
 *       **Required Permission:** `audit.retention.manage`
 *     operationId: getRetentionPolicies
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Retention policy rules list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RetentionPolicy'
 *
 *   patch:
 *     summary: Update log retention policies config
 *     description: |
 *       Updates retention period for audit logs.
 *       **Required Permission:** `audit.retention.manage`
 *     operationId: updateRetentionPolicy
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [module, retentionDays]
 *             properties:
 *               module: { type: string, example: "audit" }
 *               retentionDays: { type: integer, example: 180 }
 *     responses:
 *       200:
 *         description: Policy updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/retention', requirePermission('audit.retention.manage'), controller.getRetentionPolicies);
router.patch('/retention', requirePermission('audit.retention.manage'), controller.updateRetentionPolicy);

/**
 * @swagger
 * /api/v1/audit/export:
 *   post:
 *     summary: Request system audit report export
 *     description: |
 *       Triggers background job to package filtered audit records into a downloadable zip/csv.
 *       **Required Permission:** `audit.export`
 *     operationId: requestAuditExport
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *     responses:
 *       202:
 *         description: Export job accepted
 */
router.post('/export', requirePermission('audit.export'), controller.requestAuditExport);

/**
 * @swagger
 * /api/v1/audit/correlation/{correlationId}:
 *   get:
 *     summary: Resolve forensic correlation request timeline
 *     description: |
 *       Gathers all logs triggered under the same HTTP request/session correlation chain.
 *       **Required Permission:** `audit.search`
 *     operationId: getCorrelationTimeline
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: correlationId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Timeline logs resolved
 */
router.get('/correlation/:correlationId', requirePermission('audit.search'), controller.getCorrelationTimeline);

/**
 * @swagger
 * /api/v1/audit/request/{requestId}:
 *   get:
 *     summary: Resolve specific request lifecycle audit trace
 *     description: |
 *       Lists all sub-task logs registered under a single request ID.
 *       **Required Permission:** `audit.search`
 *     operationId: getRequestTimeline
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: requestId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Audit records trace
 */
router.get('/request/:requestId', requirePermission('audit.search'), controller.getRequestTimeline);

/**
 * @swagger
 * /api/v1/audit/{id}:
 *   get:
 *     summary: Get log details by ID
 *     description: |
 *       Resolves complete metadata, payload body, and context parameters of a single audit log.
 *       **Required Permission:** `audit.view`
 *     operationId: getLogDetails
 *     tags: [Audit Logs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Audit log resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuditLog'
 */
router.get('/:id', requirePermission('audit.view'), controller.getLogDetails);

export { router as auditRouter };
