import request from 'supertest';
import { app } from '../../src/config/app';
import { AppDataSource } from '../../src/config/database';
import { clearAuthTables } from '../helpers/db';
import { User } from '../../src/database/entities/User';
import { Role } from '../../src/database/entities/Role';
import { RoleVersion } from '../../src/database/entities/RoleVersion';
import { UserRole } from '../../src/database/entities/UserRole';
import { AccountType, RoleStatus, RoleVersionStatus } from '../../src/types/enums';

describe('System Setup Flow Integration Tests', () => {
  beforeEach(async () => {
    await clearAuthTables();
  });

  describe('GET /api/v1/setup/check', () => {
    it('should return setupAllowed: true when no Super Admin exists', async () => {
      const res = await request(app).get('/api/v1/setup/check').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.setupAllowed).toBe(true);
    });

    it('should return 403 Forbidden when a Super Admin already exists', async () => {
      const userRepo = AppDataSource.getRepository(User);
      const roleRepo = AppDataSource.getRepository(Role);
      const roleVersionRepo = AppDataSource.getRepository(RoleVersion);
      const userRoleRepo = AppDataSource.getRepository(UserRole);

      // Create admin user
      const admin = userRepo.create({
        name: 'Test Admin',
        email: 'admin@test.local',
        passwordHash: 'hashedpassword',
        accountType: AccountType.ADMIN,
        emailVerified: true,
      });
      const savedAdmin = await userRepo.save(admin);

      // Create Super Admin role
      const role = roleRepo.create({
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
        createdByUserId: savedAdmin.id,
        updatedByUserId: savedAdmin.id,
      });
      const savedRole = await roleRepo.save(role);

      // Create Approved Version for the role
      const roleVersion = roleVersionRepo.create({
        roleId: savedRole.id,
        version: 1,
        name: 'Super Admin',
        description: 'Super Admin Role',
        status: RoleVersionStatus.APPROVED,
        createdByUserId: savedAdmin.id,
        approvedByUserId: savedAdmin.id,
        approvedAt: new Date(),
      });
      await roleVersionRepo.save(roleVersion);

      savedRole.activeVersionId = roleVersion.id;
      await roleRepo.save(savedRole);

      // Assign role
      const userRole = userRoleRepo.create({
        userId: savedAdmin.id,
        roleId: savedRole.id,
        assignedAt: new Date(),
      });
      await userRoleRepo.save(userRole);

      const res = await request(app).get('/api/v1/setup/check').expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('POST /api/v1/setup', () => {
    it('should successfully run transaction to initialize system when no Super Admin exists', async () => {
      const res = await request(app)
        .post('/api/v1/setup')
        .send({
          name: 'First Admin',
          email: 'firstadmin@test.local',
          password: 'SecretPassword123!',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('firstadmin@test.local');

      // Verify DB State
      const userRepo = AppDataSource.getRepository(User);
      const roleRepo = AppDataSource.getRepository(Role);
      const userRoleRepo = AppDataSource.getRepository(UserRole);

      const createdUser = await userRepo.findOne({ where: { email: 'firstadmin@test.local' } });
      expect(createdUser).toBeDefined();
      expect(createdUser?.accountType).toBe(AccountType.ADMIN);

      const superAdminRole = await roleRepo.findOne({
        where: { isSystemRole: true },
        relations: ['createdBy', 'updatedBy'],
      });
      expect(superAdminRole).toBeDefined();
      expect(superAdminRole?.createdBy?.id).toBe(createdUser?.id);
      expect(superAdminRole?.updatedBy?.id).toBe(createdUser?.id);

      const assignment = await userRoleRepo.findOne({
        where: { userId: createdUser?.id, roleId: superAdminRole?.id },
        relations: ['assignedBy'],
      });
      expect(assignment).toBeDefined();
      expect(assignment?.assignedBy?.id).toBe(createdUser?.id);
    });

    it('should reject setup requests with 403 if a Super Admin already exists', async () => {
      const userRepo = AppDataSource.getRepository(User);
      const roleRepo = AppDataSource.getRepository(Role);
      const roleVersionRepo = AppDataSource.getRepository(RoleVersion);
      const userRoleRepo = AppDataSource.getRepository(UserRole);

      // Create admin user
      const admin = userRepo.create({
        name: 'Existing Admin',
        email: 'existing@test.local',
        passwordHash: 'hashedpassword',
        accountType: AccountType.ADMIN,
        emailVerified: true,
      });
      const savedAdmin = await userRepo.save(admin);

      // Create Super Admin role
      const role = roleRepo.create({
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
        createdByUserId: savedAdmin.id,
        updatedByUserId: savedAdmin.id,
      });
      const savedRole = await roleRepo.save(role);

      // Create Version
      const roleVersion = roleVersionRepo.create({
        roleId: savedRole.id,
        version: 1,
        name: 'Super Admin',
        status: RoleVersionStatus.APPROVED,
        createdByUserId: savedAdmin.id,
        approvedByUserId: savedAdmin.id,
        approvedAt: new Date(),
      });
      await roleVersionRepo.save(roleVersion);

      savedRole.activeVersionId = roleVersion.id;
      await roleRepo.save(savedRole);

      // Assign role
      const userRole = userRoleRepo.create({
        userId: savedAdmin.id,
        roleId: savedRole.id,
        assignedAt: new Date(),
      });
      await userRoleRepo.save(userRole);

      // Try running setup
      const res = await request(app)
        .post('/api/v1/setup')
        .send({
          name: 'Another Admin',
          email: 'another@test.local',
          password: 'SecretPassword123!',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should successfully upgrade an existing user to admin and assign Super Admin role', async () => {
      const userRepo = AppDataSource.getRepository(User);
      const roleRepo = AppDataSource.getRepository(Role);
      const userRoleRepo = AppDataSource.getRepository(UserRole);

      // Create pre-existing user (ordinary user)
      const existingUser = userRepo.create({
        name: 'Pre Existing User',
        email: 'preexisting@test.local',
        passwordHash: 'oldhash',
        accountType: AccountType.USER,
        emailVerified: false,
      });
      await userRepo.save(existingUser);

      // Run setup with same email
      const res = await request(app)
        .post('/api/v1/setup')
        .send({
          name: 'Upgraded Admin',
          email: 'preexisting@test.local',
          password: 'NewSecretPassword123!',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('preexisting@test.local');

      // Verify user is upgraded
      const upgradedUser = await userRepo.findOne({ where: { email: 'preexisting@test.local' } });
      expect(upgradedUser).toBeDefined();
      expect(upgradedUser?.accountType).toBe(AccountType.ADMIN);
      expect(upgradedUser?.name).toBe('Upgraded Admin');
      expect(upgradedUser?.emailVerified).toBe(true);

      // Verify password changed
      expect(upgradedUser?.passwordHash).not.toBe('oldhash');

      // Verify Role assigned
      const superAdminRole = await roleRepo.findOne({ where: { isSystemRole: true } });
      expect(superAdminRole).toBeDefined();

      const assignment = await userRoleRepo.findOne({
        where: { userId: upgradedUser?.id, roleId: superAdminRole?.id },
      });
      expect(assignment).toBeDefined();
    });
  });
});
