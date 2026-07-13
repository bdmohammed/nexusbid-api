import { AppDataSource } from "../../config/database";
import { Category } from "../../database/entities/Category";
import { CategoryVersion } from "../../database/entities/CategoryVersion";
import { CategoryReview } from "../../database/entities/CategoryReview";
import { CategoryReviewAssignment } from "../../database/entities/CategoryReviewAssignment";
import { CategoryReviewComment } from "../../database/entities/CategoryReviewComment";
import { User } from "../../database/entities/User";
import { TenderVersion } from "../../database/entities/TenderVersion";
import { AppError } from "../../core/AppError";
import {
  CategoryStatus,
  CategoryWorkflowStatus,
  CategoryReviewStatus,
  CategoryReviewAssignmentStatus,
  ReviewPolicy,
} from "../../types/enums";
import { generateSlug } from "../../utils/slug";
import { CacheService } from "../../services/cache.service";
import { EntityManager } from "typeorm";

const categoryRepo = AppDataSource.getRepository(Category);
const versionRepo = AppDataSource.getRepository(CategoryVersion);
const reviewRepo = AppDataSource.getRepository(CategoryReview);
const assignmentRepo = AppDataSource.getRepository(CategoryReviewAssignment);
const commentRepo = AppDataSource.getRepository(CategoryReviewComment);

export class CategoriesService {
  /**
   * Generates a unique CAT-000000 style code.
   */
  public static async generateCode(
    entityManager?: EntityManager,
  ): Promise<string> {
    const repo = entityManager
      ? entityManager.getRepository(Category)
      : categoryRepo;
    const lastCategory = await repo.findOne({
      where: {},
      order: { code: "DESC" },
      withDeleted: true,
    });

    let nextNumber = 1;
    if (lastCategory && lastCategory.code.startsWith("CAT-")) {
      const numPart = lastCategory.code.replace("CAT-", "");
      const parsedNum = parseInt(numPart, 10);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    } else if (lastCategory) {
      // Fallback for older numerical codes
      const parsedNum = parseInt(lastCategory.code, 10);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }

    return `CAT-${String(nextNumber).padStart(6, "0")}`;
  }

  /**
   * Generates a unique slug among active categories.
   */
  public static async generateUniqueSlug(
    name: string,
    categoryId?: string,
    entityManager?: EntityManager,
  ): Promise<string> {
    const baseSlug = generateSlug(name);
    const repo = entityManager
      ? entityManager.getRepository(CategoryVersion)
      : versionRepo;

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      // Find if slug is taken by any active version of a DIFFERENT category
      const qb = repo
        .createQueryBuilder("cv")
        .innerJoin("cv.category", "c")
        .where("cv.slug = :slug", { slug })
        .andWhere("c.status = :status", { status: CategoryStatus.ACTIVE });

      if (categoryId) {
        qb.andWhere("cv.categoryId != :categoryId", { categoryId });
      }

      const exists = await qb.getOne();
      if (!exists) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Validates hierarchy rules:
   * 1. Max Depth = 10 levels
   * 2. Circular dependencies
   * 3. Sibling name uniqueness
   */
  public static async validateHierarchy(
    categoryId: string | null,
    parentId: string | null,
    name: string,
    entityManager: EntityManager,
  ): Promise<void> {
    const catRepo = entityManager.getRepository(Category);

    // 1. Trace parent hierarchy for depth and circular check
    if (parentId) {
      if (categoryId && parentId === categoryId) {
        throw new AppError(
          "A category cannot be its own parent.",
          400,
          "CIRCULAR_DEPENDENCY",
        );
      }

      let currentParentId: string | null = parentId;
      let depth = 1; // parentId counts as level 1 above the category itself

      while (currentParentId) {
        if (categoryId && currentParentId === categoryId) {
          throw new AppError(
            "Circular dependency detected. Parent category is a descendant.",
            400,
            "CIRCULAR_DEPENDENCY",
          );
        }

        const parent = await catRepo.findOne({
          where: { id: currentParentId },
        });
        if (!parent) {
          throw new AppError(
            "Parent category not found.",
            404,
            "PARENT_NOT_FOUND",
          );
        }

        depth++;
        currentParentId = parent.parentId;
      }

      // Check max depth (if depth is e.g. 10, then the new category will be at level 10, which violates <= 9 index-0)
      if (depth >= 10) {
        throw new AppError(
          "Exceeds maximum hierarchy depth of 10 levels.",
          400,
          "MAX_DEPTH_EXCEEDED",
        );
      }
    }

    // 2. Sibling name uniqueness (Case-insensitive check among active categories under the same parent)
    const siblingVersionsQb = entityManager
      .getRepository(CategoryVersion)
      .createQueryBuilder("cv")
      .innerJoin("cv.category", "c")
      .where("c.parent_id IS NOT DISTINCT FROM :parentId", { parentId })
      .andWhere("c.status = :status", { status: CategoryStatus.ACTIVE })
      .andWhere("LOWER(cv.name) = LOWER(:name)", { name });

    if (categoryId) {
      siblingVersionsQb.andWhere("c.id != :categoryId", { categoryId });
    }

    const duplicate = await siblingVersionsQb.getOne();
    if (duplicate) {
      throw new AppError(
        `A sibling category with the name "${name}" already exists.`,
        400,
        "DUPLICATE_SIBLING_NAME",
      );
    }
  }

  /**
   * Recalculates level, path, and descendant trees recursively after parent updates.
   */
  public static async updateDescendantsPaths(
    category: Category,
    entityManager: EntityManager,
  ): Promise<void> {
    const catRepo = entityManager.getRepository(Category);

    // Load active children
    const children = await catRepo.find({
      where: { parentId: category.id, status: CategoryStatus.ACTIVE },
    });

    for (const child of children) {
      child.level = category.level + 1;
      child.path = `${category.path}/${child.code}`;
      await catRepo.save(child);
      await this.updateDescendantsPaths(child, entityManager);
    }
  }

  /**
   * Updates cached counters for a node and all of its ancestors up to root.
   */
  public static async updateCachedCounters(
    categoryId: string | null,
    entityManager: EntityManager,
  ): Promise<void> {
    if (!categoryId) return;

    const catRepo = entityManager.getRepository(Category);
    const category = await catRepo.findOne({ where: { id: categoryId } });
    if (!category) return;

    // 1. Count active tenders directly assigned to this leaf node
    const tenderCount = await entityManager
      .getRepository(TenderVersion)
      .createQueryBuilder("tv")
      .innerJoin("tv.tender", "t")
      .where("tv.categoryId = :categoryId", { categoryId })
      .andWhere("t.status = :tStatus", { tStatus: "ACTIVE" }) // Active tenders only
      .getCount();

    // 2. Count children
    const childrenCount = await catRepo.count({
      where: { parentId: categoryId },
    });

    const activeChildren = await catRepo.count({
      where: { parentId: categoryId, status: CategoryStatus.ACTIVE },
    });

    category.tenderCount = tenderCount;
    category.childrenCount = childrenCount;
    category.activeChildren = activeChildren;

    await catRepo.save(category);

    // Recurse up to root
    if (category.parentId) {
      await this.updateCachedCounters(category.parentId, entityManager);
    }
  }

  /**
   * Creates a new inactive category and its V1 draft version.
   */
  public static async createCategory(
    dto: any,
    creatorId: string,
  ): Promise<Category> {
    return await AppDataSource.transaction(async (em) => {
      const catRepo = em.getRepository(Category);
      const verRepo = em.getRepository(CategoryVersion);

      const code = await this.generateCode(em);
      const slug = await this.generateUniqueSlug(dto.name, undefined, em);

      // Validate validations
      await this.validateHierarchy(null, dto.parentId || null, dto.name, em);

      // Set level and path temporarily as if root (recalculated on approval anyway)
      let level = 0;
      let path = `/${code}`;

      if (dto.parentId) {
        const parent = await catRepo.findOne({ where: { id: dto.parentId } });
        if (parent) {
          level = parent.level + 1;
          path = `${parent.path}/${code}`;
        }
      }

      // Create Category
      const category = catRepo.create({
        code,
        status: CategoryStatus.INACTIVE,
        parentId: dto.parentId || null,
        level,
        path,
        sortOrder: dto.sortOrder ?? 0,
        isSystem: dto.isSystem ?? false,
        displayOrder: dto.displayOrder ?? 0,
        icon: dto.icon || null,
        color: dto.color || null,
        createdBy: creatorId,
        updatedBy: creatorId,
      });

      const savedCategory = await catRepo.save(category);

      // Create CategoryVersion (Draft)
      const version = verRepo.create({
        categoryId: savedCategory.id,
        version: 1,
        name: dto.name,
        description: dto.description || null,
        slug,
        parentId: dto.parentId || null,
        seo: dto.seo || null,
        metadata: dto.metadata || null,
        createdByUserId: creatorId,
      });

      await verRepo.save(version);
      return savedCategory;
    });
  }

  /**
   * Modifies category data by updating or spawning a new draft version.
   */
  public static async updateCategory(
    id: string,
    dto: any,
    updaterId: string,
  ): Promise<Category> {
    return await AppDataSource.transaction(async (em) => {
      const catRepo = em.getRepository(Category);
      const verRepo = em.getRepository(CategoryVersion);
      const revRepo = em.getRepository(CategoryReview);

      const category = await catRepo.findOne({ where: { id } });
      if (!category) {
        throw new AppError("Category not found.", 404, "NOT_FOUND");
      }

      // Get highest version
      const highestVersion = await verRepo.findOne({
        where: { categoryId: id },
        order: { version: "DESC" },
      });

      if (!highestVersion) {
        throw new AppError(
          "Category has no version history.",
          500,
          "NO_VERSION_HISTORY",
        );
      }

      // Check if highest version has a pending review
      const pendingReview = await revRepo.findOne({
        where: {
          categoryVersionId: highestVersion.id,
          status: CategoryReviewStatus.PENDING,
        },
      });

      let draftVersion: CategoryVersion;

      if (pendingReview || category.activeVersionId === highestVersion.id) {
        // Active or pending under review: spawn next version
        draftVersion = verRepo.create({
          categoryId: id,
          version: highestVersion.version + 1,
          name: dto.name !== undefined ? dto.name : highestVersion.name,
          description:
            dto.description !== undefined
              ? dto.description
              : highestVersion.description,
          slug: highestVersion.slug,
          parentId:
            dto.parentId !== undefined ? dto.parentId : highestVersion.parentId,
          seo: dto.seo !== undefined ? dto.seo : highestVersion.seo,
          metadata:
            dto.metadata !== undefined ? dto.metadata : highestVersion.metadata,
          createdByUserId: updaterId,
        });
      } else {
        // Exists a non-active draft/rejected version, update it in place
        draftVersion = highestVersion;
        if (dto.name !== undefined) draftVersion.name = dto.name;
        if (dto.description !== undefined)
          draftVersion.description = dto.description;
        if (dto.parentId !== undefined) draftVersion.parentId = dto.parentId;
        if (dto.seo !== undefined) draftVersion.seo = dto.seo;
        if (dto.metadata !== undefined) draftVersion.metadata = dto.metadata;
        draftVersion.createdByUserId = updaterId;
      }

      // Check name uniqueness/hierarchy
      await this.validateHierarchy(
        id,
        draftVersion.parentId,
        draftVersion.name,
        em,
      );

      // Generate slug
      draftVersion.slug = await this.generateUniqueSlug(
        draftVersion.name,
        id,
        em,
      );

      await verRepo.save(draftVersion);

      // Update structural fields directly editable on Category (non-versioned layout updates)
      if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
      if (dto.isSystem !== undefined) category.isSystem = dto.isSystem;
      if (dto.displayOrder !== undefined)
        category.displayOrder = dto.displayOrder;
      if (dto.icon !== undefined) category.icon = dto.icon;
      if (dto.color !== undefined) category.color = dto.color;
      category.updatedBy = updaterId;

      return await catRepo.save(category);
    });
  }

  /**
   * Submits a category version for review.
   */
  public static async submitVersion(
    categoryId: string,
    versionId: string,
    reviewerIds: string[],
    submitterId: string,
  ): Promise<CategoryReview> {
    return await AppDataSource.transaction(async (em) => {
      const catRepo = em.getRepository(Category);
      const verRepo = em.getRepository(CategoryVersion);
      const revRepo = em.getRepository(CategoryReview);
      const assRepo = em.getRepository(CategoryReviewAssignment);
      const comRepo = em.getRepository(CategoryReviewComment);

      const category = await catRepo.findOne({ where: { id: categoryId } });
      const version = await verRepo.findOne({ where: { id: versionId } });

      if (!category || !version) {
        throw new AppError("Category or version not found.", 404, "NOT_FOUND");
      }

      // Check if there is already a pending review for this version
      const existing = await revRepo.findOne({
        where: {
          categoryVersionId: versionId,
          status: CategoryReviewStatus.PENDING,
        },
      });
      if (existing) {
        throw new AppError(
          "This version is already submitted for review.",
          400,
          "ALREADY_SUBMITTED",
        );
      }

      // Create Review
      const review = revRepo.create({
        categoryId,
        categoryVersionId: versionId,
        status: CategoryReviewStatus.PENDING,
        policy: ReviewPolicy.SINGLE_APPROVER, // Configurable default
      });

      const savedReview = await revRepo.save(review);

      // Create assignments
      for (const reviewerId of reviewerIds) {
        const assignment = assRepo.create({
          reviewId: savedReview.id,
          reviewerId,
          status: CategoryReviewAssignmentStatus.PENDING,
        });
        await assRepo.save(assignment);
      }

      // Create comment log
      const comment = comRepo.create({
        reviewId: savedReview.id,
        userId: submitterId,
        action: "SUBMIT",
        comment: `Submitted version ${version.version} for review.`,
      });
      await comRepo.save(comment);

      return savedReview;
    });
  }

  /**
   * Submits a reviewer's decision on a category review.
   */
  public static async reviewVersion(
    reviewId: string,
    decisionDto: any,
    reviewerId: string,
  ): Promise<CategoryReview> {
    return await AppDataSource.transaction(async (em) => {
      const revRepo = em.getRepository(CategoryReview);
      const assRepo = em.getRepository(CategoryReviewAssignment);
      const comRepo = em.getRepository(CategoryReviewComment);
      const catRepo = em.getRepository(Category);
      const verRepo = em.getRepository(CategoryVersion);

      const review = await revRepo.findOne({
        where: { id: reviewId },
        relations: ["categoryVersion"],
      });
      if (!review || review.status !== CategoryReviewStatus.PENDING) {
        throw new AppError(
          "Active review session not found.",
          404,
          "NOT_FOUND",
        );
      }

      // Find reviewer's assignment
      const assignment = await assRepo.findOne({
        where: { reviewId, reviewerId },
      });

      if (!assignment) {
        throw new AppError(
          "You are not assigned as a reviewer to this session.",
          403,
          "FORBIDDEN",
        );
      }

      // Update assignment
      assignment.status = decisionDto.action as CategoryReviewAssignmentStatus;
      assignment.reviewedAt = new Date();
      await assRepo.save(assignment);

      // Add comment log
      const comment = comRepo.create({
        reviewId,
        userId: reviewerId,
        action: decisionDto.action,
        comment: decisionDto.comment,
      });
      await comRepo.save(comment);

      // Evaluate review status under policy
      if (decisionDto.action === "APPROVE") {
        // SINGLE_APPROVER policy: one approval is enough
        review.status = CategoryReviewStatus.APPROVED;
        await revRepo.save(review);

        // ACTIVATE the version changes in the tree!
        const category = await catRepo.findOne({
          where: { id: review.categoryId },
        });
        if (category) {
          const version = review.categoryVersion;
          const oldParentId = category.parentId;

          category.activeVersionId = version.id;
          category.parentId = version.parentId;
          category.status = CategoryStatus.ACTIVE;
          category.approvedBy = reviewerId;

          // Re-parent level and path
          if (version.parentId) {
            const parent = await catRepo.findOne({
              where: { id: version.parentId },
            });
            if (parent) {
              category.level = parent.level + 1;
              category.path = `${parent.path}/${category.code}`;
            }
          } else {
            category.level = 0;
            category.path = `/${category.code}`;
          }

          await catRepo.save(category);

          // Recalculate paths/levels of all active children
          await this.updateDescendantsPaths(category, em);

          // Update cached counters
          await this.updateCachedCounters(category.id, em);
          if (oldParentId && oldParentId !== category.parentId) {
            await this.updateCachedCounters(oldParentId, em);
          }

          // Invalidate Redis cache
          CacheService.invalidateBackground("nexusbid:category_tree");
        }
      } else if (decisionDto.action === "REJECT") {
        review.status = CategoryReviewStatus.REJECTED;
        await revRepo.save(review);
      } else if (decisionDto.action === "CHANGES_REQUESTED") {
        review.status = CategoryReviewStatus.CHANGES_REQUESTED;
        await revRepo.save(review);
      }

      return review;
    });
  }

  /**
   * Merges Category A into Category B. Moves tenders, archives A.
   */
  public static async mergeCategories(
    sourceId: string,
    targetId: string,
    adminId: string,
  ): Promise<void> {
    return await AppDataSource.transaction(async (em) => {
      const catRepo = em.getRepository(Category);

      const source = await catRepo.findOne({ where: { id: sourceId } });
      const target = await catRepo.findOne({ where: { id: targetId } });

      if (!source || !target) {
        throw new AppError(
          "Source or target category not found.",
          404,
          "NOT_FOUND",
        );
      }

      if (
        source.status !== CategoryStatus.ACTIVE ||
        target.status !== CategoryStatus.ACTIVE
      ) {
        throw new AppError(
          "Both source and target categories must be ACTIVE to merge.",
          400,
          "INVALID_STATUS",
        );
      }

      // Target must be a leaf category (no children)
      const childCount = await catRepo.count({
        where: { parentId: targetId, status: CategoryStatus.ACTIVE },
      });
      if (childCount > 0) {
        throw new AppError(
          "Tenders can only be assigned to leaf categories. Target is not a leaf node.",
          400,
          "TARGET_NOT_LEAF",
        );
      }

      // Re-assign tenders
      await em
        .getRepository(TenderVersion)
        .createQueryBuilder()
        .update(TenderVersion)
        .set({ categoryId: targetId })
        .where("categoryId = :sourceId", { sourceId })
        .execute();

      // Archive source
      source.status = CategoryStatus.ARCHIVED;
      source.updatedBy = adminId;
      await catRepo.save(source);

      // Recalculate counters
      await this.updateCachedCounters(targetId, em);
      await this.updateCachedCounters(sourceId, em);
      if (source.parentId) {
        await this.updateCachedCounters(source.parentId, em);
      }

      // Invalidate cache
      CacheService.invalidateBackground("nexusbid:category_tree");
    });
  }

  /**
   * List all categories, flat or tree. Join active versions.
   */
  public static async listCategories(query: any): Promise<any> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = categoryRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.activeVersion", "av")
      .leftJoin("c.tenders", "t")
      .leftJoinAndSelect("c.createdByUser", "creator")
      .select([
        "c.id",
        "c.code",
        "c.status",
        "c.activeVersionId",
        "c.parentId",
        "c.level",
        "c.path",
        "c.sortOrder",
        "c.tenderCount",
        "c.childrenCount",
        "c.activeChildren",
        "c.isSystem",
        "c.displayOrder",
        "c.icon",
        "c.color",
        "c.dbVersion",
        "c.createdAt",
        "c.updatedAt",
        "av.id",
        "av.name",
        "av.description",
        "av.slug",
        "av.seo",
        "av.metadata",
        "creator.id",
        "creator.name",
        "creator.email",
      ]);

    if (query.status) {
      qb.andWhere("c.status = :status", { status: query.status });
    } else {
      qb.andWhere("c.status != :status", { status: CategoryStatus.ARCHIVED });
    }

    if (query.code) {
      qb.andWhere("c.code = :code", { code: query.code });
    }

    if (query.createdBy) {
      qb.andWhere("c.createdBy = :createdBy", { createdBy: query.createdBy });
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere("(c.code ILIKE :search OR av.name ILIKE :search)", {
        search: searchPattern,
      });
    }

    qb.orderBy("c.level", "ASC")
      .addOrderBy("c.sortOrder", "ASC")
      .addOrderBy("c.displayOrder", "ASC")
      .addOrderBy("c.code", "ASC");

    // If query.tree is requested, fetch all and return hierarchical tree
    if (query.tree) {
      const all = await qb.getMany();
      // Map versions into top level category fields for backward compatibility
      const mapped = all.map((c) => this.mapCategoryFields(c));
      return { categories: buildTree(mapped, null), total: mapped.length };
    }

    const total = await qb.getCount();
    qb.offset(skip).limit(limit);
    const entities = await qb.getMany();

    const categories = entities.map((c) => this.mapCategoryFields(c));
    return { categories, total };
  }

  /**
   * Recursively builds tree.
   */
  public static async getCategoryTree(): Promise<any[]> {
    const cacheKey = "nexusbid:category_tree";
    const cached = await CacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const allActive = await categoryRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.activeVersion", "av")
      .where("c.status = :status", { status: CategoryStatus.ACTIVE })
      .orderBy("c.level", "ASC")
      .addOrderBy("c.sortOrder", "ASC")
      .addOrderBy("c.displayOrder", "ASC")
      .addOrderBy("c.code", "ASC")
      .getMany();

    const mapped = allActive.map((c) => this.mapCategoryFields(c));
    const tree = buildTree(mapped, null);

    // Cache for 1 hour
    await CacheService.set(cacheKey, tree, 3600);
    return tree;
  }

  /**
   * Helper to map CategoryVersion details onto the Category object.
   */
  private static mapCategoryFields(c: Category): any {
    return {
      id: c.id,
      code: c.code,
      status: c.status,
      activeVersionId: c.activeVersionId,
      parentId: c.parentId,
      level: c.level,
      path: c.path,
      sortOrder: c.sortOrder,
      tenderCount: c.tenderCount,
      childrenCount: c.childrenCount,
      activeChildren: c.activeChildren,
      isSystem: c.isSystem,
      displayOrder: c.displayOrder,
      icon: c.icon,
      color: c.color,
      dbVersion: c.dbVersion,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      name: c.activeVersion?.name || "",
      description: c.activeVersion?.description || "",
      slug: c.activeVersion?.slug || "",
      seo: c.activeVersion?.seo || null,
      metadata: c.activeVersion?.metadata || null,
    };
  }

  /**
   * Category analytics reporter.
   */
  public static async getAnalytics(): Promise<any> {
    const totalCount = await categoryRepo.count({
      where: { status: CategoryStatus.ACTIVE },
    });
    const unusedCount = await categoryRepo.count({
      where: { status: CategoryStatus.ACTIVE, tenderCount: 0 },
    });

    // Highest Budget
    const highestBudget = await categoryRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.activeVersion", "av")
      .where("c.status = :status", { status: CategoryStatus.ACTIVE })
      .orderBy("c.tenderCount", "DESC")
      .limit(5)
      .getMany();

    return {
      total: totalCount,
      unused: unusedCount,
      topCategories: highestBudget.map((c) => this.mapCategoryFields(c)),
    };
  }

  /**
   * Lists all category reviews.
   */
  public static async listReviews(query: any): Promise<any[]> {
    const qb = reviewRepo
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.category", "c")
      .leftJoinAndSelect("r.categoryVersion", "cv")
      .leftJoinAndSelect("r.assignments", "a")
      .leftJoinAndSelect("a.reviewer", "rev")
      .leftJoinAndSelect("r.comments", "com")
      .leftJoinAndSelect("com.user", "comUser");

    if (query.status) {
      qb.andWhere("r.status = :status", { status: query.status });
    }

    qb.orderBy("r.createdAt", "DESC");

    return await qb.getMany();
  }
}

/**
 * Builds nested tree format.
 */
function buildTree(list: any[], parentId: string | null = null): any[] {
  return list
    .filter((c) => c.parentId === parentId)
    .map((c) => ({
      ...c,
      children: buildTree(list, c.id),
    }))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.displayOrder - b.displayOrder ||
        a.code.localeCompare(b.code),
    );
}
