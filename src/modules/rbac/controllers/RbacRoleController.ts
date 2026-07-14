import type { Request, Response } from 'express';
import { RbacService } from '../rbac.service';
import { asyncHandler } from '../../../core/asyncHandler';
import { z } from 'zod';

const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().nullable().optional().default(null),
  permissionKeys: z.array(z.string()).min(1, 'At least one permission must be selected'),
});

const UpdateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().nullable().optional().default(null),
  permissionKeys: z.array(z.string()).min(1, 'At least one permission must be selected'),
});

const AssignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  expiresAt: z.string().nullable().optional().default(null),
});

export class RbacRoleController {
  public static getRoles = asyncHandler(async (req: Request, res: Response) => {
    const includeDeleted = req.query['deleted'] === 'true';
    const roles = await RbacService.getRoles(includeDeleted);
    res.json({ success: true, data: roles });
  });

  public static getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const role = await RbacService.getRoleById(id!);
    res.json({ success: true, data: role });
  });

  public static createRole = asyncHandler(async (req: Request, res: Response) => {
    const body = CreateRoleSchema.parse(req.body);
    const draft = await RbacService.createRole(body.name, body.description, body.permissionKeys, req.user!.userId);
    res.status(201).json({ success: true, data: draft });
  });

  public static updateRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = UpdateRoleSchema.parse(req.body);
    const draft = await RbacService.updateRole(id!, body.name, body.description, body.permissionKeys, req.user!.userId);
    res.json({ success: true, data: draft });
  });

  public static duplicateRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const draft = await RbacService.duplicateRole(id!, name, req.user!.userId);
    res.status(201).json({ success: true, data: draft });
  });

  public static deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await RbacService.deleteRole(id!, req.user!.userId);
    res.json({ success: true, message: 'Role archived successfully' });
  });

  public static restoreRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const role = await RbacService.restoreRole(id!, req.user!.userId);
    res.json({ success: true, message: 'Role restored successfully', data: role });
  });

  public static getPermissions = asyncHandler(async (req: Request, res: Response) => {
    const permissions = await RbacService.getPermissionsGroupedByModule();
    res.json({ success: true, data: permissions });
  });

  public static getModules = asyncHandler(async (req: Request, res: Response) => {
    const modules = await RbacService.getModules();
    res.json({ success: true, data: modules });
  });

  public static getAssignments = asyncHandler(async (req: Request, res: Response) => {
    const assignments = await RbacService.getAssignments();
    res.json({ success: true, data: assignments });
  });

  public static assignRole = asyncHandler(async (req: Request, res: Response) => {
    const body = AssignRoleSchema.parse(req.body);
    await RbacService.assignRole(body.userId, body.roleId, body.expiresAt, req.user!.userId);
    res.status(201).json({ success: true, message: 'Role assigned successfully' });
  });

  public static revokeAssignment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await RbacService.revokeAssignment(id!, req.user!.userId);
    res.json({ success: true, message: 'Role assignment revoked successfully' });
  });
}
