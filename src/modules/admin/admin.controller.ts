import { parse } from 'csv-parse/sync';

import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { asyncHandler } from '../../core/asyncHandler';
import { type ApiResponse, paginationMeta, sendCreated, sendOk } from '../../core/response';

import {
  type AnalyticsQueryDto,
  type ApproveAdminBodyDto,
  type ApproveAdminParamsDto,
  type AssignUserRolesBodyDto,
  type BatchCategoriesResultDto,
  type BatchCategoryItemDto,
  BatchCategorySchema,
  type BlockUserDto,
  type CategoryQueryDto,
  type CategoryStatsDto,
  type CreateAdminDto,
  type CreateCategoryDto,
  type CreatePlanDto,
  type CreateUserNoteDto,
  type IdParamDto,
  type ImpersonateUserDto,
  type ListSubscriptionsQueryDto,
  type ListUsersQueryDto,
  type PaginationQueryDto,
  type PlanParamDto,
  type PreviewPermissionResponseDto,
  type RejectAdminBodyDto,
  type RejectAdminParamsDto,
  type RevenueAnalyticsResultDto,
  type RoleParamDto,
  type SessionParamDto,
  type StateQueryDto,
  type TopDownloadResultDto,
  type UpdateCategoryDto,
  type UpdateCountryBodyDto,
  type UpdateCountryParamsDto,
  type UpdatePlanDto,
  type UpdateStateBodyDto,
  type UpdateStateParamsDto,
  type UpdateUserDetailDto,
  type UserActivityDetailDto,
  type UserDeviceDto,
  type UserGrowthResultDto,
  type UserNoteDetailDto,
  type UserOverviewDto,
  type UserRolesDto,
  type UserSecurityDto,
  type UserSessionDto,
  type UserStatsDto,
  type UserSubscriptionOverviewDto,
  type UserTimelineEvent,
} from './admin.dto';
import * as service from './admin.service';

import type { AuditLog } from '../../database/entities/AuditLog';
import type { Category } from '../../database/entities/Category';
import type { Country } from '../../database/entities/Country';
import type { Plan } from '../../database/entities/Plan';
import type { State } from '../../database/entities/State';
import type { Subscription } from '../../database/entities/Subscription';
import type { User } from '../../database/entities/User';
import type { UserNote } from '../../database/entities/UserNote';

// ─── Users ────────────────────────────────────────────────────────────────────

export const listUsers = asyncHandler<{}, ApiResponse<User[]>, {}, ListUsersQueryDto>(
  async (req, res) => {
    const q = req.query;
    const { users, total } = await service.listUsers(q);
    return sendOk(res, users, 'OK', paginationMeta(total, q.page, q.limit));
  },
);

export const getUserById = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const user = await service.getUserById(req.params.id);
  return sendOk(res, user);
});

export const blockUser = asyncHandler<IdParamDto, ApiResponse<User>, BlockUserDto>(
  async (req, res) => {
    const { isBlocked } = req.body;
    res.locals['auditBefore'] = { isBlocked: !isBlocked };
    const user = await service.blockUser(req.params.id, isBlocked);
    return sendOk(res, user, isBlocked ? 'User blocked' : 'User unblocked');
  },
);

export const getUserStats = asyncHandler<{}, ApiResponse<UserStatsDto>>(async (_req, res) => {
  const stats = await service.getUserStats();
  return sendOk(res, stats);
});

export const getUserOverview = asyncHandler<IdParamDto, ApiResponse<UserOverviewDto>>(
  async (req, res) => {
    const overview = await service.getUserOverview(req.params.id);
    return sendOk(res, overview);
  },
);

export const getUserSecurity = asyncHandler<IdParamDto, ApiResponse<UserSecurityDto>>(
  async (req, res) => {
    const security = await service.getUserSecurity(req.params.id);
    return sendOk(res, security);
  },
);

export const getUserSessions = asyncHandler<IdParamDto, ApiResponse<UserSessionDto[]>>(
  async (req, res) => {
    const sessions = await service.getUserSessions(req.params.id);
    return sendOk(res, sessions);
  },
);

export const getUserDevices = asyncHandler<IdParamDto, ApiResponse<UserDeviceDto[]>>(
  async (req, res) => {
    const devices = await service.getUserDevices(req.params.id);
    return sendOk(res, devices);
  },
);

export const getUserActivity = asyncHandler<
  IdParamDto,
  ApiResponse<UserActivityDetailDto[]>,
  {},
  PaginationQueryDto
>(async (req, res) => {
  const { page, limit } = req.query;
  const { activities, total } = await service.getUserActivity(req.params.id, page, limit);
  return sendOk(res, activities, 'OK', paginationMeta(total, page, limit));
});

export const getUserTimeline = asyncHandler<IdParamDto, ApiResponse<UserTimelineEvent[]>>(
  async (req, res) => {
    const timeline = await service.getUserTimeline(req.params.id);
    return sendOk(res, timeline);
  },
);

export const getUserAuditLogs = asyncHandler<
  IdParamDto,
  ApiResponse<AuditLog[]>,
  {},
  PaginationQueryDto
>(async (req, res) => {
  const { page, limit } = req.query;
  const { logs, total } = await service.getUserAuditLogs(req.params.id, page, limit);
  return sendOk(res, logs, 'OK', paginationMeta(total, page, limit));
});

export const getUserSubscription = asyncHandler<
  IdParamDto,
  ApiResponse<UserSubscriptionOverviewDto>
>(async (req, res) => {
  const subscription = await service.getUserSubscription(req.params.id);
  return sendOk(res, subscription);
});

export const getUserNotes = asyncHandler<IdParamDto, ApiResponse<UserNoteDetailDto[]>>(
  async (req, res) => {
    const notes = await service.getUserNotes(req.params.id);
    return sendOk(res, notes);
  },
);

export const createUserNote = asyncHandler<IdParamDto, ApiResponse<UserNote>, CreateUserNoteDto>(
  async (req, res) => {
    const { note } = req.body;
    const userNote = await service.createUserNote(req.params.id, req.user!.userId, note);
    return sendCreated(res, userNote, 'Internal note added');
  },
);

export const updateUserDetail = asyncHandler<IdParamDto, ApiResponse<User>, UpdateUserDetailDto>(
  async (req, res) => {
    const dto = req.body;
    const before = await service.getUserOverview(req.params.id);
    res.locals.auditBefore = before;
    const user = await service.updateUserDetail(req.params.id, dto);
    return sendOk(res, user, 'User details updated successfully');
  },
);

export const suspendUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.suspendUser(req.params.id);
  return sendOk(res, user, 'User account suspended');
});

export const activateUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.unsuspendUser(req.params.id);
  return sendOk(res, user, 'User account activated');
});

export const archiveUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.archiveUser(req.params.id);
  return sendOk(res, user, 'User account archived');
});

export const unarchiveUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.unarchiveUser(req.params.id);
  return sendOk(res, user, 'User account unarchived');
});

export const forcePasswordChange = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserSecurity(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.forcePasswordChange(req.params.id);
  return sendOk(res, user, 'Forced password change configured for next login');
});

export const sendResetPasswordEmail = asyncHandler<IdParamDto, ApiResponse<null>>(
  async (req, res) => {
    await service.sendResetPasswordEmailAction(req.params.id);
    return sendOk(res, null, 'Password reset email sent to user');
  },
);

export const sendUserVerification = asyncHandler<IdParamDto, ApiResponse<null>>(
  async (req, res) => {
    await service.sendUserVerificationAction(req.params.id);
    return sendOk(res, null, 'Verification email sent to user');
  },
);

export const revokeSession = asyncHandler<SessionParamDto, ApiResponse<null>>(async (req, res) => {
  const { id, sessionId } = req.params;
  await service.revokeSession(id, sessionId);
  return sendOk(res, null, 'User session revoked successfully');
});

export const revokeAllSessions = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
  await service.revokeAllSessions(req.params.id);
  return sendOk(res, null, 'All user sessions revoked successfully');
});

export const impersonateUser = asyncHandler<
  IdParamDto,
  ApiResponse<{ token: string }>,
  ImpersonateUserDto
>(async (req, res) => {
  const { reason } = req.body;
  const result = await service.impersonateUser(req.params.id, req.user!.userId, reason);
  return sendOk(res, result, 'Impersonation session established');
});

export const createAdmin = asyncHandler<{}, ApiResponse<User>, CreateAdminDto>(async (req, res) => {
  const dto = req.body;
  const admin = await service.createAdmin(dto);
  return sendCreated(res, admin, 'Admin account created');
});

export const getUserRoles = asyncHandler<IdParamDto, ApiResponse<UserRolesDto>>(
  async (req, res) => {
    const data = await service.getUserRoles(req.params.id);
    return sendOk(res, data);
  },
);

export const assignUserRoles = asyncHandler<IdParamDto, ApiResponse<null>, AssignUserRolesBodyDto>(
  async (req, res) => {
    const dto = req.body;

    const beforeState = await service.getUserRoles(req.params.id);
    res.locals.auditBefore = beforeState.assigned;

    await service.assignUserRoles(req.params.id, dto, req.user!.userId);
    return sendOk(res, null, 'User roles updated successfully');
  },
);

export const revokeUserRole = asyncHandler<RoleParamDto, ApiResponse<null>>(async (req, res) => {
  const { id, roleId } = req.params;

  const beforeState = await service.getUserRoles(id);
  res.locals.auditBefore = beforeState.assigned;

  await service.revokeUserRole(id, roleId, req.user!.userId);
  return sendOk(res, null, 'User role revoked successfully');
});

export const previewUserPermissions = asyncHandler<
  IdParamDto,
  ApiResponse<PreviewPermissionResponseDto[]>
>(async (req, res) => {
  const data = await service.previewUserPermissions(req.params.id);
  return sendOk(res, data);
});

// ─── Plans ────────────────────────────────────────────────────────────────────

export const listPlans = asyncHandler<{}, ApiResponse<Plan[]>>(async (_req, res) => {
  const plans = await service.listAllPlans();
  return sendOk(res, plans);
});

export const createPlan = asyncHandler<{}, ApiResponse<Plan>, CreatePlanDto>(async (req, res) => {
  const dto = req.body;
  const plan = await service.createPlan(dto, req.user!.userId);
  return sendCreated(res, plan, 'Plan created');
});

export const updatePlan = asyncHandler<PlanParamDto, ApiResponse<Plan>, UpdatePlanDto>(
  async (req, res) => {
    const dto = req.body;
    const plan = await service.updatePlan(req.params.id, dto);
    return sendOk(res, plan, 'Plan updated');
  },
);

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const listSubscriptions = asyncHandler<
  {},
  ApiResponse<Subscription[]>,
  {},
  ListSubscriptionsQueryDto
>(async (req, res) => {
  const { page, limit } = req.query;
  const { subscriptions, total } = await service.listAllSubscriptions({ page, limit });
  return sendOk(res, subscriptions, 'OK', paginationMeta(total, page, limit));
});

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getRevenue = asyncHandler<
  {},
  ApiResponse<RevenueAnalyticsResultDto[]>,
  {},
  AnalyticsQueryDto
>(async (req, res) => {
  const dto = req.query;
  const data = await service.getRevenueAnalytics(dto);
  return sendOk(res, data);
});

export const getTopDownloads = asyncHandler<{}, ApiResponse<TopDownloadResultDto[]>>(
  async (_req, res) => {
    const data = await service.getTopDownloads();
    return sendOk(res, data);
  },
);

export const getUserGrowth = asyncHandler<
  {},
  ApiResponse<UserGrowthResultDto[]>,
  {},
  AnalyticsQueryDto
>(async (req, res) => {
  const dto = req.query;
  const data = await service.getUserGrowth(dto);
  return sendOk(res, data);
});

// ─── Categories ──────────────────────────────────────────────────────────────

export const listCategories = asyncHandler<
  {},
  ApiResponse<{ categories: Category[]; total: number; stats: CategoryStatsDto }>,
  {},
  CategoryQueryDto
>(async (req, res) => {
  const { query } = req;
  const { categories, total } = await service.listAllCategories(query);
  const stats = await service.getCategoryStats();
  return sendOk(
    res,
    { categories, total, stats },
    'OK',
    paginationMeta(total, query.page, query.limit),
  );
});

export const getCategoryHistory = asyncHandler<IdParamDto, ApiResponse<AuditLog[]>>(
  async (req, res) => {
    const history = await service.getCategoryHistory(req.params.id);
    return sendOk(res, history);
  },
);

export const createCategory = asyncHandler<{}, ApiResponse<Category>, CreateCategoryDto>(
  async (req, res) => {
    const dto = req.body;
    const category = await service.createCategory(dto, req.user!.userId);
    return sendCreated(res, category, 'Category created');
  },
);

export const updateCategory = asyncHandler<IdParamDto, ApiResponse<Category>, UpdateCategoryDto>(
  async (req, res) => {
    const dto = req.body;
    const before = await service.getCategoryById(req.params.id);
    res.locals['auditBefore'] = {
      code: before.code,
      name: before.name,
      slug: before.slug,
      description: before.description,
      isActive: before.isActive,
    };
    const category = await service.updateCategory(req.params.id, dto, req.user!.userId);
    return sendOk(res, category, 'Category updated');
  },
);

export const deleteCategory = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
  const before = await service.getCategoryById(req.params.id);
  res.locals['auditBefore'] = {
    code: before.code,
    name: before.name,
    slug: before.slug,
    description: before.description,
    isActive: before.isActive,
  };
  await service.deleteCategory(req.params.id, req.user!.userId);
  return sendOk(res, null, 'Category deleted');
});

export const batchCategories = asyncHandler<
  {},
  ApiResponse<BatchCategoriesResultDto>,
  string | BatchCategoryItemDto[]
>(async (req, res) => {
  // eslint-disable-next-line no-useless-assignment
  let items: BatchCategoryItemDto[] = [];
  const contentType = req.headers['content-type'] ?? '';

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    if (typeof req.body !== 'string' || !req.body.trim()) {
      throw new AppError(
        AppErrorMessage.CSV_EMPTY_OR_INVALID,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INVALID_BATCH_BODY,
      );
    }

    try {
      const records = parse(req.body, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, unknown>[];

      items = records.map((record) => {
        const rawAction = record['action'] ?? 'upsert';
        const action = typeof rawAction === 'string' ? rawAction.toLowerCase() : 'upsert';

        return {
          action: ['upsert', 'delete'].includes(action)
            ? (action as 'upsert' | 'delete')
            : 'upsert',
          code: record['code'] ? String(record['code']).trim() : '',
          name: record['name'] ? String(record['name']).trim() : undefined,
          slug: record['slug'] ? String(record['slug']).trim() : undefined,
          description: record['description'] ? String(record['description']).trim() : undefined,
          isActive:
            record['is_active'] !== undefined
              ? record['is_active'] === 'true' || record['is_active'] === '1'
              : undefined,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        AppErrorMessage.CSV_PARSE_FAILED({ message }),
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.CSV_PARSE_FAILED,
      );
    }
  } else if (contentType.includes('application/json')) {
    if (!Array.isArray(req.body)) {
      throw new AppError(
        AppErrorMessage.INVALID_BATCH_JSON,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INVALID_BATCH_BODY,
      );
    }
    items = (req.body as Record<string, unknown>[]).map((item) => ({
      action:
        typeof item['action'] === 'string' && ['upsert', 'delete'].includes(item['action'])
          ? (item['action'] as 'upsert' | 'delete')
          : 'upsert',
      code: item['code'] ? String(item['code']).trim() : '',
      name: item['name'] ? String(item['name']).trim() : undefined,
      slug: item['slug'] ? String(item['slug']).trim() : undefined,
      description: item['description'] ? String(item['description']).trim() : undefined,
      isActive: item['isActive'] !== undefined ? Boolean(item['isActive']) : undefined,
    }));
  } else {
    throw new AppError(
      AppErrorMessage.UNSUPPORTED_CONTENT_TYPE,
      HttpStatusCode.UNSUPPORTED_MEDIA_TYPE,
      AppErrorCode.UNSUPPORTED_MEDIA_TYPE,
    );
  }

  const MAX_BATCH_SIZE = 500;
  if (items.length > MAX_BATCH_SIZE) {
    throw new AppError(
      AppErrorMessage.BATCH_SIZE_EXCEEDED(MAX_BATCH_SIZE),
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BATCH_SIZE_EXCEEDED,
    );
  }

  if (items.length === 0) {
    throw new AppError(
      AppErrorMessage.EMPTY_BATCH_PAYLOAD,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.EMPTY_BATCH,
    );
  }

  const validationResult = BatchCategorySchema.safeParse(items);
  if (!validationResult.success) {
    throw new AppError(
      AppErrorMessage.BATCH_VALIDATION_FAILED,
      HttpStatusCode.UNPROCESSABLE_ENTITY,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const result = await service.processBatchCategories(validationResult.data, req.user!.userId);
  return sendOk(res, result, 'Batch processed successfully');
});

// ─── States ───────────────────────────────────────────────────────────────────

export const listStates = asyncHandler<{}, ApiResponse<State[]>, {}, StateQueryDto>(
  async (req, res) => {
    const q = req.query;
    const { states, total } = await service.listAllStates(q);
    return sendOk(res, states, 'OK', paginationMeta(total, q.page, q.limit));
  },
);

export const listCountries = asyncHandler<{}, ApiResponse<string[]>>(async (_req, res) => {
  const countries = await service.listDistinctCountries();
  return sendOk(res, countries);
});

export const updateState = asyncHandler<
  UpdateStateParamsDto,
  ApiResponse<State>,
  UpdateStateBodyDto
>(async (req, res) => {
  const dto = req.body;
  const { id } = req.params;
  const before = await service.getStateById(id);
  res.locals['auditBefore'] = {
    isActive: before.isActive,
  };
  const state = await service.updateState(id, dto, req.user!.userId);
  return sendOk(res, state, 'State updated');
});

export const updateCountry = asyncHandler<
  UpdateCountryParamsDto,
  ApiResponse<Country>,
  UpdateCountryBodyDto
>(async (req, res) => {
  const dto = req.body;
  const { id } = req.params;
  const before = await service.getCountryById(id);
  res.locals['auditBefore'] = {
    isActive: before.isActive,
  };
  const country = await service.updateCountry(id, dto, req.user!.userId);
  return sendOk(res, country, 'Country updated');
});

export const approveAdmin = asyncHandler<
  ApproveAdminParamsDto,
  ApiResponse<null>,
  ApproveAdminBodyDto
>(async (req, res) => {
  const { id } = req.params;
  const { roleId } = req.body;
  await service.approveAdminUser(id, req.user!.userId, roleId);
  return sendOk(res, null, 'Administrator request approved successfully');
});

export const rejectAdmin = asyncHandler<
  RejectAdminParamsDto,
  ApiResponse<null>,
  RejectAdminBodyDto
>(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  await service.rejectAdminUser(id, req.user!.userId, reason);
  return sendOk(res, null, 'Administrator request rejected successfully');
});
