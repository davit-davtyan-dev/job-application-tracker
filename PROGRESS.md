# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `evaluating`
- **Active Feature**: `F06`
- **Generator Commit**: `f99bcaa1cbd17bd2fe4aafcd6600ac0a8de185f1`
- **Evaluator Verdict**: `pending`

## Active Sprint Contract

- **Feature ID**: `F06`
- **Scope**: Add status mutation for an existing job application across the complete fixed `ApplicationStatus` vocabulary: `Applied`, `Interviewing`, `Offer`, `Accepted`, `Rejected`, `Withdrawn`, and `Archived`. Expose a dedicated application-status Route Handler, delegate validated business logic through the Service to a server-only Database Query Module, and atomically update the application status and append one `status_changed` activity-history record. Add an accessible per-card status control to the existing Active/Closed list. Use a TanStack Query mutation, keep TanStack Query as the sole network-state owner, and refresh affected list caches so a changed application appears in the correct view without full-page navigation. Include PostgreSQL-backed service tests, focused route/component/page regressions, and `tests/e2e/status-transitions.spec.ts`. Do not add transition restrictions, bulk updates, application detail/history UI, editing of other fields, delete/restore, interview records, undo, URL persistence, schema changes, migrations, or new dependencies unless an unavoidable defect is first escalated to the Orchestrator.
- **Acceptance Criteria**:
  1. A dedicated status endpoint accepts one application UUID and a strict JSON body containing only `status`. Every shared `ApplicationStatus` value is accepted. Malformed JSON, invalid UUIDs, missing/extra fields, and unsupported statuses return the existing client-safe `INVALID_REQUEST` response with HTTP 400 and do not perform a database mutation.
  2. Mutation follows `Route Handler -> Service -> Database Query Module`. The service revalidates unknown input and database output with Zod, shared `ApplicationStatus` is the only status vocabulary, database code remains server-only, pages/client components contain no direct queries, and no `any` is introduced.
  3. For an existing application whose status differs, one database transaction updates `job_applications.status` and `updated_at` and inserts exactly one `activity_history` row with `event_type = 'status_changed'`, the new status, the application UUID, and a database-generated UTC timestamp. A forced history-insert failure rolls back the application update. No schema or migration change is made.
  4. Updating a missing UUID returns a structured `APPLICATION_NOT_FOUND` response with HTTP 404. Requesting the already-current status succeeds idempotently, returns the validated application with no new history row and does not change `updated_at`. Unexpected failures return a structured `INTERNAL_ERROR` response without database details. Existing GET and POST behavior is unchanged.
  5. Each rendered application card exposes an explicitly labelled native status selector containing all seven fixed states. It is keyboard-operable, reflects the persisted current status, disables only that card while its request is pending, and presents accessible per-card success or failure feedback without losing the existing list/search/filter semantics.
  6. A successful change updates the visible state without full-page navigation. Crossing from an Active status to a Closed status removes the card from the current Active results; crossing back removes it from Closed; changing within the same group shows the new status. The current search term and selected view remain unchanged, and the list count/empty feedback settles correctly after refetch.
  7. TanStack Query remains the sole network-state owner. The status request uses JSON and a safely encoded application ID; the mutation invalidates the applications query root so all view/search combinations become stale. Failed mutations do not display an unpersisted status and offer an unambiguous retry path or allow the user to select again. Concurrent controls cannot let a stale response overwrite a newer user choice for the same card.
  8. PostgreSQL-backed service tests prove all status values, exactly-one history insertion, idempotent same-status behavior, updated UTC timestamp behavior, not-found handling, and rollback atomicity. Route tests prove success, strict validation, not-found mapping, and safe failure mapping. Focused component tests cover selector accessibility/options, pending isolation, same-group and cross-group success, cache invalidation/refetch, error/retry behavior, request encoding, and existing create/list/search/filter regressions.
  9. `tests/e2e/status-transitions.spec.ts` seeds distinguishable applications and exercises keyboard status updates through representative Active-to-Active, Active-to-Closed, and Closed-to-Active transitions; verifies persistence and exactly one matching history row per real change; verifies current view/search preservation, movement between view groups, no full-page reload, and recoverable failure feedback. F01–F05 regressions, formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated scope.
- **Relevant Constraints**: `Server-only database access; status Route Handler -> Service -> Database Query Module; service-owned Zod input/output validation; application update plus status history insert must be one database transaction; same-status requests are idempotent without history or timestamp churn; UUIDs and database-generated UTC timestamps; reuse shared ApplicationStatus; no schema/migration or dependency changes expected; TanStack Query remains the single network-state owner; strict TypeScript; no any; accessible responsive UI; preserve F03 ordering/projection, F04 search, and F05 view filters; preserve unrelated work; one logical Generator commit; Generator must read the relevant Next.js 16.3 App Router Route Handler, mutating-data, fetching-data, and caching docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/server/db/queries/application.ts; src/services/application.ts and PostgreSQL-backed tests; a dedicated src/app/api/applications/[id]/status/route.ts and focused route tests; src/lib/application-query.ts mutation request support; src/components/active-application-list.tsx and focused tests; page/create-form regressions only as needed; tests/e2e/status-transitions.spec.ts; test helpers only when needed for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/application.test.ts src/app/api/applications/[id]/status/route.test.ts src/app/api/applications/route.test.ts src/components/active-application-list.test.tsx src/components/create-application-form.test.tsx src/app/page.test.tsx; pnpm test:e2e tests/e2e/status-transitions.spec.ts; pnpm test:e2e tests/e2e/filters.spec.ts tests/e2e/search.spec.ts tests/e2e/list-view.spec.ts tests/e2e/create-application.spec.ts tests/e2e/landing.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `f99bcaa1cbd17bd2fe4aafcd6600ac0a8de185f1`
- **Changed Files**: `src/server/db/queries/application.ts; src/services/application.ts and tests; src/app/api/applications/[id]/status/route.ts and tests; src/lib/application-query.ts; src/components/active-application-list.tsx and tests; tests/e2e/status-transitions.spec.ts.`
- **Tests Run**: `PASS: focused status route Vitest (7 tests); focused application-list component Vitest (10 tests); pnpm typecheck; pnpm format:check; git diff --check. Started but no conclusive result: PostgreSQL service tests, combined targeted Vitest, corrected status-transition E2E, and final lint.`
- **Known Risks**: `Generator verification was incomplete: PostgreSQL service tests, corrected status-transition E2E, remaining E2E regressions, final lint, full Vitest, and build require Evaluator verification. An initial E2E locator was corrected, but the rerun was blocked by a stale .next-e2e/dev/lock left by the prior dev process.`

## Evaluator Report

- **Verdict**: `pending`
- **Commit Verified**: `pending`
- **Checks Run**: `pending`
- **Findings**: `pending`
- **Required Fix**: `pending`

## Current Status

- **Active**: `F06 — update application status through all fixed states`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F05 are passing. F06 Generator commit `f99bcaa1cbd17bd2fe4aafcd6600ac0a8de185f1` is awaiting independent evaluation; Generator verification gaps are recorded above.

## Next Step

1. `Evaluator verifies exact Generator commit f99bcaa1cbd17bd2fe4aafcd6600ac0a8de185f1 in a clean workspace, including every acceptance criterion and the full completion pipeline.`
2. `Orchestrator accepts only an Evaluator PASS; on FAIL, return one bounded correction to the Generator.`

## Verification Status

- **Build**: `PASS at d7a40faab134fd82bcadde2348961785d2842aeb`
- **Lint**: `PASS at d7a40faab134fd82bcadde2348961785d2842aeb`
- **Unit/Integration**: `PASS (56 tests) at d7a40faab134fd82bcadde2348961785d2842aeb`
- **E2E**: `PASS (5/5) at d7a40faab134fd82bcadde2348961785d2842aeb`

## Current Session Handoff Report

- **Decisions Made**: `Activate F06 with a dedicated status endpoint; allow every fixed status without transition restrictions; atomically persist each real change with one status_changed history row; treat same-status requests as idempotent without history or updated_at churn; refresh TanStack Query list caches so cards move between Active and Closed views.`
- **Context Summary**: `F00 through F05 are passing. F06 is evaluating at exact Generator commit f99bcaa1cbd17bd2fe4aafcd6600ac0a8de185f1; independent verification must cover the Generator's incomplete database, E2E, lint, full-test, and build checks.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Evaluator verifies exact Generator commit f99bcaa1cbd17bd2fe4aafcd6600ac0a8de185f1 without modifying implementation or project state.`
