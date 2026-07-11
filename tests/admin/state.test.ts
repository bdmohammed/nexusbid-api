import request from 'supertest';
import { app } from '../../src/config/app';
import { appDataSource } from '../../src/config/database';
import { State } from '../../src/entities/State';
import { Category } from '../../src/entities/Category';
import { Tender } from '../../src/entities/Tender';
import { AccountType, PermissionKey, TenderStatus } from '../../src/types/enums';
import { clearAuthTables, setupTestRoleWithPermission } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createUser } from '../helpers/builders';
import { User } from '../../src/entities/User';

const stateRepo = () => appDataSource.getRepository(State);
const categoryRepo = () => appDataSource.getRepository(Category);
const tenderRepo = () => appDataSource.getRepository(Tender);

async function assignPermission(adminId: string, permissionKey: PermissionKey, allowed = true) {
  if (allowed) {
    await setupTestRoleWithPermission(adminId, `Role-${permissionKey}`, permissionKey);
  }
}

async function clearAllTables() {
  await clearAuthTables();
  await appDataSource.query(`TRUNCATE TABLE tenders, states, categories RESTART IDENTITY CASCADE`);
}

describe('State Admin API Integration Tests', () => {
  let agent: ReturnType<typeof request.agent>;
  let csrfToken: string;

  let superAdminUser: User;
  let superAdminPassword = 'SuperAdminPass1!';

  let authorizedAdminUser: User;
  let authorizedAdminPassword = 'AuthAdminPass1!';

  let unauthorizedAdminUser: User;
  let unauthorizedAdminPassword = 'UnauthAdminPass1!';

  let customerUser: User;
  let customerPassword = 'CustomerPass1!';

  beforeEach(async () => {
    await clearAllTables();
    agent = request.agent(app);

    superAdminUser = await createUser({
      email: 'superadmin@test.local',
      accountType: AccountType.ADMIN,
      password: superAdminPassword,
      emailVerified: true,
    });
    await setupTestRoleWithPermission(superAdminUser.id, 'Super Admin', 'state.view');

    authorizedAdminUser = await createUser({
      email: 'authadmin@test.local',
      accountType: AccountType.ADMIN,
      password: authorizedAdminPassword,
      emailVerified: true,
    });
    await assignPermission(authorizedAdminUser.id, PermissionKey.MANAGE_STATES, true);

    unauthorizedAdminUser = await createUser({
      email: 'unauthadmin@test.local',
      accountType: AccountType.ADMIN,
      password: unauthorizedAdminPassword,
      emailVerified: true,
    });
    await assignPermission(unauthorizedAdminUser.id, PermissionKey.VIEW_USERS, true);

    customerUser = await createUser({
      email: 'customer@test.local',
      accountType: AccountType.USER,
      password: customerPassword,
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

  describe('Authorization checks', () => {
    it('allows public (unauthenticated) GET requests but denies admin operations', async () => {
      await request(app).get('/api/v1/states').expect(200);
      await request(app)
        .post('/api/v1/states')
        .send({ code: 'CA', name: 'California', type: 'state' })
        .expect(401);
    });

    it('allows customers to GET states but denies admin operations', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(
        customerUser.email,
        customerPassword,
      );
      await client.get('/api/v1/states').expect(200);
      await client
        .post('/api/v1/states')
        .set('x-csrf-token', clientCsrf)
        .send({ code: 'CA', name: 'California', type: 'state' })
        .expect(403);
    });

    it('denies admins without MANAGE_STATES permission from writing states', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(
        unauthorizedAdminUser.email,
        unauthorizedAdminPassword,
      );
      await client
        .post('/api/v1/states')
        .set('x-csrf-token', clientCsrf)
        .send({ code: 'CA', name: 'California', type: 'state' })
        .expect(403);
    });

    it('allows Super Admin to perform write operations', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(
        superAdminUser.email,
        superAdminPassword,
      );
      await client
        .post('/api/v1/states')
        .set('x-csrf-token', clientCsrf)
        .send({ code: 'CA', name: 'California', type: 'state' })
        .expect(201);
    });

    it('allows Admin with MANAGE_STATES permission to write states', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(
        authorizedAdminUser.email,
        authorizedAdminPassword,
      );
      await client
        .post('/api/v1/states')
        .set('x-csrf-token', clientCsrf)
        .send({ code: 'CA', name: 'California', type: 'state' })
        .expect(201);
    });
  });

  describe('CRUD Operations', () => {
    let client: ReturnType<typeof request.agent>;
    let clientCsrf: string;

    beforeEach(async () => {
      const login = await loginAs(authorizedAdminUser.email, authorizedAdminPassword);
      client = login.agent;
      clientCsrf = login.csrfToken;
    });

    it('GET /states returns active states sorted by code ascending', async () => {
      await stateRepo().save([
        stateRepo().create({
          code: 'TX',
          name: 'Texas',
          slug: 'texas',
          type: 'state',
          country: 'United States',
        }),
        stateRepo().create({
          code: 'CA',
          name: 'California',
          slug: 'california',
          type: 'state',
          country: 'United States',
        }),
        stateRepo().create({
          code: 'NY',
          name: 'New York',
          slug: 'new-york',
          type: 'state',
          country: 'United States',
        }),
      ]);

      const res = await client.get('/api/v1/states').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].code).toBe('CA');
      expect(res.body.data[1].code).toBe('NY');
      expect(res.body.data[2].code).toBe('TX');
    });

    it('GET /states supports pagination, searching and filtering', async () => {
      await stateRepo().save([
        stateRepo().create({
          code: 'CA',
          name: 'California',
          slug: 'california',
          type: 'state',
          country: 'United States',
        }),
        stateRepo().create({
          code: 'TX',
          name: 'Texas',
          slug: 'texas',
          type: 'state',
          country: 'United States',
        }),
        stateRepo().create({
          code: 'ON',
          name: 'Ontario',
          slug: 'ontario',
          type: 'state',
          country: 'Canada',
        }),
        stateRepo().create({
          code: 'PR',
          name: 'Puerto Rico',
          slug: 'puerto-rico',
          type: 'territory',
          country: 'United States',
        }),
      ]);

      // 1. Pagination limit=2
      let res = await client.get('/api/v1/states?page=1&limit=2').expect(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.totalPages).toBe(2);

      // 2. Search parameter matching name/country
      res = await client.get('/api/v1/states?search=ontario').expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('ON');

      // 3. Filter by type
      res = await client.get('/api/v1/states?type=territory').expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('PR');

      // 4. Filter by country
      res = await client.get('/api/v1/states?country=Canada').expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Ontario');
    });

    it('POST /states creates state and generates unique slug', async () => {
      const res = await client
        .post('/api/v1/states')
        .set('x-csrf-token', clientCsrf)
        .send({
          code: 'WA',
          name: 'Washington State',
          type: 'state',
          country: 'United States',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('WA');
      expect(res.body.data.slug).toBe('washington-state');

      const saved = await stateRepo().findOneBy({ code: 'WA' });
      expect(saved).not.toBeNull();
      expect(saved!.slug).toBe('washington-state');
    });

    it('POST /states restores soft-deleted state if code matches', async () => {
      // Soft-delete CA state
      const state = stateRepo().create({
        code: 'CA',
        name: 'California',
        slug: 'california',
        type: 'state',
        country: 'United States',
        deletedAt: new Date(),
      });
      await stateRepo().save(state);

      const res = await client
        .post('/api/v1/states')
        .set('x-csrf-token', clientCsrf)
        .send({
          code: 'CA',
          name: 'California New',
          type: 'state',
        })
        .expect(200); // 200 returned because of restoration update

      expect(res.body.data.name).toBe('California New');
      const restored = await stateRepo().findOneBy({ code: 'CA' });
      expect(restored!.deletedAt).toBeNull();
    });

    it('PATCH /states/:id updates state and updates audit logging fields', async () => {
      const state = await stateRepo().save(
        stateRepo().create({ code: 'OR', name: 'Oregon', slug: 'oregon', type: 'state' }),
      );

      const res = await client
        .patch(`/api/v1/states/${state.id}`)
        .set('x-csrf-token', clientCsrf)
        .send({
          name: 'Oregon Updated',
        })
        .expect(200);

      expect(res.body.data.name).toBe('Oregon Updated');
      expect(res.body.data.updatedBy).toBe(authorizedAdminUser.id);
    });

    it('DELETE /states/:id soft deletes state', async () => {
      const state = await stateRepo().save(
        stateRepo().create({ code: 'NV', name: 'Nevada', slug: 'nevada', type: 'state' }),
      );

      await client.delete(`/api/v1/states/${state.id}`).set('x-csrf-token', clientCsrf).expect(200);

      const activeState = await stateRepo().findOneBy({ id: state.id });
      expect(activeState).toBeNull();

      const deletedState = await stateRepo().findOne({
        where: { id: state.id },
        withDeleted: true,
      });
      expect(deletedState!.deletedAt).not.toBeNull();
    });

    it('DELETE /states/:id returns 400 if state is associated with active tenders', async () => {
      const state = await stateRepo().save(
        stateRepo().create({ code: 'FL', name: 'Florida', slug: 'florida', type: 'state' }),
      );
      const category = await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Category 1', slug: 'category-1' }),
      );

      // Create a tender linked to Florida
      await tenderRepo().save(
        tenderRepo().create({
          title: 'Tender Florida',
          slug: 'tender-florida',
          status: TenderStatus.ACTIVE,
          stateId: state.id,
          categoryId: category.id,
          deadline: new Date(Date.now() + 100000),
          createdByUserId: authorizedAdminUser.id,
        }),
      );

      await client.delete(`/api/v1/states/${state.id}`).set('x-csrf-token', clientCsrf).expect(400); // Fails due to active tender association
    });
  });

  describe('Batch Operations', () => {
    let client: ReturnType<typeof request.agent>;
    let clientCsrf: string;

    beforeEach(async () => {
      const login = await loginAs(authorizedAdminUser.email, authorizedAdminPassword);
      client = login.agent;
      clientCsrf = login.csrfToken;
    });

    it('POST /states/batch parses and executes JSON upsert and delete', async () => {
      const stateToKeep = await stateRepo().save(
        stateRepo().create({ code: 'CO', name: 'Colorado', slug: 'colorado', type: 'state' }),
      );
      const stateToDelete = await stateRepo().save(
        stateRepo().create({ code: 'UT', name: 'Utah', slug: 'utah', type: 'state' }),
      );

      const payload = [
        { action: 'upsert', code: 'CO', name: 'Colorado Upserted', type: 'state' }, // update
        { action: 'upsert', code: 'WY', name: 'Wyoming', type: 'state' }, // create
        { action: 'delete', code: 'UT' }, // delete
      ];

      const res = await client
        .post('/api/v1/states/batch')
        .set('x-csrf-token', clientCsrf)
        .send(payload)
        .expect(200);

      expect(res.body.data.created).toBe(1);
      expect(res.body.data.updated).toBe(1);
      expect(res.body.data.deleted).toBe(1);

      const colorado = await stateRepo().findOneBy({ code: 'CO' });
      expect(colorado!.name).toBe('Colorado Upserted');

      const wyoming = await stateRepo().findOneBy({ code: 'WY' });
      expect(wyoming).not.toBeNull();

      const utah = await stateRepo().findOneBy({ code: 'UT' });
      expect(utah).toBeNull();
    });

    it('POST /states/batch parses and executes CSV batch', async () => {
      const csvData = `action,code,name,type,country\nupsert,NM,New Mexico,state,United States\ndelete,UT,,,\n`;

      const res = await client
        .post('/api/v1/states/batch')
        .set('x-csrf-token', clientCsrf)
        .set('Content-Type', 'text/csv')
        .send(csvData)
        .expect(200);

      expect(res.body.data.created).toBe(1);
      const nm = await stateRepo().findOneBy({ code: 'NM' });
      expect(nm).not.toBeNull();
      expect(nm!.name).toBe('New Mexico');
    });
  });

  describe('Tender Relation Preservation', () => {
    let client: ReturnType<typeof request.agent>;
    let clientCsrf: string;

    beforeEach(async () => {
      const login = await loginAs(authorizedAdminUser.email, authorizedAdminPassword);
      client = login.agent;
      clientCsrf = login.csrfToken;
    });

    it('keeps soft-deleted state relations consistent in tender lists and details', async () => {
      const state = await stateRepo().save(
        stateRepo().create({ code: 'AZ', name: 'Arizona', slug: 'arizona', type: 'state' }),
      );
      const category = await categoryRepo().save(
        categoryRepo().create({ code: '002', name: 'Category 2', slug: 'category-2' }),
      );

      const tender = await tenderRepo().save(
        tenderRepo().create({
          title: 'Tender Arizona',
          slug: 'tender-arizona',
          status: TenderStatus.ACTIVE,
          stateId: state.id,
          categoryId: category.id,
          deadline: new Date(Date.now() + 100000),
          createdByUserId: authorizedAdminUser.id,
        }),
      );

      // Now, soft-delete Arizona state
      await stateRepo().softRemove(state);

      // 1. Public list tenders should return the tender with state populated correctly (instead of null/crashing)
      const listRes = await client.get('/api/v1/tenders').expect(200);
      expect(listRes.body.data.tenders.length).toBe(1);
      expect(listRes.body.data.tenders[0].state).not.toBeNull();
      expect(listRes.body.data.tenders[0].state.code).toBe('AZ');

      // 2. Public detail view should also return tender with state populated correctly
      const detailRes = await client.get(`/api/v1/tenders/${tender.slug}`).expect(200);
      expect(detailRes.body.data.tender.state).not.toBeNull();
      expect(detailRes.body.data.tender.state.code).toBe('AZ');
    });
  });
});
