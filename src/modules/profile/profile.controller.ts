import { env } from '../../config/env';
import { asyncHandler } from '../../core/asyncHandler';
import { JWT_COOKIE_NAME } from '../../core/constants';
import { sendOk } from '../../core/response';
import * as authService from '../auth/auth.service';

import * as profileService from './profile.service';

import type {
  ChangePasswordDto,
  PageLimitQueryDto,
  ProfileSessionIdParamDto,
  RequestChangeDto,
  UpdateAvatarDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './profile.dto';

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.user!.userId);
  return sendOk(res, profile);
});

export const updateProfile = asyncHandler<{}, {}, UpdateProfileDto>(async (req, res) => {
  const { name, country } = req.body;
  const updateData: { name?: string; country?: string } = {};
  if (name !== undefined) updateData.name = name;
  if (country !== undefined && country !== null) updateData.country = country;

  const updated = await profileService.updateProfile(req.user!.userId, updateData);
  return sendOk(res, updated, 'Profile updated successfully');
});

export const updateAvatar = asyncHandler<{}, {}, UpdateAvatarDto>(async (req, res) => {
  const { avatarUrl } = req.body;
  const updated = await profileService.updateAvatar(req.user!.userId, avatarUrl);
  return sendOk(res, updated, 'Avatar updated successfully');
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const updated = await profileService.removeAvatar(req.user!.userId);
  return sendOk(res, updated, 'Avatar removed successfully');
});

export const changePassword = asyncHandler<{}, {}, ChangePasswordDto>(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userAgent = req.headers['user-agent'] ?? null;
  const ipAddress = req.ip ?? null;

  await authService.changeUserPassword(req.user!.userId, currentPassword, newPassword, {
    userAgent,
    ipAddress,
  });

  // Clear cookie since password change revokes all sessions
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV !== 'local',
    sameSite: 'lax',
  });

  return sendOk(res, null, 'Password changed successfully. Please log in again.');
});

export const getSessions = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken ?? undefined;
  const sessions = await authService.getUserSessions(req.user!.userId, refreshToken);
  return sendOk(res, sessions);
});

export const revokeSession = asyncHandler<ProfileSessionIdParamDto>(async (req, res) => {
  const { id } = req.params;
  await authService.revokeSessionById(req.user!.userId, id);
  return sendOk(res, null, 'Session revoked successfully');
});

export const revokeAllSessions = asyncHandler(async (req, res) => {
  await authService.revokeAllUserSessions(req.user!.userId);

  // Clear cookie as we invalidated the current token as well
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV !== 'local',
    sameSite: 'lax',
  });

  return sendOk(res, null, 'All sessions revoked successfully');
});

export const getDevices = asyncHandler(async (req, res) => {
  const devices = await profileService.getDevices(req.user!.userId);
  return sendOk(res, devices);
});

export const getActivity = asyncHandler<{}, {}, {}, PageLimitQueryDto>(async (req, res) => {
  const { page, limit } = req.query;
  const result = await profileService.getActivity(req.user!.userId, page, limit);
  return sendOk(res, result);
});

export const getSecurityHistory = asyncHandler<{}, {}, {}, PageLimitQueryDto>(async (req, res) => {
  const { page, limit } = req.query;
  const result = await profileService.getSecurityHistory(req.user!.userId, page, limit);
  return sendOk(res, result);
});

export const getTimeline = asyncHandler(async (req, res) => {
  const timeline = await profileService.getTimeline(req.user!.userId);
  return sendOk(res, timeline);
});

export const getSubscription = asyncHandler(async (req, res) => {
  const sub = await profileService.getSubscription(req.user!.userId, req.user!.accountType);
  return sendOk(res, sub);
});

export const getPreferences = asyncHandler(async (req, res) => {
  const prefs = await profileService.getPreferences(req.user!.userId);
  return sendOk(res, prefs);
});

export const updatePreferences = asyncHandler<{}, {}, UpdatePreferencesDto>(async (req, res) => {
  const preferences: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) {
      preferences[key] = val;
    }
  }
  const prefs = await profileService.updatePreferences(req.user!.userId, preferences);
  return sendOk(res, prefs, 'Preferences updated successfully');
});

export const requestChange = asyncHandler<{}, {}, RequestChangeDto>(async (req, res) => {
  const { field, value, reason } = req.body;
  const ticket = await profileService.requestProfileChange(req.user!.userId, field, value, reason);
  return sendOk(res, ticket, 'Change request submitted successfully');
});

export const deactivateAccount = asyncHandler(async (req, res) => {
  await profileService.deactivateAccount(req.user!.userId);

  // Clear session cookie
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV !== 'local',
    sameSite: 'lax',
  });

  return sendOk(res, null, 'Account deactivated successfully');
});

export const reactivateAccount = asyncHandler(async (req, res) => {
  const result = await profileService.reactivateAccount(req.user!.userId);
  return sendOk(res, result, 'Account reactivated successfully');
});

export const deleteRequest = asyncHandler(async (req, res) => {
  const result = await profileService.requestDeleteAccount(req.user!.userId);
  return sendOk(res, result);
});

export const exportData = asyncHandler(async (req, res) => {
  const data = await profileService.exportProfileData(req.user!.userId);
  res.setHeader('Content-Disposition', 'attachment; filename=nexusbid_profile_export.json');
  res.setHeader('Content-Type', 'application/json');
  return res.json(data);
});
