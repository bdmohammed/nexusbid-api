import express, { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireAccountType } from '../../middleware/requireAccountType';
import { requirePermission } from '../../middleware/permissions';
import { validate } from '../../middleware/validate';
import { auditLogger } from '../../middleware/auditLogger';
import { AccountType } from '../../types/enums';
import {
  BlockUserDto, ListUsersQueryDto, CreateAdminDto,
  CreatePlanDto, UpdatePlanDto, AnalyticsQueryDto,
  CreateUserNoteDto, UpdateUserDetailDto, ImpersonateUserDto,
} from './admin.dto';
import * as controller from './admin.controller';
import setupRouter from '../rbac/setup.routes';
import { RegisterDto, LoginDto, VerifyEmailDto, ResendVerificationDto, ForgotPasswordDto, ResetPasswordDto } from '../auth/auth.dto';
import * as authController from '../auth/auth.controller';
import { loadPermissions } from '../../middleware/permissions';

const router = Router();

// ─── Public Admin Auth Endpoints (No Session Required) ────────────────────────

/**
 * @swagger
 * /api/v1/admin/auth/register:
 *   post:
 *     summary: Register a new admin request (Public)
 *     description: Submits a registration application for the administrator role. Awaiting system owner approval.
 *     operationId: registerAdmin
 *     tags: [Admin Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email, example: "admin@example.com" }
 *               password: { type: string, example: "SecretP@ss123" }
 *               firstName: { type: string, example: "John" }
 *               lastName: { type: string, example: "Smith" }
 *     responses:
 *       201:
 *         description: Application submitted successfully
 */
router.post('/auth/register', validate(RegisterDto), authController.registerAdmin);

/**
 * @swagger
 * /api/v1/admin/auth/login:
 *   post:
 *     summary: Admin credentials login (Public)
 *     description: Authenticates admin users and returns HTTP-Only session cookies.
 *     operationId: loginAdmin
 *     tags: [Admin Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "admin@example.com" }
 *               password: { type: string, example: "SecretP@ss123" }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/auth/login', validate(LoginDto), authController.loginAdmin);

/**
 * @swagger
 * /api/v1/admin/auth/verify-email:
 *   post:
 *     summary: Verify admin email token (Public)
 *     description: Verifies the email address using the confirmation token sent during registration.
 *     operationId: verifyAdminEmail
 *     tags: [Admin Auth]
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
 *               token: { type: string, example: "token123" }
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post('/auth/verify-email', validate(VerifyEmailDto), authController.verifyAdminEmail);

/**
 * @swagger
 * /api/v1/admin/auth/resend-verification:
 *   post:
 *     summary: Resend admin email verification (Public)
 *     description: Re-dispatches email confirmation instructions.
 *     operationId: resendAdminVerification
 *     tags: [Admin Auth]
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
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Verification email resent
 */
router.post('/auth/resend-verification', validate(ResendVerificationDto), authController.resendAdminVerification);

/**
 * @swagger
 * /api/v1/admin/auth/forgot-password:
 *   post:
 *     summary: Request admin password reset (Public)
 *     description: Sends instructions to change the password if the account exists.
 *     operationId: forgotAdminPassword
 *     tags: [Admin Auth]
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
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/auth/forgot-password', validate(ForgotPasswordDto), authController.forgotAdminPassword);

/**
 * @swagger
 * /api/v1/admin/auth/reset-password:
 *   post:
 *     summary: Reset admin password with token (Public)
 *     description: Changes password using a valid forgot-password token.
 *     operationId: resetAdminPassword
 *     tags: [Admin Auth]
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
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
router.post('/auth/reset-password', validate(ResetPasswordDto), authController.resetAdminPassword);

/**
 * @swagger
 * /api/v1/admin/auth/owner-review:
 *   get:
 *     summary: Review bootstrap status (Public)
 *     description: Returns whether the initial system owner account is bootstrapped.
 *     operationId: ownerReview
 *     tags: [Admin Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Status resolved
 */
router.get('/auth/owner-review', authController.ownerReview);

/**
 * @swagger
 * /api/v1/admin/auth/bootstrap:
 *   get:
 *     summary: Verify bootstrap token (Public)
 *     description: Validates the token before launching initial admin registration.
 *     operationId: verifyBootstrapToken
 *     tags: [Admin Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Token is valid
 *
 *   post:
 *     summary: Approve bootstrap admin creation (Public)
 *     description: Creates the initial platform administrator if bootstrap credentials match.
 *     operationId: approveBootstrapAdmin
 *     tags: [Admin Auth]
 *     security:
 *       - csrfToken: []
 *     responses:
 *       201:
 *         description: Platform bootstrapped successfully
 */
router.get('/auth/bootstrap', authController.verifyBootstrapToken);
router.post('/auth/bootstrap', authController.approveBootstrapAdmin);


// ─── Protected Admin Endpoints (Require Admin Session) ─────────────────────────
router.use(authenticate, requireAccountType(AccountType.ADMIN));

/**
 * @swagger
 * /api/v1/admin/auth/logout:
 *   post:
 *     summary: Log out admin user
 *     description: Invalidates admin token cookies and terminates the active session.
 *     operationId: logoutAdmin
 *     tags: [Admin Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/auth/logout', authController.logoutAdmin);

router.use('/register', setupRouter);

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/users/stats:
 *   get:
 *     summary: Get overall user directory statistics
 *     description: |
 *       Resolves aggregate metrics for users (total, active, suspended, account types).
 *       **Required Permission:** `user.view`
 *     operationId: getUserStats
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Statistics metrics resolved
 */
router.get('/users/stats', requirePermission('user.view'), controller.getUserStats);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List platform users directory
 *     description: |
 *       Returns a paginated list of all customers, vendors, and admins.
 *       **Required Permission:** `user.view`
 *     operationId: listUsers
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         required: false
 *         schema: { type: string }
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Users list resolved
 */
router.get('/users', requirePermission('user.view'), validate(ListUsersQueryDto, 'query'), controller.listUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     description: |
 *       Retrieves the core profile of a single user.
 *       **Required Permission:** `user.view`
 *     operationId: getUserById
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Profile details resolved
 */
router.get('/users/:id', requirePermission('user.view'), controller.getUserById);

/**
 * @swagger
 * /api/v1/admin/users/{id}/block:
 *   patch:
 *     summary: Toggle user block status
 *     description: |
 *       Blocks or unblocks a user from authenticating.
 *       **Required Permission:** `user.block`
 *     operationId: blockUser
 *     tags: [Admin Users]
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
 *             required: [isBlocked]
 *             properties:
 *               isBlocked: { type: boolean }
 *     responses:
 *       200:
 *         description: User status toggled
 */
router.patch(
  '/users/:id/block',
  requirePermission('user.block'),
  validate(BlockUserDto),
  auditLogger('user.block', 'user'),
  controller.blockUser,
);

/**
 * @swagger
 * /api/v1/admin/users/admin:
 *   post:
 *     summary: Create new administrator account
 *     description: |
 *       Initializes a new admin user record directly (Super-Admin option).
 *       **Required Permission:** `user.create_admin`
 *     operationId: createAdminUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName]
 *     responses:
 *       201:
 *         description: Admin created
 */
router.post(
  '/users/admin',
  requirePermission('user.create_admin'),
  validate(CreateAdminDto),
  auditLogger('admin.create', 'user'),
  controller.createAdmin,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/approve:
 *   post:
 *     summary: Approve pending admin registration request
 *     description: |
 *       Authorizes a registered admin request and assigns them a starting role.
 *       **Required Permission:** `rbac.manage`
 *     operationId: approveAdmin
 *     tags: [Admin Users]
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
 *             required: [roleId]
 *             properties:
 *               roleId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Admin request approved
 */
router.post(
  '/users/:id/approve',
  requirePermission('rbac.manage'),
  auditLogger('admin.approve', 'user'),
  controller.approveAdmin,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/reject:
 *   post:
 *     summary: Reject pending admin registration request
 *     description: |
 *       Denies an admin request, detailing the reason.
 *       **Required Permission:** `rbac.manage`
 *     operationId: rejectAdmin
 *     tags: [Admin Users]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Admin request rejected
 */
router.post(
  '/users/:id/reject',
  requirePermission('rbac.manage'),
  auditLogger('admin.reject', 'user'),
  controller.rejectAdmin,
);

// Detailed user administration sub-resource endpoints

/**
 * @swagger
 * /api/v1/admin/users/{id}/overview:
 *   get:
 *     summary: Get detailed user overview summary
 *     description: |
 *       Resolves key security status, subscription type, and transaction history.
 *       **Required Permission:** `user.view`
 *     operationId: getUserOverview
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Overview details resolved
 */
router.get('/users/:id/overview', requirePermission('user.view'), controller.getUserOverview);

/**
 * @swagger
 * /api/v1/admin/users/{id}/security:
 *   get:
 *     summary: Get user security settings stats
 *     description: |
 *       Resolves 2FA, password change history, and active sessions count.
 *       **Required Permission:** `user.view`
 *     operationId: getUserSecurity
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Security summary
 */
router.get('/users/:id/security', requirePermission('user.view'), controller.getUserSecurity);

/**
 * @swagger
 * /api/v1/admin/users/{id}/sessions:
 *   get:
 *     summary: List user active sessions
 *     description: |
 *       Lists token refresh details, login locations, and browsers.
 *       **Required Permission:** `user.view`
 *     operationId: getUserSessions
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Sessions list resolved
 */
router.get('/users/:id/sessions', requirePermission('user.view'), controller.getUserSessions);

/**
 * @swagger
 * /api/v1/admin/users/{id}/devices:
 *   get:
 *     summary: List user recognized devices
 *     description: |
 *       Lists devices registered or cookie fingerprint keys matching user logins.
 *       **Required Permission:** `user.view`
 *     operationId: getUserDevices
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Devices list
 */
router.get('/users/:id/devices', requirePermission('user.view'), controller.getUserDevices);

/**
 * @swagger
 * /api/v1/admin/users/{id}/activity:
 *   get:
 *     summary: Get user action logs
 *     description: |
 *       Resolves recent events triggered by this user ID.
 *       **Required Permission:** `user.view`
 *     operationId: getUserActivity
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Activity log resolved
 */
router.get('/users/:id/activity', requirePermission('user.view'), controller.getUserActivity);

/**
 * @swagger
 * /api/v1/admin/users/{id}/timeline:
 *   get:
 *     summary: Get chronological timeline events
 *     description: |
 *       Resolves subscription upgrades, profile shifts, and ticket completions on a timeline.
 *       **Required Permission:** `user.view`
 *     operationId: getUserTimeline
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Timeline events resolved
 */
router.get('/users/:id/timeline', requirePermission('user.view'), controller.getUserTimeline);

/**
 * @swagger
 * /api/v1/admin/users/{id}/audit:
 *   get:
 *     summary: Get user audit log timeline
 *     description: |
 *       Resolves security and mutation records.
 *       **Required Permission:** `user.view`
 *     operationId: getUserAuditLogs
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Audit records resolved
 */
router.get('/users/:id/audit', requirePermission('user.view'), controller.getUserAuditLogs);

/**
 * @swagger
 * /api/v1/admin/users/{id}/subscription:
 *   get:
 *     summary: Get user subscription overview
 *     description: |
 *       Resolves active payment details and expiry dates.
 *       **Required Permission:** `user.view`
 *     operationId: getUserSubscription
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Subscription status details
 */
router.get('/users/:id/subscription', requirePermission('user.view'), controller.getUserSubscription);

/**
 * @swagger
 * /api/v1/admin/users/{id}/notes:
 *   get:
 *     summary: Get internal admin notes on user
 *     description: |
 *       Lists internal warnings or status notes recorded by admins.
 *       **Required Permission:** `user.view`
 *     operationId: getUserNotes
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Internal notes resolved
 *
 *   post:
 *     summary: Add internal admin note to user
 *     description: |
 *       Saves a warning note regarding this user profile.
 *       **Required Permission:** `user.view`
 *     operationId: createUserNote
 *     tags: [Admin Users]
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
 *             required: [note]
 *             properties:
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Note appended successfully
 */
router.get('/users/:id/notes', requirePermission('user.view'), controller.getUserNotes);
router.post(
  '/users/:id/notes',
  requirePermission('user.view'),
  validate(CreateUserNoteDto),
  controller.createUserNote,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/details:
 *   patch:
 *     summary: Edit user contact profile details
 *     description: |
 *       Edits name, phone, or address details.
 *       **Required Permission:** `user.view`
 *     operationId: updateUserDetail
 *     tags: [Admin Users]
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
 *         description: User profile edited
 */
router.patch(
  '/users/:id/details',
  requirePermission('user.view'),
  validate(UpdateUserDetailDto),
  auditLogger('user.update', 'user'),
  controller.updateUserDetail,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/suspend:
 *   post:
 *     summary: Suspend user account
 *     description: |
 *       Suspends a user, blocking all auth triggers.
 *       **Required Permission:** `user.block`
 *     operationId: suspendUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Account suspended successfully
 */
router.post(
  '/users/:id/suspend',
  requirePermission('user.block'),
  auditLogger('user.suspend', 'user'),
  controller.suspendUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/activate:
 *   post:
 *     summary: Activate suspended user account
 *     description: |
 *       Un-suspends a user.
 *       **Required Permission:** `user.block`
 *     operationId: activateUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Account activated
 */
router.post(
  '/users/:id/activate',
  requirePermission('user.block'),
  auditLogger('user.activate', 'user'),
  controller.activateUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/archive:
 *   post:
 *     summary: Soft archive user profile
 *     description: |
 *       Hides user profile from regular searches.
 *       **Required Permission:** `user.block`
 *     operationId: archiveUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: User archived
 */
router.post(
  '/users/:id/archive',
  requirePermission('user.block'),
  auditLogger('user.archive', 'user'),
  controller.archiveUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/unarchive:
 *   post:
 *     summary: Restore archived user profile
 *     description: |
 *       Restores an archived profile.
 *       **Required Permission:** `user.block`
 *     operationId: unarchiveUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: User restored
 */
router.post(
  '/users/:id/unarchive',
  requirePermission('user.block'),
  auditLogger('user.unarchive', 'user'),
  controller.unarchiveUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/force-password-reset:
 *   post:
 *     summary: Force user password reset on next login
 *     description: |
 *       Forces the user to select a new password on their next authentication attempt.
 *       **Required Permission:** `user.view`
 *     operationId: forcePasswordReset
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Reset rule activated
 */
router.post(
  '/users/:id/force-password-reset',
  requirePermission('user.view'),
  auditLogger('user.force_password_reset', 'user'),
  controller.forcePasswordChange,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/reset-password:
 *   post:
 *     summary: Send password reset email link
 *     description: |
 *       Sends a password reset token URL to the user's inbox.
 *       **Required Permission:** `user.view`
 *     operationId: sendAdminResetPasswordEmail
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Email dispatched
 */
router.post(
  '/users/:id/reset-password',
  requirePermission('user.view'),
  auditLogger('user.reset_password', 'user'),
  controller.sendResetPasswordEmail,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/send-verification:
 *   post:
 *     summary: Resend verification email to user
 *     description: |
 *       Triggers confirmation mail sequence to verify user email address.
 *       **Required Permission:** `user.view`
 *     operationId: sendAdminUserVerification
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Email sent successfully
 */
router.post(
  '/users/:id/send-verification',
  requirePermission('user.view'),
  auditLogger('user.send_verification', 'user'),
  controller.sendUserVerification,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/sessions/{sessionId}:
 *   delete:
 *     summary: Terminate specific user session
 *     description: |
 *       Revokes a single login session.
 *       **Required Permission:** `user.view`
 *     operationId: revokeUserSession
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session terminated
 */
router.delete(
  '/users/:id/sessions/:sessionId',
  requirePermission('user.view'),
  auditLogger('user.revoke_session', 'user'),
  controller.revokeSession,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/sessions:
 *   delete:
 *     summary: Terminate all user sessions
 *     description: |
 *       Logs the user out of all devices and browsers immediately.
 *       **Required Permission:** `user.view`
 *     operationId: revokeAllUserSessions
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: All active sessions revoked
 */
router.delete(
  '/users/:id/sessions',
  requirePermission('user.view'),
  auditLogger('user.revoke_all_sessions', 'user'),
  controller.revokeAllSessions,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/impersonate:
 *   post:
 *     summary: Establish impersonation session
 *     description: |
 *       Establishes an impersonation token to act on behalf of the user. Logs audit trail.
 *       **Required Permission:** `user.view`
 *     operationId: impersonateUser
 *     tags: [Admin Users]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: "Troubleshooting checkout issue" }
 *     responses:
 *       200:
 *         description: Impersonation token returned
 */
router.post(
  '/users/:id/impersonate',
  requirePermission('user.view'),
  validate(ImpersonateUserDto),
  auditLogger('user.impersonate', 'user'),
  controller.impersonateUser,
);

// ─── User Role Assignments & Previews ──────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/users/{id}/roles:
 *   get:
 *     summary: Get assigned roles list of user
 *     description: |
 *       Lists roles and expiry dates.
 *       **Required Permission:** `rbac.manage`
 *     operationId: getUserRoles
 *     tags: [Admin RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Assigned roles list
 *
 *   put:
 *     summary: Assign new roles to user
 *     description: |
 *       Updates user role configurations.
 *       **Required Permission:** `rbac.manage`
 *     operationId: assignUserRoles
 *     tags: [Admin RBAC]
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
 *             required: [assignments]
 *     responses:
 *       200:
 *         description: Roles saved
 */
router.get('/users/:id/roles', requirePermission('rbac.manage'), controller.getUserRoles);
router.put(
  '/users/:id/roles',
  requirePermission('rbac.manage'),
  auditLogger('user.assign_roles', 'user'),
  controller.assignUserRoles,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/roles/{roleId}:
 *   delete:
 *     summary: Revoke role from user
 *     description: |
 *       Removes a role assignment.
 *       **Required Permission:** `rbac.manage`
 *     operationId: revokeUserRole
 *     tags: [Admin RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *       - name: roleId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Role revoked successfully
 */
router.delete(
  '/users/:id/roles/:roleId',
  requirePermission('rbac.manage'),
  auditLogger('user.revoke_role', 'user'),
  controller.revokeUserRole,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/permissions:
 *   get:
 *     summary: Preview compiled permissions of user
 *     description: |
 *       Resolves final flattened list of allowed actions compiled across active roles.
 *       **Required Permission:** `rbac.manage`
 *     operationId: previewUserPermissions
 *     tags: [Admin RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Flat permissions key list
 */
router.get('/users/:id/permissions', requirePermission('rbac.manage'), controller.previewUserPermissions);

// ─── Plans ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/plans:
 *   get:
 *     summary: List all plans (Legacy Admin API)
 *     description: |
 *       Lists all subscription plans.
 *       **Required Permission:** `plan.manage`
 *     operationId: adminListPlans
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Plans list
 *
 *   post:
 *     summary: Create new plan (Legacy Admin API)
 *     description: |
 *       Creates a new legacy plan.
 *       **Required Permission:** `plan.manage`
 *     operationId: adminCreatePlan
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Plan created
 */
router.get('/plans', requirePermission('plan.manage'), controller.listPlans);
router.post('/plans', requirePermission('plan.manage'), validate(CreatePlanDto), controller.createPlan);

/**
 * @swagger
 * /api/v1/admin/plans/{id}:
 *   patch:
 *     summary: Update legacy plan details
 *     description: |
 *       Updates plan fields directly.
 *       **Required Permission:** `plan.manage`
 *     operationId: adminUpdatePlan
 *     tags: [Plans Admin]
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
 *         description: Plan updated
 */
router.patch('/plans/:id', requirePermission('plan.manage'), validate(UpdatePlanDto), controller.updatePlan);

// ─── Subscriptions ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/subscriptions:
 *   get:
 *     summary: List all user subscriptions
 *     description: |
 *       Returns a paginated list of all subscriptions in the platform.
 *       **Required Permission:** `subscription.view`
 *     operationId: adminListSubscriptions
 *     tags: [Subscriptions Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Subscriptions list resolved
 */
router.get('/subscriptions', requirePermission('subscription.view'), controller.listSubscriptions);

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics (Legacy Admin API)
 *     description: |
 *       Resolves revenue graphs.
 *       **Required Permission:** `analytics.view`
 *     operationId: adminGetRevenue
 *     tags: [Analytics Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Revenue stats
 */
router.get('/analytics/revenue', requirePermission('analytics.view'), validate(AnalyticsQueryDto, 'query'), controller.getRevenue);

/**
 * @swagger
 * /api/v1/admin/analytics/downloads:
 *   get:
 *     summary: Get top downloaded tenders metrics
 *     description: |
 *       Lists tenders with the highest number of document downloads.
 *       **Required Permission:** `analytics.view`
 *     operationId: adminGetTopDownloads
 *     tags: [Analytics Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Download metrics list
 */
router.get('/analytics/downloads', requirePermission('analytics.view'), controller.getTopDownloads);

/**
 * @swagger
 * /api/v1/admin/analytics/user-growth:
 *   get:
 *     summary: Get user growth analytics metrics
 *     description: |
 *       Resolves new registration curves.
 *       **Required Permission:** `analytics.view`
 *     operationId: adminGetUserGrowth
 *     tags: [Analytics Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User growth resolved
 */
router.get('/analytics/user-growth', requirePermission('analytics.view'), validate(AnalyticsQueryDto, 'query'), controller.getUserGrowth);

export { router as adminRouter };
