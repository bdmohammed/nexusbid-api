import type { AppDataSource } from "../../config/database";
import type { Tender } from "../../database/entities/Tender";
import type { TenderVersion } from "../../database/entities/TenderVersion";
import type { TenderReview } from "../../database/entities/TenderReview";
import type { TenderReviewAssignment } from "../../database/entities/TenderReviewAssignment";
import type { TenderReviewComment } from "../../database/entities/TenderReviewComment";
import type { TenderAmendment } from "../../database/entities/TenderAmendment";
import type { AppError } from "../../core/AppError";
import { type TenderLifecycleStatus, TenderVersionStatus, TenderPublicationStatus } from "../../types/enums";

export class TenderWorkflowService {
  /**
   * Validate and transition Tender Version status
   */
  static validateVersionTransition(
    current: TenderVersionStatus,
    next: TenderVersionStatus,
  ): boolean {
    const allowed: Record<TenderVersionStatus, TenderVersionStatus[]> = {
      [TenderVersionStatus.DRAFT]: [TenderVersionStatus.SUBMITTED],
      [TenderVersionStatus.SUBMITTED]: [
        TenderVersionStatus.REVIEW_ASSIGNED,
        TenderVersionStatus.DRAFT,
      ],
      [TenderVersionStatus.REVIEW_ASSIGNED]: [
        TenderVersionStatus.UNDER_REVIEW,
        TenderVersionStatus.DRAFT,
      ],
      [TenderVersionStatus.UNDER_REVIEW]: [
        TenderVersionStatus.APPROVED,
        TenderVersionStatus.REJECTED,
        TenderVersionStatus.CHANGES_REQUESTED,
      ],
      [TenderVersionStatus.APPROVED]: [TenderVersionStatus.DRAFT], // To reopen or create new draft
      [TenderVersionStatus.REJECTED]: [TenderVersionStatus.DRAFT],
      [TenderVersionStatus.CHANGES_REQUESTED]: [TenderVersionStatus.DRAFT],
    };

    return allowed[current]?.includes(next) ?? false;
  }

  /**
   * Validate and transition Tender Publication status
   */
  static validatePublicationTransition(
    current: TenderPublicationStatus,
    next: TenderPublicationStatus,
  ): boolean {
    const allowed: Record<TenderPublicationStatus, TenderPublicationStatus[]> =
      {
        [TenderPublicationStatus.SCHEDULED]: [
          TenderPublicationStatus.PUBLISHED,
        ],
        [TenderPublicationStatus.PUBLISHED]: [
          TenderPublicationStatus.OPEN,
          TenderPublicationStatus.CLOSED,
        ],
        [TenderPublicationStatus.OPEN]: [
          TenderPublicationStatus.CLOSING,
          TenderPublicationStatus.CLOSED,
        ],
        [TenderPublicationStatus.CLOSING]: [TenderPublicationStatus.CLOSED],
        [TenderPublicationStatus.CLOSED]: [
          TenderPublicationStatus.AWARDED,
          TenderPublicationStatus.COMPLETED,
        ],
        [TenderPublicationStatus.AWARDED]: [TenderPublicationStatus.COMPLETED],
        [TenderPublicationStatus.COMPLETED]: [],
      };

    return allowed[current]?.includes(next) ?? false;
  }

  /**
   * Generate diff comparison between two versions of a tender
   */
  static compareVersions(v1: TenderVersion, v2: TenderVersion) {
    const fieldsToCompare: (keyof TenderVersion)[] = [
      "title",
      "description",
      "procurementType",
      "priority",
      "estimatedBudget",
      "currency",
      "department",
      "formattedAddress",
      "siteVisitRequired",
      "openingDate",
      "closingDate",
      "emdAmount",
      "securityDeposit",
      "paymentTerms",
      "visibility",
    ];

    const added: any = {};
    const removed: any = {};
    const changed: any = {};

    for (const field of fieldsToCompare) {
      const val1 = v1[field];
      const val2 = v2[field];

      if (val1 === null || val1 === undefined) {
        if (val2 !== null && val2 !== undefined) {
          added[field] = val2;
        }
      } else if (val2 === null || val2 === undefined) {
        removed[field] = val1;
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changed[field] = { old: val1, new: val2 };
      }
    }

    return { added, removed, changed };
  }
}
