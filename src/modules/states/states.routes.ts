import express, { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission, requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { auditLogger } from '../../middleware/auditLogger';
import { AccountType, PermissionKey } from '../../types/enums';
import { StateQueryDto, CreateStateDto, UpdateStateDto } from '../admin/admin.dto';
import * as controller from '../admin/admin.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     GeographicalState:
 *       type: object
 *       required: [id, code, name, slug, type, country]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         code:
 *           type: string
 *           example: "CA"
 *           description: ISO state/region code
 *         name:
 *           type: string
 *           example: "California"
 *         slug:
 *           type: string
 *           example: "california"
 *         type:
 *           type: string
 *           enum: [state, territory, federal]
 *           example: "state"
 *         country:
 *           type: string
 *           example: "United States"
 */

/**
 * @swagger
 * /api/v1/states:
 *   get:
 *     summary: List and search geographical states / locations (Public)
 *     description: Returns a paginated list of active states, optionally filtered by code, slug, type, country, or partial text search.
 *     operationId: listStates
 *     tags: [States]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive search on name, code, or country
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *         description: Filter by exact ISO state code (e.g. CA, NY)
 *       - in: query
 *         name: slug
 *         schema: { type: string }
 *         description: Filter by exact slug
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [state, territory, federal] }
 *         description: Filter by location type
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *         description: Filter by country (e.g. United States)
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated list of active states/locations
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
 *                         $ref: '#/components/schemas/GeographicalState'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *             example:
 *               success: true
 *               message: "OK"
 *               data:
 *                 - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                   code: "CA"
 *                   name: "California"
 *                   slug: "california"
 *                   type: "state"
 *                   country: "United States"
 *               meta:
 *                 totalItems: 1
 *                 itemCount: 1
 *                 itemsPerPage: 20
 *                 totalPages: 1
 *                 currentPage: 1
 *               traceId: "uuid"
 */
router.get('/', validate(StateQueryDto, 'query'), controller.listStates);

/**
 * @swagger
 * /api/v1/states/countries:
 *   get:
 *     summary: List distinct countries (Public)
 *     description: Returns a flat array of all unique country names stored in the database.
 *     operationId: listCountries
 *     tags: [States]
 *     security: []
 *     responses:
 *       200:
 *         description: List of distinct countries
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
 *                         type: string
 *                         example: "United States"
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 - "United States"
 *                 - "Canada"
 *               traceId: "uuid"
 */
router.get('/countries', controller.listCountries);

/**
 * @swagger
 * /api/v1/states:
 *   post:
 *     summary: Create a new state (Admin)
 *     description: |
 *       Creates a new geographical state/location.
 *       **Required Permission:** `MANAGE_STATES` (Admin only)
 *     operationId: createState
 *     tags: [States]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, type]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "NY"
 *               name:
 *                 type: string
 *                 example: "New York"
 *               slug:
 *                 type: string
 *                 example: "new-york"
 *               type:
 *                 type: string
 *                 enum: [state, territory, federal]
 *                 example: "state"
 *               country:
 *                 type: string
 *                 example: "United States"
 *     responses:
 *       201:
 *         description: State created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/GeographicalState'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Code or Slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.MANAGE_STATES),
  validate(CreateStateDto),
  auditLogger('state.create', 'state'),
  controller.createState,
);

/**
 * @swagger
 * /api/v1/states/{id}:
 *   patch:
 *     summary: Update an existing state (Admin)
 *     description: |
 *       Updates an existing geographical state/location.
 *       **Required Permission:** `MANAGE_STATES` (Admin only)
 *     operationId: updateState
 *     tags: [States]
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
 *               code:
 *                 type: string
 *                 example: "NY"
 *               name:
 *                 type: string
 *                 example: "New York State"
 *               slug:
 *                 type: string
 *                 example: "new-york-state"
 *               type:
 *                 type: string
 *                 enum: [state, territory, federal]
 *                 example: "state"
 *               country:
 *                 type: string
 *                 example: "United States"
 *     responses:
 *       200:
 *         description: State updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/GeographicalState'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Code or Slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   delete:
 *     summary: Soft delete a state (Admin)
 *     description: |
 *       Soft deletes the specified state/location. Fails if associated with active tenders.
 *       **Required Permission:** `MANAGE_STATES` (Admin only)
 *     operationId: deleteState
 *     tags: [States]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: State deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "State deleted"
 *               data: null
 *               traceId: "uuid"
 *       400:
 *         description: State is associated with active tenders and cannot be deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.MANAGE_STATES),
  validate(UpdateStateDto),
  auditLogger('state.edit', 'state'),
  controller.updateState,
);
router.delete(
  '/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.MANAGE_STATES),
  auditLogger('state.delete', 'state'),
  controller.deleteState,
);

/**
 * @swagger
 * /api/v1/states/batch:
 *   post:
 *     summary: Batch import/upsert/delete states (Admin)
 *     description: |
 *       Processes batch actions (upsert, delete) for states in JSON or CSV format.
 *       **Required Permission:** `MANAGE_STATES` (Admin only)
 *     operationId: batchStates
 *     tags: [States]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [code]
 *               properties:
 *                 action: { type: string, enum: [upsert, delete], default: upsert }
 *                 code: { type: string, example: "TX" }
 *                 name: { type: string, example: "Texas" }
 *                 slug: { type: string, example: "texas" }
 *                 type: { type: string, enum: [state, territory, federal], example: "state" }
 *                 country: { type: string, example: "United States" }
 *         text/csv:
 *           schema:
 *             type: string
 *             example: |
 *               action,code,name,slug,type,country
 *               upsert,TX,Texas,texas,state,United States
 *               delete,FL,,,,,
 *     responses:
 *       200:
 *         description: Batch processed successfully
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
 *                         created: { type: integer, example: 1 }
 *                         updated: { type: integer, example: 0 }
 *                         deleted: { type: integer, example: 1 }
 *                         failed: { type: integer, example: 0 }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/batch',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.MANAGE_STATES),
  express.text({ type: ['text/csv', 'text/plain'], limit: '1mb' }),
  express.json({ limit: '1mb' }),
  controller.batchStates,
);

export { router as statesRouter };
