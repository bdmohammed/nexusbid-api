import { Request, Response } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { sendOk, sendCreated, sendNoContent, paginationMeta } from '../../core/response';
import { generateUploadUrl } from '../../services/s3.service';
import * as service from './tenders.service';
import { appDataSource } from '../../config/database';
import { Tender } from '../../entities/Tender';
import { TenderVersion } from '../../entities/TenderVersion';
import { TenderWorkflowService } from './TenderWorkflowService';
import { TenderLifecycleStatus, TenderPublicationStatus, TenderVersionStatus } from '../../types/enums';
import type {
  TenderSearchQueryDto,
  CreateTenderDto,
  UpdateTenderDto,
  UpdateTenderStatusDto,
  UploadUrlDto,
  RegisterDocumentDto,
  CreateQuestionDto,
  AnswerQuestionDto,
  CreateClarificationDto,
  CreateAmendmentDto,
  AssignReviewerDto,
  SubmitReviewCommentDto,
  TenderCommitteeDto,
  SubmitEvaluationDto,
  TenderWatcherDto,
  TenderInvitationDto,
  TenderTemplateDto,
} from './tenders.dto';

// ─── Public ───────────────────────────────────────────────────────────────────

export const list = asyncHandler(async (req: Request, res: Response) => {
  const params = req.validated as TenderSearchQueryDto;
  const { tenders, total, page, limit } = await service.listTenders(params);
  return sendOk(res, tenders, 'OK', paginationMeta(total, page, limit));
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const userId = req.user?.userId;
  const tender = await service.getTenderBySlug(slug, userId);
  return sendOk(res, tender);
});

export const getDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const url = await service.getDownloadUrl(id, req.user!.userId, req);
  return sendOk(res, { downloadUrl: url });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = parseInt(req.query['limit'] as string) || 20;
  const status = req.query['status'] as string | undefined;

  // For admin panel listing, load all including versions
  const qb = appDataSource.getRepository(TenderVersion)
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

export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tender = await service.getTenderBySlug(id, req.user?.userId);
  return sendOk(res, tender);
});

export const adminCreate = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateTenderDto;
  const tender = await service.createTender(dto, req.user!.userId);
  return sendCreated(res, tender, 'Tender created');
});

export const adminUpdate = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as UpdateTenderDto;
  const { id } = req.params;
  const tender = await service.updateTender(id, dto, req.user!.userId);
  return sendOk(res, tender, 'Tender updated');
});

export const adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as UpdateTenderStatusDto;
  const { id } = req.params;
  const tender = await service.updateTenderStatus(id, dto, req.user!.userId);
  return sendOk(res, tender, 'Status updated');
});

export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tender = await appDataSource.getRepository(Tender).findOne({ where: { id } });
  if (tender) {
    tender.status = TenderLifecycleStatus.ARCHIVED;
    await appDataSource.getRepository(Tender).save(tender);
  }
  return sendNoContent(res);
});

export const adminGetUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { fileName } = req.validated as UploadUrlDto;
  const uploadUrlDetails = await generateUploadUrl(fileName);
  return sendOk(res, uploadUrlDetails);
});

export const adminRegisterDocument = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as RegisterDocumentDto;
  const { id } = req.params;
  const doc = await service.registerDocument(id, dto, req.user!.userId);
  return sendCreated(res, doc, 'Document uploaded and scan initiated');
});

export const getStatistics = asyncHandler(async (req: Request, res: Response) => {
  const stats = await service.getTenderStatistics();
  return sendOk(res, stats);
});

export const cancelTender = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tender = await service.updateTenderStatus(id, { publicationStatus: TenderPublicationStatus.CLOSED }, req.user!.userId);
  tender.status = TenderLifecycleStatus.CANCELLED;
  await appDataSource.getRepository(Tender).save(tender);
  return sendOk(res, tender, 'Tender cancelled');
});

export const duplicateTender = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const original = await appDataSource.getRepository(Tender).findOne({
    where: { id },
    relations: ['activeVersion'],
  });
  if (!original || !original.activeVersion) {
    return res.status(404).json({ success: false, message: 'Tender not found' });
  }

  const dto: CreateTenderDto = {
    title: `Copy of ${original.activeVersion.title}`,
    description: original.activeVersion.description,
    procurementType: original.activeVersion.procurementType || undefined,
    priority: original.activeVersion.priority,
    estimatedBudget: original.activeVersion.estimatedBudget || undefined,
    currency: original.activeVersion.currency,
    department: original.activeVersion.department || undefined,
    placeId: original.activeVersion.placeId || undefined,
    formattedAddress: original.activeVersion.formattedAddress || undefined,
    siteVisitRequired: original.activeVersion.siteVisitRequired,
    siteVisitDate: original.activeVersion.siteVisitDate?.toISOString() || null,
    siteVisitInstructions: original.activeVersion.siteVisitInstructions || undefined,
    contactPerson: original.activeVersion.contactPerson || undefined,
    contactDesignation: original.activeVersion.contactDesignation || undefined,
    contactEmail: original.activeVersion.contactEmail || undefined,
    contactPhone: original.activeVersion.contactPhone || undefined,
    contactAlternative: original.activeVersion.contactAlternative || undefined,
    openingDate: original.activeVersion.openingDate?.toISOString() || null,
    closingDate: original.activeVersion.closingDate?.toISOString() || null,
    bidValidity: original.activeVersion.bidValidity || undefined,
    projectDuration: original.activeVersion.projectDuration || undefined,
    emdAmount: original.activeVersion.emdAmount || undefined,
    securityDeposit: original.activeVersion.securityDeposit || undefined,
    paymentTerms: original.activeVersion.paymentTerms || undefined,
    visibility: original.activeVersion.visibility,
    evaluationMethod: original.activeVersion.evaluationMethod || undefined,
    submissionMethod: original.activeVersion.submissionMethod || undefined,
    contractType: original.activeVersion.contractType || undefined,
    procurementMethod: original.activeVersion.procurementMethod || undefined,
    eligibilityCriteria: original.activeVersion.eligibilityCriteria || undefined,
    specialConditions: original.activeVersion.specialConditions || undefined,
    categoryId: original.activeVersion.categoryId,
    stateId: original.activeVersion.stateId,
  };

  const copy = await service.createTender(dto, req.user!.userId);
  return sendCreated(res, copy, 'Tender duplicated');
});

export const getDiff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const versions = await service.getTenderVersions(id);
  if (versions.length < 2) {
    return sendOk(res, { added: {}, removed: {}, changed: {} }, 'No other version to compare');
  }
  const diff = TenderWorkflowService.compareVersions(versions[1], versions[0]);
  return sendOk(res, diff);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const versions = await service.getTenderVersions(id);
  return sendOk(res, versions);
});

export const scheduleTender = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { publicationDate } = req.body;
  const tender = await service.updateTenderStatus(id, { publicationStatus: TenderPublicationStatus.SCHEDULED }, req.user!.userId);
  return sendOk(res, tender, `Tender scheduled for ${publicationDate}`);
});

export const postQuestion = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateQuestionDto;
  const { id } = req.params;
  const question = await service.askQuestion(id, dto, req.user!.userId);
  return sendCreated(res, question, 'Question submitted');
});

export const postAnswer = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as AnswerQuestionDto;
  const { qId: questionId } = req.params;
  const question = await service.answerQuestion(questionId, dto, req.user!.userId);
  return sendOk(res, question, 'Answer posted');
});

export const postClarification = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateClarificationDto;
  const { id } = req.params;
  const clar = await service.createClarification(id, dto, req.user!.userId);
  return sendCreated(res, clar, 'Clarification published');
});

export const postAmendment = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateAmendmentDto;
  const { id } = req.params;
  const amend = await service.createAmendment(id, dto, req.user!.userId);
  return sendCreated(res, amend, 'Amendment saved');
});

export const assignReviewers = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as AssignReviewerDto;
  const { id } = req.params;
  const review = await service.assignReviewers(id, dto);
  return sendCreated(res, review, 'Reviewers assigned');
});

export const submitReviewComment = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as SubmitReviewCommentDto;
  const { reviewId } = req.params;
  const comment = await service.submitReviewComment(reviewId, dto, req.user!.userId);
  return sendOk(res, comment, 'Review comment submitted');
});

export const assignCommittee = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as TenderCommitteeDto;
  const { id } = req.params;
  const comm = await service.assignCommitteeMember(id, dto);
  return sendCreated(res, comm, 'Committee member assigned');
});

export const submitEvaluation = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as SubmitEvaluationDto;
  const { participantId } = req.params;
  const evalRow = await service.submitEvaluation(participantId, dto, req.user!.userId);
  return sendCreated(res, evalRow, 'Evaluation score recorded');
});

export const toggleWatcher = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as TenderWatcherDto;
  const { id } = req.params;
  const watcherStatus = await service.toggleWatcher(id, req.user!.userId, dto);
  return sendOk(res, watcherStatus);
});

export const inviteVendor = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as TenderInvitationDto;
  const { id } = req.params;
  const inv = await service.inviteVendor(id, dto);
  return sendCreated(res, inv, 'Invitation sent');
});

export const saveTemplate = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as TenderTemplateDto;
  const tenderTemplate = await service.createTemplate(dto, req.user!.userId);
  return sendCreated(res, tenderTemplate, 'Template saved');
});
