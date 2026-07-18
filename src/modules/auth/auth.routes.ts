import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { loadPermissions } from '../../middleware/permissions';
import {
  loginLimiter,
  passwordResetLimiter,
  registerLimiter,
  resendVerificationLimiter,
} from '../../middleware/rateLimits';
import { validate } from '../../middleware/validate';

import * as controller from './auth.controller';
import {
  ChangePasswordSchema,
  EmailChangeSchema,
  ForgotPasswordSchema,
  IdParamSchema,
  LoginSchema,
  OAuthCallbackQuerySchema,
  OAuthProviderSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from './auth.dto';
import * as oauthController from './oauth.controller';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/auth/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     description: Required before any state-mutating request (POST/PATCH/DELETE). Pass the
 *     returned token in the `x-csrf-token` header.
 *     operationId: getCsrfToken
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: CSRF token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [csrfToken]
 *                   properties:
 *                     csrfToken:
 *                       type: string
 *                       example: "c7b395e8-5b4d-4952-b88a-36fb2e46b9a1"
 */
router.get('/csrf-token', controller.getCsrfToken);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Creates a new customer account and sends an email verification link.
 *     operationId: registerCustomer
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Account created — verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Registration successful. Please verify your email."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/register', registerLimiter, validate(RegisterSchema), controller.register);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email address with a one-time token
 *     description: Verifies user account using token sent via email.
 *     operationId: verifyEmail
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "verification-token-123"
 *                 description: Token from the verification email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Email verified successfully. You can now log in."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/verify-email', validate(VerifyEmailSchema), controller.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     description: Resends the activation link to the user's email if they haven't verified it yet.
 *     operationId: resendVerification
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *                 description: User email address
 *     responses:
 *       200:
 *         description: Resend email link triggered (always 200 to prevent email enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "If the email exists and is not verified, a new verification link has been sent."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post(
  '/resend-verification',
  resendVerificationLimiter,
  validate(ResendVerificationSchema),
  controller.resendVerification,
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login and obtain a JWT session cookie
 *     description: Authenticates credentials and sets HTTP-Only cookies `nexusbid_token` and `nexusbid_refresh`.
 *     operationId: login
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful. Cookies are set in response headers.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthUser'
 *             example:
 *               success: true
 *               message: "Login successful"
 *               data:
 *                 id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 name: "Jane Doe"
 *                 email: "jane@example.com"
 *                 accountType: "user"
 *                 emailVerified: true
 *                 status: "active"
 *                 companyName: "Acme Corp"
 *                 country: "United States"
 *                 mustResetPassword: false
 *                 createdAt: "2026-07-01T12:00:00.000Z"
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/login', loginLimiter, validate(LoginSchema), controller.login);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     description: Sends a password recovery email containing a one-time link.
 *     operationId: forgotPassword
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *     responses:
 *       200:
 *         description: Reset email sent (always 200 to avoid email enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "If that email is registered, a reset link has been sent."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(ForgotPasswordSchema),
  controller.forgotPassword,
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using a one-time token
 *     description: Validates password reset token and saves the new password.
 *     operationId: resetPassword
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "reset-token-xyz"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Password reset successfully. Please log in."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/reset-password', validate(ResetPasswordSchema), controller.resetPassword);

// ─── Protected routes ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and invalidate the current session
 *     description: Revokes the current session and clears HTTP-Only cookies `nexusbid_token` and
 *    `nexusbid_refresh` server-side.
 *     operationId: logout
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout', authenticate, controller.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     description: Resolves the logged-in user profile, active roles, and permissions list.
 *     operationId: getMe
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile and permission list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MeResponse'
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 name: "Jane Doe"
 *                 email: "jane@example.com"
 *                 accountType: "user"
 *                 emailVerified: true
 *                 status: "active"
 *                 companyName: "Acme Corp"
 *                 country: "United States"
 *                 mustResetPassword: false
 *                 createdAt: "2026-07-01T12:00:00.000Z"
 *                 roles: ["tender-reviewer"]
 *                 permissions: ["tender.create", "tender.edit"]
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', authenticate, loadPermissions, controller.getMe);

// ─── Token Refresh & Active Sessions ──────────────────────────────────────────

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Rotate session tokens
 *     description: Rotates the refresh token and issues a new access token via HttpOnly cookies.
 *     operationId: refreshTokens
 *     tags: [Auth]
 *     security:
 *       - refreshCookie: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Session tokens rotated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Session refreshed successfully"
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/refresh', controller.refresh);

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   get:
 *     summary: Get all active sessions
 *     description: Returns a list of all active non-expired sessions for the current user.
 *     operationId: getSessions
 *     tags: [Auth]
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
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 - id: "session-uuid-1"
 *                   userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
 *                   ipAddress: "192.168.1.1"
 *                   createdAt: "2026-07-01T12:00:00.000Z"
 *                   expiresAt: "2026-07-08T12:00:00.000Z"
 *                   isCurrent: true
 *                 - id: "session-uuid-2"
 *                   userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) ..."
 *                   ipAddress: "172.56.21.89"
 *                   createdAt: "2026-07-02T15:30:00.000Z"
 *                   expiresAt: "2026-07-09T15:30:00.000Z"
 *                   isCurrent: false
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/sessions', authenticate, controller.getSessions);

/**
 * @swagger
 * /api/v1/auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     description: Revokes an active user session by session ID.
 *     operationId: revokeSession
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Session revoked successfully"
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/sessions/:id',
  authenticate,
  validate(IdParamSchema, 'params'),
  controller.revokeSession,
);

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   delete:
 *     summary: Revoke all active sessions
 *     description: Invalidates all active sessions for the user and logs out the caller.
 *     operationId: revokeAllSessions
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: All sessions revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "All sessions revoked successfully"
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/sessions', authenticate, controller.revokeAllSessions);

// ─── Security Backlog Features ────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/auth/email/change/verify:
 *   post:
 *     summary: Complete email change verification
 *     description: Verifies email change token and updates user's primary email. Logs out user upon completion.
 *     operationId: verifyEmailChange
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Verification token sent to new email
 *                 example: "email-verification-token-999"
 *     responses:
 *       200:
 *         description: Email changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Email changed successfully. Please log in again."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/email/change/verify', validate(VerifyEmailSchema), controller.verifyEmailChange);

/**
 * @swagger
 * /api/v1/auth/password/change:
 *   post:
 *     summary: Change user password
 *     description: Changes user password and revokes all active sessions.
 *     operationId: changePassword
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordSchema'
 *     responses:
 *       200:
 *         description: Password changed successfully. User is logged out.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Password changed successfully. Please log in again."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/password/change',
  authenticate,
  validate(ChangePasswordSchema),
  controller.changePassword,
);

/**
 * @swagger
 * /api/v1/auth/email/change:
 *   post:
 *     summary: Request email change
 *     description: Initiates email change verification process. Sends confirmation links to both
 *     current and new emails.
 *     operationId: requestEmailChange
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New proposed email
 *                 example: "new.email@example.com"
 *     responses:
 *       200:
 *         description: Verification emails sent successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post(
  '/email/change',
  authenticate,
  validate(EmailChangeSchema),
  controller.requestEmailChange,
);

/**
 * @swagger
 * /api/v1/auth/devices:
 *   get:
 *     summary: Get recognized devices
 *     description: Lists all recognized user devices and their trust statuses.
 *     operationId: getDevices
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of recognized devices
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
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 - id: "device-uuid-1"
 *                   userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
 *                   ipAddress: "192.168.1.1"
 *                   isTrusted: true
 *                   lastSeenAt: "2026-07-07T12:00:00.000Z"
 *                   createdAt: "2026-07-01T12:00:00.000Z"
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/devices', authenticate, controller.getDevices);

/**
 * @swagger
 * /api/v1/auth/devices/{id}/trust:
 *   post:
 *     summary: Trust a recognized device
 *     description: Marks a recognized device as trusted to skip additional verification checks.
 *     operationId: trustDevice
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Device trusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Device marked as trusted."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/devices/:id/trust',
  authenticate,
  validate(IdParamSchema, 'params'),
  controller.trustDevice,
);

/**
 * @swagger
 * /api/v1/auth/devices/{id}:
 *   delete:
 *     summary: Revoke a recognized device
 *     description: Deletes/revokes a recognized device, causing sessions on it to invalidate.
 *     operationId: revokeDevice
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Device revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Device revoked successfully."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/devices/:id',
  authenticate,
  validate(IdParamSchema, 'params'),
  controller.revokeDevice,
);

// ─── OAuth Social Sign-In ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/auth/oauth/{provider}:
 *   get:
 *     summary: Redirect to OAuth provider
 *     description: Redirects client to the chosen OAuth provider's portal (google, github, microsoft) to authenticate.
 *     operationId: redirectToOAuthProvider
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github, microsoft]
 *         description: OAuth provider name
 *     responses:
 *       302:
 *         description: Redirect to provider authorization page. Cookie/Header parameters not
 *         required as it initiates a browser-level redirection.
 */
router.get(
  '/oauth/:provider',
  validate(OAuthProviderSchema, 'params'),
  oauthController.redirectToProvider,
);

/**
 * @swagger
 * /api/v1/auth/oauth/{provider}/callback:
 *   get:
 *     summary: Handle OAuth provider callback
 *     description: Exchanges authorization code for user profile, logs/registers the user, and
 *     redirects to frontend. Sets HttpOnly cookies.
 *     operationId: handleOAuthCallback
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github, microsoft]
 *         description: OAuth provider name
 *       - name: code
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth authorization code from provider
 *       - name: state
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth CSRF state value to verify request authenticity
 *     responses:
 *       302:
 *         description: Redirects caller to frontend app (either success dashboard or login page with error query)
 */
router.get(
  '/oauth/:provider/callback',
  validate(OAuthProviderSchema, 'params'),
  validate(OAuthCallbackQuerySchema, 'query'),
  oauthController.handleCallback,
);

export { router as authRouter };
