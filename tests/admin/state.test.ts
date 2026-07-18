import request from 'supertest';
import { app } from '../../src/config/app';
import { AppDataSource } from '../../src/config/database';
import { State } from '../../src/database/entities/State';
import { Country } from '../../src/database/entities/Country';
import { AccountType, PermissionKey } from '../../src/types/enums';
import { clearAuthTables, setupTestRoleWithPermission } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createUser } from '../helpers/builders';
import { User } from '../../src/database/entities/User';

const stateRepo = () => AppDataSource.getRepository(State);
const countryRepo = () => AppDataSource.getRepository(Country);

async function assignPermission(adminId: string, permissionKey: PermissionKey, allowed = true) {
  if (allowed) {
    await setupTestRoleWithPermission(adminId, `Role-${permissionKey}`, permissionKey);
  }
}

async function clearAllTables() {
  await clearAuthTables();
  await AppDataSource.query(
    `TRUNCATE TABLE tenders, states, countries, categories RESTART IDENTITY CASCADE`,
  );
}

describe('State & Country Admin API Integration Tests', () => {
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
      await request(app).patch('/api/v1/states/1').send({ isActive: false }).expect(401);
    });

    it('allows customers to GET states but denies admin operations', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(
        customerUser.email,
        customerPassword,
      );
      await client.get('/api/v1/states').expect(200);
      await client
        .patch('/api/v1/states/1')
        .set('x-csrf-token', clientCsrf)
        .send({ isActive: false })
        .expect(403);
    });

    it('denies admins without MANAGE_STATES permission from writing states', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(
        unauthorizedAdminUser.email,
        unauthorizedAdminPassword,
      );
      await client
        .patch('/api/v1/states/1')
        .set('x-csrf-token', clientCsrf)
        .send({ isActive: false })
        .expect(403);
    });
  });

  describe('Geographical Queries & Toggles', () => {
    let client: ReturnType<typeof request.agent>;
    let clientCsrf: string;

    beforeEach(async () => {
      const login = await loginAs(authorizedAdminUser.email, authorizedAdminPassword);
      client = login.agent;
      clientCsrf = login.csrfToken;
    });

    it('GET /states returns active states sorted by code ascending', async () => {
      const us = await countryRepo().save(
        countryRepo().create({
          code: 'US',
          name: 'United States',
          createdById: authorizedAdminUser.id,
        }),
      );

      await stateRepo().save([
        stateRepo().create({
          code: 'TX',
          name: 'Texas',
          type: 'state',
          countryId: us.id,
          createdById: authorizedAdminUser.id,
        }),
        stateRepo().create({
          code: 'CA',
          name: 'California',
          type: 'state',
          countryId: us.id,
          createdById: authorizedAdminUser.id,
        }),
        stateRepo().create({
          code: 'NY',
          name: 'New York',
          type: 'state',
          countryId: us.id,
          createdById: authorizedAdminUser.id,
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
      const us = await countryRepo().save(
        countryRepo().create({
          code: 'US',
          name: 'United States',
          createdById: authorizedAdminUser.id,
        }),
      );
      const ca = await countryRepo().save(
        countryRepo().create({ code: 'CA', name: 'Canada', createdById: authorizedAdminUser.id }),
      );

      await stateRepo().save([
        stateRepo().create({
          code: 'CA',
          name: 'California',
          type: 'state',
          countryId: us.id,
          createdById: authorizedAdminUser.id,
        }),
        stateRepo().create({
          code: 'TX',
          name: 'Texas',
          type: 'state',
          countryId: us.id,
          createdById: authorizedAdminUser.id,
        }),
        stateRepo().create({
          code: 'ON',
          name: 'Ontario',
          type: 'state',
          countryId: ca.id,
          createdById: authorizedAdminUser.id,
        }),
        stateRepo().create({
          code: 'PR',
          name: 'Puerto Rico',
          type: 'territory',
          countryId: us.id,
          createdById: authorizedAdminUser.id,
        }),
      ]);

      // 1. Pagination limit=2
      let res = await client.get('/api/v1/states?page=1&limit=2').expect(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.totalPages).toBe(2);

      // 2. Search parameter matching name
      res = await client.get('/api/v1/states?search=ontario').expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('ON');

      // 3. Filter by type
      res = await client.get('/api/v1/states?type=territory').expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('PR');

      // 4. Filter by country code
      res = await client.get('/api/v1/states?country=CA').expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Ontario');
    });

    it('PATCH /states/:id updates state status', async () => {
      const us = await countryRepo().save(
        countryRepo().create({
          code: 'US',
          name: 'United States',
          createdById: authorizedAdminUser.id,
        }),
      );
      const state = await stateRepo().save(
        stateRepo().create({
          code: 'OR',
          name: 'Oregon',
          type: 'state',
          countryId: us.id,
          createdById: authorizedAdminUser.id,
        }),
      );

      const res = await client
        .patch(`/api/v1/states/${state.id}`)
        .set('x-csrf-token', clientCsrf)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data.updatedById).toBe(authorizedAdminUser.id);
    });

    it('PATCH /states/countries/:id updates country status', async () => {
      const us = await countryRepo().save(
        countryRepo().create({
          code: 'US',
          name: 'United States',
          createdById: authorizedAdminUser.id,
        }),
      );

      const res = await client
        .patch(`/api/v1/states/countries/${us.id}`)
        .set('x-csrf-token', clientCsrf)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data.updatedById).toBe(authorizedAdminUser.id);
    });
  });
});
