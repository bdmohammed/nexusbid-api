import { z } from 'zod';

import { appDataSource } from '../../../config/database';
import { asyncHandler } from '../../../core/asyncHandler';
import { RoleReview } from '../../../entities/RoleReview';
import { RbacService } from '../rbac.service';

import type { Request, Response } from 'express';

const SubmitReviewSchema = z.object({
  reviewerIds: z.array(z.string().uuid()).min(1, 'At least one reviewer is required'),
});

const ReviewActionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  comment: z.string().max(500).optional().default(''),
});

export class RbacReviewController {
  public static submitVersion = asyncHandler(async (req: Request, res: Response) => {
    const { versionId } = req.params;
    const body = SubmitReviewSchema.parse(req.body);
    const review = await RbacService.submitRoleVersion(
      versionId!,
      body.reviewerIds,
      req.user!.userId,
    );
    res.status(201).json({ success: true, data: review });
  });

  public static submitReview = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const body = ReviewActionSchema.parse(req.body);
    await RbacService.reviewRoleVersion(reviewId!, body.status, body.comment, req.user!.userId);
    res.json({ success: true, message: 'Review decision submitted successfully' });
  });

  public static getReviewDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const review = await appDataSource.getRepository(RoleReview).findOne({
      where: { id },
      relations: [
        'assignments',
        'assignments.reviewer',
        'comments',
        'comments.user',
        'roleVersion',
      ],
    });
    res.json({ success: true, data: review });
  });
}
