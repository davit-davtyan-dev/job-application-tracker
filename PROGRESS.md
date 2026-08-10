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
- **Generator Commit**: `b8ce1d17f760eeddf04a02423af980d9f72ee0c4`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F09`
- **Scope**: Add a read-only company-scoped history of every persisted job application belonging to one company so the user can review prior roles, applied dates, and current statuses without leaving the existing application list. Follow `Route Handler -> Company History Service -> server-only Company History Database Query Module`, return a deterministic chronological list, and expose an accessible reveal/load/retry experience from each application card. TanStack Query remains the sole network-state owner and cards for the same company share one company-history cache. Preserve F01–F08 behavior and the separate application activity timeline. Do not add company editing/deletion, application detail or company pages, activity-event aggregation, notes/descriptions/reference links, paging, search/date filters inside company history, schema or dependency changes, or mutation behavior unless an unavoidable defect is first escalated to the Orchestrator.
- **Acceptance Criteria**:
  1. A company-scoped GET endpoint accepts a strict company UUID and returns every job application owned by that company. Each item contains only validated client-safe fields: application UUID, company UUID, position title, ISO applied date, and shared `ApplicationStatus`.
  2. Company history is ordered chronologically by applied date, then application creation timestamp, then UUID, all in one documented direction with deterministic tie-breaking. The UI renders in the same direction and identifies the currently displayed application without excluding it or duplicating records.
  3. Existing companies with no applications return HTTP 200 with an empty history. Missing companies return structured client-safe `COMPANY_NOT_FOUND` with HTTP 404. Invalid UUIDs return `INVALID_REQUEST` with HTTP 400. Unexpected failures return `INTERNAL_ERROR` without database details.
  4. The read flow is strictly `Route Handler -> Company History Service -> Company History Database Query Module`. The service accepts unknown input and revalidates both input and database output with Zod. Database access and Drizzle types stay in server-only modules; routes, pages, and client components contain no direct queries; no `any` is introduced.
  5. The existing application-list response gains the owning company UUID through query and service output validation so company history can be addressed without name-based lookup. Search, Active/Closed filtering, counts, ordering, and all existing client-safe fields remain unchanged.
  6. Each rendered application card has a keyboard-operable, explicitly labelled company-history section that reveals/loads the shared company timeline and renders company name, position title, applied date, and current status for each application. The current card's application is clearly identified. Empty, loading, and accessible error states are isolated to the section; a failure preserves search/view/UI state and exposes an unambiguous retry control.
  7. TanStack Query is the sole network-state owner. Requests safely encode company IDs. Cards belonging to the same company use the same company-history query key and cache; unrelated companies remain cache-isolated.
  8. Successful application creation and real application-status changes invalidate only the affected company-history cache in addition to their existing required invalidations, so revealed company history becomes fresh without full-page navigation. Same-state updates preserve existing idempotence. Interview mutations do not invalidate company history because its fields do not change.
  9. PostgreSQL-backed company-history service tests prove strict input/output validation, missing and empty companies, cross-company isolation, all fixed statuses, and deterministic ordering/tie-breaking. Route tests prove success, invalid UUID, 404, empty history, and safe failure mapping. Focused component/page tests cover accessibility, shared cache behavior, labels, loading/empty/error/retry, current-item identification, ID encoding, mutation cache scoping, and F03–F08 regressions.
  10. `tests/e2e/company-history.spec.ts` creates multiple applications for the same company plus another company, verifies deterministic company history and cross-company isolation from Active and Closed views, preserves current search/view state while revealing and retrying/refetching, reflects a real status change exactly once without reload, and remains correct after browser refresh. Formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated scope.
- **Relevant Constraints**: `Server-only database access; Company History Route Handler -> Company History Service -> Company History Database Query Module; service-owned Zod input/output validation; UUIDs; shared ApplicationStatus; deterministic applied-date/created-at/UUID ordering; no migration or dependency change; TanStack Query remains the single network-state owner; exact company-scoped invalidation for application create/status only; preserve F01–F08 and the application activity timeline; strict TypeScript; no any; accessible responsive UI; one logical Generator commit; Generator must read the relevant Next.js 16.3 App Router Route Handler, fetching-data, mutating-data, and caching docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/server/db/queries/company-history.ts (or a clearly bounded company query module); src/services/company-history.ts and PostgreSQL-backed tests; src/app/api/companies/[id]/history/route.ts and focused tests; shared client-safe company-history schema/query helper; bounded companyId extension to application list query/service types; a company-history section integrated into src/components/active-application-list.tsx plus focused tests; create/status cache invalidation regressions; tests/e2e/company-history.spec.ts; seed/test helpers only when required for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/company-history.test.ts src/app/api/companies/[id]/history/route.test.ts src/components/active-application-list.test.tsx src/app/page.test.tsx src/services/application.test.ts; pnpm test:e2e tests/e2e/company-history.spec.ts tests/e2e/activity-history.spec.ts tests/e2e/status-transitions.spec.ts tests/e2e/filters.spec.ts tests/e2e/search.spec.ts tests/e2e/list-view.spec.ts tests/e2e/create-application.spec.ts tests/e2e/landing.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `b8ce1d17f760eeddf04a02423af980d9f72ee0c4` (bounded test correction; initial implementation `bda863f6db2ff6ace846bb48fc7a4b1cadc4d852`)
- **Changed Files**: `Initial: 15 files covering company-history database query/service/API, client schema/query/UI, application-list companyId output, company-scoped mutation cache invalidation, PostgreSQL service tests, route/component/form regressions, and Playwright company-history coverage. Correction: only src/services/application.test.ts and tests/e2e/company-history.spec.ts for companyId projections and the Closed-view search locator.`
- **Tests Run**: `Correction PASS: targeted Vitest 51/51; focused F09 Playwright; full Vitest; full Playwright 9/9; format; lint; typecheck; git diff --check. Production build was attempted but the Generator sandbox denied Turbopack's CSS helper port bind; independent build rerun remains required.`
- **Known Risks**: `Independent clean-workspace production build verification is required. Generator host used Node 26.0.0 rather than the declared Node 22.23.1.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `b8ce1d17f760eeddf04a02423af980d9f72ee0c4`
- **Checks Run**: `Fresh clean detached clone and exact identity PASS; frozen install PASS after one transient store-index retry; seed PASS after sandbox IPC retry; targeted Vitest PASS (51/51); targeted Playwright PASS (8/8); format:check PASS; lint PASS; typecheck PASS; full Vitest PASS (119/119); full Playwright PASS (9/9); production build PASS; git diff --check PASS; final status clean.`
- **Findings**: `Both prior test defects are corrected. All F09 acceptance criteria pass: strict UUID/output validation, deterministic ascending ordering, safe errors, layered server-only database access, shared company cache behavior, scoped mutation invalidation, accessibility, cross-company isolation, refresh behavior, and F01–F08 regressions. No any, migration, schema, dependency, transaction, UUID, UTC, or unrelated scope violation.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS); F08 — complete and expose application-scoped activity history (704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS); F09 — company-scoped chronological application history (b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F09 are passing. F09 passed independent clean-workspace evaluation at exact corrected Generator commit `b8ce1d17f760eeddf04a02423af980d9f72ee0c4`; no feature is active.

## Next Step

1. `No not_started core product feature remains; Orchestrator awaits the next requested scope.`

## Verification Status

- **Build**: `PASS at b8ce1d17f760eeddf04a02423af980d9f72ee0c4`
- **Lint**: `PASS at b8ce1d17f760eeddf04a02423af980d9f72ee0c4`
- **Unit/Integration**: `PASS (119 tests) at b8ce1d17f760eeddf04a02423af980d9f72ee0c4`
- **E2E**: `PASS (9/9) at b8ce1d17f760eeddf04a02423af980d9f72ee0c4`

## Current Session Handoff Report

- **Decisions Made**: `Activate F09 as a read-only company-scoped chronological list of all applications for one company. Expose position, applied date, and current status from existing cards; preserve the distinct F08 activity-event timeline and avoid new pages, schema, dependencies, and company-history mutation scope.`
- **Context Summary**: `F00 through F09 are passing. F09 was independently verified in a clean workspace at exact corrected Generator commit b8ce1d17f760eeddf04a02423af980d9f72ee0c4. No feature is active and no not_started core product feature remains.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator awaits the next requested feature or maintenance scope.`
