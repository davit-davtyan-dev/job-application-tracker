# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `evaluating`
- **Active Feature**: `F11`
- **Generator Commit**: `d089a8efced85c944f93a54d50a58c2e62293d38`
- **Evaluator Verdict**: `pending`

## Active Sprint Contract

- **Feature ID**: `F11`
- **Scope**: Audit and complete server-side Zod validation for every existing application and company data-entry path, including company creation, application creation and listing criteria, application status updates, interview creation and status updates, application history lookup, and company history lookup. Keep service functions as the authoritative validation boundary accepting `unknown`; reuse shared schemas at HTTP boundaries where applicable; and add deterministic service-level evidence that malformed, mistyped, structurally unexpected, or invalid domain input is rejected before database mutation or query. Make only the smallest schema, service, route-boundary, or service-test changes required. Preserve all existing API success/error contracts, business rules, transactions, UI behavior, persistence schema, and F01–F10 behavior. Do not add fields, endpoints, migrations, dependencies, client validation, or new product policy.
- **Acceptance Criteria**:
  1. Every existing service operation that accepts application- or company-related input accepts it as `unknown` and parses it with an appropriate Zod schema before calling a database query module; strict object inputs reject unknown keys.
  2. Company creation rejects missing, blank-after-trim, non-string, and unexpected fields without inserting a company; valid input preserves the existing normalization and persistence contract.
  3. Application creation rejects invalid or conflicting company selection, blank position title, invalid calendar date, unsupported status, invalid reference URL, wrong field types, and unexpected fields before inserting an application, company, or activity row; valid behavior is unchanged.
  4. Application list criteria, application status updates, interview creation/status updates, application history lookup, and company history lookup reject malformed UUIDs, dates, enums, wrong types, and unexpected fields as applicable before database query or mutation. Existing defaults, direct-transition rules, same-state idempotence, and not-found behavior remain unchanged.
  5. Route handlers continue to return the established structured `400 INVALID_REQUEST` response for malformed JSON or Zod-invalid HTTP input, while services independently revalidate rather than trusting route or client validation.
  6. Validation schemas and shared domain enums are reused rather than duplicating business rules. The flow remains `Route Handler -> Service -> server-only Database Query Module`; routes, pages, and client components contain no direct database queries; no `any` is introduced.
  7. PostgreSQL-backed service tests deterministically prove invalid mutation input has no persistence side effects and invalid read criteria does not produce valid results. Tests use actual service boundaries as F11 evidence, not mocks alone.
  8. Existing API contracts, transactions, UUID/UTC handling, cache invalidation, UI behavior, and all F01–F10 behavior remain unchanged; formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated changes.
- **Relevant Constraints**: `Server-side Zod validation at every service boundary; services accept unknown; strict schemas reject extra keys; shared ApplicationStatus, InterviewStatus, and activity/history schemas; Route Handler -> Service -> server-only Database Query Module; invalid mutations have zero database side effects; preserve transactions, UUIDs, UTC timestamps, API error envelopes, UI and cache behavior; no migration, dependency, endpoint, field, or product-policy changes; strict TypeScript; no any; pragmatic DRY; one logical Generator commit; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `Primarily src/services/company.test.ts, src/services/application.test.ts, src/services/interview.test.ts, src/services/history.test.ts, and src/services/company-history.test.ts; corresponding src/services/*.ts schemas only where the audit identifies a concrete validation gap; route tests or handlers only if an existing HTTP-boundary gap is demonstrated. No database schema/query, migration, component, dependency, or E2E product-flow changes are expected.`
- **Targeted Verification**: `pnpm test src/services; pnpm test src/app/api; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

### Bounded Correction Assignment

- **Objective**: Reproduce and diagnose the prior Evaluator's Node 22.23.1 hang in `pnpm test src/services` using bounded process-level timeouts and per-file isolation. If the cause is repository-owned, make the smallest in-scope correction and tests; if the suite now completes without a repository change, document deterministic evidence and create no product-code change.
- **Boundaries**: Preserve the F11 scope and all acceptance criteria above. Do not start F12 or F13. Do not change product behavior, validation policy, database schema/query behavior, dependencies, endpoints, UI, orchestration state files, or durable decisions. Do not weaken, skip, or remove F11 tests merely to make the suite finish.
- **Verification Evidence Required**: Record Node and pnpm versions; use bounded commands to identify the exact file/test/process if a hang recurs; run every targeted verification command after any correction. Produce one logical commit only if repository files change, otherwise report the existing exact Generator commit `d089a8efced85c944f93a54d50a58c2e62293d38` as the implementation candidate with fresh diagnostic evidence.

## Generator Report

- **Commit**: `d089a8efced85c944f93a54d50a58c2e62293d38`
- **Changed Files**: `Candidate commit changes src/services/application.test.ts, src/services/company-history.test.ts, src/services/company.test.ts, src/services/history.test.ts, and src/services/interview.test.ts; strengthened PostgreSQL-backed malformed-input and zero-side-effect coverage. The bounded correction produced no new file changes or commit because the hang was not repository-owned.`
- **Diagnosis**: `Under Node 22.23.1 and pnpm 11.20.0, the bounded service-suite command times out after the Vitest banner only inside a network-isolated sandbox where localhost PostgreSQL is inaccessible. With PostgreSQL access, the identical suite passes normally.`
- **Tests Run**: `PASS with PostgreSQL access: pnpm test src/services (5 files, 69 tests, 11.38s); individually bounded service files all passed within 2.18–2.70s; pnpm test src/app/api (7 files, 48 tests, 13.24s); pnpm format:check; pnpm lint; pnpm typecheck; git diff --check. The isolated-sandbox reproduction timed out at 120s as expected when PostgreSQL was unreachable.`
- **Known Risks**: `Independent evaluation must run PostgreSQL-backed suites in an environment allowed to connect to the configured localhost test database. Full Playwright and production-build verification remain for the Evaluator.`

## Evaluator Report

- **Verdict**: `BLOCKED`
- **Commit Verified**: `d089a8efced85c944f93a54d50a58c2e62293d38`
- **Checks Run**: `PASS: exact isolated checkout identity; clean checkout before dependency symlinking; Node 22.23.1 and pnpm 11.20.0 runtime; PostgreSQL containers healthy on ports 5432 and 5433; test-only diff scope confirmed; static architecture/validation/no-any inspection passed. BLOCKED: pnpm test src/services did not complete and was aborted after approximately 868 seconds. Not completed: API tests, format, lint, typecheck, diff check, full Vitest, Playwright, and build.`
- **Findings**: `Static inspection supports the F11 implementation: service inputs are unknown, strict reusable Zod schemas parse before database access, layering is preserved, and the commit contains only five service-test files. Completion cannot be certified because the feature verification command hung under the declared runtime; no PASS verdict was issued.`
- **Required Fix**: `Diagnose the Node 22.23.1 service-suite hang using bounded process-level timeouts, correct the test/environment issue if repository-owned, then return F11 to active for a bounded Generator correction or directly to evaluating only if no implementation correction is needed. Rerun every targeted and full-pipeline command in a clean isolated checkout.`

## Current Status

- **Active**: `F11 — evaluating exact Generator commit d089a8efced85c944f93a54d50a58c2e62293d38`
- **Queued**: `F12 — safe Markdown rendering; F13 — exact-status sub-filtering within the existing Active and Closed application views`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS); F08 — complete and expose application-scoped activity history (704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS); F09 — company-scoped chronological application history (b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS); F10 — transactional status/history updates (f5159c184d92445af1d89edba99ba8a05618d5a9 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F10 are passing. F11 is evaluating exact Generator commit `d089a8efced85c944f93a54d50a58c2e62293d38`. The bounded correction established that the prior hang occurs only when localhost PostgreSQL is inaccessible; the full service suite passes on Node 22.23.1 with database access. F12 and F13 remain queued as `not_started`.

## Next Step

1. `Evaluator verifies exact Generator commit d089a8efced85c944f93a54d50a58c2e62293d38 in a clean isolated workspace with PostgreSQL access and runs all targeted checks plus the full completion pipeline.`

## Verification Status

- **Build**: `PASS at f5159c184d92445af1d89edba99ba8a05618d5a9`
- **Lint**: `PASS at f5159c184d92445af1d89edba99ba8a05618d5a9`
- **Unit/Integration**: `PASS at f5159c184d92445af1d89edba99ba8a05618d5a9`
- **E2E**: `PASS (9/9) at f5159c184d92445af1d89edba99ba8a05618d5a9`

## Current Session Handoff Report

- **Decisions Made**: `Activated F11 as an evidence-first audit of all existing application/company service validation boundaries. Preserve existing product and API behavior; allow only the smallest schema/service/route correction when a concrete gap is proven. No durable architecture decision is required at activation because server-side Zod validation and layering are already project rules.`
- **Context Summary**: `F00 through F10 are passing. F11 Generator commit d089a8efced85c944f93a54d50a58c2e62293d38 is test-only and passed Generator checks under Node 26, but independent evaluation under Node 22.23.1 blocked when pnpm test src/services hung for approximately 868 seconds. Static inspection and environment health checks passed; the remaining mandatory pipeline was not run.`
- **Remaining Blockers**: `Determine why pnpm test src/services hangs under the declared Node 22.23.1 runtime in a clean isolated checkout.`
- **Next Owner**: `Orchestrator resumes F11 after a session reset, diagnoses the hang, and issues a bounded Generator correction if repository-owned before reevaluation.`
