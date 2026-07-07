import { AppDataSource } from '../../src/config/database';
import { Plan } from '../../src/entities/Plan';
import { Subscription } from '../../src/entities/Subscription';
import { State } from '../../src/entities/State';
import { Category } from '../../src/entities/Category';
import { Tender } from '../../src/entities/Tender';
import { User } from '../../src/entities/User';
import { SubscriptionStatus, TenderStatus, AccountType } from '../../src/types/enums';
import { createSubscription } from '../../src/modules/subscriptions/subscriptions.service';
import { hasAccessToTender } from '../../src/utils/access';
import { createUser } from '../helpers/builders';

describe('Subscription Pricing & Target-Specific Access Control Tests', () => {
  let customerUser: User;
  let allAccessPlan: Plan;
  let statePlan: Plan;
  let countryPlan: Plan;
  let categoryPlan: Plan;
  let bundlePlan: Plan;

  let testState: State;
  let otherState: State;
  let testCategory: Category;
  let otherCategory: Category;

  let tenderInState: Tender;
  let tenderInOtherState: Tender;
  let tenderInCountry: Tender;
  let tenderInOtherCountry: Tender;
  let tenderInCategory: Tender;
  let tenderInOtherCategory: Tender;

  beforeAll(async () => {
    // Ensure database is initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  beforeEach(async () => {
    // Clear tables
    await AppDataSource.query(`TRUNCATE TABLE subscriptions, plans, tenders, categories, states, users RESTART IDENTITY CASCADE`);

    // Create user
    customerUser = await createUser({
      email: 'subscriber@test.local',
      accountType: AccountType.USER,
      emailVerified: true,
    });

    // Create lookup states
    const stateRepo = AppDataSource.getRepository(State);
    testState = stateRepo.create({
      name: 'New York',
      code: 'NY',
      slug: 'new-york',
      type: 'state',
      country: 'United States',
      isActive: true,
    });
    otherState = stateRepo.create({
      name: 'California',
      code: 'CA',
      slug: 'california',
      type: 'state',
      country: 'United States',
      isActive: true,
    });
    const canadaState = stateRepo.create({
      name: 'Ontario',
      code: 'ON',
      slug: 'ontario',
      type: 'state',
      country: 'Canada',
      isActive: true,
    });
    await stateRepo.save([testState, otherState, canadaState]);

    // Create categories
    const categoryRepo = AppDataSource.getRepository(Category);
    testCategory = categoryRepo.create({
      code: '001',
      name: 'Technology',
      slug: 'technology',
      isDeleted: false,
    });
    otherCategory = categoryRepo.create({
      code: '002',
      name: 'Construction',
      slug: 'construction',
      isDeleted: false,
    });
    await categoryRepo.save([testCategory, otherCategory]);

    // Create plans
    const planRepo = AppDataSource.getRepository(Plan);
    allAccessPlan = await planRepo.save(
      planRepo.create({
        name: 'All-Access Plan',
        priceCents: 2999,
        durationDays: 30,
        isActive: true,
        isRecurring: true,
        planType: 'all-access',
        trialDays: 7,
      })
    );

    statePlan = await planRepo.save(
      planRepo.create({
        name: 'State-Specific Plan',
        priceCents: 1499,
        durationDays: 30,
        isActive: true,
        isRecurring: true,
        planType: 'state',
        trialDays: 3,
      })
    );

    countryPlan = await planRepo.save(
      planRepo.create({
        name: 'Country-Specific Plan',
        priceCents: 1599,
        durationDays: 30,
        isActive: true,
        isRecurring: true,
        planType: 'country',
      })
    );

    categoryPlan = await planRepo.save(
      planRepo.create({
        name: 'Category-Specific Plan',
        priceCents: 999,
        durationDays: 30,
        isActive: true,
        isRecurring: true,
        planType: 'category',
      })
    );

    bundlePlan = await planRepo.save(
      planRepo.create({
        name: 'Custom Bundle Plan',
        priceCents: 1999,
        durationDays: 30,
        isActive: true,
        isRecurring: true,
        planType: 'bundle',
        bundleSize: 3,
      })
    );

    // Create tenders
    const tenderRepo = AppDataSource.getRepository(Tender);
    tenderInState = await tenderRepo.save(
      tenderRepo.create({
        title: 'NY Software Project',
        slug: 'ny-software-project',
        refNumber: 'NY-100',
        agency: 'NY Office of Technology',
        postedDate: new Date(),
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: TenderStatus.ACTIVE,
        stateId: testState.id,
        categoryId: testCategory.id,
        priceCents: 100,
      })
    );

    tenderInOtherState = await tenderRepo.save(
      tenderRepo.create({
        title: 'CA Construction Project',
        slug: 'ca-construction-project',
        refNumber: 'CA-200',
        agency: 'CA Roads',
        postedDate: new Date(),
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: TenderStatus.ACTIVE,
        stateId: otherState.id,
        categoryId: otherCategory.id,
        priceCents: 100,
      })
    );

    tenderInCountry = await tenderRepo.save(
      tenderRepo.create({
        title: 'Ontario Tech Upgrade',
        slug: 'ontario-tech-upgrade',
        refNumber: 'ON-300',
        agency: 'ON School Board',
        postedDate: new Date(),
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: TenderStatus.ACTIVE,
        stateId: canadaState.id,
        categoryId: testCategory.id,
        priceCents: 100,
      })
    );
  });

  describe('Validation & Verification of Plan Targets', () => {
    it('should fail if state-specific plan is purchased without targetStateId', async () => {
      await expect(
        createSubscription(
          {
            planId: statePlan.id,
            returnUrl: 'https://return.url',
            cancelUrl: 'https://cancel.url',
          },
          { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
        )
      ).rejects.toThrow('State selection required for state-specific plan');
    });

    it('should fail if country-specific plan is purchased without targetCountry', async () => {
      await expect(
        createSubscription(
          {
            planId: countryPlan.id,
            returnUrl: 'https://return.url',
            cancelUrl: 'https://cancel.url',
          },
          { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
        )
      ).rejects.toThrow('Country selection required for country-specific plan');
    });

    it('should fail if category-specific plan is purchased without targetCategoryId', async () => {
      await expect(
        createSubscription(
          {
            planId: categoryPlan.id,
            returnUrl: 'https://return.url',
            cancelUrl: 'https://cancel.url',
          },
          { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
        )
      ).rejects.toThrow('Category selection required for category-specific plan');
    });

    it('should fail if custom bundle plan is purchased without selectedCategoryIds', async () => {
      await expect(
        createSubscription(
          {
            planId: bundlePlan.id,
            returnUrl: 'https://return.url',
            cancelUrl: 'https://cancel.url',
          },
          { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
        )
      ).rejects.toThrow('Category selections required for custom bundle plan');
    });

    it('should fail if custom bundle category count exceeds plan bundleSize', async () => {
      await expect(
        createSubscription(
          {
            planId: bundlePlan.id,
            returnUrl: 'https://return.url',
            cancelUrl: 'https://cancel.url',
            selectedCategoryIds: ['cat-1', 'cat-2', 'cat-3', 'cat-4'], // size is 3
          },
          { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
        )
      ).rejects.toThrow('You can select at most 3 categories');
    });
  });

  describe('Tender Access Authorization Logic (hasAccessToTender)', () => {
    it('should deny access to all tenders if user has no subscription', async () => {
      const nyAccess = await hasAccessToTender(customerUser.id, tenderInState.id);
      const caAccess = await hasAccessToTender(customerUser.id, tenderInOtherState.id);
      expect(nyAccess).toBe(false);
      expect(caAccess).toBe(false);
    });

    it('should grant access to all tenders if user has All-Access subscription', async () => {
      // Create All-Access subscription
      await createSubscription(
        {
          planId: allAccessPlan.id,
          returnUrl: 'https://return.url',
          cancelUrl: 'https://cancel.url',
        },
        { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
      );

      const nyAccess = await hasAccessToTender(customerUser.id, tenderInState.id);
      const caAccess = await hasAccessToTender(customerUser.id, tenderInOtherState.id);
      expect(nyAccess).toBe(true);
      expect(caAccess).toBe(true);
    });

    it('should grant access only to NY tenders if user has state-specific NY subscription', async () => {
      // Create State-specific NY subscription
      await createSubscription(
        {
          planId: statePlan.id,
          returnUrl: 'https://return.url',
          cancelUrl: 'https://cancel.url',
          targetStateId: testState.id,
        },
        { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
      );

      const nyAccess = await hasAccessToTender(customerUser.id, tenderInState.id);
      const caAccess = await hasAccessToTender(customerUser.id, tenderInOtherState.id);
      expect(nyAccess).toBe(true);
      expect(caAccess).toBe(false);
    });

    it('should grant access only to Canada tenders if user has country-specific Canada subscription', async () => {
      // Create Country-specific Canada subscription
      await createSubscription(
        {
          planId: countryPlan.id,
          returnUrl: 'https://return.url',
          cancelUrl: 'https://cancel.url',
          targetCountry: 'Canada',
        },
        { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
      );

      const canadaAccess = await hasAccessToTender(customerUser.id, tenderInCountry.id);
      const usAccess = await hasAccessToTender(customerUser.id, tenderInState.id);
      expect(canadaAccess).toBe(true);
      expect(usAccess).toBe(false);
    });

    it('should grant access only to category-specific tenders', async () => {
      // Create Category-specific Technology subscription
      await createSubscription(
        {
          planId: categoryPlan.id,
          returnUrl: 'https://return.url',
          cancelUrl: 'https://cancel.url',
          targetCategoryId: testCategory.id,
        },
        { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
      );

      const techAccess = await hasAccessToTender(customerUser.id, tenderInState.id); // testCategory
      const constructionAccess = await hasAccessToTender(customerUser.id, tenderInOtherState.id); // otherCategory
      expect(techAccess).toBe(true);
      expect(constructionAccess).toBe(false);
    });

    it('should grant access only to bundle selected category tenders', async () => {
      // Create Custom Bundle subscription with Technology category
      await createSubscription(
        {
          planId: bundlePlan.id,
          returnUrl: 'https://return.url',
          cancelUrl: 'https://cancel.url',
          selectedCategoryIds: [testCategory.id],
        },
        { userId: customerUser.id, name: customerUser.name, email: customerUser.email }
      );

      const techAccess = await hasAccessToTender(customerUser.id, tenderInState.id); // testCategory
      const constructionAccess = await hasAccessToTender(customerUser.id, tenderInOtherState.id); // otherCategory
      expect(techAccess).toBe(true);
      expect(constructionAccess).toBe(false);
    });
  });
});
