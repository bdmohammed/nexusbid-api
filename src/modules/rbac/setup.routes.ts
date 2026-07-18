import * as bcrypt from 'bcryptjs';
import { Router } from 'express';

import { AppDataSource } from '../../config/database';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../core/asyncHandler';
import { BCRYPT_ROUNDS } from '../../core/constants';
import { Permission } from '../../database/entities/Permission';
import { Role } from '../../database/entities/Role';
import { RoleVersion } from '../../database/entities/RoleVersion';
import { RoleVersionPermission } from '../../database/entities/RoleVersionPermission';
import { User } from '../../database/entities/User';
import { UserRole } from '../../database/entities/UserRole';
import { validate } from '../../middleware/validate';
import { AccountType, RoleStatus, RoleVersionStatus } from '../../types/enums';

import { SetupSchema } from './rbac.dto';

import type { SetupDto, SuccessResponse } from './rbac.dto';

const setupRouter = Router();

/**
 * @swagger
 * /api/v1/admin/register/check:
 *   get:
 *     summary: Check if first-time system setup is allowed
 *     description: Returns true if no administrator with the 'super-admin' role exists yet.
 *     operationId: checkSetupAvailability
 *     tags: [Setup]
 *     security: []
 *     responses:
 *       200:
 *         description: Setup availability check completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       required: [setupAllowed]
 *                       properties:
 *                         setupAllowed:
 *                           type: boolean
 *                           example: true
 *             example:
 *               success: true
 *               message: "Operation completed successfully"
 *               data:
 *                 setupAllowed: true
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       403:
 *         description: Forbidden if a super administrator already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
setupRouter.get(
  '/check',
  asyncHandler<{}, SuccessResponse<{ setupAllowed: boolean }>>(async (_req, res) => {
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const superAdminCount = await userRoleRepo.count({
      where: {
        role: {
          isSystemRole: true,
        },
      },
      relations: ['role'],
    });

    if (superAdminCount > 0) {
      res.status(403).json({
        success: false,
        message:
          'Forbidden: One-Time Setup Wizard is disabled because an administrator already exists.',
        data: {
          setupAllowed: false,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        setupAllowed: true,
      },
    });
  }),
);

/**
 * @swagger
 * /api/v1/admin/register:
 *   post:
 *     summary: Run the first-time system setup wizard
 *     description: Creates the first admin user, initializes the "Super Admin" role, assigns all
 *     system permissions to the role, and assigns the role to this admin user. Blocked if a super
 *     administrator already exists.
 *     operationId: runSetupWizard
 *     tags: [Setup]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@nexusbid.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecureAdminPass123!
 *     responses:
 *       201:
 *         description: Setup completed and first administrator created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       required: [userId, email]
 *                       properties:
 *                         userId:
 *                           type: string
 *                           format: uuid
 *                           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: "admin@nexusbid.com"
 *             example:
 *               success: true
 *               message: "First Administrator created successfully and assigned the Super Admin role."
 *               data:
 *                 userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 email: "admin@nexusbid.com"
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
setupRouter.post(
  '/',
  validate(SetupSchema, 'body'),
  asyncHandler<{}, SuccessResponse<{ userId: string; email: string }>, SetupDto>(
    async (req, res) => {
      const userRoleRepo = AppDataSource.getRepository(UserRole);

      // Block if Super Admin already exists
      const superAdminCount = await userRoleRepo.count({
        where: {
          role: {
            isSystemRole: true,
          },
        },
        relations: ['role'],
      });

      if (superAdminCount > 0) {
        res.status(403).json({
          success: false,
          message:
            'Forbidden: One-Time Setup Wizard is disabled because an administrator already exists.',
        });
        return;
      }

      const { body } = req;

      // Begin Database Transaction
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const userRepo = queryRunner.manager.getRepository(User);
        const roleRepo = queryRunner.manager.getRepository(Role);
        const transactionUserRoleRepo = queryRunner.manager.getRepository(UserRole);
        const permissionRepo = queryRunner.manager.getRepository(Permission);
        const roleVersionRepo = queryRunner.manager.getRepository(RoleVersion);
        const roleVersionPermissionRepo = queryRunner.manager.getRepository(RoleVersionPermission);

        // Check if user already exists by email
        let adminUser = await userRepo.findOne({
          where: { email: body.email },
        });

        const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS.PASSWORD);

        if (adminUser) {
          // Upgrade existing user to Admin type
          adminUser.accountType = AccountType.ADMIN;
          adminUser.name = body.name;
          adminUser.passwordHash = passwordHash;
          adminUser.emailVerified = true;
          adminUser = await userRepo.save(adminUser);
        } else {
          // Create First Admin User
          adminUser = userRepo.create({
            name: body.name,
            email: body.email,
            passwordHash,
            accountType: AccountType.ADMIN,
            emailVerified: true,
          });
          adminUser = await userRepo.save(adminUser);
        }

        const savedUser = adminUser;

        // Create "Super Admin" Role if it does not exist
        let superAdminRole = await roleRepo.findOne({
          where: { isSystemRole: true },
        });

        if (!superAdminRole) {
          superAdminRole = roleRepo.create({
            isSystemRole: true,
            status: RoleStatus.ACTIVE,
          });
          superAdminRole.createdBy = savedUser;
          superAdminRole.updatedBy = savedUser;
          superAdminRole = await roleRepo.save(superAdminRole);

          // Create Version 1 (Approved)
          const superAdminVersion = roleVersionRepo.create({
            roleId: superAdminRole.id,
            version: 1,
            name: 'Super Admin',
            description: 'System Super Administrator. Has all system permissions by default.',
            status: RoleVersionStatus.APPROVED,
            createdByUserId: savedUser.id,
            approvedByUserId: savedUser.id,
            approvedAt: new Date(),
          });
          await roleVersionRepo.save(superAdminVersion);

          superAdminRole.activeVersionId = superAdminVersion.id;
          await roleRepo.save(superAdminRole);

          // Assign All Permissions to Super Admin Role Version
          const allPermissions = await permissionRepo.find({ relations: ['module'] });
          const roleVersionPerms = allPermissions.map((p) =>
            roleVersionPermissionRepo.create({
              roleVersionId: superAdminVersion.id,
              permissionKey: p.key,
              permissionName: p.name,
              moduleSlug: p.module.key,
              moduleName: p.module.name,
            }),
          );

          if (roleVersionPerms.length > 0) {
            await roleVersionPermissionRepo.save(roleVersionPerms);
          }
        }

        // Assign Super Admin Role to First Admin User (check if assignment already exists to avoid duplicates)
        let assignment = await transactionUserRoleRepo.findOne({
          where: { userId: savedUser.id, roleId: superAdminRole.id },
        });

        if (!assignment) {
          assignment = transactionUserRoleRepo.create({
            userId: savedUser.id,
            roleId: superAdminRole.id,
            assignedBy: savedUser,
            assignedAt: new Date(),
          });
          await transactionUserRoleRepo.save(assignment);
        }

        // Mark System as Initialized / Commit Transaction
        await queryRunner.commitTransaction();

        logger.info(
          { email: savedUser.email },
          'First administrator created successfully and assigned the Super Admin role',
        );

        res.status(201).json({
          success: true,
          message: 'First Administrator created successfully and assigned the Super Admin role.',
          data: {
            userId: savedUser.id,
            email: savedUser.email,
          },
        });
      } catch (error) {
        // Rollback Transaction
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        // Release query runner
        await queryRunner.release();
      }
    },
  ),
);

export default setupRouter;
