# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `evaluating`
- **Active Feature**: `F07`
- **Generator Commit**: `5271688650be136fd68a4e973b39776ee2403130`
- **Evaluator Verdict**: `pending`

## Active Sprint Contract

- **Feature ID**: `F07`
- **Scope**: Add multiple individual interview records per job application. Each record has a UUID, owning application UUID, required scheduled UTC date/time, fixed state `Scheduled`, `Completed`, or `Cancelled`, and database-generated UTC creation/update timestamps. Support listing interviews for one application, creating a scheduled interview, and directly changing one interview to any fixed state. Expose application-scoped interview Route Handlers, delegate all validated behavior through an Interview Service to a server-only Interview Database Query Module, and atomically append one matching activity-history record for each created interview or real state change. Add an accessible per-card interview section to the existing application list so the user can add, inspect, and update interviews without full-page navigation while preserving search, Active/Closed filtering, and application status controls. Use TanStack Query as the sole network-state owner. Include a committed Drizzle migration, PostgreSQL-backed service tests, focused route/component/page regressions, and `tests/e2e/interviews.spec.ts`. Do not add interview rounds, titles/types, participants, locations, links, notes, reminders, editing the scheduled date/time after creation, deletion/restore, automatic application-status changes, application detail pages, full activity-history UI, URL persistence, or new dependencies unless an unavoidable defect is first escalated to the Orchestrator.
- **Acceptance Criteria**:
  1. Define one shared string `InterviewStatus` vocabulary containing exactly `Scheduled`, `Completed`, and `Cancelled`, reused by Drizzle, Zod, service output validation, and UI options. Add an `interviews` table with UUID primary key, required application foreign key, required timezone-aware scheduled timestamp, fixed status defaulting to `Scheduled`, and database-generated timezone-aware creation/update timestamps. Add the generated migration and migration metadata; no dependency change is made.
  2. Application-scoped collection endpoints accept a strict application UUID. GET returns that application's interviews in deterministic scheduled-time/creation/id order. POST accepts strict JSON containing only a valid ISO offset/Z datetime `scheduledAt`; status is server-owned as `Scheduled`. Malformed JSON, invalid UUID/date, missing/extra fields, and unsupported input return the existing client-safe `INVALID_REQUEST` response with HTTP 400 and perform no mutation.
  3. A dedicated application/interview status endpoint accepts strict application and interview UUIDs plus a strict JSON body containing only `status`; every shared InterviewStatus value is accepted. The interview must belong to the application in the URL. Missing application/interview or an ownership mismatch returns a structured client-safe `INTERVIEW_NOT_FOUND` response with HTTP 404. Unexpected failures return `INTERNAL_ERROR` without database details, and existing routes remain unchanged.
  4. All operations follow `Route Handler -> Interview Service -> Interview Database Query Module`. The service revalidates unknown input and database output with Zod; database access remains server-only; pages/client components contain no direct queries; no `any` is introduced.
  5. Creating an interview uses one database transaction to insert the record and exactly one activity-history row for the same application with `event_type = 'interview_scheduled'`, the interview UUID, current application status, and database-generated UTC timestamp. A missing application returns `APPLICATION_NOT_FOUND` with HTTP 404. A forced history failure rolls back the interview insert.
  6. A real interview state change uses one transaction to update state/updated_at and insert exactly one matching history row: `interview_scheduled`, `interview_completed`, or `interview_cancelled`, linked to the interview and application. Same-state requests succeed idempotently without history or updated_at churn. A forced history failure rolls back the update. Creating or changing an interview never changes application status.
  7. Each rendered application card has a keyboard-operable, explicitly labelled interview section that can reveal/load its interview list, create a scheduled interview from a native date/time input, and change each interview with a native state selector containing all three states. Pending and accessible success/error feedback is isolated to the affected card/record; failures retain persisted state and provide an unambiguous retry path.
  8. TanStack Query remains the sole network-state owner. Requests use JSON and safely encoded IDs. Successful creates and state mutations invalidate/refetch only the affected application's interview query while preserving search text, selected Active/Closed view, application status controls, counts, and list ordering. Concurrent state controls cannot allow a stale response to overwrite a newer choice for the same interview.
  9. PostgreSQL-backed `src/services/interview.test.ts` proves creation/listing, strict validation, UTC timestamps, all state values, ownership/not-found handling, exactly-one activity entry per real action, same-state idempotence, no application-status mutation, and rollback atomicity. Route tests prove success, strict validation, 404 mapping, and safe failure mapping. Focused component/page tests cover accessibility, creation, listing, state updates, pending isolation, cache invalidation/refetch, error/retry behavior, ID encoding, and F03–F06 regressions.
  10. `tests/e2e/interviews.spec.ts` adds multiple distinguishable interviews to one application, exercises keyboard creation and representative state changes, verifies persistence and exactly one matching activity row per real action, verifies same-state idempotence and no application-status change, and preserves current search/view without full-page reload. Migration verification, formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated scope.
- **Relevant Constraints**: `Server-only database access; Interview Route Handler -> Interview Service -> Interview Database Query Module; service-owned Zod input/output validation; interview insert/update plus activity history insert must be one database transaction; same-state requests are idempotent; UUIDs and database-generated UTC timestamps; shared InterviewStatus; migration required; activity history may gain a nullable interview UUID foreign key while preserving existing application/status history behavior; TanStack Query remains the single network-state owner; strict TypeScript; no any; accessible responsive UI; preserve F01–F06 behavior and unrelated work; one logical Generator commit; Generator must read the relevant Next.js 16.3 App Router Route Handler, mutating-data, fetching-data, and caching docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/lib/interview.ts; src/server/db/schema.ts and one generated drizzle migration/meta update; src/server/db/queries/interview.ts; src/services/interview.ts and PostgreSQL-backed tests; application-scoped interview collection/status Route Handlers and focused tests; src/lib/interview-query.ts; src/components/active-application-list.tsx and focused tests (or a bounded interview child component); page/create/status regressions only as needed; tests/database/migration.test.ts; tests/e2e/interviews.spec.ts; seed/test helpers only when needed for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/interview.test.ts src/app/api/applications/[id]/interviews/route.test.ts src/app/api/applications/[id]/interviews/[interviewId]/status/route.test.ts src/components/active-application-list.test.tsx src/app/page.test.tsx tests/database/migration.test.ts; pnpm test:e2e tests/e2e/interviews.spec.ts; pnpm test:e2e tests/e2e/status-transitions.spec.ts tests/e2e/filters.spec.ts tests/e2e/search.spec.ts tests/e2e/list-view.spec.ts tests/e2e/create-application.spec.ts tests/e2e/landing.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `5271688650be136fd68a4e973b39776ee2403130` (bounded correction; initial implementation `98832955b6081eecdb35b33d9e7458b520412ac8`)
- **Changed Files**: `Initial: migration/schema; interview domain/query/service and tests; application-scoped interview routes and tests; TanStack Query utilities; accessible per-card interview UI and tests; migration assertion; interview E2E. Correction: vitest.config.ts serializes shared-database test files; src/services/application.test.ts cleans interviews in FK-safe order.`
- **Tests Run**: `Correction PASS: full Vitest twice (105/105 each); focused F07 Vitest (42/42); format:check; lint; typecheck; git diff --check. Initial targeted service, route/component/page/migration, and seven browser scenarios also passed.`
- **Known Risks**: `Serializing Vitest files increases local suite duration to about 29 seconds. No product behavior changed. Independent full pipeline rerun remains required.`

## Evaluator Report

- **Verdict**: `FAIL`
- **Commit Verified**: `98832955b6081eecdb35b33d9e7458b520412ac8`
- **Checks Run**: `Clean isolated exact-commit clone: install offline PASS; migrations PASS; focused F07 Vitest PASS (42/42); format PASS; lint PASS; typecheck PASS; focused F07 plus F03–F06 Playwright PASS (7/7); full Playwright PASS (7/7); production build PASS; diff check PASS; full Vitest FAIL (92 passed, 13 failed).`
- **Findings**: `The F07 behavior and static acceptance review otherwise pass, and the Generator's Turbopack caveat was not reproduced. Full Vitest fails because src/services/interview.test.ts and src/services/application.test.ts run concurrently against one PostgreSQL database: destructive shared-table cleanup and global forced-history triggers cross-contaminate the files, producing FK, missing-fixture, and forced-trigger failures.`
- **Required Fix**: `Bounded correction: serialize PostgreSQL-mutating service test files (for example Vitest fileParallelism false, or an equivalently deterministic isolated database/schema/lock), keep cleanup FK-safe across activity_history, interviews, job_applications, and companies, and prevent forced trigger setup from overlapping another integration file. Prove with pnpm test twice, then targeted F07 verification and static checks. Do not change product behavior or scope.`

## Current Status

- **Active**: `F07 — evaluating corrected Generator commit 5271688650be136fd68a4e973b39776ee2403130`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F06 are passing. F07 test-isolation correction is committed at `5271688650be136fd68a4e973b39776ee2403130` after two full Vitest passes and awaits independent reevaluation.

## Next Step

1. `Evaluator verifies exact corrected Generator commit 5271688650be136fd68a4e973b39776ee2403130 in a clean workspace and returns PASS, FAIL, or BLOCKED.`

## Verification Status

- **Build**: `PASS at efae1d6fece1825788c31f127245019beab073c2`
- **Lint**: `PASS at efae1d6fece1825788c31f127245019beab073c2`
- **Unit/Integration**: `PASS (76 tests) at efae1d6fece1825788c31f127245019beab073c2`
- **E2E**: `PASS (6/6) at efae1d6fece1825788c31f127245019beab073c2`

## Current Session Handoff Report

- **Decisions Made**: `Activate F07 for application-scoped interview creation, listing, and direct state changes. Keep the record minimal: scheduled UTC date/time plus fixed state; no rounds or auxiliary interview metadata. Require atomic activity-history entries for creation and real state changes.`
- **Context Summary**: `F00 through F06 are passing. F07 is evaluating corrected Generator commit 5271688650be136fd68a4e973b39776ee2403130; the bounded isolation fix passed full Vitest twice.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Evaluator independently verifies exact corrected commit 5271688650be136fd68a4e973b39776ee2403130.`
