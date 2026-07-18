import { Router } from 'express';

import { auditLogger } from '../../middleware/auditLogger';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { AccountType, PermissionKey } from '../../types/enums';
import * as controller from '../admin/admin.controller';
import {
  StateQuerySchema,
  UpdateCountryBodySchema,
  UpdateCountryParamsSchema,
  UpdateStateBodySchema,
  UpdateStateParamsSchema,
} from '../admin/admin.dto';

import { requirePermission } from '@/middleware/permissions';
import { requireRole } from '@/middleware/requireAccountType';

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
 *     description: Returns a paginated list of active states, optionally filtered by code, slug, type
 *     country, or partial text search.
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
router.get('/', validate(StateQuerySchema, 'query'), controller.listStates);

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
  validate(UpdateStateParamsSchema, 'params'),
  validate(UpdateStateBodySchema, 'body'),
  auditLogger('state.edit', 'state'),
  controller.updateState,
);

router.patch(
  '/countries/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(PermissionKey.MANAGE_STATES),
  validate(UpdateCountryParamsSchema, 'params'),
  validate(UpdateCountryBodySchema, 'body'),
  auditLogger('country.edit', 'country'),
  controller.updateCountry,
);

export { router as statesRouter };
