import request from 'supertest';
import { app } from '../../src/config/app';
import { appDataSource } from '../../src/config/database';
import { clearAuthTables, setupTestRoleWithPermission } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createUser } from '../helpers/builders';
import { User } from '../../src/entities/User';
import { AccountType } from '../../src/types/enums';
import { Role } from '../../src/entities/Role';
import { UserRole } from '../../src/entities/UserRole';
import { AuditLog } from '../../src/entities/AuditLog';

const roleRepo = () => appDataSource.getRepository(Role);
const userRoleRepo = () => appDataSource.getRepository(UserRole);
const auditLogRepo = () => appDataSource.getRepository(AuditLog);

describe('RBAC System Integration Tests', () => {
  let agent: ReturnType<typeof request.agent>;
  let csrfToken: string;

  let superAdminUser: User;
  let superAdminPassword = 'SuperAdminPass1!';

  let rbacAdminUser: User;
  let rbacAdminPassword = 'RbacAdminPass1!';

  let ordinaryUser: User;
  let ordinaryPassword = 'OrdinaryPass1!';

  beforeEach(async () => {
    await clearAuthTables();
    agent = request.agent(app);

    // 1. Create Super Admin
    superAdminUser = await createUser({
      email: 'superadmin@test.local',
      accountType: AccountType.ADMIN,
      password: superAdminPassword,
      emailVerified: true,
    });
    // Assign super-admin role
    await setupTestRoleWithPermission(superAdminUser.id, 'Super Admin', 'dashboard.view');

    // 2. Create RBAC Admin User
    rbacAdminUser = await createUser({
      email: 'rbacadmin@test.local',
      accountType: AccountType.ADMIN,
      password: rbacAdminPassword,
      emailVerified: true,
    });
    // Assign rbac.manage permission
    await setupTestRoleWithPermission(rbacAdminUser.id, 'RBAC Manager', 'rbac.manage');

    // 3. Create Ordinary Customer User
    ordinaryUser = await createUser({
      email: 'ordinary@test.local',
      accountType: AccountType.USER,
      password: ordinaryPassword,
      emailVerified: true,
    });

    const csrf = await getCsrf(agent);
    csrfToken = csrf.token;
  });

  async function loginAs(email: string, pass: string) {
    const freshAgent = request.agent(app);
    const csrf = await getCsrf(freshAgent);
    await freshAgent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email, password: pass })
      .expect(200);
    return { agent: freshAgent, csrfToken: csrf.token };
  }

  describe('Authorization Checks on RBAC Routes', () => {
    it('should deny non-logged in requests', async () => {
      await request(app).get('/api/v1/rbac/roles').expect(401);
    });

    it('should deny access to ordinary customers', async () => {
      const { agent: userAgent } = await loginAs(ordinaryUser.email, ordinaryPassword);
      await userAgent.get('/api/v1/rbac/roles').expect(403);
    });

    it('should allow super admin access', async () => {
      const { agent: adminAgent } = await loginAs(superAdminUser.email, superAdminPassword);
      const res = await adminAgent.get('/api/v1/rbac/roles').expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow RBAC manager admin access', async () => {
      const { agent: adminAgent } = await loginAs(rbacAdminUser.email, rbacAdminPassword);
      await adminAgent.get('/api/v1/rbac/roles').expect(200);
    });
  });

  describe('Role Management (CRUD)', () => {
    it('should create a new role and write an audit log', async () => {
      const { agent: adminAgent, csrfToken: token } = await loginAs(
        rbacAdminUser.email,
        rbacAdminPassword,
      );

      const res = await adminAgent
        .post('/api/v1/rbac/roles')
        .set('x-csrf-token', token)
        .send({
          name: 'Compliance Officer',
          description: 'Validates tenders and categories for legal compliance',
          permissions: ['tender.view', 'category.view'],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Compliance Officer');
      expect(res.body.data.slug).toBe('compliance-officer');

      // Check DB Role existence
      const dbRole = await roleRepo().findOne({ where: { slug: 'compliance-officer' } });
      expect(dbRole).toBeDefined();
      expect(dbRole?.isActive).toBe(true);

      // Check audit log
      const log = await auditLogRepo().findOne({
        where: { action: 'ROLE_CREATE' },
        order: { createdAt: 'DESC' },
      });
      expect(log).toBeDefined();
      expect(log?.userId).toBe(rbacAdminUser.id);
      expect(log?.details).toContain('Compliance Officer');
    });

    it('should prevent deleting system roles', async () => {
      const { agent: adminAgent, csrfToken: token } = await loginAs(
        superAdminUser.email,
        superAdminPassword,
      );

      // Ensure Super Admin role exists
      const saRole = await roleRepo().findOneBy({ slug: 'super-admin' });
      expect(saRole).toBeDefined();

      await adminAgent
        .delete(`/api/v1/rbac/roles/${saRole!.id}`)
        .set('x-csrf-token', token)
        .expect(400); // System role deletion is blocked
    });
  });

  describe('User Role Assignment', () => {
    it('should assign a role to a user and support temporary expiration', async () => {
      const { agent: adminAgent, csrfToken: token } = await loginAs(
        rbacAdminUser.email,
        rbacAdminPassword,
      );

      // Create a role to assign
      const newRole = roleRepo().create({
        name: 'Tender Auditor',
        slug: 'tender-auditor',
        description: 'Audits tenders',
        isActive: true,
        isSystemRole: false,
      });
      await roleRepo().save(newRole);

      const expiresAt = new Date(Date.now() + 3600000); // expires in 1 hour

      const res = await adminAgent
        .post('/api/v1/rbac/assignments')
        .set('x-csrf-token', token)
        .send({
          userId: ordinaryUser.id,
          roleId: newRole.id,
          expiresAt: expiresAt.toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      // Verify UserRole entry
      const dbAssign = await userRoleRepo().findOneBy({
        userId: ordinaryUser.id,
        roleId: newRole.id,
      });
      expect(dbAssign).toBeDefined();
      expect(dbAssign?.expiresAt).toBeDefined();

      // Check assignment audit log
      const log = await auditLogRepo().findOne({
        where: { action: 'ROLE_ASSIGN' },
        order: { createdAt: 'DESC' },
      });
      expect(log).toBeDefined();
      expect(log?.details).toContain('Tender Auditor');
    });
  });
});
