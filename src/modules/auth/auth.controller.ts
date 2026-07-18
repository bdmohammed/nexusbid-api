import { AppDataSource } from '../../config/database';
import { asyncHandler } from '../../core/asyncHandler';
import { sendCreated, sendOk } from '../../core/response';
import { EmailToken } from '../../database/entities/EmailToken';
import { User } from '../../database/entities/User';
import { generateToken } from '../../middleware/csrf';
import { sendAdminVerificationEmail } from '../../services/email.service';
import { createEmailToken } from '../../services/token.service';
import { EmailTokenType } from '../../types/enums';

import * as authService from './auth.service';

import type { ApiResponse } from '../../core/response';
import type { UserDevice } from '../../database/entities/UserDevice';
import type {
  ApproveBootstrapAdminDto,
  ChangePasswordDto,
  EmailChangeDto,
  ForgotPasswordDto,
  IdParamDto,
  LoginDto,
  OwnerReviewDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  UserSessionDto,
  VerifyBootstrapTokenDto,
  VerifyEmailDto,
} from './auth.dto';

type SanitizedUser = Omit<
  User,
  'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockoutUntil'
>;
import type { Request, Response } from 'express';

export const register = asyncHandler<{}, ApiResponse<null>, RegisterDto>(async (req, res) => {
  const dto = req.body;
  await authService.registerUser(dto, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendCreated(res, null, 'Registration successful. Please verify your email.');
});

export const verifyEmail = asyncHandler<{}, ApiResponse<null>, VerifyEmailDto>(async (req, res) => {
  const { token } = req.body;
  await authService.verifyEmail(token);
  return sendOk(res, null, 'Email verified successfully. You can now log in.');
});

export const resendVerification = asyncHandler<{}, ApiResponse<null>, ResendVerificationDto>(
  async (req, res) => {
    const { email } = req.body;
    await authService.resendVerification(email, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
    return sendOk(
      res,
      null,
      'If the email exists and is not verified, a new verification link has been sent.',
    );
  },
);

export const login = asyncHandler<{}, ApiResponse<SanitizedUser>, LoginDto>(async (req, res) => {
  const dto = req.body;
  const user = await authService.loginUser(dto, res, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendOk(res, user, 'Login successful');
});

export const logout = asyncHandler<{}, ApiResponse<null>>(async (req, res) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logoutUser(res, refreshToken, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendOk(res, null, 'Logged out successfully');
});

export const getMe = asyncHandler<
  {},
  ApiResponse<SanitizedUser & { roles: string[]; permissions: string[] }>
>(async (req, res) => {
  const user = await authService.getProfile(req.user!.userId);
  return sendOk(res, {
    ...user,
    roles: req.roles ?? [],
    permissions: req.permissions ?? [],
  });
});

export const forgotPassword = asyncHandler<{}, ApiResponse<null>, ForgotPasswordDto>(
  async (req, res) => {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return sendOk(res, null, 'If that email is registered, a reset link has been sent.');
  },
);

export const resetPassword = asyncHandler<{}, ApiResponse<null>, ResetPasswordDto>(
  async (req, res) => {
    const { token, password } = req.body;
    await authService.resetPassword(token, password, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
    return sendOk(res, null, 'Password reset successfully. Please log in.');
  },
);

/**
 * POST /api/v1/auth/refresh
 * Rotates the refresh token and issues a new access token.
 */
export const refresh = asyncHandler<{}, ApiResponse<null>>(async (req, res) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as string | undefined;
  await authService.refreshSession(refreshToken, res, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendOk(res, null, 'Session refreshed successfully');
});

/**
 * GET /api/v1/auth/sessions
 * Returns list of all active non-expired sessions.
 */
export const getSessions = asyncHandler<{}, ApiResponse<UserSessionDto[]>>(async (req, res) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as string | undefined;
  const sessions = await authService.getUserSessions(req.user!.userId, refreshToken);
  return sendOk(res, sessions);
});

/**
 * DELETE /api/v1/auth/sessions/:id
 * Revokes a specific session.
 */
export const revokeSession = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
  const { id } = req.params;
  await authService.revokeSessionById(req.user!.userId, id);
  return sendOk(res, null, 'Session revoked successfully');
});

export const registerAdmin = asyncHandler<{}, ApiResponse<null>, RegisterDto>(async (req, res) => {
  const dto = req.body;
  await authService.registerAdmin(dto, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendCreated(res, null, 'Registration successful. Please verify your email.');
});

export const verifyAdminEmail = asyncHandler<
  {},
  ApiResponse<{ superAdminExists: boolean }>,
  VerifyEmailDto
>(async (req, res) => {
  const { token } = req.body;
  const { superAdminExists } = await authService.verifyAdminEmail(token);
  return sendOk(res, { superAdminExists }, 'Your email has been verified successfully.');
});

export const loginAdmin = asyncHandler<{}, ApiResponse<SanitizedUser>, LoginDto>(
  async (req, res) => {
    const dto = req.body;
    const user = await authService.loginAdmin(dto, res, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
    return sendOk(res, user, 'Login successful');
  },
);

export const logoutAdmin = asyncHandler<{}, ApiResponse<null>>(async (req, res) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logoutUser(res, refreshToken, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendOk(res, null, 'Logged out successfully');
});

export const ownerReview = asyncHandler<{}, string, {}, OwnerReviewDto>(async (req, res) => {
  const { token, action } = req.query;

  await authService.ownerReview(token, action);
  res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f3f4f6; margin: 0;">
          <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%;">
            <h2 style="color: #10b981; margin-bottom: 16px;">Success!</h2>
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">The admin user request has been successfully <strong>${action}d</strong>.</p>
            <div style="color: #9ca3af; font-size: 14px;">You can safely close this page.</div>
          </div>
        </body>
      </html>
    `);
});

export const resendAdminVerification = asyncHandler<{}, ApiResponse<null>, ResendVerificationDto>(
  async (req, res) => {
    const { email } = req.body;

    const user = await AppDataSource.getRepository(User).findOne({ where: { email } });
    if (!user) {
      return sendOk(res, null, "Email dosn't Exits.");
    }

    if (user.emailVerified) {
      return sendOk(
        res,
        null,
        'If the email exists and is not verified, a new verification link has been sent.',
      );
    }

    const emailTokenRepository = AppDataSource.getRepository(EmailToken);
    await emailTokenRepository.delete({ userId: user.id, type: EmailTokenType.EMAIL_VERIFICATION });

    const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION);
    await sendAdminVerificationEmail({
      to: user.email,
      name: user.name,
      userId: user.id,
      token: rawToken,
    });

    return sendOk(
      res,
      null,
      'If the email exists and is not verified, a new verification link has been sent.',
    );
  },
);

export const forgotAdminPassword = asyncHandler<{}, ApiResponse<null>, ForgotPasswordDto>(
  async (req, res) => {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return sendOk(res, null, 'If that email is registered, a reset link has been sent.');
  },
);

export const resetAdminPassword = asyncHandler<{}, ApiResponse<null>, ResetPasswordDto>(
  async (req, res) => {
    const { token, password } = req.body;
    await authService.resetPassword(token, password, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
    return sendOk(res, null, 'Password reset successfully. Please log in.');
  },
);

/**
 * DELETE /api/v1/auth/sessions
 * Revokes all sessions for the current user.
 */
export const revokeAllSessions = asyncHandler<{}, ApiResponse<null>>(async (req, res) => {
  const clientMetadata = {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  };
  await authService.revokeAllUserSessions(req.user!.userId);
  // Clear the cookies for the current client too
  await authService.logoutUser(res, undefined, clientMetadata);
  return sendOk(res, null, 'All sessions revoked successfully');
});

/**
 * GET /api/v1/auth/csrf-token
 * Returns a CSRF token for the frontend to use on state-changing requests.
 */
export const getCsrfToken = (req: Request, res: Response): void => {
  const token = generateToken(req, res);
  res.json({ success: true, data: { csrfToken: token } });
};

/**
 * POST /api/v1/auth/password/change
 * Changes user password and revokes all active sessions.
 */
export const changePassword = asyncHandler<{}, ApiResponse<null>, ChangePasswordDto>(
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const clientMetadata = {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    };
    await authService.changeUserPassword(
      req.user!.userId,
      currentPassword,
      newPassword,
      clientMetadata,
    );
    // Clear the cookies of the current client too
    await authService.logoutUser(res, undefined, clientMetadata);
    return sendOk(res, null, 'Password changed successfully. Please log in again.');
  },
);

/**
 * POST /api/v1/auth/email/change
 * Initiates email change verification.
 */
export const requestEmailChange = asyncHandler<{}, ApiResponse<null>, EmailChangeDto>(
  async (req, res) => {
    const { email } = req.body;
    const clientMetadata = {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    };
    await authService.requestEmailChange(req.user!.userId, email, clientMetadata);
    return sendOk(res, null, 'Verification emails sent. Please check your inbox.');
  },
);

/**
 * POST /api/v1/auth/email/change/verify
 * Completes email change verification.
 */
export const verifyEmailChange = asyncHandler<{}, ApiResponse<null>, VerifyEmailDto>(
  async (req, res) => {
    const { token } = req.body;
    const clientMetadata = {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    };
    await authService.verifyEmailChange(token, clientMetadata);
    // Clear the cookies of the current client too
    await authService.logoutUser(res, undefined, clientMetadata);
    return sendOk(res, null, 'Email changed successfully. Please log in again.');
  },
);

/**
 * GET /api/v1/auth/devices
 * Lists recognized devices for the user.
 */
export const getDevices = asyncHandler<{}, ApiResponse<UserDevice[]>>(async (req, res) => {
  const devices = await authService.getUserDevices(req.user!.userId);
  return sendOk(res, devices);
});

/**
 * POST /api/v1/auth/devices/:id/trust
 * Trusts a recognized device.
 */
export const trustDevice = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
  const { id } = req.params;
  await authService.trustDeviceById(req.user!.userId, id);
  return sendOk(res, null, 'Device marked as trusted.');
});

/**
 * DELETE /api/v1/auth/devices/:id
 * Revokes a device.
 */
export const revokeDevice = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
  const { id } = req.params;
  await authService.revokeDeviceById(req.user!.userId, id);
  return sendOk(res, null, 'Device revoked successfully.');
});

export const verifyBootstrapToken = asyncHandler<
  {},
  ApiResponse<{ name: string; email: string }>,
  {},
  VerifyBootstrapTokenDto
>(async (req, res) => {
  const { token } = req.query;

  const bootstrapTokenDetails = await authService.verifyBootstrapToken(token);
  return sendOk(res, bootstrapTokenDetails);
});

export const approveBootstrapAdmin = asyncHandler<{}, ApiResponse<null>, ApproveBootstrapAdminDto>(
  async (req, res) => {
    const { token, action } = req.body;

    const finalAction = action === 'reject' ? 'reject' : 'approve';
    await authService.approveBootstrapAdmin(token, finalAction);

    const message =
      finalAction === 'approve'
        ? 'Administrator successfully bootstrapped and activated.'
        : 'Administrator setup request has been rejected.';

    return sendOk(res, null, message);
  },
);
