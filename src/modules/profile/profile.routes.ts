import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';

import * as controller from './profile.controller';
import {
  ChangePasswordDto,
  RequestChangeDto,
  UpdateAvatarDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './profile.dto';

const router = Router();

// Apply authenticate to all profile routes
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       required: [id, name, email]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Jane Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "jane@example.com"
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://example.com/avatar.jpg"
 *         country:
 *           type: string
 *           nullable: true
 *           example: "United States"
 *
 *     UserPreferences:
 *       type: object
 *       properties:
 *         email: { type: boolean, default: true }
 *         push: { type: boolean, default: false }
 *         sms: { type: boolean, default: false }
 *         marketing: { type: boolean, default: false }
 *         security: { type: boolean, default: true }
 *         tender: { type: boolean, default: true }
 *         newsletter: { type: boolean, default: false }
 *
 *     ProfileActivity:
 *       type: object
 *       required: [id, action, createdAt]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         action:
 *           type: string
 *           example: "profile.update"
 *         userAgent:
 *           type: string
 *           nullable: true
 *           example: "Mozilla/5.0 ..."
 *         ipAddress:
 *           type: string
 *           nullable: true
 *           example: "192.168.1.1"
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     summary: Get user profile details
 *     description: Retrieves profile details of the current logged in customer or admin.
 *     operationId: getUserProfile
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profile details resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 name: "Jane Doe"
 *                 email: "jane@example.com"
 *                 avatarUrl: "https://example.com/avatar.jpg"
 *                 country: "United States"
 *               traceId: "uuid"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', controller.getProfile);

/**
 * @swagger
 * /api/v1/profile:
 *   patch:
 *     summary: Update profile details
 *     description: Updates non-critical user profile fields (name, country).
 *     operationId: updateUserProfile
 *     tags: [Profile]
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
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Jane Doe Updated"
 *               country:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *                 example: "Canada"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/', validate(UpdateProfileDto), controller.updateProfile);

/**
 * @swagger
 * /api/v1/profile/avatar:
 *   post:
 *     summary: Update profile avatar URL
 *     description: Saves a pre-signed or public avatar picture URL to the profile.
 *     operationId: updateAvatar
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [avatarUrl]
 *             properties:
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://nexusbid-bucket.s3.amazonaws.com/avatars/user-123.jpg"
 *     responses:
 *       200:
 *         description: Avatar updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/avatar', validate(UpdateAvatarDto), controller.updateAvatar);

/**
 * @swagger
 * /api/v1/profile/avatar:
 *   delete:
 *     summary: Remove profile avatar
 *     description: Clears avatar URL from user profile.
 *     operationId: removeAvatar
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Avatar removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/avatar', controller.removeAvatar);

/**
 * @swagger
 * /api/v1/profile/change-password:
 *   post:
 *     summary: Change user password
 *     description: Updates password and revokes all active sessions for security. Sets session token cookie to null.
 *     operationId: profileChangePassword
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordDto'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Password changed successfully. Please log in again."
 *               data: null
 *               traceId: "uuid"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/change-password', validate(ChangePasswordDto), controller.changePassword);

/**
 * @swagger
 * /api/v1/profile/sessions:
 *   get:
 *     summary: Get user sessions
 *     description: Duplicate endpoint. Returns active user sessions list.
 *     operationId: profileGetSessions
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Active sessions returned
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
 *                         $ref: '#/components/schemas/SessionItem'
 */
router.get('/sessions', controller.getSessions);

/**
 * @swagger
 * /api/v1/profile/sessions/{id}:
 *   delete:
 *     summary: Revoke session by ID
 *     description: Duplicate endpoint. Invalidates specific session.
 *     operationId: profileRevokeSession
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Session revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/sessions/:id', controller.revokeSession);

/**
 * @swagger
 * /api/v1/profile/sessions:
 *   delete:
 *     summary: Revoke all user sessions
 *     description: Duplicate endpoint. Invalidates all active sessions (global logout).
 *     operationId: profileRevokeAllSessions
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: All sessions revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/sessions', controller.revokeAllSessions);

/**
 * @swagger
 * /api/v1/profile/devices:
 *   get:
 *     summary: Get recognized devices
 *     description: Duplicate endpoint. Returns a list of recognized devices.
 *     operationId: profileGetDevices
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Recognized devices list
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
 *                         $ref: '#/components/schemas/DeviceItem'
 */
router.get('/devices', controller.getDevices);

/**
 * @swagger
 * /api/v1/profile/activity:
 *   get:
 *     summary: Get profile activity logs
 *     description: Paginated log of user events (logins, updates).
 *     operationId: getProfileActivity
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated profile activity list
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
 *                         $ref: '#/components/schemas/ProfileActivity'
 */
router.get('/activity', controller.getActivity);

/**
 * @swagger
 * /api/v1/profile/security-history:
 *   get:
 *     summary: Get security actions history
 *     description: Paginated log of critical account security actions (password updates, session revokes).
 *     operationId: getSecurityHistory
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated security logs list
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
 *                         $ref: '#/components/schemas/ProfileActivity'
 */
router.get('/security-history', controller.getSecurityHistory);

/**
 * @swagger
 * /api/v1/profile/timeline:
 *   get:
 *     summary: Get combined account timeline events
 *     description: Resolves a chronological overview of all major user milestones.
 *     operationId: getProfileTimeline
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profile timeline list
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
 *                         type: object
 */
router.get('/timeline', controller.getTimeline);

/**
 * @swagger
 * /api/v1/profile/subscription:
 *   get:
 *     summary: Get user subscription status
 *     description: Resolves current subscription plan, validity dates, and PayPal checkout state.
 *     operationId: getProfileSubscription
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Subscription'
 */
router.get('/subscription', controller.getSubscription);

/**
 * @swagger
 * /api/v1/profile/preferences:
 *   get:
 *     summary: Get communication preferences
 *     description: Returns email, SMS, push notification configurations.
 *     operationId: getPreferences
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserPreferences'
 */
router.get('/preferences', controller.getPreferences);

/**
 * @swagger
 * /api/v1/profile/preferences:
 *   patch:
 *     summary: Update notification preferences
 *     description: Modifies user preference flags.
 *     operationId: updatePreferences
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserPreferences'
 *     responses:
 *       200:
 *         description: Preferences updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserPreferences'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.patch('/preferences', validate(UpdatePreferencesDto), controller.updatePreferences);

/**
 * @swagger
 * /api/v1/profile/request-change:
 *   post:
 *     summary: Request critical profile change
 *     description: Submits a support ticket/request for manual admin review to change email or organization details.
 *     operationId: requestProfileChange
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field, value, reason]
 *             properties:
 *               field:
 *                 type: string
 *                 example: "companyName"
 *               value:
 *                 type: string
 *                 example: "New Acme Corporate LLC"
 *               reason:
 *                 type: string
 *                 minLength: 5
 *                 example: "Corporate restructuring and registration update."
 *     responses:
 *       200:
 *         description: Change request submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/request-change', validate(RequestChangeDto), controller.requestChange);

/**
 * @swagger
 * /api/v1/profile/deactivate:
 *   post:
 *     summary: Deactivate user account
 *     description: Marks user status as deactivated and logs out the user.
 *     operationId: deactivateAccount
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/deactivate', controller.deactivateAccount);

/**
 * @swagger
 * /api/v1/profile/reactivate:
 *   post:
 *     summary: Reactivate user account
 *     description: Reactivates a deactivated user account.
 *     operationId: reactivateAccount
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Account reactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/reactivate', controller.reactivateAccount);

/**
 * @swagger
 * /api/v1/profile/delete-request:
 *   post:
 *     summary: Request permanent account deletion
 *     description: Flags account for permanent deletion in compliance with GDPR/data rights.
 *     operationId: deleteRequest
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Deletion request recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/delete-request', controller.deleteRequest);

/**
 * @swagger
 * /api/v1/profile/export:
 *   get:
 *     summary: Export profile data
 *     description: Downloads all user-owned profile data, preferences, subscriptions, and actions as a raw JSON file. Bypass standard API envelopes.
 *     operationId: exportProfileData
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Raw profile export JSON file attachment
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: "attachment; filename=nexusbid_profile_export.json"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/export', controller.exportData);

export { router as profileRouter };
