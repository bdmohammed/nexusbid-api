import { Router } from 'express';

import { contactLimiter } from '../../middleware/rateLimits';
import { validate } from '../../middleware/validate';

import { submitContactForm } from './support.controller';
import { ContactFormDto } from './support.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/support/contact:
 *   post:
 *     summary: Submit a public contact support form
 *     description: Accepts a support or inquiry message from guest users. Protected by strict rate limits.
 *     operationId: submitContactForm
 *     tags: [Support]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, message]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 120
 *                 example: "Jane Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: "I am having trouble downloading my purchased tender document."
 *     responses:
 *       200:
 *         description: Support form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Thank you for contacting us. We will get back to you shortly."
 *               data: null
 *               traceId: "uuid"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/contact', contactLimiter, validate(ContactFormDto), submitContactForm);

export { router as supportRouter };
