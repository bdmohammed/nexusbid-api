import type { Request, Response } from "express";
import { asyncHandler } from "../../core/asyncHandler";
import { sendOk } from "../../core/response";
import * as profileService from "./profile.service";
import * as authService from "../auth/auth.service";
import { JWT_COOKIE_NAME } from "../../core/constants";
import { env } from "../../config/env";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await profileService.getProfile(req.user!.userId);
  return sendOk(res, profile);
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, country } = req.validated as any;
    const updated = await profileService.updateProfile(req.user!.userId, {
      name,
      country,
    });
    return sendOk(res, updated, "Profile updated successfully");
  },
);

export const updateAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const { avatarUrl } = req.validated as any;
    const updated = await profileService.updateAvatar(
      req.user!.userId,
      avatarUrl,
    );
    return sendOk(res, updated, "Avatar updated successfully");
  },
);

export const removeAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const updated = await profileService.removeAvatar(req.user!.userId);
    return sendOk(res, updated, "Avatar removed successfully");
  },
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.validated as any;
    const userAgent = req.headers["user-agent"] || null;
    const ipAddress = req.ip || null;

    await authService.changeUserPassword(
      req.user!.userId,
      currentPassword,
      newPassword,
      {
        userAgent,
        ipAddress,
      },
    );

    // Clear cookie since password change revokes all sessions
    res.clearCookie(JWT_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV !== "local",
      sameSite: "lax",
      domain:
        env.NODE_ENV === "prod"
          ? ".rfpnexa.com"
          : env.NODE_ENV === "uat"
            ? ".staging.rfpnexa.com"
            : undefined,
    });

    return sendOk(
      res,
      null,
      "Password changed successfully. Please log in again.",
    );
  },
);

export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || undefined;
  const sessions = await authService.getUserSessions(
    req.user!.userId,
    refreshToken,
  );
  return sendOk(res, sessions);
});

export const revokeSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await authService.revokeSessionById(req.user!.userId, id!);
    return sendOk(res, null, "Session revoked successfully");
  },
);

export const revokeAllSessions = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.revokeAllUserSessions(req.user!.userId);

    // Clear cookie as we invalidated the current token as well
    res.clearCookie(JWT_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV !== "local",
      sameSite: "lax",
      domain:
        env.NODE_ENV === "prod"
          ? ".rfpnexa.com"
          : env.NODE_ENV === "uat"
            ? ".staging.rfpnexa.com"
            : undefined,
    });

    return sendOk(res, null, "All sessions revoked successfully");
  },
);

export const getDevices = asyncHandler(async (req: Request, res: Response) => {
  const devices = await profileService.getDevices(req.user!.userId);
  return sendOk(res, devices);
});

export const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query["page"] as string) || "1", 10);
  const limit = parseInt((req.query["limit"] as string) || "20", 10);
  const result = await profileService.getActivity(
    req.user!.userId,
    page,
    limit,
  );
  return sendOk(res, result);
});

export const getSecurityHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt((req.query["page"] as string) || "1", 10);
    const limit = parseInt((req.query["limit"] as string) || "20", 10);
    const result = await profileService.getSecurityHistory(
      req.user!.userId,
      page,
      limit,
    );
    return sendOk(res, result);
  },
);

export const getTimeline = asyncHandler(async (req: Request, res: Response) => {
  const timeline = await profileService.getTimeline(req.user!.userId);
  return sendOk(res, timeline);
});

export const getSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const sub = await profileService.getSubscription(
      req.user!.userId,
      req.user!.accountType,
    );
    return sendOk(res, sub);
  },
);

export const getPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const prefs = await profileService.getPreferences(req.user!.userId);
    return sendOk(res, prefs);
  },
);

export const updatePreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const prefs = await profileService.updatePreferences(
      req.user!.userId,
      req.validated as any,
    );
    return sendOk(res, prefs, "Preferences updated successfully");
  },
);

export const requestChange = asyncHandler(
  async (req: Request, res: Response) => {
    const { field, value, reason } = req.validated as any;
    const ticket = await profileService.requestProfileChange(
      req.user!.userId,
      field,
      value,
      reason,
    );
    return sendOk(res, ticket, "Change request submitted successfully");
  },
);

export const deactivateAccount = asyncHandler(
  async (req: Request, res: Response) => {
    await profileService.deactivateAccount(req.user!.userId);

    // Clear session cookie
    res.clearCookie(JWT_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV !== "local",
      sameSite: "lax",
      domain:
        env.NODE_ENV === "prod"
          ? ".rfpnexa.com"
          : env.NODE_ENV === "uat"
            ? ".staging.rfpnexa.com"
            : undefined,
    });

    return sendOk(res, null, "Account deactivated successfully");
  },
);

export const reactivateAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await profileService.reactivateAccount(req.user!.userId);
    return sendOk(res, result, "Account reactivated successfully");
  },
);

export const deleteRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await profileService.requestDeleteAccount(req.user!.userId);
    return sendOk(res, result);
  },
);

export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.exportProfileData(req.user!.userId);
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=nexusbid_profile_export.json",
  );
  res.setHeader("Content-Type", "application/json");
  return res.json(data);
});
