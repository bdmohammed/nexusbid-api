import request from 'supertest';
import { app } from '../../src/config/app';
import { appDataSource } from '../../src/config/database';
import { State } from '../../src/entities/State';
import { Category } from '../../src/entities/Category';
import { Tender } from '../../src/entities/Tender';
import { TenderVersion } from '../../src/entities/TenderVersion';
import {
  AccountType,
  PermissionKey,
  TenderLifecycleStatus,
  TenderPublicationStatus,
  TenderVersionStatus,
} from '../../src/types/enums';
import { clearAuthTables, setupTestRoleWithPermission } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createUser } from '../helpers/builders';
import { User } from '../../src/entities/User';

const stateRepo = () => appDataSource.getRepository(State);
const categoryRepo = () => appDataSource.getRepository(Category);
const tenderRepo = () => appDataSource.getRepository(Tender);
const versionRepo = () => appDataSource.getRepository(TenderVersion);

async function clearAllTables() {
  await clearAuthTables();
  await appDataSource.query(
    `TRUNCATE TABLE tenders, tender_versions, states, categories RESTART IDENTITY CASCADE`,
  );
}

describe('Tenders Enterprise Admin API Integration Tests', () => {
  let superAdminUser: User;
  let superAdminPassword = 'SuperAdminPass1!';
  let csrfToken: string;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    await clearAllTables();
    agent = request.agent(app);

    superAdminUser = await createUser({
      email: 'superadmin@test.local',
      accountType: AccountType.ADMIN,
      password: superAdminPassword,
      emailVerified: true,
    });
    await setupTestRoleWithPermission(
      superAdminUser.id,
      'Super Admin',
      PermissionKey.CREATE_TENDER,
    );
    await setupTestRoleWithPermission(
      superAdminUser.id,
      'Super Admin Edit',
      PermissionKey.EDIT_TENDER,
    );
    await setupTestRoleWithPermission(
      superAdminUser.id,
      'Super Admin Approve',
      PermissionKey.APPROVE_TENDER,
    );

    const csrf = await getCsrf(agent);
    csrfToken = csrf.token;
  });

  async function loginAsAdmin() {
    const freshAgent = request.agent(app);
    const csrf = await getCsrf(freshAgent);
    await freshAgent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: superAdminUser.email, password: superAdminPassword })
      .expect(200);
    return { agent: freshAgent, csrfToken: csrf.token };
  }

  describe('Tender Lifecycle & Versioning CRUD', () => {
    it('creates a new draft tender aggregate and active version', async () => {
      const { agent: client, csrfToken: token } = await loginAsAdmin();

      const payload = {
        title: 'New Municipal Airport Development',
        description: 'Design and construction of runway and logistics hangars.',
        procurementType: 'Works',
        priority: 'High',
        estimatedBudget: 8500000,
        currency: 'USD',
        department: 'Dept of Aviation',
        siteVisitRequired: true,
        visibility: 'public',
      };

      const res = await client
        .post('/api/v1/tenders/admin')
        .set('x-csrf-token', token)
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.referenceNo).toContain('TDR-');
      expect(res.body.data.status).toBe(TenderLifecycleStatus.ACTIVE);

      const createdTender = await tenderRepo().findOne({
        where: { id: res.body.data.id },
        relations: ['activeVersion'],
      });
      expect(createdTender).not.toBeNull();
      expect(createdTender!.activeVersion).not.toBeNull();
      expect(createdTender!.activeVersion!.title).toBe(payload.title);
      expect(createdTender!.activeVersion!.status).toBe(TenderVersionStatus.DRAFT);
    });

    it('submits a review for a tender and transitions status', async () => {
      const { agent: client, csrfToken: token } = await loginAsAdmin();

      // Create base tender
      const tender = tenderRepo().create({
        status: TenderLifecycleStatus.ACTIVE,
        publicationStatus: TenderPublicationStatus.SCHEDULED,
      });
      await tenderRepo().save(tender);

      const draftVersion = versionRepo().create({
        tenderId: tender.id,
        version: 1,
        status: TenderVersionStatus.DRAFT,
        title: 'Test Version 1',
        description: 'Test details info',
        priority: 'Medium',
        currency: 'USD',
        siteVisitRequired: false,
      });
      await versionRepo().save(draftVersion);

      tender.activeVersionId = draftVersion.id;
      await tenderRepo().save(tender);

      // Transition to under review
      const reviewRes = await client
        .patch(`/api/v1/tenders/admin/${tender.id}/status`)
        .set('x-csrf-token', token)
        .send({
          status: TenderVersionStatus.UNDER_REVIEW,
        })
        .expect(200);

      expect(reviewRes.body.success).toBe(true);
      const updatedVer = await versionRepo().findOneBy({ id: draftVersion.id });
      expect(updatedVer!.status).toBe(TenderVersionStatus.UNDER_REVIEW);
    });

    it('allows comparing different versions of a tender', async () => {
      const { agent: client } = await loginAsAdmin();

      const tender = tenderRepo().create({
        status: TenderLifecycleStatus.ACTIVE,
        publicationStatus: TenderPublicationStatus.SCHEDULED,
      });
      await tenderRepo().save(tender);

      const v1 = await versionRepo().save(
        versionRepo().create({
          tenderId: tender.id,
          version: 1,
          status: TenderVersionStatus.APPROVED,
          title: 'Initial Title Spec',
          description: 'Old Description',
          priority: 'Low',
          currency: 'USD',
          siteVisitRequired: false,
        }),
      );

      const v2 = await versionRepo().save(
        versionRepo().create({
          tenderId: tender.id,
          version: 2,
          status: TenderVersionStatus.DRAFT,
          title: 'Modified Title Spec',
          description: 'Old Description',
          priority: 'High',
          currency: 'USD',
          siteVisitRequired: true,
        }),
      );

      tender.activeVersionId = v2.id;
      await tenderRepo().save(tender);

      const diffRes = await client
        .get(`/api/v1/tenders/admin/${tender.id}/diff?fromVersion=1&toVersion=2`)
        .expect(200);

      expect(diffRes.body.success).toBe(true);
      expect(diffRes.body.data.diff.title).toBeDefined();
      expect(diffRes.body.data.diff.title.old).toBe('Initial Title Spec');
      expect(diffRes.body.data.diff.title.new).toBe('Modified Title Spec');
      expect(diffRes.body.data.diff.priority.new).toBe('High');
    });
  });
});
