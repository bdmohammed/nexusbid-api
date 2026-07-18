import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { AccountType, PermissionKey } from '../../types/enums';

import * as reportsController from './tenderReports.controller';
import * as controller from './tenders.controller';
import {
  AnswerQuestionSchema,
  AssignReviewerSchema,
  CreateAmendmentSchema,
  CreateClarificationSchema,
  CreateQuestionSchema,
  CreateTenderSchema,
  ParticipantIdParamSchema,
  QuestionIdParamSchema,
  RegisterDocumentSchema,
  ReviewIdParamSchema,
  SubmitEvaluationSchema,
  SubmitReviewCommentSchema,
  TenderCommitteeSchema,
  TenderIdParamSchema,
  TenderInvitationSchema,
  TenderSearchQuerySchema,
  TenderSlugParamSchema,
  TenderTemplateSchema,
  TenderWatcherSchema,
  UpdateTenderSchema,
  UpdateTenderStatusSchema,
  UploadUrlSchema,
} from './tenders.dto';

import { requirePermission } from '@/middleware/permissions';
import { requireRole } from '@/middleware/requireAccountType';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Tender:
 *       type: object
 *       required: [id, title, slug, status, publicationStatus, createdAt]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         title:
 *           type: string
 *           example: "Supply of Enterprise IT Hardware"
 *         slug:
 *           type: string
 *           example: "supply-of-enterprise-it-hardware"
 *         description:
 *           type: string
 *           example: "Procurement of laptops, monitors, and servers."
 *         estimatedBudget:
 *           type: number
 *           example: 250000
 *         status:
 *           type: string
 *           example: "Draft"
 *         publicationStatus:
 *           type: string
 *           example: "Unpublished"
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// ─── Public routes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/tenders:
 *   get:
 *     summary: List and search tenders (Public)
 *     description: Returns a paginated list of published/active tenders based on filters.
 *     operationId: searchTenders
 *     tags: [Tenders]
 *     security: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: false
 *         schema: { type: string }
 *         description: Search query on title/description
 *       - name: categoryId
 *         in: query
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - name: stateId
 *         in: query
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Tenders list resolved successfully
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
 *                         $ref: '#/components/schemas/Tender'
 */
router.get('/', validate(TenderSearchQuerySchema, 'query'), controller.list);

/**
 * @swagger
 * /api/v1/tenders/statistics:
 *   get:
 *     summary: Get tenders statistics (Public)
 *     description: Resolves key metrics such as active tenders, closing soon, and category distribution.
 *     operationId: getTendersStatistics
 *     tags: [Tenders]
 *     security: []
 *     responses:
 *       200:
 *         description: Statistics data resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 */
router.get('/statistics', controller.getStatistics);

/**
 * @swagger
 * /api/v1/tenders/{slug}:
 *   get:
 *     summary: Get tender by slug (Public)
 *     description: Retrieves complete details of a published tender by its URL-friendly slug.
 *     operationId: getTenderBySlug
 *     tags: [Tenders]
 *     security: []
 *     parameters:
 *       - name: slug
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: Tender slug identifier
 *     responses:
 *       200:
 *         description: Tender details resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Tender'
 */
router.get('/:slug', validate(TenderSlugParamSchema, 'params'), controller.getBySlug);

// ─── Authenticated routes ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/tenders/{id}/download-url:
 *   get:
 *     summary: Get document download URL
 *     description: Generates a temporary pre-signed S3 download URL for a tender document.
 *     operationId: getDocumentDownloadUrl
 *     tags: [Tenders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Download URL resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         url: { type: string, format: uri }
 */
router.get(
  '/:id/download-url',
  authenticate,
  validate(TenderIdParamSchema, 'params'),
  controller.getDownloadUrl,
);

/**
 * @swagger
 * /api/v1/tenders/{id}/questions:
 *   post:
 *     summary: Ask a question about a tender
 *     description: Submits a public/private question regarding a tender's details or conditions.
 *     operationId: askTenderQuestion
 *     tags: [Tenders]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionText]
 *             properties:
 *               questionText:
 *                 type: string
 *                 minLength: 10
 *                 example: "Is there a requirement for local vendor presence in California?"
 *     responses:
 *       201:
 *         description: Question posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/:id/questions',
  authenticate,
  validate(TenderIdParamSchema, 'params'),
  validate(CreateQuestionSchema),
  controller.postQuestion,
);

/**
 * @swagger
 * /api/v1/tenders/{id}/watch:
 *   post:
 *     summary: Toggle watch subscription
 *     description: Watch/unwatch a tender to receive alerts about amendments, clarifications, and deadlines.
 *     operationId: toggleWatchTender
 *     tags: [Tenders]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifyEmail: { type: boolean, default: true }
 *               notifyInApp: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Watch status toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/:id/watch',
  authenticate,
  validate(TenderIdParamSchema, 'params'),
  validate(TenderWatcherSchema),
  controller.toggleWatcher,
);

// ─── Admin routes ─────────────────────────────────────────────────────────────

const adminRouter = Router();

/**
 * @swagger
 * /api/v1/tenders/admin/upload-url:
 *   post:
 *     summary: Get document upload URL (Admin)
 *     description: Generates a pre-signed S3 upload URL for hosting tender attachments.
 *     operationId: getUploadUrl
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName]
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "specifications.pdf"
 *               documentType:
 *                 type: string
 *                 default: "Notice"
 *     responses:
 *       200:
 *         description: Upload credentials generated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         uploadUrl: { type: string, format: uri }
 *                         key: { type: string }
 */
adminRouter.post(
  '/upload-url',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(UploadUrlSchema),
  controller.adminGetUploadUrl,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/documents:
 *   post:
 *     summary: Register an uploaded document (Admin)
 *     description: Links a uploaded S3 file to the specific tender record.
 *     operationId: registerDocument
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentType, s3Key, bucket, originalName]
 *             properties:
 *               documentType: { type: string, example: "Specifications" }
 *               s3Key: { type: string, example: "tenders/123/specs.pdf" }
 *               bucket: { type: string, example: "nexusbid-tenders" }
 *               originalName: { type: string, example: "specs.pdf" }
 *     responses:
 *       201:
 *         description: Document registered
 */
adminRouter.post(
  '/:id/documents',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(TenderIdParamSchema, 'params'),
  validate(RegisterDocumentSchema),
  controller.adminRegisterDocument,
);

/**
 * @swagger
 * /api/v1/tenders/admin:
 *   get:
 *     summary: List all tenders (Admin)
 *     description: |
 *       Lists all tenders including unpublished drafts.
 *       **Required Permission:** `CREATE_TENDER`
 *     operationId: adminListTenders
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tenders list resolved
 *
 *   post:
 *     summary: Create a new tender draft (Admin)
 *     description: |
 *       Initializes a new tender in draft state.
 *       **Required Permission:** `CREATE_TENDER`
 *     operationId: createTender
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tender'
 *     responses:
 *       201:
 *         description: Tender created
 */
adminRouter.get(
  '/',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.CREATE_TENDER),
  controller.adminList,
);

adminRouter.post(
  '/',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.CREATE_TENDER),
  validate(CreateTenderSchema),
  controller.adminCreate,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}:
 *   get:
 *     summary: Get tender details (Admin)
 *     description: |
 *       Retrieves full admin details of a tender.
 *       **Required Permission:** `CREATE_TENDER`
 *     operationId: adminGetTenderById
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Tender details resolved
 *
 *   patch:
 *     summary: Update a tender (Admin)
 *     description: |
 *       Updates properties of a draft or active tender version.
 *       **Required Permission:** `EDIT_TENDER`
 *     operationId: updateTender
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Tender updated
 *
 *   delete:
 *     summary: Delete/Archive a tender (Admin)
 *     description: |
 *       Removes or archives a tender record.
 *       **Required Permission:** `DELETE_TENDER`
 *     operationId: deleteTender
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Tender archived successfully
 */
adminRouter.get(
  '/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.CREATE_TENDER),
  validate(TenderIdParamSchema, 'params'),
  controller.adminGetById,
);

adminRouter.patch(
  '/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.EDIT_TENDER),
  validate(TenderIdParamSchema, 'params'),
  validate(UpdateTenderSchema),
  controller.adminUpdate,
);

adminRouter.delete(
  '/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.DELETE_TENDER),
  validate(TenderIdParamSchema, 'params'),
  controller.adminDelete,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/status:
 *   patch:
 *     summary: Perform status state transition (Admin)
 *     description: |
 *       Publishes, approves, rejects, or closes a tender.
 *       **Required Permission:** `APPROVE_TENDER`
 *     operationId: transitionTenderStatus
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Status updated
 */
adminRouter.patch(
  '/:id/status',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.APPROVE_TENDER),
  validate(TenderIdParamSchema, 'params'),
  validate(UpdateTenderStatusSchema),
  controller.adminUpdateStatus,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/cancel:
 *   post:
 *     summary: Cancel active tender (Admin)
 *     description: |
 *       Cancels an active public tender, logging audit records.
 *       **Required Permission:** `DELETE_TENDER`
 *     operationId: cancelTender
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Tender canceled
 */
adminRouter.post(
  '/:id/cancel',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.DELETE_TENDER),
  validate(TenderIdParamSchema, 'params'),
  controller.cancelTender,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/duplicate:
 *   post:
 *     summary: Duplicate tender (Admin)
 *     description: |
 *       Clones a tender into a new draft configuration.
 *       **Required Permission:** `CREATE_TENDER`
 *     operationId: duplicateTender
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       201:
 *         description: Cloned draft created
 */
adminRouter.post(
  '/:id/duplicate',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.CREATE_TENDER),
  validate(TenderIdParamSchema, 'params'),
  controller.duplicateTender,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/diff:
 *   get:
 *     summary: Get changes diff between versions (Admin)
 *     description: Compares current draft modifications with the active published version.
 *     operationId: getTenderDiff
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Comparison resolved
 */
adminRouter.get(
  '/:id/diff',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(TenderIdParamSchema, 'params'),
  controller.getDiff,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/history:
 *   get:
 *     summary: Get modification history logs (Admin)
 *     description: Returns audit history logs for edits and workflow actions on a tender.
 *     operationId: getTenderHistory
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Audit log history
 */
adminRouter.get(
  '/:id/history',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(TenderIdParamSchema, 'params'),
  controller.getHistory,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/schedule:
 *   post:
 *     summary: Schedule auto-publication (Admin)
 *     description: |
 *       Saves settings to automatically publish draft at a future date.
 *       **Required Permission:** `APPROVE_TENDER`
 *     operationId: scheduleTender
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Scheduled successfully
 */
adminRouter.post(
  '/:id/schedule',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.APPROVE_TENDER),
  validate(TenderIdParamSchema, 'params'),
  controller.scheduleTender,
);

/**
 * @swagger
 * /api/v1/tenders/admin/questions/{qId}/answer:
 *   post:
 *     summary: Answer vendor question (Admin)
 *     description: |
 *       Submits an official answer to a query.
 *       **Required Permission:** `EDIT_TENDER`
 *     operationId: answerQuestion
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: qId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answerText]
 *             properties:
 *               answerText: { type: string }
 *               isPublic: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Answer posted
 */
adminRouter.post(
  '/questions/:qId/answer',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.EDIT_TENDER),
  validate(QuestionIdParamSchema, 'params'),
  validate(AnswerQuestionSchema),
  controller.postAnswer,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/clarifications:
 *   post:
 *     summary: Post pre-bid clarification (Admin)
 *     description: |
 *       Publishes an official clarification bulletin for a tender.
 *       **Required Permission:** `EDIT_TENDER`
 *     operationId: addClarification
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *     responses:
 *       201:
 *         description: Clarification added
 */
adminRouter.post(
  '/:id/clarifications',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.EDIT_TENDER),
  validate(TenderIdParamSchema, 'params'),
  validate(CreateClarificationSchema),
  controller.postClarification,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/amendments:
 *   post:
 *     summary: Add official amendment (Admin)
 *     description: |
 *       Records a formal change/revision version of the tender requirements.
 *       **Required Permission:** `EDIT_TENDER`
 *     operationId: addAmendment
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Amendment created
 */
adminRouter.post(
  '/:id/amendments',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.EDIT_TENDER),
  validate(TenderIdParamSchema, 'params'),
  validate(CreateAmendmentSchema),
  controller.postAmendment,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/assign:
 *   post:
 *     summary: Assign version reviewers (Admin)
 *     description: |
 *       Delegates specific admins/evaluators to review a draft version.
 *       **Required Permission:** `APPROVE_TENDER`
 *     operationId: assignTenderReviewers
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reviewerIds]
 *     responses:
 *       200:
 *         description: Reviewers assigned
 */
adminRouter.post(
  '/:id/assign',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.APPROVE_TENDER),
  validate(TenderIdParamSchema, 'params'),
  validate(AssignReviewerSchema),
  controller.assignReviewers,
);

/**
 * @swagger
 * /api/v1/tenders/admin/reviews/{reviewId}/comments:
 *   post:
 *     summary: Submit a review comment (Admin)
 *     description: Records an evaluator's feedback/comments on a tender version draft.
 *     operationId: addReviewComment
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commentText]
 *     responses:
 *       201:
 *         description: Comment submitted
 */
adminRouter.post(
  '/reviews/:reviewId/comments',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(ReviewIdParamSchema, 'params'),
  validate(SubmitReviewCommentSchema),
  controller.submitReviewComment,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/committee:
 *   post:
 *     summary: Assign evaluation committee members (Admin)
 *     description: Appoints committee members (evaluators, chairs) to review bids.
 *     operationId: assignCommittee
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, role]
 *     responses:
 *       200:
 *         description: Committee registered
 */
adminRouter.post(
  '/:id/committee',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(TenderIdParamSchema, 'params'),
  validate(TenderCommitteeSchema),
  controller.assignCommittee,
);

/**
 * @swagger
 * /api/v1/tenders/admin/participants/{participantId}/evaluate:
 *   post:
 *     summary: Submit participant evaluation score (Admin)
 *     description: Records technical, financial, or overall scores for a bidder participant.
 *     operationId: evaluateParticipant
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: participantId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [evaluationType, criteriaName, weight, score, maxScore]
 *     responses:
 *       200:
 *         description: Evaluation recorded
 */
adminRouter.post(
  '/participants/:participantId/evaluate',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(ParticipantIdParamSchema, 'params'),
  validate(SubmitEvaluationSchema),
  controller.submitEvaluation,
);

/**
 * @swagger
 * /api/v1/tenders/admin/{id}/invitations:
 *   post:
 *     summary: Invite vendor to private tender (Admin)
 *     description: Sends an email invitation code to a vendor for a private/restricted bidding process.
 *     operationId: inviteVendor
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *     responses:
 *       200:
 *         description: Invitation dispatched successfully
 */
adminRouter.post(
  '/:id/invitations',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(TenderIdParamSchema, 'params'),
  validate(TenderInvitationSchema),
  controller.inviteVendor,
);

/**
 * @swagger
 * /api/v1/tenders/admin/templates:
 *   post:
 *     summary: Save tender as template (Admin)
 *     description: Stores structural metadata of a tender to be reused as a template.
 *     operationId: saveTenderTemplate
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateScope, title]
 *     responses:
 *       201:
 *         description: Template saved successfully
 */
adminRouter.post(
  '/templates',
  authenticate,
  requireRole(AccountType.ADMIN),
  validate(TenderTemplateSchema),
  controller.saveTemplate,
);

/**
 * @swagger
 * /api/v1/tenders/admin/reports/budget:
 *   get:
 *     summary: Get tender budget reports (Admin)
 *     description: Resolves procurement budget analytics and expenditure metrics.
 *     operationId: getBudgetReport
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Budget report data resolved
 */
adminRouter.get(
  '/reports/budget',
  authenticate,
  requireRole(AccountType.ADMIN),
  reportsController.getBudgetReport,
);

/**
 * @swagger
 * /api/v1/tenders/admin/reports/status:
 *   get:
 *     summary: Get tender status distribution reports (Admin)
 *     description: Returns breakdowns of tenders by state, lifecycle status, and organizational departments.
 *     operationId: getStatusReport
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Status report metrics
 */
adminRouter.get(
  '/reports/status',
  authenticate,
  requireRole(AccountType.ADMIN),
  reportsController.getStatusReport,
);

/**
 * @swagger
 * /api/v1/tenders/admin/reports/vendors:
 *   get:
 *     summary: Get vendor engagement reports (Admin)
 *     description: Resolves reports on vendor activity, invitation click rates, and bid submissions.
 *     operationId: getVendorsReport
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Vendor engagement report
 */
adminRouter.get(
  '/reports/vendors',
  authenticate,
  requireRole(AccountType.ADMIN),
  reportsController.getVendorsReport,
);

/**
 * @swagger
 * /api/v1/tenders/admin/reports/performance:
 *   get:
 *     summary: Get committee performance reports (Admin)
 *     description: Analyzes evaluation timelines, review delays, and committee action speeds.
 *     operationId: getPerformanceReport
 *     tags: [Tenders Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Performance analysis reports
 */
adminRouter.get(
  '/reports/performance',
  authenticate,
  requireRole(AccountType.ADMIN),
  reportsController.getPerformanceReport,
);

router.use('/admin', adminRouter);

export { router as tendersRouter };
