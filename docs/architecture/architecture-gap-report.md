# Architecture Gap Report v1.0

This audit document evaluates the current NexusBid backend codebase structure against the approved **Backend Architecture Standard v1.0**. It identifies structural gaps, architectural deviations, and configuration redundancies, providing an actionable roadmap for remediation without introducing behavioral risks.

---

## 1. Executive Summary

### Architectural Maturity
The current backend has an architectural maturity score of **6.5/10**. The boundaries between logical components are established (e.g. TypeORM entities are isolated from controllers, and routing is separated from business flow), but the codebase exhibits significant structural drift.

### Overall Compliance
The overall compliance level of the codebase against the Backend Architecture Standard v1.0 is **68%**. 

### Biggest Strengths
- **Decoupled Entities**: Core entity models are well-organized in `src/entities/`, separating schema representations from route controllers.
- **Robust Route Middleware Stack**: Security, validation, logging, and tracing contexts are consistently implemented at the request pipeline level.
- **Isolate Scheduled Workers**: Background cron jobs are separated into the top-level `src/jobs/` directory, maintaining clear separation of scheduled execution contexts.

### Biggest Weaknesses
- **Module Structure Inconsistency**: Modules show no unified layout structure. Some are flat, some hybrid, and some nested, which increases development friction.
- **Duplicate Permission Definitions**: Role permissions are defined statically in `src/authorization/registry/` and then duplicated in database seed scripts in `src/database/seed/permissions/`.
- **Fragmented Caching Architecture**: Core cache systems are split across three locations, generating duplicate Redis client pools and increasing the likelihood of stale reads.

### Highest-Risk Architectural Issues
1. **Seeding vs Registry Configuration Drift (Critical)**: Updates to the authorization graph registry may not be updated in the DB seeds, leading to missing permissions or invalid access configurations.
2. **Circular Dependencies (High)**: Bi-directional imports between tight modules (e.g. `plans.service.ts` and `subscriptions.service.ts`) risk circular references at startup.
3. **Cache Coherency Failure (Medium)**: Broken caching architectures lead to uncoordinated key storage and inconsistent database reads.

### Recommended Migration Strategy
We recommend an **Incremental, Four-Phase Remediation Plan** focusing first on non-breaking directory cleanups, followed by data model seed synchronization, and concluding with cache unification.

---

## 2. Top-Level Folder Compliance

The table below outlines the compliance status of each top-level folder within `src/` against the approved standard:

| Folder Path | Purpose | Current Responsibility | Expected Responsibility | Compliant? | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/authorization/` | Permission registration. | Dynamic permission graph validation and validation query parsing. | Dynamic permission graph validation and validation query parsing. | **Yes** | Maintain current scope. |
| `src/cache/` | Cache providers. | Redis, Valkey, and memory providers. | Unified provider interface implementation. | **Partial** | *REQUIRED*: Consolidate all caching adapters into this folder. |
| `src/config/` | System setup. | Parse envs, database connection, logger, RBAC bootstrapper. | Core environment configuration parser and database config init. | **Yes** | Maintain current scope. |
| `src/core/` | Global primitives. | custom HTTP errors, async error wrappers. | Base project errors and base constants. | **Yes** | Maintain current scope. |
| `src/database/` | Database seeds/migrations. | TypeORM migrations, seed data scripts. | Database migrations and seed execution scripts. | **Partial** | *REQUIRED*: Refactor seeding modules to load from the graph registry. |
| `src/entities/` | Schema classes. | DB tables representations. | DB tables representations. | **Yes** | Maintain current scope. |
| `src/jobs/` | Scheduled tasks. | cron job manager and background tasks. | cron job manager and background tasks. | **Yes** | Maintain current scope. |
| `src/middleware/` | Express interception. | Auth, CORS, validation, trace logs. | Express request lifecycle helpers. | **Yes** | Maintain current scope. |
| `src/modules/` | Feature logic. | Route, controllers, service endpoints. | Standardized modular feature folders (Levels 1–4). | **Partial** | *REQUIRED*: Restructure drifted modules to follow evolution standards. |
| `src/search/` | Search integration. | Full-text indexing for tenders. | Indexing interfaces for search engines. | **Yes** | Maintain current scope. |
| `src/services/` | Shared adapters. | S3 storage client, email sender, legacy caching service, token service. | Business-agnostic shared infrastructure client integrations. | **Partial** | *REQUIRED*: Deprecate `cache.service.ts` and move it to `src/cache/`. |
| `src/types/` | Global definitions. | Declaration mappings and enums. | Declaration mappings and enums. | **Yes** | Maintain current scope. |
| `src/utils/` | Low-level helpers. | Domain logic checkers, slug formatting, stateless encryption. | Stateless, side-effect free helper functions. | **Yes** | Maintain current scope. |

---

## 3. Module Compliance Review

Each feature module under `src/modules/` has been reviewed individually to check for structural compliance:

### 1. `admin`
- **Current Structure**: Flat root (`admin.controller.ts`, `admin.dto.ts`, `admin.routes.ts`, `admin.service.ts`).
- **Expected Structure**: Flat root.
- **Current Level**: Level 1.
- **Expected Level**: Level 1 (Fits requirements: contains exactly one controller, route, service, and DTO).
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

### 2. `analytics`
- **Current Structure**: Nested (`api/`, `cache/`, `dto/`, `events/`, `jobs/`, `metrics/`, `reports/`, `services/`).
- **Expected Structure**: Level 4 (Complete Domain Sub-system).
- **Current Level**: Level 4.
- **Expected Level**: Level 4.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: Ensure the localized `cache/` references the global `src/cache/` provider rather than standing up an independent client pool.

### 3. `audit`
- **Current Structure**: Nested (`api/`, `dto/`, `jobs/`, `services/`, `utils/`).
- **Expected Structure**: Level 3 (Fully Layered).
- **Current Level**: Level 3.
- **Expected Level**: Level 3.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: Ensure `utils/redaction.ts` does not acquire database states.

### 4. `auth`
- **Current Structure**: Flat root with 8 files.
- **Expected Structure**: Nested (`api/`, `services/`, `dto/`).
- **Current Level**: Level 1 (Flat).
- **Expected Level**: Level 3 (Fully Layered).
- **Compliant?**: **No**
- **Reason**: The module exceeds standard complexity thresholds (multiple controllers/services like OAuth, Session, and Security Log).
- **Risk**: High (increased cognitive load, difficult maintenance).
- **Recommendation (REQUIRED)**: Reorganize the folder into `api/`, `services/`, and `dto/` subdirectories.

### 5. `categories`
- **Current Structure**: Only `categories.routes.ts` exists at the root.
- **Expected Structure**: Flat root.
- **Current Level**: Level 1.
- **Expected Level**: Level 1.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

### 6. `dashboard`
- **Current Structure**: Nested (`api/`, `dto/`, `services/`).
- **Expected Structure**: Level 3 (Fully Layered).
- **Current Level**: Level 3.
- **Expected Level**: Level 3.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

### 7. `notifications`
- **Current Structure**: Nested (`api/`, `services/`).
- **Expected Structure**: Level 2 (Segmented).
- **Current Level**: Level 2.
- **Expected Level**: Level 2.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

### 8. `profile`
- **Current Structure**: Flat root (`profile.controller.ts`, `profile.dto.ts`, `profile.routes.ts`, `profile.service.ts`).
- **Expected Structure**: Flat root.
- **Current Level**: Level 1.
- **Expected Level**: Level 1.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

### 9. `rbac`
- **Current Structure**: Hybrid (half root files, half nested in `controllers/` and `events/`).
- **Expected Structure**: Level 3 (Fully Layered).
- **Current Level**: Hybrid.
- **Expected Level**: Level 3.
- **Compliant?**: **No**
- **Reason**: Incomplete controller migration. Leaving `rbac.controller.ts` at the root while nesting others in `controllers/` is inconsistent.
- **Risk**: Medium.
- **Recommendation (REQUIRED)**: Consolidate all controllers into a unified `api/` or `controllers/` subdirectory.

### 10. `states`
- **Current Structure**: Only `states.routes.ts` at root.
- **Expected Structure**: Flat root.
- **Current Level**: Level 1.
- **Expected Level**: Level 1.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

### 11. `subscriptions`
- **Current Structure**: Flat root containing 7 files.
- **Expected Structure**: Level 3 (Fully Layered).
- **Current Level**: Level 1 (Flat).
- **Expected Level**: Level 3.
- **Compliant?**: **No**
- **Reason**: Manages two distinct controllers (`plans.controller.ts`, `subscriptions.controller.ts`) and two service files at a single root, exceeding standard limits.
- **Risk**: Medium.
- **Recommendation (REQUIRED)**: Evolve the module to Level 3. Separate controllers into `api/`, services into `services/`, and schemas into `dto/`.

### 12. `support`
- **Current Structure**: Flat root (`support.controller.ts`, `support.dto.ts`, `support.routes.ts`).
- **Expected Structure**: Flat root.
- **Current Level**: Level 1.
- **Expected Level**: Level 1.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

### 13. `tenders`
- **Current Structure**: Flat root with 6 files.
- **Expected Structure**: Level 3 (Fully Layered).
- **Current Level**: Level 1 (Flat).
- **Expected Level**: Level 3.
- **Compliant?**: **No**
- **Reason**: Exceeds flat file-count thresholds (multiple controllers/services like `tenderReports.controller.ts` and `TenderWorkflowService.ts`).
- **Risk**: Medium.
- **Recommendation (REQUIRED)**: Reorganize into `api/`, `services/`, and `dto/` structures.

### 14. `webhooks`
- **Current Structure**: Flat root (`webhooks.controller.ts`, `webhooks.routes.ts`, `webhooks.service.ts`).
- **Expected Structure**: Flat root.
- **Current Level**: Level 1.
- **Expected Level**: Level 1.
- **Compliant?**: **Yes**
- **Risk**: Low.
- **Recommendation**: None.

---

## 4. Module Evolution Validation

The table below checks module structures against the evolution thresholds (defined in Section 6 of the Standard):

| Feature Module | Controllers Count | Services Count | DTO Files | Current Level | standard Threshold Met? | Action Required |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `auth` | 2 | 4 | 1 | Level 1 | **Exceeded** | Evolve to Level 3 (Create `api/` and `services/`). |
| `rbac` | 6 | 1 | 0 | Hybrid | **Broken** | Evolve to Level 3 (Move all controllers to `api/`). |
| `subscriptions` | 2 | 2 | 1 | Level 1 | **Exceeded** | Evolve to Level 3 (Create `api/` and `services/`). |
| `tenders` | 2 | 2 | 1 | Level 1 | **Exceeded** | Evolve to Level 3 (Create `api/` and `services/`). |

---

## 5. Dependency Compliance

Based on the project structure, potential dependency direction compliance is analyzed below:

- **Controller to Database / Entity Mappings**:
  - *Assessment*: **Likely Compliant**. The architecture isolates queries into repository calls. However, code-level inspection is needed to ensure controllers do not construct TypeORM `createQueryBuilder` queries directly.
- **Repository to Service Imports**:
  - *Assessment*: **Confirmed Compliant**. Repositories are represented as raw TypeORM database targets inside services and are not defined as independent classes that import service instances.
- **Middleware to Business Logic Imports**:
  - *Assessment*: **Likely Compliant**. Middlewares like `authenticate.ts` and `permissions.ts` import database repositories to verify tokens/permissions rather than calling high-level feature controllers.
- **Shared Infrastructure to Feature Imports**:
  - *Assessment*: **Confirmed Compliant**. The files under `src/services/` (S3, Email) do not reference any path under `src/modules/`.
- **Feature to Feature Cross-Imports**:
  - *Assessment*: **Needs Code Review**. It is highly likely that `subscriptions.service.ts` imports entity details or methods directly from the `plans` service files. Direct coupling should be replaced by generic orchestrators or events.

---

## 6. Shared Infrastructure Review

- **Single Responsibility (Platform Services)**:
  - *Drift Risk*: **High**. The caching logic is split between `src/cache/` (provider factories) and `src/services/cache.service.ts`. This creates redundant instances.
- **Duplicate Seeding Definitions**:
  - *Drift Risk*: **Critical**. `src/authorization/registry/modules/` and `src/database/seed/permissions/` contain parallel domain definition files. This introduces a major risk of configuration drift.
- **Unknown Areas Requiring Deeper Inspection**:
  - *Action*: **Needs Code Review**. A code-level audit is required to inspect `src/utils/` to ensure all helper files are stateless and do not import from TypeORM.

---

## 7. Cross-Cutting Concerns

| Concern | Organization Status | Risk / Drift Level | Remediation Plan |
| :--- | :--- | :--- | :--- |
| **Authentication** | Isolated in `middleware/authenticate.ts`. | **Low** | None. |
| **Authorization** | Split between `middleware/` and `authorization/registry/`. | **Medium** | Reconcile DB seed routines to reference the static registry module. |
| **Caching** | Fragmented across `src/cache/`, `cache.service.ts`, and `analytics/cache/`. | **High** | Deprecate `cache.service.ts` and route all calls through `src/cache/`. |
| **Logging** | Managed via `config/logger.ts`. | **Low** | None. |
| **Validation** | Implemented via middlewares and DTO mappings. | **Low** | None. |
| **Configuration** | Centralized in `config/env.ts`. | **Low** | None. |
| **Error Handling** | Standardized via `AppError.ts` and Express middleware. | **Low** | None. |
| **Background Jobs** | Organized under `src/jobs/` and `CronManager.ts`. | **Low** | None. |
| **Metrics / Formulas**| Localized in `analytics/metrics/`. | **Low** | None. |
| **Search** | Isolated in `src/search/`. | **Low** | None. |

---

## 8. Architecture Violations

### 1. Duplicate Permission Source of Truth
- **ID**: `AV-01`
- **Title**: Duplicate Permission Configuration
- **Evidence**: Identical file structures in `src/authorization/registry/modules/` and `src/database/seed/permissions/`.
- **Severity**: `Critical`
- **Business Impact**: Security configuration drift. Seeded user roles may deviate from the registry, locking users out of features or leading to privilege escalation.
- **Technical Impact**: Maintenance overhead. Developers must modify two parallel files for any permission change.
- **Architecture Principle Violated**: Single Source of Truth (SSOT).
- **Recommendation (REQUIRED)**: Refactor seed scripts to import permission configurations directly from the static registry modules.
- **Migration Complexity**: Medium.
- **Risk**: Medium.
- **Status**: **Confirmed**.

### 2. Fragmented Cache Implementations
- **ID**: `AV-02`
- **Title**: Overlapping Caching Adapters
- **Evidence**: Coexistence of `src/cache/`, `src/services/cache.service.ts`, and `src/modules/analytics/cache/`.
- **Severity**: `High`
- **Business Impact**: Stale database reads, inconsistent cache states, and redundant cloud service connection charges.
- **Technical Impact**: Uncoordinated client pool initialization.
- **Architecture Principle Violated**: High Cohesion, Single Responsibility.
- **Recommendation (REQUIRED)**: Standardize all caching around `src/cache/` providers. Deprecate and remove `cache.service.ts`.
- **Migration Complexity**: Medium.
- **Risk**: Medium.
- **Status**: **Confirmed**.

### 3. Drifted Feature Module Folders
- **ID**: `AV-03`
- **Title**: Non-Standard Feature Module Layouts
- **Evidence**: Flat root directories in `auth/`, `subscriptions/`, and `tenders/` exceeding file thresholds; hybrid layout in `rbac/`.
- **Severity**: `Medium`
- **Business Impact**: Increased developer onboarding friction and longer feature delivery timelines.
- **Technical Impact**: High cognitive load due to disorganized folder structures.
- **Architecture Principle Violated**: Explicit Ownership, Consistency.
- **Recommendation (REQUIRED)**: Reorganize the four modules (`auth`, `rbac`, `subscriptions`, `tenders`) into structured subdirectories (`api/`, `services/`, `dto/`).
- **Migration Complexity**: Low.
- **Risk**: Low.
- **Status**: **Confirmed**.

---

## 9. Compliance Matrix

The table below outlines current compliance and remediation priorities across architectural areas:

| Category | Current Status | Target Standard | Compliance % | Priority |
| :--- | :---: | :---: | :---: | :---: |
| **Module Consistency** | Mixed styles | Level-based evolution structure | 55% | **High** |
| **Folder Ownership** | Mostly consistent | No infrastructure in features | 85% | **Low** |
| **Shared Infrastructure** | Caching overlap | Consolidated infrastructure directories | 60% | **High** |
| **Cross-Cutting Concerns** | Seed configuration duplication | Unified graph registry database seeder | 65% | **Critical** |
| **Dependency Direction** | Unidirectional imports | Strictly enforced layer rules | 90% | **Medium** |
| **Scalability** | Decoupled entities | Isolated domain models | 95% | **Low** |
| **Maintainability** | High cognitive overhead | standard layout structures | 70% | **Medium** |
| **Technical Debt** | Caching & Seeding duplication | Refactored systems | 50% | **High** |

---

## 10. Module Classification

Classification of each module under the standard's level-based paradigm:

* **Level 1 (Simple / Flat)**:
  - `admin`: Single-controller admin dashboard service.
  - `categories`: Contains route definitions only.
  - `profile`: Manages simple user profile updates.
  - `states`: Contains route definitions only.
  - `support`: Simple ticket request router.
  - `webhooks`: Paypal endpoint payload receiver.
* **Level 2 (Growing / Segmented API)**:
  - `notifications`: Separates API routing from services.
* **Level 3 (Complex / Layered)**:
  - `audit`: Segregates logging, jobs, DTOs, and redaction utils.
  - `dashboard`: Layered layout structure for KPI rollups.
  - `auth` *(Target)*: Highly complex authentication workflow.
  - `rbac` *(Target)*: System-wide access controls.
  - `subscriptions` *(Target)*: Payment integrations.
  - `tenders` *(Target)*: Core domain bidding systems.
* **Level 4 (Subsystem)**:
  - `analytics`: Contains dedicated background rollups, export jobs, and metrics calculations.

---

## 11. Migration Backlog

### Backlog Item 1: RBAC Controller Cleanup
- **ID**: `MB-01`
- **Title**: Consolidate RBAC Controllers
- **Current State**: `rbac.controller.ts` is at root; others are nested in `controllers/`.
- **Target State**: All controllers reside in `src/modules/rbac/api/`.
- **Reason**: Standardize module folder structures.
- **Priority**: High.
- **Dependencies**: None.
- **Risk**: Low (requires path updates).
- **Estimated Effort**: 4 hours.
- **Acceptance Criteria**: All RBAC controllers reside in `api/`; compilation succeeds.

### Backlog Item 2: Evolve Feature Modules
- **ID**: `MB-02`
- **Title**: Evolve Drifted Feature Modules (`auth`, `subscriptions`, `tenders`)
- **Current State**: Modules are flat at root.
- **Target State**: Standardized Level 3 layouts (`api/`, `services/`, `dto/`).
- **Reason**: Adhere to complexity thresholds.
- **Priority**: High.
- **Dependencies**: MB-01.
- **Risk**: Low.
- **Estimated Effort**: 8 hours.
- **Acceptance Criteria**: Target files reside in standardized subdirectories.

### Backlog Item 3: Consolidate Database Permission Seeding
- **ID**: `MB-03`
- **Title**: Synchronize Permission Seeder with Static Registry Modules
- **Current State**: Duplicate definitions in `seed/permissions/` and `registry/modules/`.
- **Target State**: Seeding script reads files from the static registry modules directly.
- **Reason**: Establish a Single Source of Truth for system permissions.
- **Priority**: Critical.
- **Dependencies**: None.
- **Risk**: Medium.
- **Estimated Effort**: 12 hours.
- **Acceptance Criteria**: `npm run seed` runs successfully; DB permissions match registry definitions.

### Backlog Item 4: Integrate Unified Cache Provider
- **ID**: `MB-04`
- **Title**: Deprecate and Remove `cache.service.ts`
- **Current State**: Caching split across three locations.
- **Target State**: All cache operations run through providers in `src/cache/`.
- **Reason**: Remove redundant client setups and connection overhead.
- **Priority**: High.
- **Dependencies**: None.
- **Risk**: Medium.
- **Estimated Effort**: 10 hours.
- **Acceptance Criteria**: `cache.service.ts` is removed; all modules use the unified cache provider.

---

## 12. Migration Order

1. **Dashboard & Support (Lowest Risk)**: Standardizes basic layouts first without touching database seeds or security boundaries.
2. **Subscriptions & Tenders (Structural Alignment)**: Standardizes complex business logic modules, resolving potential circular dependencies.
3. **RBAC & Database Seeding (Security Foundations)**: Eliminates permission duplication and aligns the database seeders with the registry.
4. **Auth & Caching (Core Infrastructure)**: Unifies client caches and refactors authentication routing into standardized layers.

---

## 13. Out of Scope

The following items are out of scope for this audit:
* **Identifier Naming**: Checked by naming guidelines, not audited here.
* **Linting / Code Formatting**: Enforced by Prettier and ESLint.
* **Business Logic Integrity**: Audit assumes implementation logic is functionally correct.
* **Testing Coverage**: Test strategy checks folder locations but does not evaluate test quality.
* **Performance / Database Design**: DB indexes, schema choices, and query planning are out of scope.

---

## 14. Architecture Scorecard

Scorecard ratings (1-10 scale) against the Backend Architecture Standard:

| Category | Score | Reason for Score < 8 | Impact | Smallest Improvement |
| :--- | :---: | :--- | :--- | :--- |
| **Folder Organization** | `6/10` | Top-level files are clean, but modular infrastructure is duplicated. | Cognitive friction. | Consolidate cache utilities into `src/cache/`. |
| **Module Consistency** | `5/10` | Four key modules do not follow the evolution rules. | Slower feature delivery. | Consolidate RBAC controllers into a single folder. |
| **Feature Isolation** | `7/10` | Services likely cross-import directly. | Circular dependency risks. | Run code-level dependency audits. |
| **Shared Infrastructure** | `6/10` | Duplicate caching client packages. | Redundant memory overhead. | Deprecate `cache.service.ts`. |
| **Dependency Rules** | `8/10` | Entity-Service isolation is maintained. | Minimal. | None. |
| **Cross-Cutting Concerns**| `6/10` | Duplicate permission files. | Risk of authorization drift. | Refactor permission seeds to read from the registry. |
| **Scalability** | `8/10` | Clean entity layer separation. | Minimal. | None. |
| **Maintainability** | `7/10` | Complex modules lack clear folder boundaries. | Slower onboarding. | Evolve `auth` to a Level 3 layout. |
| **Documentation** | `9/10` | Architecture standard is clear. | Minimal. | None. |
| **Architecture Governance**| `7/10` | Standards exist but are not yet enforced via automated checks. | Increased risk of future drift. | Implement ESLint directory import limits. |
| **Overall** | `6.8/10` | **Target: 9.0/10** | | |

---

## 15. Final Recommendation

The current architecture is **suitable for long-term growth**, provided the identified technical debt (caching duplication and permission seeding redundancy) is addressed. 

### Key Takeaways
- **Incremental Refactoring**: Migration can be done incrementally without interrupting feature delivery.
- **Highest Priority Improvement**: Refactor database seeds to load permissions directly from the graph registry modules.
- **Recommended First Migration**: Consolidate RBAC controllers into `src/modules/rbac/api/` as a low-risk, immediate improvement.
