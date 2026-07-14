import { AppDataSource } from "../../config/database";
import { Role, RoleStatus } from "../../database/entities/Role";
import {
  RoleVersion,
  RoleVersionStatus,
} from "../../database/entities/RoleVersion";
import { RoleVersionPermission } from "../../database/entities/RoleVersionPermission";
import { RoleReview, ReviewStatus } from "../../database/entities/RoleReview";
import {
  RoleReviewAssignment,
  ReviewAssignmentStatus,
} from "../../database/entities/RoleReviewAssignment";
import { RoleReviewComment } from "../../database/entities/RoleReviewComment";
import { Permission } from "../../database/entities/Permission";
import { PermissionModule } from "../../database/entities/PermissionModule";
import { UserRole } from "../../database/entities/UserRole";
import type { User } from "../../database/entities/User";
import { AppError } from "../../core/AppError";
import { rbacEventEmitter } from "./events/RbacEvents";
import slugify from "slugify";
import { In, Not } from "typeorm";

export class RbacService {
  private static roleRepo = AppDataSource.getRepository(Role);
  private static versionRepo = AppDataSource.getRepository(RoleVersion);
  private static rvpRepo = AppDataSource.getRepository(RoleVersionPermission);
  private static reviewRepo = AppDataSource.getRepository(RoleReview);
  private static assignmentRepo =
    AppDataSource.getRepository(RoleReviewAssignment);
  private static commentRepo = AppDataSource.getRepository(RoleReviewComment);
  private static permRepo = AppDataSource.getRepository(Permission);
  private static moduleRepo = AppDataSource.getRepository(PermissionModule);
  private static userRoleRepo = AppDataSource.getRepository(UserRole);

  /**
   * Get all active, disabled and soft-deleted roles, joining their active version.
   */
  public static async getRoles(includeDeleted = false): Promise<any[]> {
    const roles = await this.roleRepo.find({
      where: includeDeleted ? {} : { status: Not(RoleStatus.ARCHIVED) },
      relations: [
        "activeVersion",
        "activeVersion.roleVersionPermissions",
        "versions",
        "versions.roleVersionPermissions",
      ],
      order: { createdAt: "DESC" },
    });

    return roles.map((r) => {
      let displayVersion = r.activeVersion;
      if (!displayVersion && r.versions && r.versions.length > 0) {
        const sorted = [...r.versions].sort((a, b) => b.version - a.version);
        displayVersion = sorted[0];
      }

      const permissions =
        displayVersion?.roleVersionPermissions?.map((p) => p.permissionKey) ||
        [];

      return {
        id: r.id,
        slug: r.slug,
        status: r.status,
        isSystemRole: r.isSystemRole,
        isDefaultRole: r.isDefaultRole,
        activeVersionId: r.activeVersionId,
        name: displayVersion?.name || "Unnamed Role",
        description: displayVersion?.description || "",
        version: displayVersion?.version || 0,
        permissions,
        permissionKeys: permissions,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        deletedAt: r.status === RoleStatus.ARCHIVED ? r.updatedAt : null,
      };
    });
  }

  /**
   * Get role by ID with active version permissions.
   */
  public static async getRoleById(id: string): Promise<any> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: [
        "activeVersion",
        "activeVersion.roleVersionPermissions",
        "versions",
        "versions.roleVersionPermissions",
      ],
    });

    if (!role) {
      throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
    }

    let displayVersion = role.activeVersion;
    if (!displayVersion && role.versions && role.versions.length > 0) {
      const sorted = [...role.versions].sort((a, b) => b.version - a.version);
      displayVersion = sorted[0];
    }

    const permissions =
      displayVersion?.roleVersionPermissions.map((p) => p.permissionKey) || [];

    return {
      id: role.id,
      slug: role.slug,
      status: role.status,
      isSystemRole: role.isSystemRole,
      isDefaultRole: role.isDefaultRole,
      activeVersionId: role.activeVersionId,
      name: displayVersion?.name || "Unnamed Role",
      description: displayVersion?.description || "",
      version: displayVersion?.version || 0,
      permissions,
      permissionKeys: permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Create a new role draft (Version 1).
   */
  public static async createRole(
    name: string,
    description: string | null,
    permissionKeys: string[],
    userId: string,
  ): Promise<any> {
    if (!name || name.trim() === "") {
      throw new AppError("Role name is required", 400, "VALIDATION_ERROR");
    }

    if (!permissionKeys || permissionKeys.length === 0) {
      throw new AppError(
        "A role must have at least one permission assigned.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const slug = slugify(name, { lower: true, strict: true });

    // Validate if any version has this name or slug already
    const existingVersion = await this.versionRepo.findOne({
      where: { name: name.trim() },
    });
    if (existingVersion) {
      throw new AppError(
        `A role version with name "${name}" already exists.`,
        409,
        "ROLE_ALREADY_EXISTS",
      );
    }

    // Resolve registry permissions
    const permissions = await this.permRepo.find({
      where: { key: In(permissionKeys) },
      relations: ["module"],
    });

    if (permissions.length === 0) {
      throw new AppError(
        "None of the assigned permissions exist in the registry.",
        400,
        "VALIDATION_ERROR",
      );
    }

    return AppDataSource.transaction(async (transactionManager) => {
      // 1. Create Role
      const role = new Role();
      role.slug = slug;
      role.status = RoleStatus.DISABLED; // Disabled until a version is approved
      role.isSystemRole = false;
      role.isDefaultRole = false;
      const savedRole = await transactionManager.save(role);

      // 2. Create Version 1
      const version = new RoleVersion();
      version.roleId = savedRole.id;
      version.version = 1;
      version.name = name.trim();
      version.description = description || "";
      version.status = RoleVersionStatus.DRAFT;
      version.createdByUserId = userId;
      const savedVersion = await transactionManager.save(version);

      // 3. Save snapshot permissions
      const versionPermissions = permissions.map((p) => {
        const rvp = new RoleVersionPermission();
        rvp.roleVersionId = savedVersion.id;
        rvp.permissionKey = p.key;
        rvp.permissionName = p.name;
        rvp.moduleSlug = p.module.slug;
        rvp.moduleName = p.module.name;
        return rvp;
      });
      await transactionManager.save(RoleVersionPermission, versionPermissions);

      rbacEventEmitter.emit("RoleCreated", {
        roleId: savedRole.id,
        roleName: version.name,
        version: 1,
        userId,
      });

      return {
        roleId: savedRole.id,
        versionId: savedVersion.id,
        version: 1,
        name: version.name,
        status: version.status,
      };
    });
  }

  /**
   * Update role: updates existing draft or spawns a new version draft.
   */
  public static async updateRole(
    id: string,
    name: string,
    description: string | null,
    permissionKeys: string[],
    userId: string,
  ): Promise<any> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ["activeVersion"],
    });
    if (!role) {
      throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
    }

    if (role.isSystemRole) {
      throw new AppError(
        "System roles cannot be modified.",
        403,
        "SYSTEM_ROLE_PROTECTED",
      );
    }

    if (!permissionKeys || permissionKeys.length === 0) {
      throw new AppError(
        "A role must have at least one permission assigned.",
        400,
        "VALIDATION_ERROR",
      );
    }

    // Resolve registry permissions
    const permissions = await this.permRepo.find({
      where: { key: In(permissionKeys) },
      relations: ["module"],
    });
    if (permissions.length === 0) {
      throw new AppError(
        "None of the assigned permissions exist in the registry.",
        400,
        "VALIDATION_ERROR",
      );
    }

    // Check if there is an editable draft
    let draft = await this.versionRepo.findOne({
      where: {
        roleId: id,
        status: In([
          RoleVersionStatus.DRAFT,
          RoleVersionStatus.REJECTED,
          RoleVersionStatus.REOPENED,
        ]),
      },
    });

    if (draft) {
      // Check Draft Lock
      if (
        draft.lockedByUserId &&
        draft.lockedByUserId !== userId &&
        draft.lockedAt
      ) {
        const lockExpiry = new Date(draft.lockedAt.getTime() + 15 * 60 * 1000);
        if (lockExpiry > new Date()) {
          throw new AppError(
            "This role draft is currently locked by another administrator.",
            409,
            "DRAFT_LOCKED",
          );
        }
      }

      const before = {
        name: draft.name,
        description: draft.description,
        status: draft.status,
      };

      // Update current draft
      draft.name = name.trim();
      draft.description = description || "";
      draft.status = RoleVersionStatus.DRAFT; // Reset to Draft if it was rejected/reopened
      draft.lockedByUserId = null;
      draft.lockedAt = null;

      await AppDataSource.transaction(async (transactionManager) => {
        await transactionManager.save(draft);

        // Delete old snapshot permissions
        await transactionManager.delete(RoleVersionPermission, {
          roleVersionId: draft.id,
        });

        // Save new snapshot permissions
        const versionPermissions = permissions.map((p) => {
          const rvp = new RoleVersionPermission();
          rvp.roleVersionId = draft.id;
          rvp.permissionKey = p.key;
          rvp.permissionName = p.name;
          rvp.moduleSlug = p.module.slug;
          rvp.moduleName = p.module.name;
          return rvp;
        });
        await transactionManager.save(
          RoleVersionPermission,
          versionPermissions,
        );
      });

      rbacEventEmitter.emit("RoleUpdated", {
        roleId: id,
        roleName: draft.name,
        version: draft.version,
        userId,
        before,
        after: { name: draft.name, description: draft.description },
      });

      return {
        roleId: id,
        versionId: draft.id,
        version: draft.version,
        status: draft.status,
      };
    } else {
      // Spawn new draft version
      const latestVersionNum = await this.versionRepo
        .createQueryBuilder("v")
        .where("v.roleId = :roleId", { roleId: id })
        .select("MAX(v.version)", "max")
        .getRawOne()
        .then((res) => res?.max || 0);

      const nextVersion = latestVersionNum + 1;

      const newDraft = new RoleVersion();
      newDraft.roleId = id;
      newDraft.version = nextVersion;
      newDraft.name = name.trim();
      newDraft.description = description || "";
      newDraft.status = RoleVersionStatus.DRAFT;
      newDraft.createdByUserId = userId;

      await AppDataSource.transaction(async (transactionManager) => {
        const savedDraft = await transactionManager.save(newDraft);

        const versionPermissions = permissions.map((p) => {
          const rvp = new RoleVersionPermission();
          rvp.roleVersionId = savedDraft.id;
          rvp.permissionKey = p.key;
          rvp.permissionName = p.name;
          rvp.moduleSlug = p.module.slug;
          rvp.moduleName = p.module.name;
          return rvp;
        });
        await transactionManager.save(
          RoleVersionPermission,
          versionPermissions,
        );
      });

      rbacEventEmitter.emit("RoleUpdated", {
        roleId: id,
        roleName: newDraft.name,
        version: newDraft.version,
        userId,
        before: { activeVersionId: role.activeVersionId },
        after: { newDraftVersion: newDraft.version },
      });

      return {
        roleId: id,
        versionId: newDraft.id,
        version: newDraft.version,
        status: newDraft.status,
      };
    }
  }

  /**
   * Clone a role or version to create a new role template draft.
   */
  public static async duplicateRole(
    id: string,
    newName: string,
    userId: string,
  ): Promise<any> {
    const role = await this.getRoleById(id);
    return this.createRole(
      newName,
      `Cloned from ${role.name}.`,
      role.permissionKeys,
      userId,
    );
  }

  /**
   * Soft-delete/Archive a role.
   */
  public static async deleteRole(id: string, userId: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
    }

    if (role.isSystemRole) {
      throw new AppError(
        "System roles cannot be archived or deleted.",
        403,
        "SYSTEM_ROLE_PROTECTED",
      );
    }

    // Archive the role status
    role.status = RoleStatus.ARCHIVED;
    await this.roleRepo.save(role);

    // Invalidate and rebuild cache
    rbacEventEmitter.emit("RoleArchived", {
      roleId: id,
      roleName: role.id,
      userId,
    });
  }

  /**
   * Restore a soft-deleted archived role.
   */
  public static async restoreRole(id: string, userId: string): Promise<any> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
    }

    role.status = RoleStatus.ACTIVE;
    await this.roleRepo.save(role);

    rbacEventEmitter.emit("RoleApproved", {
      roleId: id,
      roleName: role.id,
      version: 0,
      userId,
    });

    return role;
  }

  /**
   * Get all version history of a role.
   */
  public static async getRoleVersions(roleId: string): Promise<RoleVersion[]> {
    return this.versionRepo.find({
      where: { roleId },
      order: { version: "DESC" },
      relations: ["createdByUser"],
    });
  }

  /**
   * Lock a role version to prevent concurrent modifications.
   */
  public static async lockRoleVersion(
    versionId: string,
    userId: string,
  ): Promise<void> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
    });
    if (!version)
      throw new AppError("Role version not found", 404, "NOT_FOUND");

    if (
      version.lockedByUserId &&
      version.lockedByUserId !== userId &&
      version.lockedAt
    ) {
      const lockExpiry = new Date(version.lockedAt.getTime() + 15 * 60 * 1000);
      if (lockExpiry > new Date()) {
        throw new AppError(
          "Draft is locked by another admin.",
          409,
          "DRAFT_LOCKED",
        );
      }
    }

    version.lockedByUserId = userId;
    version.lockedAt = new Date();
    await this.versionRepo.save(version);
  }

  /**
   * Unlock a role version.
   */
  public static async unlockRoleVersion(
    versionId: string,
    userId: string,
  ): Promise<void> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
    });
    if (!version)
      throw new AppError("Role version not found", 404, "NOT_FOUND");

    if (version.lockedByUserId && version.lockedByUserId !== userId) {
      throw new AppError(
        "You cannot unlock a draft locked by someone else.",
        403,
        "FORBIDDEN",
      );
    }

    version.lockedByUserId = null;
    version.lockedAt = null;
    await this.versionRepo.save(version);
  }

  /**
   * Submit a role version for review, creating a Review workflow and assigning reviewers.
   */
  public static async submitRoleVersion(
    versionId: string,
    reviewerIds: string[],
    userId: string,
  ): Promise<any> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
    });
    if (!version)
      throw new AppError("Role version not found", 404, "NOT_FOUND");

    if (
      version.status !== RoleVersionStatus.DRAFT &&
      version.status !== RoleVersionStatus.REOPENED
    ) {
      throw new AppError(
        "Only draft versions can be submitted for review.",
        400,
        "INVALID_STATE",
      );
    }

    // Business Rules: Cannot assign oneself as reviewer
    if (reviewerIds.includes(userId)) {
      throw new AppError(
        "Creator/Submitter cannot be assigned as a reviewer.",
        400,
        "CREATOR_APPROVAL_BLOCKED",
      );
    }

    if (!reviewerIds || reviewerIds.length === 0) {
      throw new AppError(
        "At least one reviewer must be assigned.",
        400,
        "VALIDATION_ERROR",
      );
    }

    version.status = RoleVersionStatus.PENDING_REVIEW;

    return AppDataSource.transaction(async (transactionManager) => {
      const savedVersion = await transactionManager.save(version);

      // Create Review Session
      const review = new RoleReview();
      review.roleId = version.roleId;
      review.roleVersionId = version.id;
      review.status = ReviewStatus.PENDING;
      const savedReview = await transactionManager.save(review);

      // Create Reviewer Assignments
      const assignments = reviewerIds.map((rid) => {
        const assign = new RoleReviewAssignment();
        assign.reviewId = savedReview.id;
        assign.reviewerId = rid;
        assign.status = ReviewAssignmentStatus.PENDING;
        return assign;
      });
      await transactionManager.save(RoleReviewAssignment, assignments);

      // Log submission activity comment
      const comment = new RoleReviewComment();
      comment.reviewId = savedReview.id;
      comment.userId = userId;
      comment.action = "SUBMIT";
      comment.comment = `Submitted version ${version.version} for review.`;
      await transactionManager.save(RoleReviewComment, comment);

      rbacEventEmitter.emit("RoleSubmitted", {
        roleId: version.roleId,
        roleName: version.name,
        version: version.version,
        userId,
      });

      return savedReview;
    });
  }

  /**
   * Action review: Approve, Reject or request changes on a role review session.
   */
  public static async reviewRoleVersion(
    reviewId: string,
    status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
    commentText: string,
    userId: string,
  ): Promise<void> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ["roleVersion", "role"],
    });

    if (!review)
      throw new AppError("Review workflow not found", 404, "NOT_FOUND");
    if (review.status !== ReviewStatus.PENDING) {
      throw new AppError(
        "This review workflow is already completed.",
        400,
        "INVALID_STATE",
      );
    }

    // Check assignment
    const assignment = await this.assignmentRepo.findOne({
      where: { reviewId, reviewerId: userId },
    });

    if (!assignment) {
      throw new AppError(
        "You are not assigned as a reviewer for this role.",
        403,
        "UNAUTHORIZED_REVIEWER",
      );
    }

    if (assignment.status !== ReviewAssignmentStatus.PENDING) {
      throw new AppError(
        "You have already submitted your review decision.",
        400,
        "ALREADY_REVIEWED",
      );
    }

    // Update assignment status
    assignment.status = status as any;
    assignment.reviewedAt = new Date();

    await AppDataSource.transaction(async (transactionManager) => {
      await transactionManager.save(assignment);

      // Save Comment log
      const commentLog = new RoleReviewComment();
      commentLog.reviewId = review.id;
      commentLog.userId = userId;
      commentLog.action = status;
      commentLog.comment = commentText || `${status} review submission.`;
      await transactionManager.save(RoleReviewComment, commentLog);

      // Check all reviewer assignments to make final decision
      const allAssignments = await transactionManager.find(
        RoleReviewAssignment,
        {
          where: { reviewId },
        },
      );

      const totalReviewers = allAssignments.length;
      const approvals = allAssignments.filter(
        (a) => a.status === ReviewAssignmentStatus.APPROVED,
      ).length;
      const rejections = allAssignments.filter(
        (a) => a.status === ReviewAssignmentStatus.REJECTED,
      ).length;
      const changesRequested = allAssignments.filter(
        (a) => a.status === ReviewAssignmentStatus.CHANGES_REQUESTED,
      ).length;

      // Business Rules:
      // - Reject: If any reviewer rejects.
      // - Changes Requested: If changes requested.
      // - Approve: If everyone approves (or minimum reviewers met, here we enforce consensus).
      if (rejections > 0) {
        review.status = ReviewStatus.REJECTED;
        review.roleVersion.status = RoleVersionStatus.REJECTED;
        await transactionManager.save(review);
        await transactionManager.save(review.roleVersion);

        rbacEventEmitter.emit("RoleRejected", {
          roleId: review.roleId,
          roleName: review.roleVersion.name,
          version: review.roleVersion.version,
          userId,
          after: { comment: commentText },
        });
      } else if (changesRequested > 0) {
        review.status = ReviewStatus.REJECTED; // Or custom CHANGES_REQUESTED status
        review.roleVersion.status = RoleVersionStatus.REOPENED;
        await transactionManager.save(review);
        await transactionManager.save(review.roleVersion);

        rbacEventEmitter.emit("RoleReopened", {
          roleId: review.roleId,
          roleName: review.roleVersion.name,
          version: review.roleVersion.version,
          userId,
        });
      } else if (approvals === totalReviewers) {
        // Enforce Consensus: All approved -> Activate Role Version!
        review.status = ReviewStatus.APPROVED;
        review.roleVersion.status = RoleVersionStatus.APPROVED;
        await transactionManager.save(review);
        await transactionManager.save(review.roleVersion);

        // Update active version of Role
        const role = review.role;
        role.status = RoleStatus.ACTIVE;
        role.activeVersionId = review.roleVersionId;
        await transactionManager.save(role);

        // Check if role replaces a previous role
        const description = review.roleVersion.description || "";
        const match = description.match(/\[ReplacesRole:\s*([0-9a-fA-F-]+)\]/);
        if (match) {
          const previousRoleId = match[1];
          const previousRole = await transactionManager.findOne(Role, {
            where: { id: previousRoleId },
          });
          if (previousRole) {
            previousRole.status = RoleStatus.DISABLED;
            await transactionManager.save(previousRole);

            // Migrate all users with that previous role to the new role
            const userRoles = await transactionManager.find(UserRole, {
              where: { roleId: previousRoleId },
            });
            for (const ur of userRoles) {
              const alreadyHasNew = await transactionManager.findOne(UserRole, {
                where: { userId: ur.userId, roleId: role.id },
              });
              if (alreadyHasNew) {
                await transactionManager.remove(ur);
              } else {
                ur.roleId = role.id;
                await transactionManager.save(ur);
              }
            }
          }
        }

        rbacEventEmitter.emit("RoleApproved", {
          roleId: review.roleId,
          roleName: review.roleVersion.name,
          version: review.roleVersion.version,
          userId,
        });
      }
    });
  }

  /**
   * Compare two versions of a role.
   */
  public static async compareRoleVersions(
    roleId: string,
    v1Num: number,
    v2Num: number,
  ): Promise<any> {
    const ver1 = await this.versionRepo.findOne({
      where: { roleId, version: v1Num },
      relations: ["roleVersionPermissions"],
    });

    const ver2 = await this.versionRepo.findOne({
      where: { roleId, version: v2Num },
      relations: ["roleVersionPermissions"],
    });

    if (!ver1 || !ver2) {
      throw new AppError("One or both versions not found.", 404, "NOT_FOUND");
    }

    const keys1 = ver1.roleVersionPermissions.map((p) => p.permissionKey);
    const keys2 = ver2.roleVersionPermissions.map((p) => p.permissionKey);

    const added = keys2.filter((k) => !keys1.includes(k));
    const removed = keys1.filter((k) => !keys2.includes(k));
    const unchanged = keys1.filter((k) => keys2.includes(k));

    return {
      v1: {
        version: ver1.version,
        name: ver1.name,
        description: ver1.description,
        status: ver1.status,
      },
      v2: {
        version: ver2.version,
        name: ver2.name,
        description: ver2.description,
        status: ver2.status,
      },
      diff: {
        added,
        removed,
        unchanged,
      },
    };
  }

  /**
   * Get role counts, distribution and pending workflow metrics.
   */
  public static async getRoleStats(): Promise<any> {
    const totalRoles = await this.roleRepo.count();
    const activeRoles = await this.roleRepo.count({
      where: { status: RoleStatus.ACTIVE },
    });
    const pendingReviews = await this.reviewRepo.count({
      where: { status: ReviewStatus.PENDING },
    });

    // Distribution count by modules
    const permissions = await this.rvpRepo
      .createQueryBuilder("p")
      .select("p.moduleName", "module")
      .addSelect("COUNT(DISTINCT p.permissionKey)", "count")
      .groupBy("p.moduleName")
      .getRawMany();

    return {
      totalRoles,
      activeRoles,
      pendingReviews,
      moduleDistribution: permissions,
    };
  }

  /**
   * Get audit trails for exports.
   */
  public static async getExportData(): Promise<any[]> {
    const roles = await this.roleRepo.find({
      relations: ["activeVersion", "activeVersion.roleVersionPermissions"],
    });
    return roles.map((r) => ({
      roleId: r.id,
      slug: r.slug,
      status: r.status,
      isSystemRole: r.isSystemRole,
      name: r.activeVersion?.name || "",
      description: r.activeVersion?.description || "",
      version: r.activeVersion?.version || 0,
      permissions:
        r.activeVersion?.roleVersionPermissions.map((p) => p.permissionKey) ||
        [],
    }));
  }

  /**
   * Get all user role assignments.
   */
  public static async getAssignments(): Promise<UserRole[]> {
    return this.userRoleRepo.find({
      relations: ["user", "role", "assignedBy"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Assign a role to a user.
   */
  public static async assignRole(
    userId: string,
    roleId: string,
    expiresAt: string | null,
    currentUserId: string,
  ): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new AppError("Role not found", 404, "NOT_FOUND");

    const existingAssignments = await this.userRoleRepo.find({
      where: { userId },
    });
    const assignments = existingAssignments
      .filter((ur) => ur.roleId !== roleId)
      .map((ur) => ({
        roleId: ur.roleId,
        expiresAt: ur.expiresAt ? ur.expiresAt.toISOString() : null,
      }));

    assignments.push({ roleId, expiresAt });

    const { assignUserRoles } = require("../admin/admin.service");
    await assignUserRoles(userId, assignments, currentUserId);

    rbacEventEmitter.emit("RoleAssigned", {
      roleId,
      roleName: role.slug,
      targetUserId: userId,
      userId: currentUserId,
    });
  }

  /**
   * Revoke a user role assignment.
   */
  public static async revokeAssignment(
    id: string,
    currentUserId: string,
  ): Promise<void> {
    const userRole = await this.userRoleRepo.findOne({ where: { id } });
    if (!userRole) {
      throw new AppError("Role assignment not found", 404, "NOT_FOUND");
    }

    const { revokeUserRole } = require("../admin/admin.service");
    await revokeUserRole(userRole.userId, userRole.roleId, currentUserId);
  }

  /**
   * Get permissions grouped by module.
   */
  public static async getPermissionsGroupedByModule(): Promise<any[]> {
    const modules = await this.moduleRepo.find({
      order: { displayOrder: "ASC" },
    });
    const permissions = await this.permRepo.find({ relations: ["module"] });

    return modules.map((mod) => {
      const modPerms = permissions.filter((p) => p.moduleId === mod.id);
      return {
        id: mod.id,
        name: mod.name,
        slug: mod.slug,
        icon: mod.icon,
        permissions: modPerms.map((p) => ({
          id: p.id,
          key: p.key,
          name: p.name,
          action: p.action,
          description: p.description,
        })),
      };
    });
  }

  /**
   * Get modules.
   */
  public static async getModules(): Promise<PermissionModule[]> {
    return this.moduleRepo.find({ order: { displayOrder: "ASC" } });
  }

  /**
   * Auto-expire review requests older than 60 days.
   */
  public static async autoExpireReviews(): Promise<void> {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const expiredReviews = await this.reviewRepo.find({
      where: {
        status: ReviewStatus.PENDING,
        createdAt: Not(In([])), // TypeORM representation helper
      },
      relations: ["roleVersion"],
    });

    for (const review of expiredReviews) {
      if (review.createdAt < sixtyDaysAgo) {
        review.status = ReviewStatus.REJECTED;
        review.roleVersion.status = RoleVersionStatus.REJECTED;

        await AppDataSource.transaction(async (transactionManager) => {
          await transactionManager.save(review);
          await transactionManager.save(review.roleVersion);

          // Add timeline comment
          const comment = new RoleReviewComment();
          comment.reviewId = review.id;
          comment.userId = "00000000-0000-0000-0000-000000000000"; // System UUID
          comment.action = "AUTO_EXPIRE";
          comment.comment = "Review auto-expired and rejected after 60 days.";
          await transactionManager.save(RoleReviewComment, comment);
        });
      }
    }
  }
}
