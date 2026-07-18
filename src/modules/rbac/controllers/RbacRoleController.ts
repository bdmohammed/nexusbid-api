import { asyncHandler } from '../../../core/asyncHandler';
import { RbacService } from '../rbac.service';

import type { PermissionModule } from '../../../database/entities/PermissionModule';
import type { Role } from '../../../database/entities/Role';
import type { UserRole } from '../../../database/entities/UserRole';
import type {
  AssignRoleDto,
  CreateRoleDto,
  CreateRoleResult,
  DuplicateRoleBodyDto,
  // GroupedPermissionModule,
  IdParamDto,
  ListRolesQueryDto,
  RoleDetails,
  SuccessResponse,
  UpdateRoleDto,
  UpdateRoleResult,
} from '../rbac.dto';

export class RbacRoleController {
  public static getRoles = asyncHandler<{}, {}, {}, ListRolesQueryDto>(async (req, res) => {
    const includeDeleted = req.query.deleted;
    const roles = await RbacService.getRoles(includeDeleted);
    res.json({ success: true, data: roles });
  });

  public static getRoleById = asyncHandler<IdParamDto, SuccessResponse<RoleDetails>>(
    async (req, res) => {
      const { id } = req.params;
      const role = await RbacService.getRoleById(id);
      res.json({ success: true, data: role });
    },
  );

  public static createRole = asyncHandler<{}, SuccessResponse<CreateRoleResult>, CreateRoleDto>(
    async (req, res) => {
      const { body } = req;
      const draft = await RbacService.createRole(
        body.name,
        body.description,
        body.permissionKeys,
        req.user!.userId,
      );
      res.status(201).json({ success: true, data: draft });
    },
  );

  public static updateRole = asyncHandler<
    IdParamDto,
    SuccessResponse<UpdateRoleResult>,
    UpdateRoleDto
  >(async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const draft = await RbacService.updateRole(
      id,
      body.name,
      body.description,
      body.permissionKeys,
      req.user!.userId,
    );
    res.json({ success: true, data: draft });
  });

  public static duplicateRole = asyncHandler<
    IdParamDto,
    SuccessResponse<CreateRoleResult>,
    DuplicateRoleBodyDto
  >(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const draft = await RbacService.duplicateRole(id, name, req.user!.userId);
    res.status(201).json({ success: true, data: draft });
  });

  public static deleteRole = asyncHandler<IdParamDto, SuccessResponse<null>>(async (req, res) => {
    const { id } = req.params;
    await RbacService.deleteRole(id, req.user!.userId);
    res.json({ success: true, message: 'Role archived successfully' });
  });

  public static restoreRole = asyncHandler<IdParamDto, SuccessResponse<Role>>(async (req, res) => {
    const { id } = req.params;
    const role = await RbacService.restoreRole(id, req.user!.userId);
    res.json({ success: true, message: 'Role restored successfully', data: role });
  });

  public static getPermissions = asyncHandler(async (_req, res) => {
    const permissions = await RbacService.getPermissionsGroupedByModule();
    res.json({ success: true, data: permissions });
  });

  public static getModules = asyncHandler<{}, SuccessResponse<PermissionModule[]>>(
    async (_req, res) => {
      const modules = await RbacService.getModules();
      res.json({ success: true, data: modules });
    },
  );

  public static getAssignments = asyncHandler<{}, SuccessResponse<UserRole[]>>(
    async (_req, res) => {
      const assignments = await RbacService.getAssignments();
      res.json({ success: true, data: assignments });
    },
  );

  public static assignRole = asyncHandler<{}, SuccessResponse<null>, AssignRoleDto>(
    async (req, res) => {
      const { body } = req;
      await RbacService.assignRole(body.userId, body.roleId, body.expiresAt, req.user!.userId);
      res.status(201).json({ success: true, message: 'Role assigned successfully' });
    },
  );

  public static revokeAssignment = asyncHandler<IdParamDto, SuccessResponse<null>>(
    async (req, res) => {
      const { id } = req.params;
      await RbacService.revokeAssignment(id, req.user!.userId);
      res.json({ success: true, message: 'Role assignment revoked successfully' });
    },
  );
}
