import { AppDataSource } from "../../config/database";
import { Tender } from "../../database/entities/Tender";
import { Category } from "../../database/entities/Category";
import { TenderVersion } from "../../database/entities/TenderVersion";
import { TenderDocument } from "../../database/entities/TenderDocument";
import { TenderReview } from "../../database/entities/TenderReview";
import { TenderReviewAssignment } from "../../database/entities/TenderReviewAssignment";
import { TenderReviewComment } from "../../database/entities/TenderReviewComment";
import { TenderCommittee } from "../../database/entities/TenderCommittee";
import { TenderParticipant } from "../../database/entities/TenderParticipant";
import { TenderEvaluation } from "../../database/entities/TenderEvaluation";
import { TenderWatcher } from "../../database/entities/TenderWatcher";
import { TenderInvitation } from "../../database/entities/TenderInvitation";
import { TenderTemplate } from "../../database/entities/TenderTemplate";
import { TenderQuestion } from "../../database/entities/TenderQuestion";
import { TenderClarification } from "../../database/entities/TenderClarification";
import { TenderAmendment } from "../../database/entities/TenderAmendment";
import { EvaluationTemplate } from "../../database/entities/EvaluationTemplate";
import { DownloadHistory } from "../../database/entities/DownloadHistory";
import { AppError } from "../../core/AppError";
import {
  TenderLifecycleStatus,
  TenderVersionStatus,
  TenderPublicationStatus,
  CategoryStatus,
} from "../../types/enums";
import { hasAccessToTender } from "../../utils/access";
import { generateDownloadUrl } from "../../services/s3.service";
import { logger } from "../../config/logger";
import { domainEvents, TENDER_EVENTS } from "../../utils/domainEvents";
import type {
  CreateTenderDto,
  UpdateTenderDto,
  UpdateTenderStatusDto,
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
} from "./tenders.dto";
import type { Request } from "express";

const tenderRepo = AppDataSource.getRepository(Tender);
const versionRepo = AppDataSource.getRepository(TenderVersion);
const documentRepo = AppDataSource.getRepository(TenderDocument);
const reviewRepo = AppDataSource.getRepository(TenderReview);
const assignmentRepo = AppDataSource.getRepository(TenderReviewAssignment);
const commentRepo = AppDataSource.getRepository(TenderReviewComment);
const committeeRepo = AppDataSource.getRepository(TenderCommittee);
const participantRepo = AppDataSource.getRepository(TenderParticipant);
const evaluationRepo = AppDataSource.getRepository(TenderEvaluation);
const watcherRepo = AppDataSource.getRepository(TenderWatcher);
const invitationRepo = AppDataSource.getRepository(TenderInvitation);
const templateRepo = AppDataSource.getRepository(TenderTemplate);
const questionRepo = AppDataSource.getRepository(TenderQuestion);
const clarificationRepo = AppDataSource.getRepository(TenderClarification);
const amendmentRepo = AppDataSource.getRepository(TenderAmendment);
const downloadRepo = AppDataSource.getRepository(DownloadHistory);

// ─── Public: List Tenders ─────────────────────────────────────────────────────

export async function listTenders(params: {
  q?: string;
  categoryId?: string;
  stateId?: string;
  priority?: string;
  procurementType?: string;
  budgetMin?: number;
  budgetMax?: number;
  page?: number;
  limit?: number;
  sort?: "createdAt" | "closingDate" | "estimatedBudget";
  order?: "ASC" | "DESC";
}): Promise<{ tenders: any[]; total: number; page: number; limit: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const qb = tenderRepo
    .createQueryBuilder("tender")
    .leftJoinAndSelect("tender.activeVersion", "activeVersion")
    .leftJoinAndSelect("activeVersion.category", "category")
    .leftJoinAndSelect("activeVersion.state", "state")
    .where("tender.status = :status", { status: TenderLifecycleStatus.ACTIVE })
    .andWhere("tender.publicationStatus IN (:...pubStatuses)", {
      pubStatuses: [
        TenderPublicationStatus.PUBLISHED,
        TenderPublicationStatus.OPEN,
        TenderPublicationStatus.CLOSING,
      ],
    });

  if (params.q) {
    qb.andWhere(
      "(activeVersion.title ILIKE :q OR activeVersion.description ILIKE :q OR tender.referenceNo ILIKE :q)",
      {
        q: `%${params.q}%`,
      },
    );
  }

  if (params.categoryId) {
    const chosenCategory = await AppDataSource.getRepository(Category).findOne({
      where: { id: params.categoryId },
    });
    if (chosenCategory) {
      const subCategories = await AppDataSource.getRepository(Category).find({
        where: { status: CategoryStatus.ACTIVE },
        select: ["id", "path"],
      });
      const matchingIds = subCategories
        .filter(
          (c) =>
            c.path === chosenCategory.path ||
            (c.path && c.path.startsWith(`${chosenCategory.path}/`)),
        )
        .map((c) => c.id);

      if (matchingIds.length > 0) {
        qb.andWhere("activeVersion.categoryId IN (:...categoryIds)", {
          categoryIds: matchingIds,
        });
      } else {
        qb.andWhere("activeVersion.categoryId = :categoryId", {
          categoryId: params.categoryId,
        });
      }
    } else {
      qb.andWhere("activeVersion.categoryId = :categoryId", {
        categoryId: params.categoryId,
      });
    }
  }

  if (params.stateId) {
    qb.andWhere("activeVersion.stateId = :stateId", {
      stateId: params.stateId,
    });
  }

  if (params.priority) {
    qb.andWhere("activeVersion.priority = :priority", {
      priority: params.priority,
    });
  }

  if (params.procurementType) {
    qb.andWhere("activeVersion.procurementType = :procurementType", {
      procurementType: params.procurementType,
    });
  }

  if (params.budgetMin) {
    qb.andWhere("activeVersion.estimatedBudget >= :budgetMin", {
      budgetMin: params.budgetMin,
    });
  }

  if (params.budgetMax) {
    qb.andWhere("activeVersion.estimatedBudget <= :budgetMax", {
      budgetMax: params.budgetMax,
    });
  }

  const sortField = params.sort
    ? `activeVersion.${params.sort}`
    : "tender.createdAt";
  const sortOrder = params.order ?? "DESC";
  qb.orderBy(sortField, sortOrder);

  qb.skip((page - 1) * limit).take(limit);

  const [tenders, total] = await qb.getManyAndCount();

  // Map into flat structure for frontend previews
  const mapped = tenders.map((t) => ({
    id: t.id,
    referenceNumber: t.referenceNo,
    title: t.activeVersion?.title ?? "No Title Available",
    description: t.activeVersion?.description ?? "",
    procurementType: t.activeVersion?.procurementType ?? "",
    priority: t.activeVersion?.priority ?? "Medium",
    budgetMax: t.activeVersion?.estimatedBudget ?? 0,
    currency: t.activeVersion?.currency ?? "USD",
    openingDate: t.activeVersion?.openingDate ?? null,
    closingDate: t.activeVersion?.closingDate ?? null,
    status: t.publicationStatus,
    category: t.activeVersion?.category ?? null,
    state: t.activeVersion?.state ?? null,
  }));

  return { tenders: mapped, total, page, limit };
}

// ─── Public: Get Tender by Slug ───────────────────────────────────────────────

export async function getTenderBySlug(
  slug: string,
  userId?: string,
): Promise<{ tender: any; hasAccess: boolean }> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug,
    );

  const qb = tenderRepo
    .createQueryBuilder("tender")
    .leftJoinAndSelect("tender.activeVersion", "activeVersion")
    .leftJoinAndSelect("activeVersion.category", "category")
    .leftJoinAndSelect("activeVersion.state", "state")
    .leftJoinAndSelect("activeVersion.documents", "documents")
    .leftJoinAndSelect("tender.clarifications", "clarifications")
    .leftJoinAndSelect("tender.amendments", "amendments");

  if (isUuid) {
    qb.where("tender.id = :slug", { slug });
  } else {
    qb.where("tender.referenceNo = :slug", { slug });
  }

  const tender = await qb.getOne();

  if (!tender) {
    throw new AppError("Tender not found", 404, "NOT_FOUND");
  }

  let hasAccess = false;
  if (userId) {
    hasAccess = await hasAccessToTender(userId, tender.id);
  }

  const mapped = {
    id: tender.id,
    referenceNumber: tender.referenceNo,
    status: tender.status,
    publicationStatus: tender.publicationStatus,
    title: tender.activeVersion?.title ?? "",
    description: tender.activeVersion?.description ?? "",
    procurementType: tender.activeVersion?.procurementType ?? "",
    priority: tender.activeVersion?.priority ?? "Medium",
    budgetMax: tender.activeVersion?.estimatedBudget ?? 0,
    currency: tender.activeVersion?.currency ?? "USD",
    department: tender.activeVersion?.department ?? "",
    formattedAddress: tender.activeVersion?.formattedAddress ?? "",
    siteVisitRequired: tender.activeVersion?.siteVisitRequired ?? false,
    siteVisitDate: tender.activeVersion?.siteVisitDate ?? null,
    siteVisitInstructions: tender.activeVersion?.siteVisitInstructions ?? "",
    contactPerson: hasAccess ? tender.activeVersion?.contactPerson : null,
    contactEmail: hasAccess ? tender.activeVersion?.contactEmail : null,
    contactPhone: hasAccess ? tender.activeVersion?.contactPhone : null,
    openingDate: tender.activeVersion?.openingDate ?? null,
    closingDate: tender.activeVersion?.closingDate ?? null,
    projectDuration: tender.activeVersion?.projectDuration ?? "",
    bidValidity: tender.activeVersion?.bidValidity ?? 0,
    emdAmount: tender.activeVersion?.emdAmount ?? 0,
    securityDeposit: tender.activeVersion?.securityDeposit ?? 0,
    paymentTerms: tender.activeVersion?.paymentTerms ?? "",
    evaluationMethod: tender.activeVersion?.evaluationMethod ?? "",
    submissionMethod: tender.activeVersion?.submissionMethod ?? "",
    contractType: tender.activeVersion?.contractType ?? "",
    procurementMethod: tender.activeVersion?.procurementMethod ?? "",
    eligibility: tender.activeVersion?.eligibilityCriteria ?? "",
    specialConditions: tender.activeVersion?.specialConditions ?? "",
    category: tender.activeVersion?.category ?? null,
    state: tender.activeVersion?.state ?? null,
    documents: (tender.activeVersion?.documents ?? [])
      .filter((d: any) => d.isPublic || hasAccess)
      .map((d) => ({
        id: d.id,
        documentType: d.documentType,
        originalName: d.documentOriginalName,
        fileSize: d.fileSize,
        virusScanStatus: d.virusScanStatus,
        uploadedAt: d.uploadedAt,
      })),
    clarifications: tender.clarifications,
    amendments: tender.amendments,
  };

  return { tender: mapped, hasAccess };
}

// ─── Get Download URL ─────────────────────────────────────────────────────────

export async function getDownloadUrl(
  documentId: string,
  userId: string,
  req: Request,
): Promise<string> {
  const doc = await documentRepo.findOne({
    where: { id: documentId },
    relations: ["tenderVersion", "tenderVersion.tender"],
  });

  if (!doc) {
    throw new AppError("Document not found", 404, "NOT_FOUND");
  }

  const tenderId = doc.tenderVersion.tenderId;

  const allowed = await hasAccessToTender(userId, tenderId);
  if (!allowed && !doc.isPublic) {
    throw new AppError(
      "Access denied: Active subscription or purchase required",
      403,
      "ACCESS_DENIED",
    );
  }

  const url = await generateDownloadUrl(
    doc.documentS3Key,
    doc.documentOriginalName,
  );

  // Increment download counter
  doc.downloadCount += 1;
  await documentRepo.save(doc);

  // Log download history (non-blocking)
  setImmediate(() => {
    downloadRepo
      .save({
        userId,
        tenderId,
        fileName: doc.documentOriginalName,
        ipAddress: req.ip ?? null,
      })
      .catch(() => {
        /* silent */
      });
  });

  return url;
}

// Helper to validate category of a tender (must exist, be active, and be a leaf node)
async function validateTenderCategory(categoryId?: string): Promise<void> {
  if (!categoryId) return;
  const cat = await AppDataSource.getRepository(Category).findOne({
    where: { id: categoryId },
  });
  if (!cat) {
    throw new AppError(
      "Selected category not found",
      404,
      "CATEGORY_NOT_FOUND",
    );
  }
  if (cat.status !== CategoryStatus.ACTIVE) {
    throw new AppError(
      "Selected category is not active",
      400,
      "CATEGORY_INACTIVE",
    );
  }
  if (cat.activeChildren > 0) {
    throw new AppError(
      "Tenders can only be assigned to leaf-node categories. This category contains subcategories.",
      400,
      "CATEGORY_NOT_LEAF",
    );
  }
}

// ─── Admin: Create Tender ─────────────────────────────────────────────────────

export async function createTender(
  dto: CreateTenderDto,
  createdById: string,
): Promise<Tender> {
  if (dto.categoryId) {
    await validateTenderCategory(dto.categoryId);
  }
  // Generate sequence reference number
  const [{ nextval }] = await AppDataSource.query(
    "SELECT nextval('tender_ref_seq') as nextval",
  );
  const referenceNo = `TDR-${new Date().getFullYear()}-${String(nextval).padStart(6, "0")}`;

  const tender = tenderRepo.create({
    referenceNo,
    createdById,
    status: TenderLifecycleStatus.ACTIVE,
    publicationStatus: TenderPublicationStatus.SCHEDULED,
  });

  const savedTender = await tenderRepo.save(tender);

  const version = versionRepo.create({
    ...dto,
    tenderId: savedTender.id,
    version: 1,
    status: TenderVersionStatus.DRAFT,
    createdById,
  } as any) as unknown as TenderVersion;

  const savedVersion = await versionRepo.save(version);

  savedTender.activeVersionId = savedVersion.id;
  await tenderRepo.save(savedTender);

  return savedTender;
}

// ─── Admin: Update Tender ─────────────────────────────────────────────────────

export async function updateTender(
  id: string,
  dto: UpdateTenderDto,
  createdById: string,
): Promise<Tender> {
  if (dto.categoryId) {
    await validateTenderCategory(dto.categoryId);
  }
  const tender = await tenderRepo.findOne({
    where: { id },
    relations: ["activeVersion"],
  });

  if (!tender) {
    throw new AppError("Tender not found", 404, "NOT_FOUND");
  }

  let active = tender.activeVersion;
  if (!active) {
    throw new AppError("No active version found", 404, "NO_ACTIVE_VERSION");
  }

  // Concurrency Check (Optimistic Locking)
  if (dto.dbVersion !== undefined && active.dbVersion !== dto.dbVersion) {
    throw new AppError(
      "Conflict: Tender was modified by another user",
      409,
      "CONCURRENCY_CONFLICT",
    );
  }

  // If the active version is not in DRAFT mode, we must spawn a new version draft
  if (active.status !== TenderVersionStatus.DRAFT) {
    const nextVerNum = active.version + 1;
    const newVersion = versionRepo.create({
      ...active,
      ...dto,
      id: undefined, // Let DB generate new UUID
      version: nextVerNum,
      status: TenderVersionStatus.DRAFT,
      createdById,
      createdAt: new Date(),
    } as any) as unknown as TenderVersion;

    const savedVersion = await versionRepo.save(newVersion);

    // Copy documents to new version
    const docs = await documentRepo.find({
      where: { tenderVersionId: active.id },
    });
    for (const d of docs) {
      const copiedDoc = documentRepo.create({
        ...d,
        id: undefined,
        tenderVersionId: savedVersion.id,
      });
      await documentRepo.save(copiedDoc);
    }

    tender.activeVersionId = savedVersion.id;
    await tenderRepo.save(tender);

    return tender;
  }

  // Otherwise, we edit the existing draft version
  Object.assign(active, dto);
  await versionRepo.save(active);

  return tender;
}

// ─── Admin: Update Status ─────────────────────────────────────────────────────

export async function updateTenderStatus(
  id: string,
  dto: UpdateTenderStatusDto,
  actorId: string,
): Promise<Tender> {
  const tender = await tenderRepo.findOne({
    where: { id },
    relations: ["activeVersion"],
  });

  if (!tender) {
    throw new AppError("Tender not found", 404, "NOT_FOUND");
  }

  if (dto.status && tender.activeVersion) {
    tender.activeVersion.status = dto.status;
    await versionRepo.save(tender.activeVersion);
  }

  if (dto.publicationStatus) {
    tender.publicationStatus = dto.publicationStatus;
  }

  const savedTender = await tenderRepo.save(tender);

  // Dispatch decoupled domain events
  if (dto.status === TenderVersionStatus.SUBMITTED) {
    domainEvents.dispatch(TENDER_EVENTS.SUBMITTED, {
      tender: savedTender,
      actorId,
    });
  } else if (dto.status === TenderVersionStatus.APPROVED) {
    domainEvents.dispatch(TENDER_EVENTS.APPROVED, {
      tender: savedTender,
      actorId,
    });
  }

  return savedTender;
}

// ─── Admin: Statistics aggregations ──────────────────────────────────────────

export async function getTenderStatistics(): Promise<any> {
  const totalTenders = await tenderRepo.count();
  const draftCount = await versionRepo.count({
    where: { status: TenderVersionStatus.DRAFT },
  });
  const reviewCount = await versionRepo.count({
    where: { status: TenderVersionStatus.UNDER_REVIEW },
  });
  const publishedCount = await tenderRepo.count({
    where: { publicationStatus: TenderPublicationStatus.PUBLISHED },
  });

  const sumBudget = await versionRepo
    .createQueryBuilder("tv")
    .select("SUM(tv.estimated_budget)", "sum")
    .getRawOne();

  const totalParticipants = await participantRepo.count();

  return {
    totalTenders,
    draftCount,
    reviewCount,
    publishedCount,
    totalBudget: parseInt(sumBudget?.sum || "0", 10),
    totalParticipants,
  };
}

// ─── Document Upload Registration ─────────────────────────────────────────────

export async function registerDocument(
  tenderId: string,
  dto: RegisterDocumentDto,
  userId: string,
): Promise<TenderDocument> {
  const tender = await tenderRepo.findOne({
    where: { id: tenderId },
    relations: ["activeVersion"],
  });

  if (!tender || !tender.activeVersion) {
    throw new AppError("Tender active version not found", 404, "NOT_FOUND");
  }

  const doc = documentRepo.create({
    tenderVersionId: tender.activeVersion.id,
    documentType: dto.documentType,
    documentS3Key: dto.s3Key,
    documentS3Bucket: dto.bucket,
    documentOriginalName: dto.originalName,
    mimeType: dto.mimeType || "application/pdf",
    fileSize: dto.fileSize || 0,
    checksum: dto.checksum || null,
    virusScanStatus: "Scanning", // Initiate scan state
    isPublic: dto.isPublic,
    uploadedById: userId,
  });

  const saved = await documentRepo.save(doc);

  // Stub background virus scanner simulation
  setImmediate(() => {
    setTimeout(async () => {
      saved.virusScanStatus = "Clean";
      await documentRepo.save(saved);
      logger.info(
        { docId: saved.id },
        "Mock malware virus scan complete: CLEAN",
      );
    }, 5000);
  });

  return saved;
}

// ─── Question & Answers ───────────────────────────────────────────────────────

export async function askQuestion(
  tenderId: string,
  dto: CreateQuestionDto,
  vendorId: string,
): Promise<TenderQuestion> {
  const question = questionRepo.create({
    tenderId,
    vendorId,
    questionText: dto.questionText,
    isPublic: false,
  });

  return questionRepo.save(question);
}

export async function answerQuestion(
  questionId: string,
  dto: AnswerQuestionDto,
  answeredById: string,
): Promise<TenderQuestion> {
  const question = await questionRepo.findOne({ where: { id: questionId } });
  if (!question) {
    throw new AppError("Question not found", 404, "NOT_FOUND");
  }

  question.answerText = dto.answerText;
  question.isPublic = dto.isPublic;
  question.answeredById = answeredById;
  question.answeredAt = new Date();

  return questionRepo.save(question);
}

// ─── Clarifications ─────────────────────────────────────────────────────────

export async function createClarification(
  tenderId: string,
  dto: CreateClarificationDto,
  createdById: string,
): Promise<TenderClarification> {
  const clar = clarificationRepo.create({
    tenderId,
    title: dto.title,
    description: dto.description,
    createdById,
  });

  return clarificationRepo.save(clar);
}

// ─── Amendments ─────────────────────────────────────────────────────────────

export async function createAmendment(
  tenderId: string,
  dto: CreateAmendmentDto,
  createdById: string,
): Promise<TenderAmendment> {
  const amend = amendmentRepo.create({
    tenderId,
    amendmentNumber: dto.amendmentNumber,
    changedFields: dto.changedFields,
    publishedById: createdById,
  } as any) as unknown as TenderAmendment;

  return amendmentRepo.save(amend);
}

// ─── Committee Assignments ───────────────────────────────────────────────────

export async function assignCommitteeMember(
  tenderId: string,
  dto: TenderCommitteeDto,
): Promise<TenderCommittee> {
  const comm = committeeRepo.create({
    tenderId,
    userId: dto.userId,
    role: dto.role,
  });

  return committeeRepo.save(comm);
}

// ─── Bid Evaluations ──────────────────────────────────────────────────────────

export async function submitEvaluation(
  participantId: string,
  dto: SubmitEvaluationDto,
  evaluatedById: string,
): Promise<TenderEvaluation> {
  const templateRepo = AppDataSource.getRepository(EvaluationTemplate);
  let template = await templateRepo.findOne({
    where: { name: dto.criteriaName },
  });
  if (!template) {
    template = templateRepo.create({
      name: dto.criteriaName,
      description: `Auto-generated template for ${dto.criteriaName}`,
      defaultWeight: dto.weight,
      maxScore: dto.maxScore,
    });
    await templateRepo.save(template);
  }

  const evalRow = evaluationRepo.create({
    participantId,
    evaluationType: dto.evaluationType,
    evaluationTemplateId: template.id,
    weight: dto.weight,
    score: dto.score,
    maxScore: dto.maxScore,
    passed: dto.passed,
    remarks: dto.remarks || null,
    evaluatedById,
  } as any) as unknown as TenderEvaluation;

  return evaluationRepo.save(evalRow);
}

// ─── Review Assignments & Review comments ───────────────────────────────────

export async function assignReviewers(
  tenderId: string,
  dto: AssignReviewerDto,
): Promise<TenderReview> {
  const tender = await tenderRepo.findOne({
    where: { id: tenderId },
    relations: ["activeVersion"],
  });

  if (!tender || !tender.activeVersion) {
    throw new AppError("Tender active version not found", 404, "NOT_FOUND");
  }

  // Create review session
  const review = reviewRepo.create({
    tenderVersionId: tender.activeVersion.id,
    status: "assigned",
  });

  const savedReview = await reviewRepo.save(review);

  for (const reviewerId of dto.reviewerIds) {
    const assign = assignmentRepo.create({
      reviewId: savedReview.id,
      reviewerId,
    });
    await assignmentRepo.save(assign);
  }

  // Transition version status to REVIEW_ASSIGNED
  tender.activeVersion.status = TenderVersionStatus.REVIEW_ASSIGNED;
  await versionRepo.save(tender.activeVersion);

  return savedReview;
}

export async function submitReviewComment(
  reviewId: string,
  dto: SubmitReviewCommentDto,
  authorId: string,
): Promise<TenderReviewComment> {
  const review = await reviewRepo.findOne({
    where: { id: reviewId },
    relations: ["tenderVersion", "tenderVersion.tender"],
  });

  if (!review) {
    throw new AppError("Review session not found", 404, "NOT_FOUND");
  }

  const comment = commentRepo.create({
    reviewId,
    authorId,
    commentText: dto.commentText,
  });

  const savedComment = await commentRepo.save(comment);

  if (dto.status) {
    review.status = dto.status.toLowerCase();
    await reviewRepo.save(review);

    // Update version status
    review.tenderVersion.status = dto.status;
    await versionRepo.save(review.tenderVersion);
  }

  return savedComment;
}

// ─── Watchers ───────────────────────────────────────────────────────────────

export async function toggleWatcher(
  tenderId: string,
  userId: string,
  dto: TenderWatcherDto,
): Promise<any> {
  const existing = await watcherRepo.findOne({ where: { tenderId, userId } });

  if (existing) {
    await watcherRepo.remove(existing);
    return { watching: false };
  }

  const channels: string[] = [];
  if (dto.notifyEmail) channels.push("EMAIL");
  if (dto.notifyInApp) channels.push("IN_APP");
  if (dto.notifySms) channels.push("SMS");

  const watcher = watcherRepo.create({
    tenderId,
    userId,
    channels,
  } as any) as unknown as TenderWatcher;

  await watcherRepo.save(watcher);
  return { watching: true };
}

// ─── Invitations ────────────────────────────────────────────────────────────

export async function inviteVendor(
  tenderId: string,
  dto: TenderInvitationDto,
): Promise<TenderInvitation> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + dto.expiresDays);

  const inv = invitationRepo.create({
    tenderId,
    email: dto.email,
    status: "invited",
    expiresAt,
  });

  return invitationRepo.save(inv);
}

// ─── Templates ──────────────────────────────────────────────────────────────

export async function createTemplate(
  dto: TenderTemplateDto,
  userId: string,
): Promise<TenderTemplate> {
  const temp = templateRepo.create({
    templateScope: dto.templateScope,
    departmentId: dto.departmentId || null,
    title: dto.title,
    description: dto.description || null,
    payload: dto.payload,
    createdById: userId,
  });

  return templateRepo.save(temp);
}

// ─── Diff / Version comparison ───────────────────────────────────────────────

export async function getTenderVersions(
  tenderId: string,
): Promise<TenderVersion[]> {
  return versionRepo.find({
    where: { tenderId },
    order: { version: "DESC" },
  });
}
