# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `passing`
- **Active Feature**: `none`
- **Generator Commit**: `3dae583b4ae05a52684934f0368fca9e0b952b25`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F03`
- **Scope**: Add the default list view of active job applications to the landing page. Load the list through the required Route Handler -> Service -> Database Query Module flow and render every application whose status is `Applied`, `Interviewing`, or `Offer`, ordered deterministically by applied date descending and then creation timestamp and identifier descending. Each row/card shows company name, position title, applied date, and current status, with accessible loading, error, empty, and populated states. Integrate the list alongside the existing F02 creation workflow and refresh it after a successful creation without a page reload. Include PostgreSQL-backed service coverage, focused route/component/page tests, and `tests/e2e/list-view.spec.ts`. Do not add search, filter controls, closed applications, pagination, status changes, application detail/history, company history, Markdown rendering, edit/delete actions, interview records, or schema changes unless an unavoidable schema defect is first escalated to the Orchestrator.
- **Acceptance Criteria**:
  1. A server-only query returns only applications in the exact active-status set `Applied`, `Interviewing`, and `Offer`, joined with the owning company name. It selects only fields needed by the list and orders rows by `appliedDate DESC`, then `createdAt DESC`, then `id DESC`, so repeated reads are deterministic. Closed statuses (`Accepted`, `Rejected`, `Withdrawn`, and `Archived`) never appear.
  2. Listing follows `GET Route Handler -> Service -> Database Query Module`; pages and client components contain no database imports or direct queries. The service owns the active-status business rule and validates the query result/output contract with Zod before returning it; shared domain status definitions remain the single source of truth and no `any` is introduced.
  3. `GET /api/applications` delegates to the list service, returns a stable JSON object containing the active applications with HTTP 200, and maps unexpected failures to the existing structured client-safe `INTERNAL_ERROR` response without exposing database details. The existing `POST /api/applications` behavior remains unchanged.
  4. The landing page renders a clearly named, responsive active-applications region. Populated entries expose company name, position title, human-readable applied date backed by semantic `<time dateTime=\"YYYY-MM-DD\">`, and current status text. Status is not conveyed by color alone, rows have stable application-ID keys, and the layout remains usable at narrow and wide viewports.
  5. The client experience has explicit accessible loading and recoverable error states and an unambiguous empty state when no active applications exist. A successful F02 creation invalidates/refetches the same TanStack Query list and the new active application appears without a full-page reload or duplicate network-state implementation.
  6. PostgreSQL-backed service tests prove active-only selection, company association, exact projected output, deterministic ordering including tie breakers, and an empty result. Focused route tests cover successful GET response and safe failure mapping while preserving POST coverage; component/page tests cover loading, empty, error/retry, populated rendering, semantic dates/statuses, and refresh after creation.
  7. `tests/e2e/list-view.spec.ts` seeds or creates multiple active applications and at least one closed application, verifies the exact visible active rows and newest-first order, verifies the closed row is absent, and proves a newly created active application appears without page reload. Existing F01/F02 regressions, formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated product scope.
- **Relevant Constraints**: `Server-only database access; GET Route Handler -> Service -> Database Query Module; service-owned active-status rule and Zod output validation; reuse the shared ApplicationStatus source; no schema/migration changes expected; TanStack Query cache invalidation shared with F02 creation; strict TypeScript; no any; accessible responsive UI; preserve unrelated work; one logical Generator commit; Generator must read the relevant Next.js 16.3 App Router/Route Handler and data-fetching docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `server-only application list query module; application list schema/service and PostgreSQL integration tests; GET extension to src/app/api/applications/route.ts with focused tests; active-application list client component and tests; minimal shared query-key/fetch types as needed; creation mutation invalidation integration; landing-page composition/tests; tests/e2e/list-view.spec.ts; seed/test helpers only when needed for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/application.test.ts src/app/api/applications/route.test.ts plus focused list/create/page component tests; pnpm test:e2e tests/e2e/list-view.spec.ts; pnpm test:e2e tests/e2e/create-application.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `3dae583b4ae05a52684934f0368fca9e0b952b25`
- **Changed Files**: `13 files: application GET route/tests; list database query, service, and PostgreSQL tests; shared application query key/fetch utility; active-list component/tests; creation-form invalidation integration/tests; landing-page composition/tests; tests/e2e/list-view.spec.ts.`
- **Tests Run**: `PASS: pnpm format:check; pnpm lint; pnpm typecheck; focused non-database Vitest (4 files/13 tests); full PostgreSQL-backed pnpm test (8 files/38 tests). Not completed in Generator sandbox: Playwright command handoff stalled before execution; production build was denied Turbopack port binding while processing PostCSS.`
- **Known Risks**: `Evaluator must authoritatively run the new focused Playwright spec, full browser regression suite, and production build outside the Generator's restricted sandbox. No known implementation defect remains from Generator verification.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `3dae583b4ae05a52684934f0368fca9e0b952b25`
- **Checks Run**: `PASS in a clean detached workspace: focused F03 Playwright 1/1; affected F02 Playwright 1/1; full Playwright 3/3; full PostgreSQL-backed Vitest 8 files/38 tests; pnpm format:check; pnpm lint; pnpm typecheck; production build; exact-commit clean status.`
- **Findings**: `All F03 acceptance criteria and architecture constraints pass. The active-only query, deterministic ordering, company projection, service-owned status rule and Zod output validation, structured GET response, accessible list states and semantic dates, TanStack Query invalidation after creation, no-any rule, server-only layering, and scope exclusions were independently verified.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F03 is complete at `3dae583b4ae05a52684934f0368fca9e0b952b25`. The exact Generator commit passed independent clean-workspace focused/full browser, focused/full unit/integration, static, architecture, accessibility, and production-build verification.

## Next Step

1. `Orchestrator may select F04 and write its sprint contract when the user is ready.`

## Verification Status

- **Build**: `Passing`
- **Lint**: `Passing`
- **Unit/Integration**: `Passing (38 tests)`
- **E2E**: `Passing (3/3)`

## Current Session Handoff Report

- **Decisions Made**: `Complete F03 as an active-only default list; active statuses are Applied, Interviewing, and Offer; deterministic applied-date/creation-time/ID descending order; reuse TanStack Query invalidation after F02 creation; defer all search/filter/status/detail/history/pagination behavior.`
- **Context Summary**: `F00 through F03 are passing. No feature is active, and WIP=1 is clear. F03's exact Generator commit 3dae583b4ae05a52684934f0368fca9e0b952b25 has independent Evaluator PASS evidence.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator selects F04 when requested.`
