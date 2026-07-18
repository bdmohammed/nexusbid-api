import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { requireAnyPermission, requirePermission } from '../../middleware/permissions';
import { requireAccountType } from '../../middleware/requireAccountType';
import { validate } from '../../middleware/validate';
import { AccountType } from '../../types/enums';

// Let's import Export Controller correctly
import { RbacExportController as ExportController } from './controllers/RbacExportController';
import { RbacReviewController } from './controllers/RbacReviewController';
import { RbacRoleController } from './controllers/RbacRoleController';
import { RbacStatsController } from './controllers/RbacStatsController';
import { RbacVersionController } from './controllers/RbacVersionController';
import {
  AssignRoleSchema,
  CompareVersionsParamsSchema,
  CreateRoleSchema,
  DuplicateRoleBodySchema,
  IdParamSchema,
  ListRolesQuerySchema,
  ReviewActionSchema,
  ReviewIdParamSchema,
  RoleIdParamSchema,
  SubmitReviewSchema,
  UpdateRoleSchema,
  VersionIdParamSchema,
} from './rbac.dto';

const router = Router();

// Secure all RBAC routes - must be authenticated admin
router.use(authenticate);
router.use(requireAccountType(AccountType.ADMIN));

/**
 * @swagger
 * components:
 *   schemas:
 *     RbacRole:
 *       type: object
 *       required: [id, slug, isSystemRole, status]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         slug:
 *           type: string
 *           example: "tender-reviewer"
 *         isSystemRole:
 *           type: boolean
 *           example: false
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, ARCHIVED]
 *           example: "ACTIVE"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     RbacRoleVersion:
 *       type: object
 *       required: [id, roleId, version, name, status, lockStatus]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         roleId:
 *           type: string
 *           format: uuid
 *         version:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Tender Reviewer"
 *         description:
 *           type: string
 *           example: "Can view and review tenders"
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, APPROVED, REJECTED]
 *           example: "APPROVED"
 *         lockStatus:
 *           type: string
 *           enum: [LOCKED, UNLOCKED]
 *           example: "LOCKED"
 *         lockedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     RbacAssignment:
 *       type: object
 *       required: [id, userId, roleId]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         roleId:
 *           type: string
 *           format: uuid
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         assignedAt:
 *           type: string
 *           format: date-time
 *
 *     RbacPermission:
 *       type: object
 *       required: [key, name]
 *       properties:
 *         key:
 *           type: string
 *           example: "tender.create"
 *         name:
 *           type: string
 *           example: "Create Tender"
 *
 *     RbacModule:
 *       type: object
 *       required: [slug, name]
 *       properties:
 *         slug:
 *           type: string
 *           example: "tenders"
 *         name:
 *           type: string
 *           example: "Tenders Management"
 */

// ─── Roles CRUD ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/rbac/roles:
 *   get:
 *     summary: List all RBAC roles
 *     description: |
 *       Lists all RBAC roles in the system.
 *       **Required Permission:** `ROLE_VIEW` (Admin only)
 *     operationId: listRoles
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: deleted
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include archived/deleted roles
 *     responses:
 *       200:
 *         description: List of roles
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
 *                         $ref: '#/components/schemas/RbacRole'
 *             example:
 *               success: true
 *               message: "Operation completed successfully"
 *               data:
 *                 - id: "role-uuid-1"
 *                   slug: "tender-reviewer"
 *                   isSystemRole: false
 *                   status: "ACTIVE"
 *                   createdAt: "2026-07-01T12:00:00.000Z"
 *                   updatedAt: "2026-07-01T12:00:00.000Z"
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/roles',
  requirePermission('ROLE_VIEW'),
  validate(ListRolesQuerySchema, 'query'),
  RbacRoleController.getRoles,
);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}:
 *   get:
 *     summary: Get RBAC role details
 *     description: |
 *       Retrieves the details, configuration, and resolved versions of a specific role.
 *       **Required Permission:** `ROLE_VIEW` (Admin only)
 *     operationId: getRoleById
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Role details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RbacRole'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/roles/:id',
  requirePermission('ROLE_VIEW'),
  validate(IdParamSchema, 'params'),
  RbacRoleController.getRoleById,
);

/**
 * @swagger
 * /api/v1/rbac/roles:
 *   post:
 *     summary: Create a new role draft
 *     description: |
 *       Initializes a new RBAC role with a draft version and assigns chosen permissions.
 *       **Required Permission:** `ROLE_CREATE` (Admin only)
 *     operationId: createRole
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, permissionKeys]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tender Evaluator"
 *               description:
 *                 type: string
 *                 example: "Can review bidder responses and submit evaluations."
 *               permissionKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["tender.view", "tender.evaluate"]
 *     responses:
 *       201:
 *         description: Role draft created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RbacRoleVersion'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/roles',
  requirePermission('ROLE_CREATE'),
  validate(CreateRoleSchema, 'body'),
  RbacRoleController.createRole,
);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}:
 *   put:
 *     summary: Update a role draft version
 *     description: |
 *       Updates the configuration of the current unlocked role version or starts a new version draft.
 *       **Required Permission:** `ROLE_UPDATE` (Admin only)
 *     operationId: updateRole
 *     tags: [RBAC]
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
 *             required: [name, permissionKeys]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tender Senior Evaluator"
 *               description:
 *                 type: string
 *                 example: "Can review, grade, and approve tender evaluations."
 *               permissionKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["tender.view", "tender.evaluate", "tender.evaluate.approve"]
 *     responses:
 *       200:
 *         description: Role version updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RbacRoleVersion'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put(
  '/roles/:id',
  requirePermission('ROLE_UPDATE'),
  validate(IdParamSchema, 'params'),
  validate(UpdateRoleSchema, 'body'),
  RbacRoleController.updateRole,
);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}:
 *   delete:
 *     summary: Archive a role
 *     description: |
 *       Sets status of role to ARCHIVED. System roles cannot be archived.
 *       **Required Permission:** `ROLE_ARCHIVE` (Admin only)
 *     operationId: archiveRole
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Role archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Role archived successfully"
 *               data: null
 *               traceId: "uuid"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/roles/:id',
  requirePermission('ROLE_ARCHIVE'),
  validate(IdParamSchema, 'params'),
  RbacRoleController.deleteRole,
);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}/duplicate:
 *   post:
 *     summary: Duplicate a role
 *     description: |
 *       Clones the active permissions configuration of an existing role into a new role draft.
 *       **Required Permission:** `ROLE_CREATE` (Admin only)
 *     operationId: duplicateRole
 *     tags: [RBAC]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cloned Role Name"
 *     responses:
 *       201:
 *         description: Cloned role draft created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RbacRoleVersion'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/roles/:id/duplicate',
  requirePermission('ROLE_CREATE'),
  validate(IdParamSchema, 'params'),
  validate(DuplicateRoleBodySchema, 'body'),
  RbacRoleController.duplicateRole,
);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}/restore:
 *   post:
 *     summary: Restore an archived role
 *     description: |
 *       Restores an archived role back to ACTIVE status.
 *       **Required Permission:** `ROLE_RESTORE` (Admin only)
 *     operationId: restoreRole
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Role restored
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RbacRole'
 */
router.post(
  '/roles/:id/restore',
  requirePermission('ROLE_RESTORE'),
  validate(IdParamSchema, 'params'),
  RbacRoleController.restoreRole,
);

// ─── Role Assignments ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/rbac/assignments:
 *   get:
 *     summary: Get all active assignments
 *     description: |
 *       Lists all assignments of roles to admin users.
 *       **Required Permission:** `ROLE_ASSIGN` (Admin only)
 *     operationId: listRoleAssignments
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Role assignments list
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
 *                         $ref: '#/components/schemas/RbacAssignment'
 */
router.get('/assignments', requirePermission('ROLE_ASSIGN'), RbacRoleController.getAssignments);

/**
 * @swagger
 * /api/v1/rbac/assignments:
 *   post:
 *     summary: Assign role to user
 *     description: |
 *       Grants a specific role to a user. Optionally supports an expiry timestamp.
 *       **Required Permission:** `ROLE_ASSIGN` (Admin only)
 *     operationId: assignRoleToUser
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, roleId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               roleId:
 *                 type: string
 *                 format: uuid
 *                 example: "00000000-0000-0000-0000-000000000000"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-12-31T23:59:59.000Z"
 *     responses:
 *       201:
 *         description: Role assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/assignments',
  requirePermission('ROLE_ASSIGN'),
  validate(AssignRoleSchema, 'body'),
  RbacRoleController.assignRole,
);

/**
 * @swagger
 * /api/v1/rbac/assignments/{id}:
 *   delete:
 *     summary: Revoke role assignment
 *     description: |
 *       Removes a role assignment from a user.
 *       **Required Permission:** `ROLE_ASSIGN` (Admin only)
 *     operationId: revokeRoleAssignment
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Assignment revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete(
  '/assignments/:id',
  requirePermission('ROLE_ASSIGN'),
  validate(IdParamSchema, 'params'),
  RbacRoleController.revokeAssignment,
);

// ─── Metadata ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/rbac/permissions:
 *   get:
 *     summary: Get system permissions
 *     description: |
 *       Lists all registered permissions grouped by module.
 *       **Required Permission:** `ROLE_VIEW` (Admin only)
 *     operationId: listPermissionsGrouped
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Permissions grouped by module
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/RbacPermission'
 */
router.get('/permissions', requirePermission('ROLE_VIEW'), RbacRoleController.getPermissions);

/**
 * @swagger
 * /api/v1/rbac/modules:
 *   get:
 *     summary: List system modules
 *     description: |
 *       Lists all registered system modules.
 *       **Required Permission:** `ROLE_VIEW` (Admin only)
 *     operationId: listModules
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of modules
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
 *                         $ref: '#/components/schemas/RbacModule'
 */
router.get('/modules', requirePermission('ROLE_VIEW'), RbacRoleController.getModules);

// ─── Versions & Compare ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/rbac/roles/{roleId}/versions:
 *   get:
 *     summary: List role versions
 *     description: |
 *       Lists all audit history versions of a specific role.
 *       **Required Permission:** `ROLE_VIEW` (Admin only)
 *     operationId: listRoleVersions
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: roleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the role to list versions for
 *     responses:
 *       200:
 *         description: Role versions history list
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
 *                         $ref: '#/components/schemas/RbacRoleVersion'
 */
router.get(
  '/roles/:roleId/versions',
  requirePermission('ROLE_VIEW'),
  validate(RoleIdParamSchema, 'params'),
  RbacVersionController.getRoleVersions,
);

/**
 * @swagger
 * /api/v1/rbac/versions/{id}/lock:
 *   post:
 *     summary: Lock role version draft
 *     description: |
 *       Locks a draft version to prevent edits while pending review.
 *       **Required Permission:** `ROLE_UPDATE` (Admin only)
 *     operationId: lockVersion
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Role version locked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/versions/:id/lock',
  requirePermission('ROLE_UPDATE'),
  validate(IdParamSchema, 'params'),
  RbacVersionController.lockVersion,
);

/**
 * @swagger
 * /api/v1/rbac/versions/{id}/unlock:
 *   post:
 *     summary: Unlock role version draft
 *     description: |
 *       Unlocks a locked draft version.
 *       **Required Permission:** `ROLE_UPDATE` (Admin only)
 *     operationId: unlockVersion
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Role version unlocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/versions/:id/unlock',
  requirePermission('ROLE_UPDATE'),
  validate(IdParamSchema, 'params'),
  RbacVersionController.unlockVersion,
);

/**
 * @swagger
 * /api/v1/rbac/roles/{id}/versions/{v1}/compare/{v2}:
 *   get:
 *     summary: Compare role versions
 *     description: |
 *       Compares permissions config between two audit versions of a role.
 *       **Required Permission:** `ROLE_COMPARE` (Admin only)
 *     operationId: compareRoleVersions
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *       - name: v1
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: First version number to compare
 *       - name: v2
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Second version number to compare
 *     responses:
 *       200:
 *         description: Comparison diff report
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
 *                         added:
 *                           type: array
 *                           items: { type: string }
 *                         removed:
 *                           type: array
 *                           items: { type: string }
 *                         unchanged:
 *                           type: array
 *                           items: { type: string }
 */
router.get(
  '/roles/:id/versions/:v1/compare/:v2',
  requirePermission('ROLE_COMPARE'),
  validate(CompareVersionsParamsSchema, 'params'),
  RbacVersionController.compareVersions,
);

// ─── Approval Workflows ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/rbac/versions/{versionId}/submit:
 *   post:
 *     summary: Submit role version for review
 *     description: |
 *       Locks the version and creates an approval workflow assigning designated reviewers.
 *       **Required Permission:** `ROLE_UPDATE` (Admin only)
 *     operationId: submitVersionForReview
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: versionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the role version to submit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reviewerIds]
 *             properties:
 *               reviewerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       201:
 *         description: Review workflow initialized successfully
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
 *                         reviewId: { type: string, format: uuid }
 */
router.post(
  '/versions/:versionId/submit',
  requirePermission('ROLE_UPDATE'),
  validate(VersionIdParamSchema, 'params'),
  validate(SubmitReviewSchema, 'body'),
  RbacReviewController.submitVersion,
);

/**
 * @swagger
 * /api/v1/rbac/reviews/{reviewId}/action:
 *   post:
 *     summary: Submit review decision
 *     description: |
 *       Submits approval, rejection, or changes request decision on a role version.
 *       **Required Permission:** `ROLE_REVIEW`, `ROLE_APPROVE`, or `ROLE_REJECT` (Admin only)
 *     operationId: submitReviewAction
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the review assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, CHANGES_REQUESTED]
 *                 example: "APPROVED"
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Permissions configuration is approved for deployment."
 *     responses:
 *       200:
 *         description: Review submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/reviews/:reviewId/action',
  requireAnyPermission(['ROLE_REVIEW', 'ROLE_APPROVE', 'ROLE_REJECT']),
  validate(ReviewIdParamSchema, 'params'),
  validate(ReviewActionSchema, 'body'),
  RbacReviewController.submitReview,
);

/**
 * @swagger
 * /api/v1/rbac/reviews/{id}:
 *   get:
 *     summary: Get review workflow details
 *     description: |
 *       Retrieves the review assignments, status, comments, and role versions details of a review workflow.
 *       **Required Permission:** `ROLE_REVIEW` (Admin only)
 *     operationId: getReviewDetails
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Review workflow details
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
router.get(
  '/reviews/:id',
  requirePermission('ROLE_REVIEW'),
  validate(IdParamSchema, 'params'),
  RbacReviewController.getReviewDetails,
);

// ─── Stats & Export ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/rbac/statistics:
 *   get:
 *     summary: Get RBAC statistics
 *     description: |
 *       Retrieves overall RBAC counts, role distributions, and workflow metrics.
 *       **Required Permission:** `ROLE_VIEW` (Admin only)
 *     operationId: getRbacStats
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: RBAC stats
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
router.get('/statistics', requirePermission('ROLE_VIEW'), RbacStatsController.getStats);

/**
 * @swagger
 * /api/v1/rbac/exports:
 *   get:
 *     summary: Export RBAC configuration
 *     description: |
 *       Generates a JSON configuration export of all roles, versions, and permissions.
 *       **Required Permission:** `ROLE_EXPORT` (Admin only)
 *     operationId: exportRbacData
 *     tags: [RBAC]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Full RBAC export data payload
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
router.get('/exports', requirePermission('ROLE_EXPORT'), ExportController.exportData);

export default router;
