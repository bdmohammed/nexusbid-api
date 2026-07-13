import { z } from 'zod';

export const CategorySeoSchema = z.object({
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(300).optional(),
  keywords: z.array(z.string()).optional(),
});

export const CreateCategoryDto = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isSystem: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  icon: z.string().max(100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  seo: CategorySeoSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategoryDto>;

export const UpdateCategoryDto = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isSystem: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  icon: z.string().max(100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  seo: CategorySeoSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type UpdateCategoryDto = z.infer<typeof UpdateCategoryDto>;

export const BatchCategoryItemDto = z.object({
  action: z.enum(['upsert', 'delete']).default('upsert'),
  code: z.string().regex(/^CAT-\d{6}$/, 'Category code must match format CAT-000000').optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isSystem: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  icon: z.string().max(100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
}).refine(data => {
  if (data.action === 'upsert' && !data.name) {
    return false;
  }
  return true;
}, {
  message: 'Name is required for upsert operation',
  path: ['name'],
});
export type BatchCategoryItemDto = z.infer<typeof BatchCategoryItemDto>;

export const BatchCategoryDto = z.array(BatchCategoryItemDto);
export type BatchCategoryDto = z.infer<typeof BatchCategoryDto>;

export const CategoryQueryDto = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  createdBy: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  unusedOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  tree: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CategoryQueryDto = z.infer<typeof CategoryQueryDto>;

export const SubmitCategoryReviewDto = z.object({
  reviewerIds: z.array(z.string().uuid()).min(1, 'At least one reviewer must be assigned'),
});
export type SubmitCategoryReviewDto = z.infer<typeof SubmitCategoryReviewDto>;

export const CategoryReviewDecisionDto = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'CHANGES_REQUESTED']),
  comment: z.string().min(3, 'Review comment must be at least 3 characters long'),
});
export type CategoryReviewDecisionDto = z.infer<typeof CategoryReviewDecisionDto>;

export const MergeCategoryDto = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});
export type MergeCategoryDto = z.infer<typeof MergeCategoryDto>;
