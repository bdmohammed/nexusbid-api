import type { Request, Response } from 'express';
import { RbacService } from '../rbac.service';
import { asyncHandler } from '../../../core/asyncHandler';

export class RbacVersionController {
  public static getRoleVersions = asyncHandler(async (req: Request, res: Response) => {
    const { roleId } = req.params;
    const versions = await RbacService.getRoleVersions(roleId!);
    res.json({ success: true, data: versions });
  });

  public static lockVersion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await RbacService.lockRoleVersion(id!, req.user!.userId);
    res.json({ success: true, message: 'Role version draft locked successfully' });
  });

  public static unlockVersion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await RbacService.unlockRoleVersion(id!, req.user!.userId);
    res.json({ success: true, message: 'Role version draft unlocked successfully' });
  });

  public static compareVersions = asyncHandler(async (req: Request, res: Response) => {
    const { id, v1, v2 } = req.params;
    const comparison = await RbacService.compareRoleVersions(
      id!,
      parseInt(v1!, 10),
      parseInt(v2!, 10),
    );
    res.json({ success: true, data: comparison });
  });
}
