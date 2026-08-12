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
- **Generator Commit**: `f5159c184d92445af1d89edba99ba8a05618d5a9`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F10`
- **Scope**: Establish and independently prove the atomicity invariant for application status transitions: every real status change must persist the application update and its single matching `status_changed` activity-history row in one PostgreSQL transaction, or persist neither operation. Preserve the existing direct-transition policy, same-status idempotence, API contract, cache invalidation, and F01–F09 behavior. Audit the existing transaction path first and make only the smallest implementation or PostgreSQL-backed test changes needed to close F10. Do not add transition restrictions, new history event types, UI behavior, endpoints, migrations, dependencies, or changes to application creation/interview transactions.
- **Acceptance Criteria**:
  1. A real status transition uses one database transaction for both the `job_applications` status/`updated_at` update and insertion of exactly one matching `status_changed` activity-history row.
  2. If activity-history insertion fails after the application update is attempted, the transaction rejects and PostgreSQL retains the original application status and `updated_at`; no history row from the failed transition persists.
  3. Successful transitions to every shared `ApplicationStatus` persist exactly one history row whose application ID, event type, status, and UTC timestamp match the transition.
  4. A same-status request remains a successful idempotent no-op: it does not change `updated_at` and does not append history. A missing application remains a not-found result with no history side effect.
  5. The flow remains `Route Handler -> Application Service -> server-only Application Database Query Module`; the service accepts unknown input and validates it with Zod; routes, pages, and client components contain no direct database query; no `any` is introduced.
  6. Existing status endpoint responses, unrestricted direct status transitions, TanStack Query invalidation, application/company history presentation, and all F01–F09 behavior remain unchanged.
  7. PostgreSQL-backed tests deterministically prove both commit and rollback behavior and clean up any failure injection even when an assertion fails. Tests must not rely on mocks as evidence of database atomicity.
  8. Formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated changes.
- **Relevant Constraints**: `Server-only database access; Route Handler -> Application Service -> Application Database Query Module; one PostgreSQL transaction for status plus history; shared ApplicationStatus and ActivityEventType; same-state idempotence; UUIDs and UTC timestamps; no migration, dependency, API, UI, cache-policy, application-creation, or interview-transaction changes; strict TypeScript; no any; one logical Generator commit; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `Primarily src/services/application.test.ts for deterministic PostgreSQL commit/rollback evidence; src/server/db/queries/application.ts only if the audit reveals the smallest implementation correction required. No route, component, schema, migration, dependency, application-creation, or interview files are expected.`
- **Targeted Verification**: `pnpm test src/services/application.test.ts; pnpm test:e2e tests/e2e/status-transitions.spec.ts tests/e2e/activity-history.spec.ts tests/e2e/company-history.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `f5159c184d92445af1d89edba99ba8a05618d5a9`
- **Changed Files**: `src/services/application.test.ts only; strengthened PostgreSQL-backed evidence for exact status-history fields and bounded UTC timestamp, missing-application history isolation, rollback preservation of status and updated_at, zero leaked history, and failure-injection cleanup.`
- **Tests Run**: `PASS: pnpm test src/services/application.test.ts (29/29); targeted Playwright status-transitions, activity-history, and company-history specs (3/3); pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Known Risks**: `Generator verification ran under Node 26.0.0 while the project declares Node 22.23.1; independent clean-workspace evaluation under the declared runtime remains required.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `f5159c184d92445af1d89edba99ba8a05618d5a9`
- **Checks Run**: `Clean isolated checkout and exact identity PASS; declared Node 22.23.1 and pnpm 11.20.0 runtime; F10 service test PASS (29/29); targeted Playwright PASS; format:check PASS; lint PASS; typecheck PASS; full Vitest PASS; full Playwright PASS (9/9); production build PASS; git diff --check PASS; final checkout clean.`
- **Findings**: `All F10 criteria pass. One PostgreSQL transaction covers each real application-status update and its single matching status_changed history insert; failure injection proves rollback preserves both status and updated_at with no leaked history; every shared status records exact application/status/event data with UTC timestamps; same-status and missing-record paths remain side-effect free. Layering, server-only database access, Zod input validation, UUID/UTC rules, no-any, existing API/cache/UI behavior, and bounded test-only scope all pass.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Queued**: `F11 — server-side Zod validation; F12 — safe Markdown rendering; F13 — exact-status sub-filtering within the existing Active and Closed application views`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS); F08 — complete and expose application-scoped activity history (704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS); F09 — company-scoped chronological application history (b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS); F10 — transactional status/history updates (f5159c184d92445af1d89edba99ba8a05618d5a9 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F10 are passing. F10 passed independent clean-workspace evaluation at exact Generator commit `f5159c184d92445af1d89edba99ba8a05618d5a9`. F11 through F13 remain queued as `not_started`; no feature is active.

## Next Step

1. `When implementation is next requested, activate F11 and replace the completed F10 sprint contract with a bounded server-side validation contract.`

## Verification Status

- **Build**: `PASS at f5159c184d92445af1d89edba99ba8a05618d5a9`
- **Lint**: `PASS at f5159c184d92445af1d89edba99ba8a05618d5a9`
- **Unit/Integration**: `PASS at f5159c184d92445af1d89edba99ba8a05618d5a9`
- **E2E**: `PASS (9/9) at f5159c184d92445af1d89edba99ba8a05618d5a9`

## Current Session Handoff Report

- **Decisions Made**: `F10 required no production change because the existing database query already wraps the real status update and history insert in one transaction. Close F10 with stronger PostgreSQL-backed commit/rollback evidence; no new durable decision entry is required because DECISIONS.md already records this invariant.`
- **Context Summary**: `F00 through F10 are passing. F10 was independently verified at exact Generator commit f5159c184d92445af1d89edba99ba8a05618d5a9 under the declared Node 22.23.1 runtime. F11 through F13 remain not_started and no feature is active.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator activates F11 and writes its sprint contract when the next implementation request is made.`
