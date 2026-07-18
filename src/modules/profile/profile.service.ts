import { AppDataSource } from '../../config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { AuditLog } from '../../database/entities/AuditLog';
import { Country } from '../../database/entities/Country';
import { SecurityLog } from '../../database/entities/SecurityLog';
import { Subscription } from '../../database/entities/Subscription';
import { SupportTicket } from '../../database/entities/SupportTicket';
import { SupportTicketMessage } from '../../database/entities/SupportTicketMessage';
import { User } from '../../database/entities/User';
import { UserDevice } from '../../database/entities/UserDevice';
import { UserSession } from '../../database/entities/UserSession';
import {
  AccountType,
  SecurityEvent,
  SubscriptionStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserStatus,
} from '../../types/enums';

const userRepo = AppDataSource.getRepository(User);
const sessionRepo = AppDataSource.getRepository(UserSession);
const deviceRepo = AppDataSource.getRepository(UserDevice);
const auditRepo = AppDataSource.getRepository(AuditLog);
const securityRepo = AppDataSource.getRepository(SecurityLog);
const subscriptionRepo = AppDataSource.getRepository(Subscription);

function sanitizeUserProfile(user: User) {
  const { passwordHash, tokenVersion, failedLoginAttempts, lockoutUntil, ...safe } = user;
  return safe;
}

export async function getProfile(userId: string) {
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ['userRoles', 'userRoles.role', 'userRoles.role.activeVersion'],
  });

  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const sanitized = sanitizeUserProfile(user);
  const roles = user.userRoles.map((ur) => ur.role.activeVersion?.name);
  // user.userRoles
  //   .map((ur) => {
  //     if (!ur.role) return '';
  //     if (ur.role.isSystemRole) return 'Super Admin';
  //     return ur.role.activeVersion?.name ?? '';
  //   })
  //   .filter(Boolean) ?? [];

  return {
    ...sanitized,
    roles,
  };
}

export async function updateProfile(userId: string, data: { name?: string; country?: string }) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  if (data.name !== undefined) user.name = data.name;
  if (data.country !== undefined) {
    const countryRepo = AppDataSource.getRepository(Country);
    const countryObj = await countryRepo.findOne({
      where: [{ id: data.country }, { name: data.country }, { code: data.country }],
    });
    if (!countryObj) {
      throw new AppError(
        'Country not found',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    user.country = countryObj;
  }

  await userRepo.save(user);

  await securityRepo.save(
    securityRepo.create({
      userId,
      email: user.email,
      event: SecurityEvent.PROFILE_UPDATED,
      details: { fields: Object.keys(data) },
    }),
  );

  return getProfile(userId);
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  user.avatarUrl = avatarUrl;
  await userRepo.save(user);

  return getProfile(userId);
}

export async function removeAvatar(userId: string) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  user.avatarUrl = null;
  await userRepo.save(user);

  return getProfile(userId);
}

export async function getDevices(userId: string) {
  return deviceRepo.find({
    where: { userId },
    order: { lastActiveAt: 'DESC' },
  });
}

export async function getActivity(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  const [activities, total] = await auditRepo.findAndCount({
    where: { actorId: userId },
    order: { createdAt: 'DESC' },
    skip,
    take: limit,
  });

  return { activities, total, page, limit };
}

export async function getSecurityHistory(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  const [logs, total] = await securityRepo.findAndCount({
    where: { userId },
    order: { createdAt: 'DESC' },
    skip,
    take: limit,
  });

  return { logs, total, page, limit };
}

export async function getTimeline(userId: string) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const timeline = [];

  // Account creation
  timeline.push({
    event: 'account_created',
    title: 'Account Created',
    timestamp: user.createdAt,
    description: 'Initial registration',
  });

  // Email verification status
  if (user.emailVerified) {
    timeline.push({
      event: 'email_verified',
      title: 'Email Verified',
      timestamp: user.createdAt, // fallback if verification date isn't stored
      description: 'Account activation completed',
    });
  }

  // Fetch security events for password resets and 2FA changes
  const securityLogs = await securityRepo.find({
    where: { userId },
    order: { createdAt: 'ASC' },
  });

  for (const log of securityLogs) {
    if (log.event === SecurityEvent.PASSWORD_CHANGED) {
      timeline.push({
        event: 'password_changed',
        title: 'Password Changed',
        timestamp: log.createdAt,
        description: 'Security credential updated',
      });
    } else if (log.event === SecurityEvent.TWO_FACTOR_ENABLED) {
      timeline.push({
        event: '2fa_enabled',
        title: 'Two-Factor Auth Enabled',
        timestamp: log.createdAt,
        description: 'Multi-factor security activated',
      });
    } else if (log.event === SecurityEvent.TWO_FACTOR_DISABLED) {
      timeline.push({
        event: '2fa_disabled',
        title: 'Two-Factor Auth Disabled',
        timestamp: log.createdAt,
        description: 'Multi-factor security removed',
      });
    }
  }

  // Fetch subscription purchases
  const subs = await subscriptionRepo.find({
    where: { userId },
    relations: ['plan', 'planVersion'],
    order: { createdAt: 'ASC' },
  });

  for (const sub of subs) {
    timeline.push({
      event: 'subscription_started',
      title: `Plan Activated: ${sub.planVersion.name}`,
      timestamp: sub.createdAt,
      description: `Access levels configured (Status: ${sub.status})`,
    });
  }

  // Sort timeline chronologically (latest first or earliest first - we do earliest first for progress timeline)
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return timeline;
}

export async function getSubscription(userId: string, accountType: AccountType) {
  if (accountType === AccountType.ADMIN) {
    throw new AppError(
      AppErrorMessage.SUBSCRIPTIONS_CUSTOMERS_ONLY,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.FORBIDDEN,
    );
  }

  const activeSub = await subscriptionRepo.findOne({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ['plan'],
    order: { createdAt: 'DESC' },
  });

  return activeSub ?? null;
}

export async function getPreferences(userId: string) {
  const user = await userRepo.findOne({
    where: { id: userId },
    select: ['id', 'notificationPreferences'],
  });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  return user.notificationPreferences;
}

export async function updatePreferences(
  userId: string,
  preferences: Partial<User['notificationPreferences']>,
) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  user.notificationPreferences = {
    ...user.notificationPreferences,
    ...preferences,
  };

  await userRepo.save(user);
  return user.notificationPreferences;
}

export async function requestProfileChange(
  userId: string,
  field: string,
  value: string,
  reason: string,
) {
  return AppDataSource.transaction(async (manager) => {
    const ticket = manager.create(SupportTicket, {
      userId,
      subject: `Profile Change Request: ${field}`,
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      category: TicketCategory.TECHNICAL,
    });
    const savedTicket = await manager.save(ticket);

    const message = manager.create(SupportTicketMessage, {
      ticketId: savedTicket.id,
      senderId: userId,
      message: `Requested update for field [${field}] to: [${value}]\nReason: ${reason}`,
      isInternal: false,
    });
    await manager.save(message);

    return savedTicket;
  });
}

export async function deactivateAccount(userId: string) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  user.status = UserStatus.DEACTIVATED;
  // Revoke all active sessions
  user.tokenVersion += 1;
  await userRepo.save(user);

  await sessionRepo.update({ userId }, { isRevoked: true });

  await securityRepo.save(
    securityRepo.create({
      userId,
      email: user.email,
      event: SecurityEvent.ACCOUNT_DEACTIVATED,
    }),
  );

  return { success: true };
}

export async function reactivateAccount(userId: string) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  if (user.status !== UserStatus.DEACTIVATED) {
    throw new AppError(
      AppErrorMessage.ACCOUNT_NOT_DEACTIVATED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.INVALID_STATUS,
    );
  }

  user.status = UserStatus.ACTIVE;
  await userRepo.save(user);

  await securityRepo.save(
    securityRepo.create({
      userId,
      email: user.email,
      event: SecurityEvent.ACCOUNT_REACTIVATED,
    }),
  );

  return { success: true };
}

export async function requestDeleteAccount(userId: string) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  // Create a support ticket for deletion
  await AppDataSource.transaction(async (manager) => {
    const ticket = manager.create(SupportTicket, {
      userId,
      subject: 'Account Deletion Request',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      category: TicketCategory.ACCOUNT,
    });
    const savedTicket = await manager.save(ticket);

    const message = manager.create(SupportTicketMessage, {
      ticketId: savedTicket.id,
      senderId: userId,
      message: `User ${user.name} (${user.email}) requested account deletion.`,
      isInternal: false,
    });
    await manager.save(message);
  });

  await securityRepo.save(
    securityRepo.create({
      userId,
      email: user.email,
      event: SecurityEvent.ACCOUNT_DELETE_REQUESTED,
    }),
  );

  return { success: true, message: 'Deletion request received and under review.' };
}

export async function exportProfileData(userId: string) {
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ['userRoles', 'userRoles.role', 'userRoles.role.activeVersion'],
  });

  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const sessions = await sessionRepo.find({ where: { userId } });
  const devices = await deviceRepo.find({ where: { userId } });
  const activities = await auditRepo.find({ where: { actorId: userId } });
  const securityLogs = await securityRepo.find({ where: { userId } });
  const subscription = await subscriptionRepo.find({
    where: { userId },
    relations: ['plan', 'planVersion'],
  });

  return {
    exportedAt: new Date(),
    profile: sanitizeUserProfile(user),
    roles: user.userRoles.map((ur) => ur.role.activeVersion?.name),
    // roles:
    //   user.userRoles
    //     .map((ur) => {
    //       if (ur.role) return '';
    //       if (ur.role.isSystemRole) return 'Super Admin';
    //       return ur.role.activeVersion?.name ?? '';
    //     })
    //     .filter(Boolean) ?? [],
    sessions: sessions.map((s) => ({
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
    })),
    devices: devices.map((d) => ({
      userAgent: d.userAgent,
      lastIpAddress: d.lastIpAddress,
      lastActiveAt: d.lastActiveAt,
    })),
    activities: activities.map((a) => ({
      action: a.action,
      details: { before: a.before, after: a.after },
      createdAt: a.createdAt,
    })),
    securityLogs: securityLogs.map((sl) => ({
      event: sl.event,
      ipAddress: sl.ipAddress,
      userAgent: sl.userAgent,
      createdAt: sl.createdAt,
    })),
    subscriptions: subscription.map((sub) => ({
      plan: sub.planVersion.name,
      status: sub.status,
      endDate: sub.endDate,
      createdAt: sub.createdAt,
    })),
  };
}
