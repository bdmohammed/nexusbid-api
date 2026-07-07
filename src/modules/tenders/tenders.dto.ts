import { z } from 'zod';
import { TenderLifecycleStatus, TenderVersionStatus, TenderPublicationStatus } from '../../types/enums';

export const TenderSearchQueryDto = z.object({
  q: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  stateId: z.string().uuid().optional(),
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
export type TenderSearchQueryDto = z.infer<typeof TenderSearchQueryDto>;

export const CreateTenderDto = z.object({
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
  stateId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional(),
});
export type CreateTenderDto = z.infer<typeof CreateTenderDto>;

export const UpdateTenderDto = CreateTenderDto.partial().extend({
  dbVersion: z.number().int().optional(),
});
export type UpdateTenderDto = z.infer<typeof UpdateTenderDto>;

export const UpdateTenderStatusDto = z.object({
  status: z.nativeEnum(TenderVersionStatus).optional(),
  publicationStatus: z.nativeEnum(TenderPublicationStatus).optional(),
  rejectionNote: z.string().optional(),
});
export type UpdateTenderStatusDto = z.infer<typeof UpdateTenderStatusDto>;

export const UploadUrlDto = z.object({
  fileName: z.string().min(1).max(255),
  documentType: z.string().default('Notice'),
});
export type UploadUrlDto = z.infer<typeof UploadUrlDto>;

export const RegisterDocumentDto = z.object({
  documentType: z.string(),
  s3Key: z.string(),
  bucket: z.string(),
  originalName: z.string(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().optional(),
  checksum: z.string().optional(),
  isPublic: z.boolean().default(true),
});
export type RegisterDocumentDto = z.infer<typeof RegisterDocumentDto>;

export const CreateQuestionDto = z.object({
  questionText: z.string().min(10).trim(),
});
export type CreateQuestionDto = z.infer<typeof CreateQuestionDto>;

export const AnswerQuestionDto = z.object({
  answerText: z.string().min(5).trim(),
  isPublic: z.boolean().default(false),
});
export type AnswerQuestionDto = z.infer<typeof AnswerQuestionDto>;

export const CreateClarificationDto = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10),
});
export type CreateClarificationDto = z.infer<typeof CreateClarificationDto>;

export const CreateAmendmentDto = z.object({
  amendmentNumber: z.number().int().min(1),
  changedFields: z.any(),
});
export type CreateAmendmentDto = z.infer<typeof CreateAmendmentDto>;

export const AssignReviewerDto = z.object({
  reviewerIds: z.array(z.string().uuid()).min(1),
});
export type AssignReviewerDto = z.infer<typeof AssignReviewerDto>;

export const SubmitReviewCommentDto = z.object({
  commentText: z.string().min(5),
  status: z.nativeEnum(TenderVersionStatus).optional(),
});
export type SubmitReviewCommentDto = z.infer<typeof SubmitReviewCommentDto>;

export const TenderCommitteeDto = z.object({
  userId: z.string().uuid(),
  role: z.enum(['Chairperson', 'Evaluator', 'Observer']),
});
export type TenderCommitteeDto = z.infer<typeof TenderCommitteeDto>;

export const SubmitEvaluationDto = z.object({
  evaluationType: z.enum(['technical', 'financial', 'overall']),
  criteriaName: z.string().min(2),
  weight: z.number().min(0).max(1),
  score: z.number().min(0),
  maxScore: z.number().int().min(1),
  passed: z.boolean().default(true),
  remarks: z.string().optional(),
});
export type SubmitEvaluationDto = z.infer<typeof SubmitEvaluationDto>;

export const TenderWatcherDto = z.object({
  notifyEmail: z.boolean().default(true),
  notifyInApp: z.boolean().default(true),
  notifySms: z.boolean().default(false),
});
export type TenderWatcherDto = z.infer<typeof TenderWatcherDto>;

export const TenderInvitationDto = z.object({
  email: z.string().email(),
  expiresDays: z.number().default(7),
});
export type TenderInvitationDto = z.infer<typeof TenderInvitationDto>;

export const TenderTemplateDto = z.object({
  templateScope: z.enum(['department', 'organization', 'personal']),
  departmentId: z.string().uuid().optional(),
  title: z.string().min(5),
  description: z.string().optional(),
  payload: z.any(),
});
export type TenderTemplateDto = z.infer<typeof TenderTemplateDto>;
