import type { Request, Response } from 'express';
import { RbacService } from '../rbac.service';
import { asyncHandler } from '../../../core/asyncHandler';

export class RbacExportController {
  public static exportData = asyncHandler(async (req: Request, res: Response) => {
    const data = await RbacService.getExportData();
    res.json({ success: true, data });
  });
}
