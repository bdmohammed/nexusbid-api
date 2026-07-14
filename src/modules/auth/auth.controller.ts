import type { Request, Response } from "express";
import { asyncHandler } from "../../core/asyncHandler";
import { sendOk, sendCreated } from "../../core/response";
import { generateToken } from "../../middleware/csrf";
import * as authService from "./auth.service";
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  EmailChangeDto,
  ChangePasswordDto,
} from "./auth.dto";
import { AppError } from "../../core/AppError";
import { AppDataSource } from "../../config/database";
import { User } from "../../database/entities/User";
import { EmailToken } from "../../database/entities/EmailToken";
import { EmailTokenType } from "../../types/enums";
import { createEmailToken } from "../../services/token.service";
import { sendAdminVerificationEmail } from "../../services/email.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as RegisterDto;
  await authService.registerUser(dto, {
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || null,
  });
  return sendCreated(
    res,
    null,
    "Registration successful. Please verify your email.",
  );
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.validated as VerifyEmailDto;
  await authService.verifyEmail(token);
  return sendOk(res, null, "Email verified successfully. You can now log in.");
});

export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.validated as ResendVerificationDto;
    await authService.resendVerification(email, {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });
    return sendOk(
      res,
      null,
      "If the email exists and is not verified, a new verification link has been sent.",
    );
  },
);

export const login = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as LoginDto;
  const user = await authService.loginUser(dto, res, {
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || null,
  });
  return sendOk(res, user, "Login successful");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as
    | string
    | undefined;
  await authService.logoutUser(res, refreshToken, {
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || null,
  });
  return sendOk(res, null, "Logged out successfully");
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.userId);
  return sendOk(res, {
    ...user,
    roles: req.roles || [],
    permissions: req.permissions || [],
  });
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.validated as ForgotPasswordDto;
    await authService.forgotPassword(email);
    return sendOk(
      res,
      null,
      "If that email is registered, a reset link has been sent.",
    );
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, password } = req.validated as ResetPasswordDto;
    await authService.resetPassword(token, password, {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });
    return sendOk(res, null, "Password reset successfully. Please log in.");
  },
);

/**
 * POST /api/v1/auth/refresh
 * Rotates the refresh token and issues a new access token.
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as
    | string
    | undefined;
  await authService.refreshSession(refreshToken, res, {
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || null,
  });
  return sendOk(res, null, "Session refreshed successfully");
});

/**
 * GET /api/v1/auth/sessions
 * Returns list of all active non-expired sessions.
 */
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as
    | string
    | undefined;
  const sessions = await authService.getUserSessions(
    req.user!.userId,
    refreshToken,
  );
  return sendOk(res, sessions);
});

/**
 * DELETE /api/v1/auth/sessions/:id
 * Revokes a specific session.
 */
export const revokeSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await authService.revokeSessionById(req.user!.userId, id);
    return sendOk(res, null, "Session revoked successfully");
  },
);

export const registerAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const dto = req.validated as RegisterDto;
    await authService.registerAdmin(dto, {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });
    return sendCreated(
      res,
      null,
      "Registration successful. Please verify your email.",
    );
  },
);

export const verifyAdminEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.validated as VerifyEmailDto;
    const { superAdminExists } = await authService.verifyAdminEmail(token);
    return sendOk(
      res,
      { superAdminExists },
      "Your email has been verified successfully.",
    );
  },
);

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as LoginDto;
  const user = await authService.loginAdmin(dto, res, {
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || null,
  });
  return sendOk(res, user, "Login successful");
});

export const logoutAdmin = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[authService.REFRESH_COOKIE_NAME] as
    | string
    | undefined;
  await authService.logoutUser(res, refreshToken, {
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || null,
  });
  return sendOk(res, null, "Logged out successfully");
});

export const ownerReview = asyncHandler(async (req: Request, res: Response) => {
  const token = req.query.token as string;
  const action = req.query.action as "approve" | "reject";

  if (!token || !action || (action !== "approve" && action !== "reject")) {
    throw new AppError(
      "Valid token and action are required",
      400,
      "VALIDATION_ERROR",
    );
  }

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

export const resendAdminVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.validated as ResendVerificationDto;

    const user = await AppDataSource.getRepository(User).findOne({
      where: { email },
    });
    if (!user || user.emailVerified) {
      return sendOk(
        res,
        null,
        "If the email exists and is not verified, a new verification link has been sent.",
      );
    }

    const tokenRepo = AppDataSource.getRepository(EmailToken);
    await tokenRepo.delete({
      userId: user.id,
      type: EmailTokenType.EMAIL_VERIFICATION,
    });

    const rawToken = await createEmailToken(
      user.id,
      EmailTokenType.EMAIL_VERIFICATION,
    );
    await sendAdminVerificationEmail({
      to: user.email,
      name: user.name,
      userId: user.id,
      token: rawToken,
    });

    return sendOk(
      res,
      null,
      "If the email exists and is not verified, a new verification link has been sent.",
    );
  },
);

export const forgotAdminPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.validated as ForgotPasswordDto;
    await authService.forgotPassword(email);
    return sendOk(
      res,
      null,
      "If that email is registered, a reset link has been sent.",
    );
  },
);

export const resetAdminPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, password } = req.validated as ResetPasswordDto;
    await authService.resetPassword(token, password, {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });
    return sendOk(res, null, "Password reset successfully. Please log in.");
  },
);

/**
 * DELETE /api/v1/auth/sessions
 * Revokes all sessions for the current user.
 */
export const revokeAllSessions = asyncHandler(
  async (req: Request, res: Response) => {
    const details = {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    };
    await authService.revokeAllUserSessions(req.user!.userId);
    // Clear the cookies for the current client too
    await authService.logoutUser(res, undefined, details);
    return sendOk(res, null, "All sessions revoked successfully");
  },
);

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
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.validated as ChangePasswordDto;
    const details = {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    };
    await authService.changeUserPassword(
      req.user!.userId,
      currentPassword,
      newPassword,
      details,
    );
    // Clear the cookies of the current client too
    await authService.logoutUser(res, undefined, details);
    return sendOk(
      res,
      null,
      "Password changed successfully. Please log in again.",
    );
  },
);

/**
 * POST /api/v1/auth/email/change
 * Initiates email change verification.
 */
export const requestEmailChange = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.validated as EmailChangeDto;
    const details = {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    };
    await authService.requestEmailChange(req.user!.userId, email, details);
    return sendOk(
      res,
      null,
      "Verification emails sent. Please check your inbox.",
    );
  },
);

/**
 * POST /api/v1/auth/email/change/verify
 * Completes email change verification.
 */
export const verifyEmailChange = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.validated as VerifyEmailDto;
    const details = {
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    };
    await authService.verifyEmailChange(token, details);
    // Clear the cookies of the current client too
    await authService.logoutUser(res, undefined, details);
    return sendOk(
      res,
      null,
      "Email changed successfully. Please log in again.",
    );
  },
);

/**
 * GET /api/v1/auth/devices
 * Lists recognized devices for the user.
 */
export const getDevices = asyncHandler(async (req: Request, res: Response) => {
  const devices = await authService.getUserDevices(req.user!.userId);
  return sendOk(res, devices);
});

/**
 * POST /api/v1/auth/devices/:id/trust
 * Trusts a recognized device.
 */
export const trustDevice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await authService.trustDeviceById(req.user!.userId, id!);
  return sendOk(res, null, "Device marked as trusted.");
});

/**
 * DELETE /api/v1/auth/devices/:id
 * Revokes a device.
 */
export const revokeDevice = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await authService.revokeDeviceById(req.user!.userId, id!);
    return sendOk(res, null, "Device revoked successfully.");
  },
);

export const verifyBootstrapToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) {
      throw new AppError("Token is required", 400, "VALIDATION_ERROR");
    }

    const details = await authService.verifyBootstrapToken(token);
    return sendOk(res, details);
  },
);

export const approveBootstrapAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, action } = req.body;
    if (!token) {
      throw new AppError("Token is required", 400, "VALIDATION_ERROR");
    }

    const act = action === "reject" ? "reject" : "approve";
    await authService.approveBootstrapAdmin(token, act);

    const message =
      act === "approve"
        ? "Administrator successfully bootstrapped and activated."
        : "Administrator setup request has been rejected.";

    return sendOk(res, null, message);
  },
);
