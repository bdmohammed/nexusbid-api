import { AppDataSource } from '../../config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { asyncHandler } from '../../core/asyncHandler';
import { paginationMeta, sendCreated, sendNoContent, sendOk } from '../../core/response';
import { Tender } from '../../database/entities/Tender';
import { TenderVersion } from '../../database/entities/TenderVersion';
import { generateUploadUrl } from '../../services/s3.service';
import { TenderLifecycleStatus, TenderPublicationStatus } from '../../types/enums';

import * as service from './tenders.service';
import { TenderWorkflowService } from './TenderWorkflowService';

import type { JwtPayload } from '../../types/express';
import type {
  AnswerQuestionDto,
  AssignReviewerDto,
  CreateAmendmentDto,
  CreateClarificationDto,
  CreateQuestionDto,
  CreateTenderDto,
  ParticipantIdParamDto,
  QuestionIdParamDto,
  RegisterDocumentDto,
  ReviewIdParamDto,
  SubmitEvaluationDto,
  SubmitReviewCommentDto,
  TenderCommitteeDto,
  TenderIdParamDto,
  TenderInvitationDto,
  TenderSearchQueryDto,
  TenderSlugParamDto,
  TenderTemplateDto,
  TenderWatcherDto,
  UpdateTenderDto,
  UpdateTenderStatusDto,
  UploadUrlDto,
} from './tenders.dto';

const getUserId = (req: { user?: unknown }): string => {
  const user = req.user as JwtPayload | undefined;
  if (!user?.userId) {
    throw new AppError(
      AppErrorMessage.USER_NOT_LOGGED_IN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }
  return user.userId;
};

// ─── Public ───────────────────────────────────────────────────────────────────

export const list = asyncHandler<{}, object, {}, TenderSearchQueryDto>(async (req, res) => {
  const params = req.query;
  const { tenders, total, page, limit } = await service.listTenders(params);
  return sendOk(res, tenders, 'OK', paginationMeta(total, page, limit));
});

export const getBySlug = asyncHandler<TenderSlugParamDto>(async (req, res) => {
  const { slug } = req.params;
  const { userId } = req.user as JwtPayload;
  const tender = await service.getTenderBySlug(slug, userId);
  return sendOk(res, tender);
});

export const getDownloadUrl = asyncHandler<TenderIdParamDto>(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const url = await service.getDownloadUrl(id, userId, req);
  return sendOk(res, { downloadUrl: url });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminList = asyncHandler(async (req, res) => {
  const page = parseInt((req.query.page as string | undefined) ?? '1', 10);
  const limit = parseInt((req.query.limit as string | undefined) ?? '20', 10);
  const status = req.query.status as string | undefined;

  // For admin panel listing, load all including versions
  const qb = AppDataSource.getRepository(TenderVersion)
    .createQueryBuilder('tv')
    .leftJoinAndSelect('tv.tender', 'tender')
    .leftJoinAndSelect('tv.category', 'category')
    .leftJoinAndSelect('tv.state', 'state')
    .orderBy('tv.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  if (status) {
    qb.where('tv.status = :status', { status });
  }

  const [versions, total] = await qb.getManyAndCount();
  return sendOk(res, versions, 'OK', paginationMeta(total, page, limit));
});

export const adminGetById = asyncHandler<TenderIdParamDto>(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const tender = await service.getTenderBySlug(id, userId);
  return sendOk(res, tender);
});

export const adminCreate = asyncHandler<{}, object, CreateTenderDto>(async (req, res) => {
  const dto = req.body;
  const userId = getUserId(req);
  const tender = await service.createTender(dto, userId);
  return sendCreated(res, tender, 'Tender created');
});

export const adminUpdate = asyncHandler<TenderIdParamDto, object, UpdateTenderDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const userId = getUserId(req);
    const tender = await service.updateTender(id, dto, userId);
    return sendOk(res, tender, 'Tender updated');
  },
);

export const adminUpdateStatus = asyncHandler<TenderIdParamDto, object, UpdateTenderStatusDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const userId = getUserId(req);
    const tender = await service.updateTenderStatus(id, dto, userId);
    return sendOk(res, tender, 'Status updated');
  },
);

export const adminDelete = asyncHandler<TenderIdParamDto>(async (req, res) => {
  const { id } = req.params;
  const tender = await AppDataSource.getRepository(Tender).findOne({ where: { id } });
  if (tender) {
    tender.status = TenderLifecycleStatus.ARCHIVED;
    await AppDataSource.getRepository(Tender).save(tender);
  }
  return sendNoContent(res);
});

export const adminGetUploadUrl = asyncHandler<{}, object, UploadUrlDto>(async (req, res) => {
  const { fileName } = req.body;
  const uploadUrlDetails = await generateUploadUrl(fileName);
  return sendOk(res, uploadUrlDetails);
});

export const adminRegisterDocument = asyncHandler<TenderIdParamDto, object, RegisterDocumentDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const userId = getUserId(req);
    const doc = await service.registerDocument(id, dto, userId);
    return sendCreated(res, doc, 'Document uploaded and scan initiated');
  },
);

export const getStatistics = asyncHandler(async (_req, res) => {
  const stats = await service.getTenderStatistics();
  return sendOk(res, stats);
});

export const cancelTender = asyncHandler<TenderIdParamDto>(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const tender = await service.updateTenderStatus(
    id,
    { publicationStatus: TenderPublicationStatus.CLOSED },
    userId,
  );
  tender.status = TenderLifecycleStatus.CANCELLED;
  await AppDataSource.getRepository(Tender).save(tender);
  return sendOk(res, tender, 'Tender cancelled');
});

export const duplicateTender = asyncHandler<TenderIdParamDto>(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const original = await AppDataSource.getRepository(Tender).findOne({
    where: { id },
    relations: ['activeVersion'],
  });
  if (!original?.activeVersion) {
    throw new AppError('Tender not found', HttpStatusCode.NOT_FOUND, AppErrorCode.NOT_FOUND);
  }

  const dto: CreateTenderDto = {
    title: `Copy of ${original.activeVersion.title}`,
    description: original.activeVersion.description,
    procurementType: original.activeVersion.procurementType ?? undefined,
    priority: original.activeVersion.priority,
    estimatedBudget: original.activeVersion.estimatedBudget ?? undefined,
    currency: original.activeVersion.currency,
    department: original.activeVersion.department ?? undefined,
    placeId: original.activeVersion.placeId ?? undefined,
    formattedAddress: original.activeVersion.formattedAddress ?? undefined,
    siteVisitRequired: original.activeVersion.siteVisitRequired,
    siteVisitDate: original.activeVersion.siteVisitDate?.toISOString() ?? null,
    siteVisitInstructions: original.activeVersion.siteVisitInstructions ?? undefined,
    contactPerson: original.activeVersion.contactPerson ?? undefined,
    contactDesignation: original.activeVersion.contactDesignation ?? undefined,
    contactEmail: original.activeVersion.contactEmail ?? undefined,
    contactPhone: original.activeVersion.contactPhone ?? undefined,
    contactAlternative: original.activeVersion.contactAlternative ?? undefined,
    openingDate: original.activeVersion.openingDate?.toISOString() ?? null,
    closingDate: original.activeVersion.closingDate?.toISOString() ?? null,
    bidValidity: original.activeVersion.bidValidity ?? undefined,
    projectDuration: original.activeVersion.projectDuration ?? undefined,
    emdAmount: original.activeVersion.emdAmount ?? undefined,
    securityDeposit: original.activeVersion.securityDeposit ?? undefined,
    paymentTerms: original.activeVersion.paymentTerms ?? undefined,
    visibility: original.activeVersion.visibility,
    evaluationMethod: original.activeVersion.evaluationMethod ?? undefined,
    submissionMethod: original.activeVersion.submissionMethod ?? undefined,
    contractType: original.activeVersion.contractType ?? undefined,
    procurementMethod: original.activeVersion.procurementMethod ?? undefined,
    eligibilityCriteria: original.activeVersion.eligibilityCriteria ?? undefined,
    specialConditions: original.activeVersion.specialConditions ?? undefined,
    categoryId: original.activeVersion.categoryId,
    stateId: original.activeVersion.stateId,
  };

  const copy = await service.createTender(dto, userId);
  return sendCreated(res, copy, 'Tender duplicated');
});

export const getDiff = asyncHandler<TenderIdParamDto>(async (req, res) => {
  const { id } = req.params;
  const versions = await service.getTenderVersions(id);
  if (versions.length < 2) {
    return sendOk(res, { added: {}, removed: {}, changed: {} }, 'No other version to compare');
  }
  const diff = TenderWorkflowService.compareVersions(
    versions[1] as TenderVersion,
    versions[0] as TenderVersion,
  );
  return sendOk(res, diff);
});

export const getHistory = asyncHandler<TenderIdParamDto>(async (req, res) => {
  const { id } = req.params;
  const versions = await service.getTenderVersions(id);
  return sendOk(res, versions);
});

export const scheduleTender = asyncHandler<TenderIdParamDto, object, { publicationDate: string }>(
  async (req, res) => {
    const { id } = req.params;
    const { publicationDate } = req.body;
    const userId = getUserId(req);
    const tender = await service.updateTenderStatus(
      id,
      { publicationStatus: TenderPublicationStatus.SCHEDULED },
      userId,
    );
    return sendOk(res, tender, `Tender scheduled for ${publicationDate}`);
  },
);

export const postQuestion = asyncHandler<TenderIdParamDto, object, CreateQuestionDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const userId = getUserId(req);
    const question = await service.askQuestion(id, dto, userId);
    return sendCreated(res, question, 'Question submitted');
  },
);

export const postAnswer = asyncHandler<QuestionIdParamDto, object, AnswerQuestionDto>(
  async (req, res) => {
    const dto = req.body;
    const { qId } = req.params;
    const userId = getUserId(req);
    const question = await service.answerQuestion(qId, dto, userId);
    return sendOk(res, question, 'Answer posted');
  },
);

export const postClarification = asyncHandler<TenderIdParamDto, object, CreateClarificationDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const userId = getUserId(req);
    const clar = await service.createClarification(id, dto, userId);
    return sendCreated(res, clar, 'Clarification published');
  },
);

export const postAmendment = asyncHandler<TenderIdParamDto, object, CreateAmendmentDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const userId = getUserId(req);
    const amend = await service.createAmendment(id, dto, userId);
    return sendCreated(res, amend, 'Amendment saved');
  },
);

export const assignReviewers = asyncHandler<TenderIdParamDto, object, AssignReviewerDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const review = await service.assignReviewers(id, dto);
    return sendCreated(res, review, 'Reviewers assigned');
  },
);

export const submitReviewComment = asyncHandler<ReviewIdParamDto, object, SubmitReviewCommentDto>(
  async (req, res) => {
    const dto = req.body;
    const { reviewId } = req.params;
    const userId = getUserId(req);
    const comment = await service.submitReviewComment(reviewId, dto, userId);
    return sendOk(res, comment, 'Review comment submitted');
  },
);

export const assignCommittee = asyncHandler<TenderIdParamDto, object, TenderCommitteeDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const comm = await service.assignCommitteeMember(id, dto);
    return sendCreated(res, comm, 'Committee member assigned');
  },
);

export const submitEvaluation = asyncHandler<ParticipantIdParamDto, object, SubmitEvaluationDto>(
  async (req, res) => {
    const dto = req.body;
    const { participantId } = req.params;
    const userId = getUserId(req);
    const evalRow = await service.submitEvaluation(participantId, dto, userId);
    return sendCreated(res, evalRow, 'Evaluation score recorded');
  },
);

export const toggleWatcher = asyncHandler<TenderIdParamDto, object, TenderWatcherDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const userId = getUserId(req);
    const watcherStatus = await service.toggleWatcher(id, userId, dto);
    return sendOk(res, watcherStatus);
  },
);

export const inviteVendor = asyncHandler<TenderIdParamDto, object, TenderInvitationDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const inv = await service.inviteVendor(id, dto);
    return sendCreated(res, inv, 'Invitation sent');
  },
);

export const saveTemplate = asyncHandler<{}, object, TenderTemplateDto>(async (req, res) => {
  const dto = req.body;
  const userId = getUserId(req);
  const tenderTemplate = await service.createTemplate(dto, userId);
  return sendCreated(res, tenderTemplate, 'Template saved');
});
