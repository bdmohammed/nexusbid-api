import request from 'supertest';
import { app } from '../../src/config/app';
import { AppDataSource } from '../../src/config/database';
import { Category } from '../../src/entities/Category';
import { Tender } from '../../src/entities/Tender';
import { AccountType, PermissionKey } from '../../src/types/enums';
import { clearAuthTables, setupTestRoleWithPermission } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createUser } from '../helpers/builders';
import { User } from '../../src/entities/User';

const categoryRepo = () => AppDataSource.getRepository(Category);
const tenderRepo = () => AppDataSource.getRepository(Tender);

// Helper to assign a permission to a user
async function assignPermission(adminId: string, permissionKey: PermissionKey, allowed = true) {
  if (allowed) {
    await setupTestRoleWithPermission(adminId, `Role-${permissionKey}`, permissionKey);
  }
}

// Clear database including categories & tenders before/after tests
async function clearAllTables() {
  await clearAuthTables();
  // Clear categories and tenders to avoid FK issues
  await AppDataSource.query(`TRUNCATE TABLE tenders, categories RESTART IDENTITY CASCADE`);
}

describe('Category Admin API Integration Tests', () => {
  let agent: ReturnType<typeof request.agent>;
  let csrfToken: string;

  // We will create three users for authorization scenarios:
  // 1. Super Admin (unlimited access)
  // 2. Limited Admin with MANAGE_CATEGORIES permission
  // 3. Limited Admin WITHOUT MANAGE_CATEGORIES permission
  // 4. Regular Customer
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

    // Setup Super Admin
    superAdminUser = await createUser({
      email: 'superadmin@test.local',
      accountType: AccountType.ADMIN,
      password: superAdminPassword,
      emailVerified: true,
    });
    await setupTestRoleWithPermission(superAdminUser.id, 'Super Admin', 'category.view');

    // Setup Authorized Admin
    authorizedAdminUser = await createUser({
      email: 'authadmin@test.local',
      accountType: AccountType.ADMIN,
      password: authorizedAdminPassword,
      emailVerified: true,
    });
    await assignPermission(authorizedAdminUser.id, PermissionKey.MANAGE_CATEGORIES, true);

    // Setup Unauthorized Admin
    unauthorizedAdminUser = await createUser({
      email: 'unauthadmin@test.local',
      accountType: AccountType.ADMIN,
      password: unauthorizedAdminPassword,
      emailVerified: true,
    });
    // Give support some permission other than categories
    await assignPermission(unauthorizedAdminUser.id, PermissionKey.VIEW_USERS, true);

    // Setup Customer User
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
    it('allows public (unauthenticated) GET requests but denies POST', async () => {
      await request(app).get('/api/v1/categories').expect(200);
      await request(app).post('/api/v1/categories').send({ code: '001', name: 'Test' }).expect(401);
    });

    it('allows customers to GET but denies POST', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(customerUser.email, customerPassword);
      await client.get('/api/v1/categories').expect(200);
      await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '001', name: 'Test' })
        .expect(403);
    });

    it('allows admins without MANAGE_CATEGORIES permission to GET but denies POST', async () => {
      const { agent: client, csrfToken: clientCsrf } = await loginAs(unauthorizedAdminUser.email, unauthorizedAdminPassword);
      await client.get('/api/v1/categories').expect(200);
      await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '001', name: 'Test' })
        .expect(403);
    });

    it('allows Super Admin to GET and write', async () => {
      const { agent: client } = await loginAs(superAdminUser.email, superAdminPassword);
      await client.get('/api/v1/categories').expect(200);
    });

    it('allows Admin with MANAGE_CATEGORIES permission to GET and write', async () => {
      const { agent: client } = await loginAs(authorizedAdminUser.email, authorizedAdminPassword);
      await client.get('/api/v1/categories').expect(200);
    });
  });

  // ─── CRUD Functional Tests ─────────────────────────────────────────────────
  describe('CRUD Operations', () => {
    let client: ReturnType<typeof request.agent>;
    let clientCsrf: string;

    beforeEach(async () => {
      const login = await loginAs(authorizedAdminUser.email, authorizedAdminPassword);
      client = login.agent;
      clientCsrf = login.csrfToken;
    });

    it('GET /categories returns categories sorted by code ascending', async () => {
      // Seed some categories out of order
      await categoryRepo().save([
        categoryRepo().create({ code: '003', name: 'Category C', slug: 'category-c' }),
        categoryRepo().create({ code: '001', name: 'Category A', slug: 'category-a' }),
        categoryRepo().create({ code: '002', name: 'Category B', slug: 'category-b' }),
      ]);

      const res = await client.get('/api/v1/categories').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].code).toBe('001');
      expect(res.body.data[1].code).toBe('002');
      expect(res.body.data[2].code).toBe('003');
    });

    it('GET /categories returns dynamic activeTenderCount', async () => {
      // Seed two categories
      const catA = await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Category A', slug: 'category-a' })
      );
      const catB = await categoryRepo().save(
        categoryRepo().create({ code: '002', name: 'Category B', slug: 'category-b' })
      );

      // Seed a state
      const stateRepo = AppDataSource.getRepository('State');
      const state = await stateRepo.save(
        stateRepo.create({ code: 'NY', name: 'New York' })
      ) as any;

      // Seed 2 active tenders for Category A
      await tenderRepo().save([
        tenderRepo().create({
          title: 'Tender 1',
          slug: 'tender-1',
          refNumber: 'REF-1',
          description: 'Desc 1',
          status: 'active' as any,
          submissionType: 'both' as any,
          closingAt: new Date(),
          categoryId: catA.id,
          stateId: state.id,
          createdById: superAdminUser.id,
        } as any),
        tenderRepo().create({
          title: 'Tender 2',
          slug: 'tender-2',
          refNumber: 'REF-2',
          description: 'Desc 2',
          status: 'active' as any,
          submissionType: 'both' as any,
          closingAt: new Date(),
          categoryId: catA.id,
          stateId: state.id,
          createdById: superAdminUser.id,
        } as any),
        // 1 draft/inactive tender for Category A
        tenderRepo().create({
          title: 'Tender 3',
          slug: 'tender-3',
          refNumber: 'REF-3',
          description: 'Desc 3',
          status: 'draft' as any,
          submissionType: 'both' as any,
          closingAt: new Date(),
          categoryId: catA.id,
          stateId: state.id,
          createdById: superAdminUser.id,
        } as any)
      ]);

      const res = await client.get('/api/v1/categories').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      
      const catAData = res.body.data.find((c: any) => c.code === '001');
      const catBData = res.body.data.find((c: any) => c.code === '002');
      
      expect(catAData).toBeDefined();
      expect(catAData.activeTenderCount).toBe(2);
      
      expect(catBData).toBeDefined();
      expect(catBData.activeTenderCount).toBe(0);
    });

    it('GET /categories supports search and filter parameters', async () => {
      // Seed some categories
      await categoryRepo().save([
        categoryRepo().create({ code: '001', name: 'Software Development', slug: 'software-development' }),
        categoryRepo().create({ code: '002', name: 'Mobile App Dev', slug: 'mobile-app-dev' }),
        categoryRepo().create({ code: '003', name: 'HR Services', slug: 'hr-services' }),
      ]);

      // 1. Search by name (partial case-insensitive)
      let res = await client.get('/api/v1/categories?search=dev').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].code).toBe('001');
      expect(res.body.data[1].code).toBe('002');

      // 2. Search by code (partial matching)
      res = await client.get('/api/v1/categories?search=002').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('002');

      // 3. Filter by exact code
      res = await client.get('/api/v1/categories?code=003').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('HR Services');

      // 4. Filter by exact slug
      res = await client.get('/api/v1/categories?slug=software-development').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('001');

      // 5. Combined filter and search
      res = await client.get('/api/v1/categories?code=002&search=dev').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].slug).toBe('mobile-app-dev');
    });

    it('POST /categories creates category and auto-generates unique slug', async () => {
      const res = await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({
          code: '055',
          name: 'Technology and IT',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('055');
      expect(res.body.data.name).toBe('Technology and IT');
      expect(res.body.data.slug).toBe('technology-and-it');

      const saved = await categoryRepo().findOneBy({ code: '055' });
      expect(saved).not.toBeNull();
      expect(saved!.slug).toBe('technology-and-it');
    });

    it('POST /categories respects custom slug if provided', async () => {
      const res = await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({
          code: '060',
          name: 'Custom Category',
          slug: 'my-custom-slug',
        })
        .expect(201);

      expect(res.body.data.slug).toBe('my-custom-slug');

      const saved = await categoryRepo().findOneBy({ code: '060' });
      expect(saved!.slug).toBe('my-custom-slug');
    });

    it('POST /categories auto-resolves slug collision with suffix', async () => {
      // Create first category
      await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '001', name: 'Same Name' })
        .expect(201);

      // Create second category with same name (different code)
      const res2 = await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '002', name: 'Same Name' })
        .expect(201);

      expect(res2.body.data.slug).toBe('same-name-1');

      const all = await categoryRepo().find({ order: { code: 'ASC' } });
      expect(all[0].slug).toBe('same-name');
      expect(all[1].slug).toBe('same-name-1');
    });

    it('POST /categories strict validation of 3-digit NAICS code', async () => {
      // 4 digits (invalid)
      await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '0001', name: 'Test' })
        .expect(422);

      // Alphabetic (invalid)
      await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: 'abc', name: 'Test' })
        .expect(422);

      // 2 digits (invalid)
      await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '12', name: 'Test' })
        .expect(422);
    });

    it('POST /categories returns 409 on duplicate code (TOCTOU protection)', async () => {
      await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Construction', slug: 'construction' })
      );

      const res = await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '001', name: 'Building' })
        .expect(409);

      expect(res.body.code).toBe('CATEGORY_CODE_TAKEN');
    });

    it('POST /categories returns 409 on duplicate slug if slug explicitly supplied', async () => {
      await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Construction', slug: 'const-slug' })
      );

      const res = await client
        .post('/api/v1/categories')
        .set('x-csrf-token', clientCsrf)
        .send({ code: '002', name: 'Building', slug: 'const-slug' })
        .expect(409);

      expect(res.body.code).toBe('CATEGORY_SLUG_TAKEN');
    });

    it('PATCH /categories/:id updates fields successfully', async () => {
      const cat = await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Construction', slug: 'construction' })
      );

      const res = await client
        .patch(`/api/v1/categories/${cat.id}`)
        .set('x-csrf-token', clientCsrf)
        .send({
          name: 'Construction Works',
          code: '002',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Construction Works');
      expect(res.body.data.code).toBe('002');
      // Slug should be regenerated from name because name changed and no slug supplied
      expect(res.body.data.slug).toBe('construction-works');
    });

    it('PATCH /categories/:id returns 409 if updated code is already taken', async () => {
      await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Construction', slug: 'construction' })
      );
      const cat2 = await categoryRepo().save(
        categoryRepo().create({ code: '002', name: 'IT', slug: 'it' })
      );

      const res = await client
        .patch(`/api/v1/categories/${cat2.id}`)
        .set('x-csrf-token', clientCsrf)
        .send({ code: '001' })
        .expect(409);

      expect(res.body.code).toBe('CATEGORY_CODE_TAKEN');
    });

    it('PATCH /categories/:id returns 404 if not found', async () => {
      const nonExistentUuid = 'a0000000-0000-0000-0000-000000000000';
      await client
        .patch(`/api/v1/categories/${nonExistentUuid}`)
        .set('x-csrf-token', clientCsrf)
        .send({ name: 'Testing' })
        .expect(404);
    });

    it('DELETE /categories/:id deletes category successfully', async () => {
      const cat = await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Construction', slug: 'construction' })
      );

      await client
        .delete(`/api/v1/categories/${cat.id}`)
        .set('x-csrf-token', clientCsrf)
        .expect(200);

      const found = await categoryRepo().findOneBy({ id: cat.id });
      expect(found).toBeNull();
    });

    it('DELETE /categories/:id returns 400 when category has associated tenders', async () => {
      // 1. Create a category
      const cat = await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Construction', slug: 'construction' })
      );

      // 2. Create a tender referencing the category
      // We need a dummy state for tender
      const stateRepo = AppDataSource.getRepository('State');
      const state = await stateRepo.save(
        stateRepo.create({ code: 'NY', name: 'New York' })
      ) as any;

      // Also need a user to assign as creator
      await tenderRepo().save(
        tenderRepo().create({
          title: 'Big Bridge Project',
          slug: 'big-bridge-project',
          refNumber: 'REF-123',
          description: 'A huge bridge building project.',
          status: 'draft' as any,
          submissionType: 'both' as any,
          closingAt: new Date(),
          categoryId: cat.id,
          stateId: state.id,
          createdById: superAdminUser.id,
        } as any)
      );

      // 3. Attempt to delete
      const res = await client
        .delete(`/api/v1/categories/${cat.id}`)
        .set('x-csrf-token', clientCsrf)
        .expect(400);

      expect(res.body.code).toBe('CATEGORY_HAS_TENDERS');
      
      const found = await categoryRepo().findOneBy({ id: cat.id });
      expect(found).not.toBeNull();
    });

    it('DELETE /categories/:id returns 404 if not found', async () => {
      const nonExistentUuid = 'a0000000-0000-0000-0000-000000000000';
      await client
        .delete(`/api/v1/categories/${nonExistentUuid}`)
        .set('x-csrf-token', clientCsrf)
        .expect(404);
    });
  });

  describe('Batch Operations & Soft Delete', () => {
    let client: ReturnType<typeof request.agent>;
    let clientCsrf: string;

    beforeEach(async () => {
      const login = await loginAs(authorizedAdminUser.email, authorizedAdminPassword);
      client = login.agent;
      clientCsrf = login.csrfToken;
    });

    it('soft deletes category and excludes it from standard GET queries', async () => {
      const cat = await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'To Delete', slug: 'to-delete' })
      );

      // Verify it exists in list
      let list = await client.get('/api/v1/categories').expect(200);
      expect(list.body.data.some((c: any) => c.code === '001')).toBe(true);

      // Soft delete it
      await client
        .delete(`/api/v1/categories/${cat.id}`)
        .set('x-csrf-token', clientCsrf)
        .expect(200);

      // Verify it is excluded from list
      list = await client.get('/api/v1/categories').expect(200);
      expect(list.body.data.some((c: any) => c.code === '001')).toBe(false);

      // Verify it still exists in DB with deleted_at set (withDeleted: true)
      const dbCat = await categoryRepo().findOne({ where: { id: cat.id }, withDeleted: true });
      expect(dbCat).not.toBeNull();
      expect(dbCat!.deletedAt).not.toBeNull();
    });

    it('processes batch creation/updates/deletes via JSON', async () => {
      // 1. Seed two categories (one of which will be deleted, one updated)
      await categoryRepo().save([
        categoryRepo().create({ code: '001', name: 'Cat One', slug: 'cat-one' }),
        categoryRepo().create({ code: '002', name: 'Cat Two', slug: 'cat-two' }),
      ]);

      const payload = [
        { action: 'delete', code: '001' }, // delete 001
        { action: 'upsert', code: '002', name: 'Cat Two Updated' }, // update 002
        { action: 'upsert', code: '003', name: 'Cat Three' }, // create 003
      ];

      const res = await client
        .post('/api/v1/categories/batch')
        .set('x-csrf-token', clientCsrf)
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        created: 1,
        updated: 1,
        deleted: 1,
      });

      // Verify db state
      const all = await categoryRepo().find({ order: { code: 'ASC' } });
      expect(all.length).toBe(2);
      expect(all[0].code).toBe('002');
      expect(all[0].name).toBe('Cat Two Updated');
      expect(all[1].code).toBe('003');
      expect(all[1].name).toBe('Cat Three');
    });

    it('processes batch creation/updates/deletes via CSV text', async () => {
      await categoryRepo().save([
        categoryRepo().create({ code: '001', name: 'Cat One', slug: 'cat-one' }),
      ]);

      const csvData = [
        'action,code,name,slug',
        'delete,001,,',
        'upsert,002,Cat Two,cat-two-slug',
        'upsert,003,Cat Three,',
      ].join('\n');

      const res = await client
        .post('/api/v1/categories/batch')
        .set('x-csrf-token', clientCsrf)
        .set('content-type', 'text/csv')
        .send(csvData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        created: 2,
        updated: 0,
        deleted: 1,
      });

      const all = await categoryRepo().find({ order: { code: 'ASC' } });
      expect(all.length).toBe(2);
      expect(all[0].code).toBe('002');
      expect(all[0].slug).toBe('cat-two-slug');
      expect(all[1].code).toBe('003');
      expect(all[1].slug).toBe('cat-three');
    });

    it('restores soft-deleted categories during batch upsert', async () => {
      // 1. Create and soft-delete a category
      const cat = await categoryRepo().save(
        categoryRepo().create({ code: '001', name: 'Cat One', slug: 'cat-one' })
      );
      await categoryRepo().softRemove(cat);

      // Verify it's soft-deleted
      let dbCat = await categoryRepo().findOne({ where: { code: '001' } });
      expect(dbCat).toBeNull();

      // 2. Batch upsert the same code
      const payload = [{ action: 'upsert', code: '001', name: 'Cat One Restored' }];

      await client
        .post('/api/v1/categories/batch')
        .set('x-csrf-token', clientCsrf)
        .send(payload)
        .expect(200);

      // Verify it's restored and updated
      dbCat = await categoryRepo().findOne({ where: { code: '001' } });
      expect(dbCat).not.toBeNull();
      expect(dbCat!.name).toBe('Cat One Restored');
      expect(dbCat!.deletedAt).toBeNull();
    });

    it('rolls back transaction and returns error if validation fails in batch', async () => {
      await categoryRepo().save([
        categoryRepo().create({ code: '001', name: 'Cat One', slug: 'cat-one' }),
      ]);

      // Batch with a duplicate slug conflict
      const payload = [
        { action: 'upsert', code: '002', name: 'Cat Two', slug: 'cat-one' } // slug conflict with 001
      ];

      const res = await client
        .post('/api/v1/categories/batch')
        .set('x-csrf-token', clientCsrf)
        .send(payload)
        .expect(409);

      expect(res.body.code).toBe('CATEGORY_SLUG_TAKEN');

      // Verify that no new category was saved (transaction rolled back)
      const count = await categoryRepo().count();
      expect(count).toBe(1);
    });

    it('enforces batch limit of 500 items', async () => {
      const items = Array.from({ length: 501 }, (_, i) => ({
        action: 'upsert',
        code: String(100 + i).slice(0, 3),
        name: `Cat ${i}`,
      }));

      const res = await client
        .post('/api/v1/categories/batch')
        .set('x-csrf-token', clientCsrf)
        .send(items)
        .expect(400);

      expect(res.body.code).toBe('BATCH_SIZE_EXCEEDED');
    });
  });
});
