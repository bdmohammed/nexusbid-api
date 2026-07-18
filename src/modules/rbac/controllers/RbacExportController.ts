import { asyncHandler } from '../../../core/asyncHandler';
import { RbacService } from '../rbac.service';

import type { ExportRoleData, SuccessResponse } from '../rbac.dto';

export class RbacExportController {
  public static exportData = asyncHandler<{}, SuccessResponse<ExportRoleData[]>>(
    async (_req, res) => {
      const data = await RbacService.getExportData();
      res.json({ success: true, data });
    },
  );
}
