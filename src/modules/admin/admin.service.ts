import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { In } from 'typeorm';

import { AppDataSource } from '../../config/database';
import { env } from '../../config/env';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { BCRYPT_ROUNDS } from '../../core/constants';
import { AuditLog } from '../../database/entities/AuditLog';
import { Category } from '../../database/entities/Category';
import { Country } from '../../database/entities/Country';
import { DownloadHistory } from '../../database/entities/DownloadHistory';
import { Permission } from '../../database/entities/Permission';
import { Plan } from '../../database/entities/Plan';
import { PlanVersion } from '../../database/entities/PlanVersion';
import { Role } from '../../database/entities/Role';
import { RoleVersionPermission } from '../../database/entities/RoleVersionPermission';
import { SecurityLog } from '../../database/entities/SecurityLog';
import { State } from '../../database/entities/State';
import { Subscription } from '../../database/entities/Subscription';
import { Tender } from '../../database/entities/Tender';
import { TenderVersion } from '../../database/entities/TenderVersion';
import { Transaction } from '../../database/entities/Transaction';
import { User } from '../../database/entities/User';
import { UserNote } from '../../database/entities/UserNote';
import { UserRole } from '../../database/entities/UserRole';
import { UserSession } from '../../database/entities/UserSession';
import { CacheService } from '../../services/cache.service';
import {
  sendAdminApprovalStatusEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../../services/email.service';
import { createEmailToken } from '../../services/token.service';
import {
  AccountType,
  EmailTokenType,
  PlanStatus,
  PlanVersionStatus,
  RoleStatus,
  SecurityEvent,
  SubscriptionStatus,
  TenderLifecycleStatus,
  TransactionStatus,
  UserStatus,
} from '../../types/enums';
import { generateSlug } from '../../utils/slug';

import type {
  AnalyticsQueryDto,
  AssignUserRolesBodyDto,
  BatchCategoriesResultDto,
  BatchCategoryItemDto,
  CategoryQueryDto,
  CategoryStatsDto,
  CreateAdminDto,
  CreateCategoryDto,
  CreatePlanDto,
  ListUsersQueryDto,
  RevenueAnalyticsResultDto,
  StateQueryDto,
  TopDownloadResultDto,
  UpdateCategoryDto,
  UpdateCountryBodyDto,
  UpdatePlanDto,
  UpdateStateDto,
  UpdateUserDetailDto,
  UserActivityDetailDto,
  UserDeviceDto,
  UserGrowthResultDto,
  UserNoteDetailDto,
  UserRolesDto,
  UserSecurityDto,
  UserSessionDto,
  UserStatsDto,
  UserSubscriptionOverviewDto,
  UserTimelineEvent,
} from './admin.dto';
import { UserPermissions } from '@/constants/permissions';
import { PermissionModule } from '@/database/entities/PermissionModule';

const userRepo = AppDataSource.getRepository(User);
const planRepo = AppDataSource.getRepository(Plan);
const subRepo = AppDataSource.getRepository(Subscription);
const txnRepo = AppDataSource.getRepository(Transaction);
const categoryRepo = AppDataSource.getRepository(Category);
const stateRepo = AppDataSource.getRepository(State);
const countryRepo = AppDataSource.getRepository(Country);
const tenderRepo = AppDataSource.getRepository(Tender);
const auditRepo = AppDataSource.getRepository(AuditLog);

// ─── User Management ──────────────────────────────────────────────────────────

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function listUsers(
  opts: Partial<ListUsersQueryDto> = {},
): Promise<{ users: User[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const qb = userRepo.createQueryBuilder('user');

  qb.select([
    'user.id',
    'user.name',
    'user.email',
    'user.accountType',
    'user.companyName',
    'user.country',
    'user.emailVerified',
    'user.isBlocked',
    'user.status',
    'user.createdAt',
    'user.lastLoginAt',
  ]);

  qb.leftJoinAndSelect('user.userRoles', 'userRole')
    .leftJoinAndSelect('userRole.role', 'role')
    .leftJoinAndSelect('role.activeVersion', 'activeVersion')
    .leftJoinAndSelect(
      'user.subscriptions',
      'subscription',
      'subscription.status = :activeStatus',
      { activeStatus: SubscriptionStatus.ACTIVE },
    )
    .leftJoinAndSelect('subscription.plan', 'plan');

  if (opts.search) {
    qb.andWhere(
      '(user.name ILIKE :search OR user.email ILIKE :search OR user.companyName ILIKE :search OR user.id::text = :exactSearch)',
      { search: `%${opts.search}%`, exactSearch: opts.search },
    );
  }

  if (opts.accountType) {
    qb.andWhere('user.accountType = :accountType', { accountType: opts.accountType });
  }

  if (opts.status) {
    if (opts.status === UserStatus.ACTIVE) {
      qb.andWhere(
        'user.status = :status AND user.emailVerified = true AND user.isBlocked = false',
        {
          status: UserStatus.ACTIVE,
        },
      );
    } else if (opts.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
      qb.andWhere('user.emailVerified = false');
    } else if (opts.status === UserStatus.PENDING_APPROVAL) {
      qb.andWhere('user.status = :status AND user.emailVerified = true', { status: opts.status });
    } else if (opts.status === UserStatus.SUSPENDED) {
      qb.andWhere('user.status = :status', { status: opts.status });
    } else if (opts.status === UserStatus.BLOCKED) {
      qb.andWhere('user.isBlocked = true');
    } else if (opts.status === UserStatus.ARCHIVED) {
      qb.andWhere('user.status = :status', { status: opts.status });
    }
  }

  if (opts.country) {
    qb.andWhere('user.country = :country', { country: opts.country });
  }

  if (opts.verified !== undefined) {
    qb.andWhere('user.emailVerified = :verified', { verified: opts.verified });
  }

  if (opts.dateFrom) {
    qb.andWhere('user.createdAt >= :dateFrom', { dateFrom: new Date(opts.dateFrom) });
  }

  if (opts.dateTo) {
    qb.andWhere('user.createdAt <= :dateTo', { dateTo: new Date(opts.dateTo) });
  }

  if (opts.planId) {
    qb.andWhere('plan.id = :planId', { planId: opts.planId });
  }

  if (opts.roleId) {
    qb.andWhere('role.id = :roleId', { roleId: opts.roleId });
  }

  if (opts.approvalStatus) {
    if (opts.approvalStatus === UserStatus.PENDING_APPROVAL) {
      qb.andWhere('user.status = :status AND user.emailVerified = true', {
        status: UserStatus.PENDING_APPROVAL,
      });
    } else if (opts.approvalStatus === UserStatus.APPROVED) {
      qb.andWhere('user.approvedAt IS NOT NULL');
    } else if (opts.approvalStatus === UserStatus.REJECTED_BY_ADMIN) {
      qb.andWhere('user.status = :status AND user.emailVerified = true', {
        status: UserStatus.REJECTED_BY_ADMIN,
      });
    }
  }

  qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

  const [users, total] = await qb.getManyAndCount();
  return { users, total };
}

export async function getUserById(id: string): Promise<User> {
  const user = await userRepo.findOne({
    where: { id },
    select: [
      'id',
      'name',
      'email',
      'accountType',
      'companyName',
      'country',
      'emailVerified',
      'isBlocked',
      'createdAt',
      'updatedAt',
    ],
  });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  return user;
}

export async function blockUser(id: string, isBlocked: boolean): Promise<User> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  user.isBlocked = isBlocked;
  if (isBlocked) {
    user.tokenVersion += 1;
  }
  return userRepo.save(user);
}

export async function suspendUser(id: string): Promise<User> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  user.status = UserStatus.SUSPENDED;
  user.tokenVersion += 1;
  return userRepo.save(user);
}

export async function unsuspendUser(id: string): Promise<User> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  user.status = UserStatus.ACTIVE;
  return userRepo.save(user);
}

export async function archiveUser(id: string): Promise<User> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  user.status = UserStatus.ARCHIVED;
  user.tokenVersion += 1;
  return userRepo.save(user);
}

export async function unarchiveUser(id: string): Promise<User> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  user.status = UserStatus.ACTIVE;
  return userRepo.save(user);
}

export async function forcePasswordChange(id: string): Promise<User> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  user.mustResetPassword = true;
  user.tokenVersion += 1;
  return userRepo.save(user);
}

export async function sendResetPasswordEmailAction(id: string): Promise<void> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  const rawToken = await createEmailToken(user.id, EmailTokenType.PASSWORD_RESET);
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });
}

export async function sendUserVerificationAction(id: string): Promise<void> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION);
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const sessionRepo = AppDataSource.getRepository(UserSession);
  const session = await sessionRepo.findOne({ where: { id: sessionId, userId } });
  if (!session)
    throw new AppError(
      AppErrorMessage.SESSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  session.isRevoked = true;
  await sessionRepo.save(session);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const sessionRepo = AppDataSource.getRepository(UserSession);
  await sessionRepo.update({ userId }, { isRevoked: true });
  const user = await userRepo.findOne({ where: { id: userId } });
  if (user) {
    user.tokenVersion += 1;
    await userRepo.save(user);
  }
}

export async function impersonateUser(
  userId: string,
  adminId: string,
  reason: string,
): Promise<{ token: string }> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  const admin = await userRepo.findOneOrFail({ where: { id: adminId } });

  const payload = {
    sub: user.id,
    userId: user.id,
    email: user.email,
    accountType: user.accountType,
    role: user.accountType,
    tokenVersion: user.tokenVersion,
    impersonatedBy: admin.email,
    impersonatorId: admin.id,
    reason,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
  return { token };
}

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function updateUserDetail(id: string, dto: UpdateUserDetailDto): Promise<User> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  if (dto.email && dto.email !== user.email) {
    const exists = await userRepo.findOne({ where: { email: dto.email } });
    if (exists && exists.id !== id) {
      throw new AppError(
        AppErrorMessage.EMAIL_IN_USE,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.EMAIL_TAKEN,
      );
    }
    user.email = dto.email;
  }

  if (dto.name !== undefined) user.name = dto.name;
  if (dto.companyName !== undefined && dto.companyName !== null) user.companyName = dto.companyName;
  if (dto.country !== undefined && dto.country !== null) {
    const countryObj = await countryRepo.findOne({
      where: [{ id: dto.country }, { name: dto.country }, { code: dto.country }],
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

  if (dto.status !== undefined) {
    user.status = dto.status;
    if (dto.status === 'suspended' || dto.status === 'archived') {
      user.tokenVersion += 1;
    }
  }

  if (dto.isBlocked !== undefined) {
    user.isBlocked = dto.isBlocked;
    if (dto.isBlocked) {
      user.tokenVersion += 1;
    }
  }

  return userRepo.save(user);
}

export async function getUserStats(): Promise<UserStatsDto> {
  const total = await userRepo.count();
  const active = await userRepo.count({
    where: { status: UserStatus.ACTIVE, emailVerified: true, isBlocked: false },
  });
  const inactive = await userRepo.count({
    where: { status: UserStatus.PENDING_EMAIL_VERIFICATION },
  });
  const suspended = await userRepo.count({ where: { status: UserStatus.SUSPENDED } });
  const admins = await userRepo.count({ where: { accountType: AccountType.ADMIN } });
  const customers = await userRepo.count({ where: { accountType: AccountType.USER } });
  const pendingVerification = await userRepo.count({ where: { emailVerified: false } });
  const pendingApprovalAdmins = await userRepo.count({
    where: { accountType: AccountType.ADMIN, status: UserStatus.PENDING_APPROVAL },
  });

  const subscribed = await userRepo
    .createQueryBuilder('user')
    .innerJoin('user.subscriptions', 'sub', "sub.status = 'active'")
    .getCount();

  const blocked = await userRepo.count({ where: { isBlocked: true } });

  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const onlineNow = await AppDataSource.getRepository(UserSession)
    .createQueryBuilder('session')
    .select('DISTINCT session.userId')
    .where(
      'session.expiresAt > :now AND session.isRevoked = false AND session.updatedAt >= :fiveMinsAgo',
      {
        now: new Date(),
        fiveMinsAgo,
      },
    )
    .getCount();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const newToday = await userRepo
    .createQueryBuilder('user')
    .where('user.createdAt >= :startOfToday', { startOfToday })
    .getCount();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newThisMonth = await userRepo
    .createQueryBuilder('user')
    .where('user.createdAt >= :startOfMonth', { startOfMonth })
    .getCount();

  return {
    total,
    active,
    inactive,
    suspended,
    admins,
    customers,
    pendingVerification,
    pendingApprovalAdmins,
    subscribed,
    blocked,
    onlineNow,
    newToday,
    newThisMonth,
  };
}

export async function getUserOverview(id: string) {
  const user = await userRepo.findOne({
    where: { id },
    relations: ['approvedBy'],
  });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  const notesCount = await AppDataSource.getRepository(UserNote).count({ where: { userId: id } });

  const createdTendersCount = await tenderRepo.count({ where: { createdById: id } });
  const downloadCount = await AppDataSource.getRepository(DownloadHistory).count({
    where: { userId: id },
  });
  const loginCount = await AppDataSource.getRepository(SecurityLog).count({
    where: { userId: id, event: SecurityEvent.USER_LOGIN },
  });

  const storageResult = await AppDataSource.getRepository(DownloadHistory)
    .createQueryBuilder('dl')
    .select('SUM(dl.fileSize)', 'totalSize')
    .where('dl.userId = :userId', { userId: id })
    .getRawOne();

  const storageUsedBytes = parseInt(storageResult?.totalSize ?? '0', 10);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    companyName: user.companyName,
    country: user.country,
    status: user.status,
    emailVerified: user.emailVerified,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    approvedBy: user.approvedBy
      ? { id: user.approvedBy.id, name: user.approvedBy.name, email: user.approvedBy.email }
      : null,
    approvedAt: user.approvedAt,
    rejectionReason: user.rejectionReason,
    notesCount,
    stats: {
      createdTendersCount,
      downloadCount,
      wonTendersCount: 0,
      lostTendersCount: 0,
      documentsCount: downloadCount,
      loginsCount: loginCount,
      storageUsedBytes,
    },
  };
}

export async function getUserSecurity(id: string): Promise<UserSecurityDto> {
  const user = await userRepo.findOne({ where: { id } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  return {
    emailVerified: user.emailVerified,
    twoFactorEnabled: false,
    passwordChangedAt: user.passwordChangedAt,
    failedLoginAttempts: user.failedLoginAttempts,
    lockoutUntil: user.lockoutUntil,
    mustResetPassword: user.mustResetPassword,
  };
}

export async function getUserSessions(id: string): Promise<UserSessionDto[]> {
  const sessions = await AppDataSource.getRepository(UserSession).find({
    where: { userId: id, isRevoked: false },
    order: { createdAt: 'DESC' },
  });
  return sessions.map((s) => ({
    id: s.id,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }));
}

export async function getUserDevices(id: string): Promise<UserDeviceDto[]> {
  const logs = await AppDataSource.getRepository(SecurityLog).find({
    where: { userId: id, event: SecurityEvent.USER_LOGIN },
    order: { createdAt: 'DESC' },
    take: 10,
  });
  return logs.map((l) => ({
    id: l.id,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    location:
      // l.location ??
      'Unknown',
    lastUsedAt: l.createdAt,
  }));
}

export async function getUserActivity(
  id: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ activities: UserActivityDetailDto[]; total: number }> {
  const skip = (page - 1) * limit;
  const qb = AppDataSource.getRepository(SecurityLog)
    .createQueryBuilder('log')
    .where('log.userId = :userId', { userId: id })
    .orderBy('log.createdAt', 'DESC')
    .skip(skip)
    .take(limit);

  const [logs, total] = await qb.getManyAndCount();
  const activities = logs.map((l) => ({
    id: l.id,
    event: l.event,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    details: l.details,
    timestamp: l.createdAt,
  }));
  return { activities, total };
}

export async function getUserTimeline(id: string): Promise<UserTimelineEvent[]> {
  const timeline: UserTimelineEvent[] = [];
  const user = await userRepo.findOneOrFail({ where: { id } });

  timeline.push({
    event: 'Created',
    timestamp: user.createdAt,
    description: 'Account registered successfully.',
  });

  if (user.emailVerified) {
    timeline.push({
      event: 'Verified',
      timestamp: user.emailChangedAt ?? user.createdAt,
      description: 'Email address verified.',
    });
  }

  const subs = await subRepo.find({
    where: { userId: id },
    relations: ['plan', 'planVersion'],
    order: { createdAt: 'ASC' },
  });
  for (const sub of subs) {
    const planName = sub.planVersion.name;
    timeline.push({
      event: 'Subscribed',
      timestamp: sub.createdAt,
      description: `Subscribed to ${planName} plan.`,
    });
  }

  const logs = await auditRepo.find({
    where: { entityType: 'user', entityId: id },
    order: { createdAt: 'ASC' },
  });
  for (const l of logs) {
    let description = l.action;
    if (l.action === UserPermissions.BLOCK.key) {
      description = l.after?.['isBlocked'] ? 'User account blocked.' : 'User account unblocked.';
    } else if (l.action === 'user.suspend') {
      description = 'User status changed to suspended.';
    } else if (l.action === 'user.archive') {
      description = 'User status changed to archived.';
    }
    timeline.push({ event: l.action, timestamp: l.createdAt, description });
  }

  return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function getUserAuditLogs(
  id: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ logs: AuditLog[]; total: number }> {
  const skip = (page - 1) * limit;
  const [logs, total] = await auditRepo.findAndCount({
    where: [{ actorId: id }, { entityType: 'user', entityId: id }],
    order: { createdAt: 'DESC' },
    skip,
    take: limit,
  });
  return { logs, total };
}

export async function getUserSubscription(id: string): Promise<UserSubscriptionOverviewDto> {
  const activeSub = await subRepo.findOne({
    where: { userId: id, status: SubscriptionStatus.ACTIVE },
    relations: ['plan', 'planVersion'],
    order: { createdAt: 'DESC' },
  });

  const txns = await txnRepo.find({
    where: { userId: id },
    order: { createdAt: 'DESC' },
  });

  return {
    activeSubscription: activeSub
      ? {
          id: activeSub.id,
          planName: activeSub.planVersion.name,
          status: activeSub.status,
          startedAt: activeSub.createdAt,
          expiresAt: activeSub.endDate,
        }
      : null,
    transactions: txns.map((t) => ({
      id: t.id,
      amountCents: t.amountCents,
      type: t.type,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
}

export async function getUserNotes(id: string): Promise<UserNoteDetailDto[]> {
  const notes = await AppDataSource.getRepository(UserNote).find({
    where: { userId: id },
    relations: ['admin'],
    order: { createdAt: 'DESC' },
  });
  return notes.map((n) => ({
    id: n.id,
    note: n.note,
    createdAt: n.createdAt,
    admin: n.admin ? { id: n.admin.id, name: n.admin.name, email: n.admin.email } : null,
  }));
}

export async function createUserNote(
  userId: string,
  adminId: string,
  note: string,
): Promise<UserNote> {
  const noteRepo = AppDataSource.getRepository(UserNote);
  const userNote = noteRepo.create({ userId, adminId, note });
  return noteRepo.save(userNote);
}

export async function createAdmin(dto: CreateAdminDto): Promise<User> {
  const exists = await userRepo.findOne({ where: { email: dto.email } });
  if (exists)
    throw new AppError(
      AppErrorMessage.EMAIL_REGISTERED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.EMAIL_TAKEN,
    );

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS.PASSWORD);

  // Validate assigned roles
  const roleRepo = AppDataSource.getRepository(Role);
  const roles = await roleRepo
    .createQueryBuilder('role')
    .where('role.id IN (:...roleIds)', { roleIds: dto.roleIds })
    .andWhere('role.isActive = true')
    .getMany();

  if (roles.length !== dto.roleIds.length) {
    throw new AppError(
      AppErrorMessage.ROLE_INVALID_OR_INACTIVE,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const saved = await AppDataSource.transaction(async (transactionManager) => {
    const admin = transactionManager.create(User, {
      name: dto.name,
      email: dto.email,
      passwordHash,
      accountType: AccountType.ADMIN,
      emailVerified: true,
    });

    const savedAdmin = await transactionManager.save(admin);

    const userRoles = roles.map((role) => {
      const ur = new UserRole();
      ur.userId = savedAdmin.id;
      ur.roleId = role.id;
      ur.assignedAt = new Date();
      return ur;
    });

    await transactionManager.save(UserRole, userRoles);
    return savedAdmin;
  });

  return saved;
}

// ─── Plan Management ──────────────────────────────────────────────────────────

export async function listAllPlans(): Promise<Plan[]> {
  return planRepo.find({
    relations: ['activeVersion'],
    order: { createdAt: 'DESC' },
  });
}

export async function createPlan(dto: CreatePlanDto, createdById?: string): Promise<Plan> {
  const plan = planRepo.create({
    status: dto.isActive ? PlanStatus.ACTIVE : PlanStatus.ARCHIVED,
  });
  const savedPlan = await planRepo.save(plan);

  const versionRepo = AppDataSource.getRepository(PlanVersion);
  const version = versionRepo.create({
    planId: savedPlan.id,
    version: 1,
    status: PlanVersionStatus.PUBLISHED,
    name: dto.name,
    subtitle: '',
    description: '',
    priceCents: dto.priceCents,
    currency: 'USD',
    durationDays: dto.durationDays,
    trialDays: dto.trialDays,
    setupFeeCents: 0,
    isRecurring: dto.isRecurring,
    isFeatured: false,
    planType: dto.planType,
    targetStateId: dto.targetStateId ?? null,
    targetCountry: dto.targetCountry ?? null,
    targetCategoryId: dto.targetCategoryId ?? null,
    bundleSize: dto.bundleSize ?? null,
    createdBy: createdById ?? null,
  });
  await versionRepo.save(version);

  savedPlan.activeVersionId = version.id;
  savedPlan.activeVersion = version;
  return planRepo.save(savedPlan);
}

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
  const plan = await planRepo.findOne({ where: { id }, relations: ['activeVersion'] });
  if (!plan)
    throw new AppError(
      AppErrorMessage.PLAN_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  if (plan.activeVersion) {
    const activeVer = plan.activeVersion;
    if (dto.name !== undefined) activeVer.name = dto.name;
    if (dto.priceCents !== undefined) activeVer.priceCents = dto.priceCents;
    if (dto.durationDays !== undefined) activeVer.durationDays = dto.durationDays;
    if (dto.trialDays !== undefined) activeVer.trialDays = dto.trialDays;
    if (dto.isRecurring !== undefined) activeVer.isRecurring = dto.isRecurring;
    if (dto.planType !== undefined) activeVer.planType = dto.planType;
    if (dto.targetStateId !== undefined) activeVer.targetStateId = dto.targetStateId ?? null;
    if (dto.targetCountry !== undefined) activeVer.targetCountry = dto.targetCountry ?? null;
    if (dto.targetCategoryId !== undefined)
      activeVer.targetCategoryId = dto.targetCategoryId ?? null;
    if (dto.bundleSize !== undefined) activeVer.bundleSize = dto.bundleSize ?? null;
    await AppDataSource.getRepository(PlanVersion).save(activeVer);
  }

  if (dto.isActive !== undefined) {
    plan.status = dto.isActive ? PlanStatus.ACTIVE : PlanStatus.ARCHIVED;
  }
  return planRepo.save(plan);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getRevenueAnalytics(
  dto: AnalyticsQueryDto,
): Promise<RevenueAnalyticsResultDto[]> {
  const format = dto.groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

  const qb = txnRepo
    .createQueryBuilder('txn')
    .select(`TO_CHAR(txn.created_at, '${format}')`, 'period')
    .addSelect('SUM(txn.amount_cents)', 'totalCents')
    .addSelect('COUNT(txn.id)', 'count')
    .where('txn.status = :status', { status: TransactionStatus.SUCCESS })
    .groupBy('period')
    .orderBy('period', 'ASC');

  if (dto.from) qb.andWhere('txn.created_at >= :from', { from: new Date(dto.from) });
  if (dto.to) qb.andWhere('txn.created_at <= :to', { to: new Date(dto.to) });

  return qb.getRawMany();
}

export async function getTopDownloads(): Promise<TopDownloadResultDto[]> {
  return AppDataSource.query(`
    SELECT
      t.id,
      t.title,
      t.slug,
      COUNT(dh.id)::int AS download_count
    FROM tenders t
    LEFT JOIN download_history dh ON dh.tender_id = t.id
    GROUP BY t.id, t.title, t.slug
    ORDER BY download_count DESC
    LIMIT 10
  `);
}

export async function getUserGrowth(dto: AnalyticsQueryDto): Promise<UserGrowthResultDto[]> {
  const format = dto.groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

  const qb = userRepo
    .createQueryBuilder('user')
    .select(`TO_CHAR(user.created_at, '${format}')`, 'period')
    .addSelect('COUNT(user.id)', 'count')
    .groupBy('period')
    .orderBy('period', 'ASC');

  if (dto.from) qb.andWhere('user.created_at >= :from', { from: new Date(dto.from) });
  if (dto.to) qb.andWhere('user.created_at <= :to', { to: new Date(dto.to) });

  return qb.getRawMany();
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function listAllSubscriptions(opts: {
  page: number;
  limit: number;
}): Promise<{ subscriptions: Subscription[]; total: number }> {
  const [subscriptions, total] = await subRepo.findAndCount({
    relations: ['user', 'plan'],
    order: { createdAt: 'DESC' },
    skip: (opts.page - 1) * opts.limit,
    take: opts.limit,
  });
  return { subscriptions, total };
}

// ─── Category Management ──────────────────────────────────────────────────────

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function listAllCategories(
  query: Partial<CategoryQueryDto> = {},
): Promise<{ categories: Category[]; total: number }> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  const qb = categoryRepo
    .createQueryBuilder('category')
    .leftJoinAndSelect('category.createdBy', 'creator')
    .orderBy('category.code', 'ASC');

  if (query.status === 'ARCHIVED') {
    qb.withDeleted().andWhere('category.deleted_at IS NOT NULL');
  } else {
    qb.andWhere('category.deleted_at IS NULL');
    if (query.status === 'ACTIVE') {
      qb.andWhere('category.isActive = :isActive', { isActive: true });
    } else if (query.status === 'INACTIVE') {
      qb.andWhere('category.isActive = :isActive', { isActive: false });
    }
  }

  if (query.code !== undefined && query.code !== '') {
    qb.andWhere('category.code = :code', { code: query.code });
  }

  if (query.slug !== undefined && query.slug !== '') {
    qb.andWhere('category.slug = :slug', { slug: query.slug });
  }

  if (query.createdBy !== undefined) {
    qb.andWhere('category.createdBy = :createdBy', { createdBy: query.createdBy });
  }

  if (query.dateFrom !== undefined) {
    qb.andWhere('category.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
  }

  if (query.dateTo !== undefined) {
    qb.andWhere('category.createdAt <= :dateTo', {
      dateTo: new Date(`${query.dateTo}T23:59:59.999Z`),
    });
  }

  if (query.search !== undefined && query.search !== '') {
    const searchPattern = `%${query.search}%`;
    qb.andWhere('(category.name ILIKE :search OR category.code ILIKE :search)', {
      search: searchPattern,
    });
  }

  if (query.unusedOnly) {
    qb.having('COALESCE(COUNT(tender.id), 0) = 0');
  }

  // Count subquery to match filters
  const countQb = categoryRepo.createQueryBuilder('category');
  if (query.status === 'ARCHIVED') {
    countQb.withDeleted().andWhere('category.deleted_at IS NOT NULL');
  } else {
    countQb.andWhere('category.deleted_at IS NULL');
    if (query.status === 'ACTIVE') {
      countQb.andWhere('category.isActive = :isActive', { isActive: true });
    } else if (query.status === 'INACTIVE') {
      countQb.andWhere('category.isActive = :isActive', { isActive: false });
    }
  }
  if (query.code) countQb.andWhere('category.code = :code', { code: query.code });
  if (query.slug) countQb.andWhere('category.slug = :slug', { slug: query.slug });
  if (query.createdBy)
    countQb.andWhere('category.createdBy = :createdBy', { createdBy: query.createdBy });
  if (query.dateFrom)
    countQb.andWhere('category.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
  if (query.dateTo)
    countQb.andWhere('category.createdAt <= :dateTo', {
      dateTo: new Date(`${query.dateTo}T23:59:59.999Z`),
    });
  if (query.search) {
    const searchPattern = `%${query.search}%`;
    countQb.andWhere('(category.name ILIKE :search OR category.code ILIKE :search)', {
      search: searchPattern,
    });
  }
  if (query.unusedOnly) {
    countQb.andWhere((qb) => {
      const subQuery = qb
        .subQuery()
        .select('tv.category_id')
        .from('tender_versions', 'tv')
        .getQuery();
      return `category.id NOT IN ${subQuery}`;
    });
  }

  const total = await countQb.getCount();

  qb.offset(skip).limit(limit);
  const categories = await qb.getMany();

  return { categories, total };
}

export async function getCategoryStats(): Promise<CategoryStatsDto> {
  const total = await categoryRepo.count({ withDeleted: true });
  const active = await categoryRepo.count({ where: { isActive: true, isDeleted: false } });
  const inactive = await categoryRepo.count({ where: { isActive: false, isDeleted: false } });
  const archived = await categoryRepo.count({ where: { isDeleted: true }, withDeleted: true });

  const tendersCountResult = await tenderRepo
    .createQueryBuilder('tender')
    .innerJoin('tender.activeVersion', 'activeVersion')
    .select('COUNT(DISTINCT activeVersion.categoryId)', 'cnt')
    .getRawOne();
  const tendersCount = parseInt(tendersCountResult?.cnt ?? '0', 10);

  return { total, active, inactive, archived, tendersCount };
}

export async function getCategoryHistory(id: string): Promise<AuditLog[]> {
  return await auditRepo.find({
    where: { entityType: 'category', entityId: id },
    order: { createdAt: 'DESC' },
  });
}

export async function getCategoryById(id: string): Promise<Category> {
  const category = await categoryRepo.findOne({ where: { id } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  return category;
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const exists = await categoryRepo.findOne({ where: { slug } });
    if (!exists) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function createCategory(dto: CreateCategoryDto, adminId?: string): Promise<Category> {
  let { code } = dto;
  if (!code) {
    const maxCategory = await categoryRepo.findOne({
      where: {},
      order: { code: 'DESC' },
      withDeleted: true,
    });
    const maxVal = maxCategory ? parseInt(maxCategory.code, 10) : 0;
    code = String(maxVal + 1).padStart(3, '0');
  }

  let { slug } = dto;
  slug ??= await generateUniqueSlug(dto.name);

  const existingCode = await categoryRepo.findOne({ where: { code }, withDeleted: true });
  if (existingCode) {
    throw new AppError(
      AppErrorMessage.CATEGORY_CODE_EXISTS,
      HttpStatusCode.CONFLICT,
      AppErrorCode.CATEGORY_CODE_TAKEN,
    );
  }
  const existingSlug = await categoryRepo.findOne({ where: { slug }, withDeleted: true });
  if (existingSlug) {
    throw new AppError(
      AppErrorMessage.CATEGORY_SLUG_EXISTS,
      HttpStatusCode.CONFLICT,
      AppErrorCode.CATEGORY_SLUG_TAKEN,
    );
  }

  const category = categoryRepo.create({
    code,
    name: dto.name,
    slug,
    description: dto.description ?? null,
    isActive: dto.isActive ?? true,
    createdBy: adminId as string,
    updatedBy: adminId ?? null,
    isDeleted: false,
  });

  let retries = 3;

  while (retries > 0) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await categoryRepo.save(category);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === '23505') {
        const detail = err.detail ?? '';
        if (detail.includes('code')) {
          throw new AppError(
            AppErrorMessage.CATEGORY_CODE_EXISTS,
            HttpStatusCode.CONFLICT,
            AppErrorCode.CATEGORY_CODE_TAKEN,
          );
        }
        if (detail.includes('slug')) {
          if (dto.slug) {
            throw new AppError(
              AppErrorMessage.CATEGORY_SLUG_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          category.slug = await generateUniqueSlug(dto.name);
          retries--;
          continue;
        }
      }
      throw err;
    }
  }
  throw new AppError(
    AppErrorMessage.SLUG_GENERATION_FAILED,
    HttpStatusCode.CONFLICT,
    AppErrorCode.CATEGORY_SLUG_CONFLICT,
  );
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function updateCategory(
  id: string,
  dto: UpdateCategoryDto,
  adminId?: string,
): Promise<Category> {
  const category = await categoryRepo.findOne({ where: { id } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  let { slug } = dto;
  if (dto.name && !slug && dto.name !== category.name) {
    slug = await generateUniqueSlug(dto.name);
  }

  const updates: Partial<Category> = {};
  if (dto.code !== undefined) updates.code = dto.code;
  if (dto.name !== undefined) updates.name = dto.name;
  if (slug !== undefined) updates.slug = slug;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.isActive !== undefined) updates.isActive = dto.isActive;
  if (adminId !== undefined) updates.updatedBy = adminId;

  if (updates.code && updates.code !== category.code) {
    const existingCode = await categoryRepo.findOne({
      where: { code: updates.code },
      withDeleted: true,
    });
    if (existingCode) {
      throw new AppError(
        AppErrorMessage.CATEGORY_CODE_EXISTS,
        HttpStatusCode.CONFLICT,
        AppErrorCode.CATEGORY_CODE_TAKEN,
      );
    }
  }
  if (updates.slug && updates.slug !== category.slug) {
    const existingSlug = await categoryRepo.findOne({
      where: { slug: updates.slug },
      withDeleted: true,
    });
    if (existingSlug) {
      throw new AppError(
        AppErrorMessage.CATEGORY_SLUG_EXISTS,
        HttpStatusCode.CONFLICT,
        AppErrorCode.CATEGORY_SLUG_TAKEN,
      );
    }
  }

  Object.assign(category, updates);

  let retries = 3;
  while (retries > 0) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await categoryRepo.save(category);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === '23505') {
        const detail = err.detail ?? '';
        if (detail.includes('code')) {
          throw new AppError(
            AppErrorMessage.CATEGORY_CODE_EXISTS,
            HttpStatusCode.CONFLICT,
            AppErrorCode.CATEGORY_CODE_TAKEN,
          );
        }
        if (detail.includes('slug')) {
          if (dto.slug) {
            throw new AppError(
              AppErrorMessage.CATEGORY_SLUG_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          category.slug = await generateUniqueSlug(category.name);
          retries--;
          continue;
        }
      }
      throw err;
    }
  }
  throw new AppError(
    AppErrorMessage.SLUG_GENERATION_FAILED,
    HttpStatusCode.CONFLICT,
    AppErrorCode.CATEGORY_SLUG_CONFLICT,
  );
}

export async function deleteCategory(id: string, adminId?: string): Promise<void> {
  const category = await categoryRepo.findOne({
    where: { id },
    relations: ['tenders', 'tenders.tender'],
  });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const hasActiveTenders = category.tenders.some(
    (tv) => tv.tender.status === TenderLifecycleStatus.ACTIVE,
  );
  if (hasActiveTenders) {
    throw new AppError(
      AppErrorMessage.CATEGORY_DELETE_ASSOCIATED_TENDERS,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.CATEGORY_HAS_TENDERS,
    );
  }

  category.isDeleted = true;
  if (adminId) {
    category.updatedBy = adminId;
  }
  await categoryRepo.softRemove(category);
}

export async function processBatchCategories(
  items: BatchCategoryItemDto[],
  adminId?: string,
): Promise<BatchCategoriesResultDto> {
  // eslint-disable-next-line sonarjs/cognitive-complexity, complexity
  return await AppDataSource.transaction(async (transactionalEntityManager) => {
    const categoryTxRepo = transactionalEntityManager.getRepository(Category);
    // const tenderTxRepo = transactionalEntityManager.getRepository(Tender);

    // 1. Fetch all existing categories (including soft-deleted ones)
    const allCategories = await categoryTxRepo.find({ withDeleted: true });

    // 2. Build lookups
    const codeMap = new Map<string, Category>(allCategories.map((c) => [c.code, c]));
    const slugSet = new Set<string>(allCategories.map((c) => c.slug));

    const categoriesToSave: Category[] = [];
    const categoriesToDelete: Category[] = [];

    let created = 0;
    let updated = 0;
    // let deleted = 0;

    // 3. Process items in-memory
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) {
        continue;
      }

      if (item.action === 'delete') {
        const category = codeMap.get(item.code);
        if (category) {
          category.isDeleted = true;
          if (adminId) {
            category.updatedBy = adminId;
          }
          categoriesToDelete.push(category);
          // deleted++;
        }
        continue;
      }

      // Upsert action
      const name = item.name!;
      const category = codeMap.get(item.code);

      if (category) {
        // Update existing (including soft-deleted)
        category.name = name;
        category.isDeleted = false;
        if (item.description !== undefined) category.description = item.description;
        if (item.isActive !== undefined) category.isActive = item.isActive;
        if (adminId) {
          category.updatedBy = adminId;
        }

        if (item.slug) {
          if (item.slug !== category.slug && slugSet.has(item.slug)) {
            throw new AppError(
              AppErrorMessage.SLUG_CONFLICT_BATCH(i + 1, item.code, item.slug),
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          slugSet.delete(category.slug);
          category.slug = item.slug;
          slugSet.add(item.slug);
        } else {
          // Regenerate slug from name if no explicit slug provided
          slugSet.delete(category.slug);
          const baseSlug = generateSlug(name);
          let slug = baseSlug;
          let counter = 1;
          while (slugSet.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          category.slug = slug;
          slugSet.add(slug);
        }

        // Restore if it was soft-deleted
        if (category.deletedAt) {
          category.deletedAt = null;
        }

        categoriesToSave.push(category);
        updated++;
      } else {
        // Insert new category
        const newCategory = new Category();
        newCategory.code = item.code;
        newCategory.name = name;
        newCategory.description = item.description ?? null;
        newCategory.isActive = item.isActive ?? true;
        newCategory.isDeleted = false;
        if (adminId) {
          newCategory.createdBy = adminId;
          newCategory.updatedBy = adminId;
        }

        if (item.slug) {
          if (slugSet.has(item.slug)) {
            throw new AppError(
              AppErrorMessage.SLUG_CONFLICT_BATCH(i + 1, item.code, item.slug),
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          newCategory.slug = item.slug;
          slugSet.add(item.slug);
        } else {
          const baseSlug = generateSlug(name);
          let slug = baseSlug;
          let counter = 1;
          while (slugSet.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          newCategory.slug = slug;
          slugSet.add(slug);
        }

        categoriesToSave.push(newCategory);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        codeMap.set(item?.code, newCategory); // prevent internal duplicate code issue
        created++;
      }
    }

    // 4. Batch delete validations & actions
    if (categoriesToDelete.length > 0) {
      const deleteIds = categoriesToDelete.map((c) => c.id);

      // Check for associated tenders
      const tenderVersions = await transactionalEntityManager.getRepository(TenderVersion).find({
        where: { categoryId: In(deleteIds) },
        relations: ['category'],
      });

      if (tenderVersions.length > 0) {
        const failedCodes = Array.from(
          new Set(tenderVersions.map((t) => t.category.code).filter(Boolean)),
        );
        throw new AppError(
          AppErrorMessage.CATEGORY_DELETE_TENDERS_ASSOCIATED(failedCodes.join(', ')),
          HttpStatusCode.BAD_REQUEST,
          AppErrorCode.CATEGORY_HAS_TENDERS,
        );
      }

      // Bulk soft delete using softRemove
      await categoryTxRepo.softRemove(categoriesToDelete);
    }

    // 5. Bulk save inserts & updates
    if (categoriesToSave.length > 0) {
      try {
        await categoryTxRepo.save(categoriesToSave);
      } catch (err: unknown) {
        const error = err as { code: string; detail?: string };
        if (error.code === '23505') {
          const detail = error.detail ?? '';
          if (detail.includes('code')) {
            throw new AppError(
              AppErrorMessage.CATEGORY_CODE_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_CODE_TAKEN,
            );
          }
          if (detail.includes('slug')) {
            throw new AppError(
              AppErrorMessage.CATEGORY_SLUG_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
        }
        throw err;
      }
    }

    return { created, updated, deleted: categoriesToDelete.length };
  });
}

// ─── State Management ──────────────────────────────────────────────────────────

export async function listAllStates(
  query: Partial<StateQueryDto> = {},
): Promise<{ states: State[]; total: number }> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  const qb = stateRepo.createQueryBuilder('state').leftJoinAndSelect('state.country', 'country');

  if (query.code !== undefined && query.code !== '') {
    qb.andWhere('state.code = :code', { code: query.code });
  }

  if (query.slug !== undefined && query.slug !== '') {
    qb.andWhere('state.slug = :slug', { slug: query.slug });
  }

  if (query.type !== undefined) {
    qb.andWhere('state.type = :type', { type: query.type });
  }

  if (query.countryId !== undefined) {
    qb.andWhere('state.countryId = :countryId', { countryId: query.countryId });
  }

  if (query.countryCode !== undefined && query.countryCode !== '') {
    qb.andWhere('country.code = :countryCode', { countryCode: query.countryCode.toUpperCase() });
  }

  if (query.search !== undefined && query.search !== '') {
    const searchPattern = `%${query.search}%`;
    qb.andWhere(
      '(state.name ILike :pattern OR state.code ILike :pattern OR country.name ILike :pattern OR country.code ILike :pattern)',
      { pattern: searchPattern },
    );
  }

  qb.orderBy('state.code', 'ASC').skip(skip).take(limit);

  const [states, total] = await qb.getManyAndCount();
  return { states, total };
}

export async function listDistinctCountries(): Promise<string[]> {
  const result = await countryRepo.find({
    select: ['code'],
    order: { code: 'ASC' },
  });
  return result.map((c) => c.code);
}

export async function getStateById(id: string): Promise<State> {
  const state = await stateRepo.findOne({ where: { id }, relations: ['country'] });
  if (!state) {
    throw new AppError(
      AppErrorMessage.STATE_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  return state;
}

export async function getCountryById(id: string): Promise<Country> {
  const country = await countryRepo.findOne({ where: { id } });
  if (!country) {
    throw new AppError(
      AppErrorMessage.COUNTRY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  return country;
}

export async function updateState(
  id: string,
  dto: UpdateStateDto,
  adminId?: string,
): Promise<State> {
  const state = await getStateById(id);
  state.isActive = dto.isActive;
  if (adminId) {
    state.updatedById = adminId;
  }
  return await stateRepo.save(state);
}

export async function updateCountry(
  id: string,
  dto: UpdateCountryBodyDto,
  adminId?: string,
): Promise<Country> {
  const country = await getCountryById(id);
  country.isActive = dto.isActive;
  if (adminId) {
    country.updatedById = adminId;
  }
  return await countryRepo.save(country);
}

// ─── RBAC Admin User Role Assignment & Previews ───────────────────────────────

export async function getUserRoles(userId: string): Promise<UserRolesDto> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  if (user.accountType !== AccountType.ADMIN) {
    throw new AppError(
      AppErrorMessage.ROLES_MANAGED_FOR_ADMIN_ONLY,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const roleRepo = AppDataSource.getRepository(Role);
  const userRoleRepo = AppDataSource.getRepository(UserRole);

  const assigned = await userRoleRepo.find({
    where: { userId },
    relations: ['role', 'role.activeVersion'],
  });

  const available = await roleRepo.find({
    where: { status: RoleStatus.ACTIVE },
    relations: ['activeVersion'],
  });

  return {
    assigned: assigned.map((ur) => ({
      id: ur.role.id,
      name: ur.role.activeVersion?.name ?? 'Unnamed Role',
      key: ur.role.key,
      expiresAt: ur.expiresAt,
      isSystemRole: ur.role.isSystemRole,
    })),
    available: available.map((r) => ({
      id: r.id,
      name: r.activeVersion?.name ?? 'Unnamed Role',
      key: r.key,
      isSystemRole: r.isSystemRole,
    })),
  };
}

export async function assignUserRoles(
  userId: string,
  dto: AssignUserRolesBodyDto,
  currentUserId: string,
): Promise<void> {
  const { assignments } = dto;
  if (userId === currentUserId) {
    throw new AppError(
      AppErrorMessage.ROLE_SELF_MODIFICATION_FORBIDDEN,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.SELF_MODIFICATION_FORBIDDEN,
    );
  }

  if (assignments.length === 0) {
    throw new AppError(
      AppErrorMessage.ADMIN_ROLE_MUTATION_REJECTED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  if (user.accountType !== AccountType.ADMIN) {
    throw new AppError(
      AppErrorMessage.ROLES_ASSIGNED_TO_ADMIN_ONLY,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const roleRepo = AppDataSource.getRepository(Role);
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleIds = assignments.map((a) => a.roleId);

  // Validate all roles are active
  const roles = await roleRepo
    .createQueryBuilder('role')
    .where('role.id IN (:...roleIds)', { roleIds })
    .andWhere("role.status = 'ACTIVE'")
    .getMany();

  if (roles.length !== roleIds.length) {
    throw new AppError(
      AppErrorMessage.ROLES_ASSIGNED_INVALID_OR_INACTIVE,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  // Privilege Escalation Check: Compare against current user's max priority
  // const currentUserRoles = await userRoleRepo.find({
  //   where: { userId: currentUserId },
  //   relations: ['role'],
  // });
  // const currentMaxPriority = currentUserRoles.reduce((max, ur) => {
  //   return ur.role && ur.role.isActive ? Math.max(max, ur.role.priority ?? 0) : max;
  // }, 0);

  // for (const role of roles) {
  //   if (role.priority > currentMaxPriority) {
  //     throw new AppError('Forbidden: Cannot assign roles with a priority higher
  //        than your own highest role priority.', 403, 'PRIVILEGE_ESCALATION');
  //   }
  // }

  const targetUserRoles = await userRoleRepo.find({
    where: { userId },
    relations: ['role'],
  });
  // for (const ur of targetUserRoles) {
  //   if (ur.role && ur.role.priority > currentMaxPriority) {
  //     throw new AppError('Forbidden: Cannot modify roles of an administrator
  //      with a higher role priority than your own.', 403,
  //      'PRIVILEGE_ESCALATION');
  //   }
  // }

  // Last Super Admin Protection
  const superAdminRole = await roleRepo.findOne({ where: { key: 'super-admin' } });
  if (superAdminRole) {
    const targetHasSuperAdmin = targetUserRoles.some((ur) => ur.roleId === superAdminRole.id);
    const newHasSuperAdmin = roleIds.includes(superAdminRole.id);

    if (targetHasSuperAdmin && !newHasSuperAdmin) {
      const otherSuperAdminsCount = await userRoleRepo.count({
        where: {
          roleId: superAdminRole.id,
          userId: In(
            await userRepo
              .find({
                where: { accountType: AccountType.ADMIN, isBlocked: false },
                select: ['id'],
              })
              .then((users) => users.map((u) => u.id).filter((id) => id !== userId)),
          ),
        },
      });

      if (otherSuperAdminsCount === 0) {
        throw new AppError(
          AppErrorMessage.FORBIDDEN_REVOKE_LAST_SUPER_ADMIN,
          HttpStatusCode.FORBIDDEN,
          AppErrorCode.LAST_SUPER_ADMIN_PROTECTION,
        );
      }
    }
  }

  await AppDataSource.transaction(async (transactionManager) => {
    // Delete existing roles
    await transactionManager.query('DELETE FROM "user_roles" WHERE "user_id" = $1', [userId]);

    const userRoles = assignments.map((a) => {
      const ur = new UserRole();
      ur.userId = userId;
      ur.roleId = a.roleId;
      ur.expiresAt = a.expiresAt ? new Date(a.expiresAt) : null;
      return ur;
    });

    await transactionManager.save(UserRole, userRoles);
  });

  // Invalidate permissions cache
  CacheService.invalidateBackground(`permissions:${userId}`);
}

export async function revokeUserRole(
  userId: string,
  roleId: string,
  currentUserId: string,
): Promise<void> {
  if (userId === currentUserId) {
    throw new AppError(
      AppErrorMessage.ROLE_SELF_MODIFICATION_FORBIDDEN,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.SELF_MODIFICATION_FORBIDDEN,
    );
  }

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const activeRolesCount = await userRoleRepo.count({ where: { userId } });

  if (activeRolesCount <= 1) {
    throw new AppError(
      AppErrorMessage.ADMIN_ROLE_REVOCATION_REJECTED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.REVOCATION_REJECTED,
    );
  }

  const roleToRevoke = await roleRepo.findOne({ where: { id: roleId } });
  if (!roleToRevoke) {
    throw new AppError(
      AppErrorMessage.ROLE_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.ROLE_NOT_FOUND,
    );
  }

  // Privilege Escalation Check
  // const currentUserRoles = await userRoleRepo.find({
  //   where: { userId: currentUserId },
  //   relations: ['role'],
  // });
  // const currentMaxPriority = currentUserRoles.reduce((max, ur) => {
  //   return ur.role && ur.role.isActive ? Math.max(max, ur.role.priority ?? 0) : max;
  // }, 0);

  // if (roleToRevoke.priority > currentMaxPriority) {
  //   throw new AppError('Forbidden: Cannot revoke roles with a priority higher
  //  than your own highest role priority.', 403, 'PRIVILEGE_ESCALATION');
  // }

  // const targetUserRoles = await userRoleRepo.find({
  //   where: { userId },
  //   relations: ['role'],
  // });
  // for (const ur of targetUserRoles) {
  //   if (ur.role && ur.role.priority > currentMaxPriority) {
  //     throw new AppError('Forbidden: Cannot modify roles of an administrator
  //      with a higher role priority than your own.', 403,
  //      'PRIVILEGE_ESCALATION');
  //   }
  // }

  // Last Super Admin Protection
  if (roleToRevoke.key === 'super-admin') {
    const otherSuperAdminsCount = await userRoleRepo.count({
      where: {
        roleId: roleToRevoke.id,
        userId: In(
          await userRepo
            .find({
              where: { accountType: AccountType.ADMIN, isBlocked: false },
              select: ['id'],
            })
            .then((users) => users.map((u) => u.id).filter((id) => id !== userId)),
        ),
      },
    });

    if (otherSuperAdminsCount === 0) {
      throw new AppError(
        AppErrorMessage.FORBIDDEN_REVOKE_LAST_SUPER_ADMIN,
        HttpStatusCode.FORBIDDEN,
        AppErrorCode.LAST_SUPER_ADMIN_PROTECTION,
      );
    }
  }

  await userRoleRepo.delete({ userId, roleId });

  // Invalidate permissions cache
  CacheService.invalidateBackground(`permissions:${userId}`);
}

export async function previewUserPermissions(userId: string) {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const userRoles = await userRoleRepo.find({
    where: { userId },
    relations: ['role', 'role.activeVersion'],
  });

  const activeUserRoles = userRoles.filter((ur) => {
    if (ur.role.status !== RoleStatus.ACTIVE) return false;
    if (ur.expiresAt && ur.expiresAt.getTime() < Date.now()) return false;
    return true;
  });

  const roleNames = activeUserRoles.map((ur) => ur.role.activeVersion?.name ?? 'Unnamed Role');
  const isSuperAdmin = activeUserRoles.some((ur) => ur.role.isSystemRole === true);

  const permRepo = AppDataSource.getRepository(Permission);
  const modRepo = AppDataSource.getRepository(PermissionModule);

  const modules = await modRepo.find({ order: { displayOrder: 'ASC' } });
  let effectiveKeys = new Set<string>();

  if (isSuperAdmin) {
    const allPerms = await permRepo.find({ select: ['key'] });
    effectiveKeys = new Set(allPerms.map((p) => p.key));
  } else if (activeUserRoles.length > 0) {
    const activeVersionIds = activeUserRoles
      .map((ur) => ur.role.activeVersionId)
      .filter((id): id is string => !!id);

    if (activeVersionIds.length > 0) {
      const rvpRepo = AppDataSource.getRepository(RoleVersionPermission);
      const rvpList = await rvpRepo.find({
        where: { roleVersionId: In(activeVersionIds) },
        select: ['permissionKey'],
      });
      effectiveKeys = new Set(rvpList.map((p) => p.permissionKey));
    }
  }

  // Group all registry permissions and mark whether user has them
  const allPermissions = await permRepo.find({ relations: ['module'] });

  const preview = modules.map((mod) => {
    const modPerms = allPermissions.filter((p) => p.moduleId === mod.id);
    return {
      moduleName: mod.name,
      moduleSlug: mod.key,
      permissions: modPerms.map((p) => ({
        key: p.key,
        name: p.name,
        action: p.action,
        description: p.description,
        granted: effectiveKeys.has(p.key),
      })),
    };
  });

  return {
    roles: roleNames,
    isSuperAdmin,
    permissions: preview,
  };
}

export async function approveAdminUser(
  userId: string,
  approvedByUserId: string,
  roleId: string,
): Promise<void> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.USER_NOT_FOUND,
    );
  }

  if (user.accountType !== AccountType.ADMIN) {
    throw new AppError(
      AppErrorMessage.ONLY_ADMIN_APPROVED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.INVALID_ACCOUNT_TYPE,
    );
  }

  user.status = UserStatus.ACTIVE;
  user.approvedBy = { id: approvedByUserId } as User;
  user.approvedAt = new Date();
  await userRepo.save(user);

  // Assign the specified role
  const userRoleRepo = AppDataSource.getRepository(UserRole);

  // Clean up any existing roles first to avoid unique constraint violations
  await userRoleRepo.delete({ userId: user.id });

  const assignment = userRoleRepo.create({
    userId: user.id,
    roleId,
    assignedBy: { id: approvedByUserId } as User,
    assignedAt: new Date(),
  });
  await userRoleRepo.save(assignment);

  // Notify user
  await sendAdminApprovalStatusEmail({
    to: user.email,
    name: user.name,
    status: 'approved',
  });
}

export async function rejectAdminUser(
  userId: string,
  approvedByUserId: string,
  reason: string,
): Promise<void> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.USER_NOT_FOUND,
    );
  }

  if (user.accountType !== AccountType.ADMIN) {
    throw new AppError(
      AppErrorMessage.ONLY_ADMIN_REJECTED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.INVALID_ACCOUNT_TYPE,
    );
  }

  user.status = UserStatus.REJECTED;
  user.rejectionReason = reason;
  user.approvedBy = { id: approvedByUserId } as User;
  user.approvedAt = new Date();
  await userRepo.save(user);

  // Notify user
  await sendAdminApprovalStatusEmail({
    to: user.email,
    name: user.name,
    status: 'rejected',
    reason,
  });
}
