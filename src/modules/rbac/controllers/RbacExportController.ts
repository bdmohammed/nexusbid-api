import { asyncHandler } from '../../../core/asyncHandler';
import { RbacService } from '../rbac.service';

import type { Request, Response } from 'express';

export class RbacExportController {
  public static exportData = asyncHandler(async (req: Request, res: Response) => {
    const data = await RbacService.getExportData();
    res.json({ success: true, data });
  });
}
