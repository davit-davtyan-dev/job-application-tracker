# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `idle`
- **Active Feature**: `none`
- **Generator Commit**: `6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F14`
- **Scope**: Add a dedicated `/companies` management page reachable through clear application navigation. It lists companies and lets the single user create a company, rename it, edit its optional Markdown notes, and permanently delete it only after explicit confirmation. Company names are trimmed and case-insensitively unique at both the validated service boundary and PostgreSQL constraint. Deletion atomically removes the selected company and its complete ownership tree: application activity history, interviews, job applications, and the company record. Reuse the existing company creation/listing flow, safe Markdown renderer, API error envelope, TanStack Query provider, and application/company-history cache conventions. Preserve application creation, list/search/status filters, status/interview mutations, histories, Markdown safety, UUID/UTC rules, and all F01–F13 behavior. Do not add soft deletion, restore, bulk actions, application reassignment, new company fields, or unrelated redesign.
- **Acceptance Criteria**:
  1. A clearly named `Companies` navigation link uses Next.js client navigation between `/` and `/companies`; the dedicated page has a single accessible heading and distinct loading, load-error/retry, populated, and empty states without direct database access.
  2. The page lists every company in deterministic case-insensitive name order and exposes its name and safely rendered Markdown notes. Blank/null notes have an intentional empty presentation, and raw HTML or unsafe URLs remain inert through the existing shared Markdown boundary.
  3. A keyboard-operable create form accepts a required company name and optional Markdown notes, reports field/server failures without losing entered values, and inserts the new company into the visible list on success. Existing application creation continues to use the same company data and observes newly created/renamed/deleted companies after cache invalidation.
  4. Each company can enter an explicit edit state for name and notes. Saving validates and persists both fields, canceling makes no request and restores stored values, successful edits update the visible list/order and all application/company-history consumers, and failed edits preserve the draft with an accessible error.
  5. Company names are trimmed, non-empty, and case-insensitively unique. A PostgreSQL unique index/constraint enforces the invariant, a committed migration applies it, and create/update services map duplicate-name conflicts to the established structured `409` response without exposing database details. Unchanged self-renames are allowed; blank, malformed, extra-field, invalid-UUID, missing-company, and duplicate inputs are rejected before inappropriate writes.
  6. Deletion requires a company-specific confirmation that clearly states all owned application data will be permanently removed. Cancel performs no request. Confirming calls the company DELETE API, removes the company from the page and company selectors/caches, refreshes application results, and handles pending, failure, retry, and not-found states without accidental double submission.
  7. The delete service validates the UUID, confirms existence, and uses one database transaction to remove the selected company's activity history, interviews, job applications, and company in foreign-key-safe order. It affects no other company and leaves no owned rows; any failure rolls back the whole operation. Route Handlers contain no Drizzle/database queries.
  8. Route Handler, service/integration, component/page, migration, and Playwright tests cover listing, create, edit/cancel, uniqueness, safe Markdown, confirmation/cancel, full ownership-tree deletion and isolation, invalid/not-found/error envelopes, accessibility, cache-visible behavior, and navigation. Formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated changes, dependency additions, or `any`.
- **Relevant Constraints**: `Read Next.js 16.3.0 Route Handlers, Server/Client Components, and Linking/Navigating guides in node_modules/next/dist/docs before code changes; Route Handler -> Service -> server-only Database Query Module; server-side Zod validation for every write and path UUID; one transaction for ownership-tree deletion; PostgreSQL case-insensitive uniqueness with a committed migration; parameterized Drizzle queries; standardized API errors; reuse the shared safe Markdown boundary and TanStack Query provider; invalidate companies, applications, and affected company-history caches after mutations; preserve UUIDs, UTC timestamps, F01–F13 behavior, and existing application workflows; no soft delete, restore, bulk action, reassignment, new domain field, dependency, or unrelated redesign; strict TypeScript; no any; pragmatic DRY; one logical Generator commit; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/app/companies/page.tsx and page/component tests; a focused client company-management component plus tests; shared navigation extracted only as needed across src/app/page.tsx and src/app/companies/page.tsx; src/lib/company.ts and/or company-query helpers; src/app/api/companies/route.ts and test; new src/app/api/companies/[id]/route.ts and test; src/services/company.ts and test; src/server/db/queries/company.ts; src/server/db/schema.ts; one generated Drizzle migration and metadata; tests/database/migration.test.ts; tests/e2e/company-management.spec.ts; update existing page/create-application tests only where company cache/navigation contracts require it. A minimal src/components/active-application-list/status-filter-area.tsx prop-plumbing correction and its focused existing test are authorized solely to repair the confirmed current-HEAD ReferenceError that prevents required E2E and to preserve F13. A test-only update to tests/e2e/markdown-rendering.spec.ts is authorized to operate the existing Job description and Company notes disclosure buttons before asserting their intentionally collapsed Markdown; production Markdown behavior must not change. Do not change application/interview/history write services except narrowly required shared cache consumers or test fixtures; do not broaden either regression repair.`
- **Targeted Verification**: `pnpm db:migrate against development and test databases; pnpm test src/app/api/companies/route.test.ts src/app/api/companies/[id]/route.test.ts src/services/company.test.ts tests/database/migration.test.ts and focused company-management/page component tests; pnpm test:e2e tests/e2e/company-management.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `6f3aaf4d060b3cdb4640650d1e06391a77ef6153 (bounded correction on 91dc06c41d5e9efac2cf6b9046dd6ac8de51c0d9)`
- **Changed Files**: `Feature commit: drizzle/0004_wooden_franklin_storm.sql; drizzle/meta/0004_snapshot.json; drizzle/meta/_journal.json; src/app/api/companies/route.ts and route.test.ts; src/app/api/companies/[id]/route.ts and route.test.ts; src/app/companies/page.tsx and page.test.tsx; src/app/page.tsx and page.test.tsx; src/components/company-management.tsx and company-management.test.tsx; src/components/site-navigation.tsx; src/components/create-application-form.tsx; src/components/active-application-list/active-application-list.tsx and status-filter-area.tsx; src/lib/company-query.ts; src/server/db/schema.ts; src/server/db/queries/company.ts; src/services/company.ts and company.test.ts; tests/database/migration.test.ts; tests/e2e/company-management.spec.ts; tests/e2e/markdown-rendering.spec.ts. Correction commit: src/app/api/companies/[id]/route.ts and route.test.ts; src/services/company.ts.`
- **Tests Run**: `Feature commit PASS: development and test pnpm db:migrate; targeted Vitest 6 files / 32 tests; targeted company Playwright 2/2; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check; full Vitest 20 files / 173 tests; full Playwright 12/12; Next production build with --webpack, including compile, TypeScript, and 7/7 static pages. Correction commit PASS: focused company id route test 1 file / 9 tests; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Known Risks**: `Exact default Turbopack pnpm build was environment-blocked for the Generator by an OS EPERM when its internal CSS worker attempted to bind a port; the clean Evaluator must retry the exact command. The migration assumes existing company names contain no case-insensitive duplicates. The commit includes two Orchestrator-authorized pre-existing regression repairs: missing F13 status prop plumbing and Markdown E2E disclosure interaction. Startup readiness also found full docker compose up cannot build the app image without a build-time DATABASE_URL, while both PostgreSQL services and local workflows are healthy.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **Checks Run**: `PASS in a fresh isolated clone: prior PATCH failure regression 9/9; development and test pnpm db:migrate; targeted Vitest 9 files / 56 tests; targeted company-management Playwright 2/2; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check; full Vitest 20 files / 175 tests; full Playwright 12/12; exact default Turbopack pnpm build with TypeScript and 7/7 static pages; exact HEAD and clean tracked/staged worktrees.`
- **Findings**: `All eight F14 acceptance criteria passed. Path UUID and strict PATCH body are independently validated; body id cannot override the route and invalid requests never call updateCompany. The dedicated accessible company page supports create/edit/cancel and confirmed permanent deletion with coherent caches and safe Markdown. PostgreSQL enforces trimmed case-insensitive name uniqueness through the committed migration. Server-only parameterized queries preserve Route Handler -> Service -> Query layering, and ownership-tree deletion runs in one foreign-key-safe transaction without affecting other companies. UUID/UTC, no-any, F01–F13 behavior, and the two authorized regression repairs passed.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Queued**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS); F08 — complete and expose application-scoped activity history (704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS); F09 — company-scoped chronological application history (b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS); F10 — transactional status/history updates (f5159c184d92445af1d89edba99ba8a05618d5a9 / Evaluator PASS); F11 — server-side Zod validation evidence (d089a8efced85c944f93a54d50a58c2e62293d38 / Evaluator PASS); F12 — safe Markdown rendering (3d89edab9b3d006e593fc08de433060f7ba334da / Evaluator PASS); F13 — exact-status button-group filtering (7fcfc4220be3ac454354d11e69c0fa7ccf8512d0 / Evaluator PASS); F14 — dedicated company management and ownership-tree deletion (6f3aaf4d060b3cdb4640650d1e06391a77ef6153 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F14 are passing. A fresh Evaluator independently verified exact corrected F14 tip `6f3aaf4d060b3cdb4640650d1e06391a77ef6153` and returned PASS after the prior PATCH identity failure, all targeted checks, 175/175 Vitest tests, 12/12 Playwright tests, and the exact default production build passed.

## Next Step

1. `No feature remains queued in FEATURES.md; the Orchestrator awaits the next requested feature.`

## Verification Status

- **Build**: `PASS at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **Lint**: `PASS at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **Unit/Integration**: `PASS (175/175) at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **E2E**: `PASS (12/12) at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`

## Current Session Handoff Report

- **Decisions Made**: `Accepted F14 after a fresh Evaluator PASS. Companies are managed at /companies; names are trimmed and case-insensitively unique; deletion atomically removes the ownership tree after explicit confirmation; PATCH path identity and strict body input are validated independently.`
- **Context Summary**: `F00 through F14 are passing. Exact F14 corrected tip 6f3aaf4d060b3cdb4640650d1e06391a77ef6153 received Evaluator PASS after targeted tests, 175/175 Vitest tests, 12/12 Playwright tests, formatting, lint, typecheck, both migrations, exact Turbopack build, architecture inspection, exact-HEAD, and clean-worktree checks passed.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator awaits the next requested feature.`
