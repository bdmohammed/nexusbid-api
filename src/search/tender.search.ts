import { TenderLifecycleStatus, TenderPublicationStatus } from '../types/enums';

import type { Tender } from '../database/entities/Tender';
import type { SelectQueryBuilder } from 'typeorm';

export interface TenderSearchParams {
  q?: string;
  categoryId?: string;
  stateId?: number;
  before?: string; // ISO date string
  after?: string; // ISO date string
  featured?: boolean;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

function applySearchFilters(qb: SelectQueryBuilder<Tender>, params: TenderSearchParams): void {
  if (params.categoryId) {
    qb.andWhere('activeVersion.categoryId = :cat', { cat: params.categoryId });
  }

  if (params.stateId) {
    qb.andWhere('activeVersion.stateId = :state', { state: params.stateId });
  }

  if (params.before) {
    qb.andWhere('activeVersion.closingDate <= :before', { before: new Date(params.before) });
  }

  if (params.after) {
    qb.andWhere('activeVersion.closingDate >= :after', { after: new Date(params.after) });
  }
}

function applySearchSort(qb: SelectQueryBuilder<Tender>, params: TenderSearchParams): void {
  // Default sort when not searching by text
  if (!params.q) {
    const validSorts = ['createdAt', 'closingDate', 'estimatedBudget'] as const;
    type ValidSort = (typeof validSorts)[number];
    const sort = validSorts.includes(params.sort as ValidSort) ? params.sort : 'createdAt';
    const direction = params.order === 'ASC' ? 'ASC' : ('DESC' as const);

    if (sort === 'createdAt') {
      qb.orderBy('tender.createdAt', direction);
    } else {
      qb.orderBy(`activeVersion.${sort}`, direction);
    }
  }
}

export function buildTenderSearchQuery(
  qb: SelectQueryBuilder<Tender>,
  params: TenderSearchParams,
): { qb: SelectQueryBuilder<Tender>; page: number; limit: number } {
  // CRITICAL: Always enforce ACTIVE status and PUBLISHED publication status for public search
  qb.where('tender.status = :status', { status: TenderLifecycleStatus.ACTIVE });
  qb.andWhere('tender.publicationStatus = :pubStatus', {
    pubStatus: TenderPublicationStatus.PUBLISHED,
  });

  // Ensure activeVersion is joined
  qb.leftJoinAndSelect('tender.activeVersion', 'activeVersion');

  if (params.q && params.q.trim().length > 0) {
    const searchTerm = params.q.trim();

    qb.addSelect(
      `ts_rank(
        to_tsvector('english', activeVersion.title ?? ' ' ?? COALESCE(activeVersion.description, '')),
        plainto_tsquery('english', :query)
      )`,
      'rank',
    );

    qb.andWhere(
      `(
        to_tsvector('english', activeVersion.title ?? ' ' ?? COALESCE(activeVersion.description, ''))
          @@ plainto_tsquery('english', :query)
        OR activeVersion.title ILIKE :ilike
      )`,
      { query: searchTerm, ilike: `%${searchTerm}%` },
    );

    qb.orderBy('rank', 'DESC');
  }

  applySearchFilters(qb, params);
  applySearchSort(qb, params);

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  qb.skip((page - 1) * limit).take(limit);

  return { qb, page, limit };
}
