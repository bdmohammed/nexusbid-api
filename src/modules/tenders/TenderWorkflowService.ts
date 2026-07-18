import { TenderPublicationStatus, TenderVersionStatus } from '../../types/enums';

import type { TenderVersion } from '../../database/entities/TenderVersion';

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

    return allowed[current].includes(next);
  }

  /**
   * Validate and transition Tender Publication status
   */
  static validatePublicationTransition(
    current: TenderPublicationStatus,
    next: TenderPublicationStatus,
  ): boolean {
    const allowed: Record<TenderPublicationStatus, TenderPublicationStatus[]> = {
      [TenderPublicationStatus.SCHEDULED]: [TenderPublicationStatus.PUBLISHED],
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

    return allowed[current].includes(next);
  }

  /**
   * Generate diff comparison between two versions of a tender
   */
  static compareVersions(version1: TenderVersion, version2: TenderVersion) {
    const fieldsToCompare: (keyof TenderVersion)[] = [
      'title',
      'description',
      'procurementType',
      'priority',
      'estimatedBudget',
      'currency',
      'department',
      'formattedAddress',
      'siteVisitRequired',
      'openingDate',
      'closingDate',
      'emdAmount',
      'securityDeposit',
      'paymentTerms',
      'visibility',
    ];

    const added: any = {};
    const removed: any = {};
    const changed: any = {};

    for (const field of fieldsToCompare) {
      const value1 = version1[field];
      const value2 = version2[field];

      if (value1 === null || value1 === undefined) {
        if (value2 !== null && value2 !== undefined) {
          added[field] = value2;
        }
      } else if (value2 === null || value2 === undefined) {
        removed[field] = value1;
      } else if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        changed[field] = { old: value1, new: value2 };
      }
    }

    return { added, removed, changed };
  }
}
