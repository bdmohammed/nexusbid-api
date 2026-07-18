import { z } from 'zod';

import {
  TenderLifecycleStatus,
  TenderPublicationStatus,
  TenderVersionStatus,
} from '../../types/enums';

export const TenderSearchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  stateId: z.coerce.number().int().optional(),
  status: z.nativeEnum(TenderLifecycleStatus).optional(),
  publicationStatus: z.nativeEnum(TenderPublicationStatus).optional(),
  priority: z.string().optional(),
  procurementType: z.string().optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(['createdAt', 'closingDate', 'estimatedBudget']).optional(),
  order: z.enum(['ASC', 'DESC']).optional(),
});
export type TenderSearchQueryDto = z.infer<typeof TenderSearchQuerySchema>;

export const CreateTenderSchema = z.object({
  title: z.string().min(5).max(400).trim(),
  description: z.string().min(20).trim(),
  procurementType: z.string().trim().optional(),
  priority: z.string().default('Medium'),
  estimatedBudget: z.number().int().min(0).optional(),
  currency: z.string().max(10).default('USD'),
  department: z.string().trim().optional(),
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
  siteVisitRequired: z.boolean().default(false),
  siteVisitDate: z.string().datetime({ offset: true }).optional().nullable(),
  siteVisitInstructions: z.string().optional(),
  contactPerson: z.string().trim().optional(),
  contactDesignation: z.string().trim().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional(),
  contactAlternative: z.string().trim().optional(),
  openingDate: z.string().datetime({ offset: true }).optional().nullable(),
  closingDate: z.string().datetime({ offset: true }).optional().nullable(),
  bidValidity: z.number().int().min(0).optional(),
  projectDuration: z.string().optional(),
  emdAmount: z.number().int().min(0).optional(),
  securityDeposit: z.number().int().min(0).optional(),
  paymentTerms: z.string().optional(),
  visibility: z.string().default('public'),
  evaluationMethod: z.string().optional(),
  submissionMethod: z.string().optional(),
  contractType: z.string().optional(),
  procurementMethod: z.string().optional(),
  eligibilityCriteria: z.string().optional(),
  specialConditions: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  stateId: z.coerce.number().int().optional().nullable(),
  templateId: z.string().uuid().optional(),
});
export type CreateTenderDto = z.infer<typeof CreateTenderSchema>;

export const UpdateTenderSchema = CreateTenderSchema.partial().extend({
  dbVersion: z.number().int().optional(),
});
export type UpdateTenderDto = z.infer<typeof UpdateTenderSchema>;

export const UpdateTenderStatusSchema = z.object({
  status: z.nativeEnum(TenderVersionStatus).optional(),
  publicationStatus: z.nativeEnum(TenderPublicationStatus).optional(),
  rejectionNote: z.string().optional(),
});
export type UpdateTenderStatusDto = z.infer<typeof UpdateTenderStatusSchema>;

export const UploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  documentType: z.string().default('Notice'),
});
export type UploadUrlDto = z.infer<typeof UploadUrlSchema>;

export const RegisterDocumentSchema = z.object({
  documentType: z.string(),
  s3Key: z.string(),
  bucket: z.string(),
  originalName: z.string(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().optional(),
  checksum: z.string().optional(),
  isPublic: z.boolean().default(true),
});
export type RegisterDocumentDto = z.infer<typeof RegisterDocumentSchema>;

export const CreateQuestionSchema = z.object({
  questionText: z.string().min(10).trim(),
});
export type CreateQuestionDto = z.infer<typeof CreateQuestionSchema>;

export const AnswerQuestionSchema = z.object({
  answerText: z.string().min(5).trim(),
  isPublic: z.boolean().default(false),
});
export type AnswerQuestionDto = z.infer<typeof AnswerQuestionSchema>;

export const CreateClarificationSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10),
});
export type CreateClarificationDto = z.infer<typeof CreateClarificationSchema>;

export const CreateAmendmentSchema = z.object({
  amendmentNumber: z.number().int().min(1),
  changedFields: z.any(),
});
export type CreateAmendmentDto = z.infer<typeof CreateAmendmentSchema>;

export const AssignReviewerSchema = z.object({
  reviewerIds: z.array(z.string().uuid()).min(1),
});
export type AssignReviewerDto = z.infer<typeof AssignReviewerSchema>;

export const SubmitReviewCommentSchema = z.object({
  commentText: z.string().min(5),
  status: z.nativeEnum(TenderVersionStatus).optional(),
});
export type SubmitReviewCommentDto = z.infer<typeof SubmitReviewCommentSchema>;

export const TenderCommitteeSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['Chairperson', 'Evaluator', 'Observer']),
});
export type TenderCommitteeDto = z.infer<typeof TenderCommitteeSchema>;

export const SubmitEvaluationSchema = z.object({
  evaluationType: z.enum(['technical', 'financial', 'overall']),
  criteriaName: z.string().min(2),
  weight: z.number().min(0).max(1),
  score: z.number().min(0),
  maxScore: z.number().int().min(1),
  passed: z.boolean().default(true),
  remarks: z.string().optional(),
});
export type SubmitEvaluationDto = z.infer<typeof SubmitEvaluationSchema>;

export const TenderWatcherSchema = z.object({
  notifyEmail: z.boolean().default(true),
  notifyInApp: z.boolean().default(true),
  notifySms: z.boolean().default(false),
});
export type TenderWatcherDto = z.infer<typeof TenderWatcherSchema>;

export const TenderInvitationSchema = z.object({
  email: z.string().email(),
  expiresDays: z.number().default(7),
});
export type TenderInvitationDto = z.infer<typeof TenderInvitationSchema>;

export const TenderTemplateSchema = z.object({
  templateScope: z.enum(['department', 'organization', 'personal']),
  departmentId: z.string().uuid().optional(),
  title: z.string().min(5),
  description: z.string().optional(),
  payload: z.any(),
});
export type TenderTemplateDto = z.infer<typeof TenderTemplateSchema>;

export const TenderIdParamSchema = z.object({
  id: z.string().uuid(),
});
export type TenderIdParamDto = z.infer<typeof TenderIdParamSchema>;

export const TenderSlugParamSchema = z.object({
  slug: z.string().min(1),
});
export type TenderSlugParamDto = z.infer<typeof TenderSlugParamSchema>;

export const QuestionIdParamSchema = z.object({
  qId: z.string().uuid(),
});
export type QuestionIdParamDto = z.infer<typeof QuestionIdParamSchema>;

export const ReviewIdParamSchema = z.object({
  reviewId: z.string().uuid(),
});
export type ReviewIdParamDto = z.infer<typeof ReviewIdParamSchema>;

export const ParticipantIdParamSchema = z.object({
  participantId: z.string().uuid(),
});
export type ParticipantIdParamDto = z.infer<typeof ParticipantIdParamSchema>;
