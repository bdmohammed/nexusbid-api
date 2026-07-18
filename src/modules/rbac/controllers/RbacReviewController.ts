import { AppDataSource } from '../../../config/database';
import { asyncHandler } from '../../../core/asyncHandler';
import { RoleReview } from '../../../database/entities/RoleReview';
import { RbacService } from '../rbac.service';

import type {
  IdParamDto,
  ReviewActionDto,
  ReviewIdParamDto,
  SubmitReviewDto,
  SuccessResponse,
  VersionIdParamDto,
} from '../rbac.dto';

export class RbacReviewController {
  public static submitVersion = asyncHandler<
    VersionIdParamDto,
    SuccessResponse<RoleReview>,
    SubmitReviewDto
  >(async (req, res) => {
    const { versionId } = req.params;
    const { body } = req;
    const review = await RbacService.submitRoleVersion(
      versionId,
      body.reviewerIds,
      req.user!.userId,
    );
    res.status(201).json({ success: true, data: review });
  });

  public static submitReview = asyncHandler<
    ReviewIdParamDto,
    SuccessResponse<null>,
    ReviewActionDto
  >(async (req, res) => {
    const { reviewId } = req.params;
    const { body } = req;
    await RbacService.reviewRoleVersion(reviewId, body.status, body.comment, req.user!.userId);
    res.json({ success: true, message: 'Review decision submitted successfully' });
  });

  public static getReviewDetails = asyncHandler<
    IdParamDto,
    SuccessResponse<RoleReview | undefined>
  >(async (req, res) => {
    const { id } = req.params;
    const review = await AppDataSource.getRepository(RoleReview).findOne({
      where: { id },
      relations: [
        'assignments',
        'assignments.reviewer',
        'comments',
        'comments.user',
        'roleVersion',
      ],
    });
    res.json({ success: true, data: review ?? undefined });
  });
}
