import { asyncHandler } from '../../../core/asyncHandler';
import { RbacService } from '../rbac.service';

import type { Request, Response } from 'express';

export class RbacStatsController {
  public static getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await RbacService.getRoleStats();
    res.json({ success: true, data: stats });
  });
}
