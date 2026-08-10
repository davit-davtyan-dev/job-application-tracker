# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `evaluating`
- **Active Feature**: `F08`
- **Generator Commit**: `704e8c96f23c3662d35258b024dc882916137f17`
- **Evaluator Verdict**: `pending`

## Active Sprint Contract

- **Feature ID**: `F08`
- **Scope**: Complete activity history as a first-class, immutable application audit trail. Define one shared fixed event vocabulary for application creation, real application-status changes, interview scheduling, interview completion, and interview cancellation; reuse it in persistence writers, Zod validation, service output validation, and UI rendering. Preserve the already-required transactional writes from F02/F06/F07 while consolidating repeated history-write rules where that improves correctness. Add an application-scoped read-only history Route Handler following `Route Handler -> History Service -> server-only History Database Query Module`, returning a deterministic chronological timeline. Add an accessible per-card activity section to the existing application list so the user can reveal, inspect, retry, and refresh that application's timeline without navigation. TanStack Query remains the sole network-state owner. Include PostgreSQL-backed history service tests, focused route/component/page regressions, and `tests/e2e/activity-history.spec.ts`. Do not add manual history creation/editing/deletion, activity notes, paging, date filters, company-wide or cross-application history, application detail pages, notification/reminder behavior, schema changes or dependencies unless an unavoidable defect is first escalated to the Orchestrator.
- **Acceptance Criteria**:
  1. Define one shared string `ActivityEventType` vocabulary containing exactly `application_created`, `status_changed`, `interview_scheduled`, `interview_completed`, and `interview_cancelled`. Reuse it in every application/interview history writer, Zod schemas, service output validation, and UI event rendering; no freehand event strings remain in production writers.
  2. Preserve the existing immutable `activity_history` records: UUID identity, owning application UUID, nullable interview UUID, application-status snapshot, and database-generated timezone-aware creation timestamp. F08 requires no schema or dependency change; any discovered need for one must stop for Orchestrator approval.
  3. An application-scoped GET endpoint accepts a strict application UUID and returns that application's complete activity timeline ordered deterministically by `created_at` then UUID, oldest first. Each response item contains only validated client-safe fields: history UUID, application UUID, nullable interview UUID, shared event type, shared application status, and UTC ISO timestamp.
  4. Missing applications return the structured client-safe `APPLICATION_NOT_FOUND` response with HTTP 404, including when no history rows exist. Invalid UUIDs return the existing `INVALID_REQUEST` response with HTTP 400. Unexpected failures return `INTERNAL_ERROR` without database details; existing routes remain unchanged.
  5. The read flow is strictly `Route Handler -> History Service -> History Database Query Module`. The service accepts unknown input and revalidates both input and database output with Zod. Database access and Drizzle types stay in server-only modules; routes, pages, and client components contain no direct queries; no `any` is introduced.
  6. Application creation still appends exactly one `application_created` record in the same transaction. Each real application-status change still appends exactly one `status_changed` record in the same transaction; same-state requests remain idempotent without history or timestamp churn. Existing rollback guarantees remain covered.
  7. Interview creation and each real interview-state change still append exactly one correctly linked shared event in the same transaction. Same-state interview requests remain idempotent, application status remains unchanged, and existing rollback guarantees remain covered.
  8. Each rendered application card has a keyboard-operable, explicitly labelled activity section that reveals/loads a chronological timeline and renders an understandable label, application-status snapshot, timestamp, and interview association when present. Empty, loading, and accessible error states are isolated to the affected card; failures preserve persisted UI state and expose an unambiguous retry control.
  9. TanStack Query is the sole network-state owner. Requests safely encode application IDs. Successful application creation, real application-status changes, interview creation, and real interview-state changes make the affected timeline fresh without full-page navigation while preserving search text, Active/Closed view, application/interview controls, counts, and ordering; unrelated application history caches are not invalidated.
  10. PostgreSQL-backed `src/services/history.test.ts` proves strict validation, missing-application behavior, all five event shapes, UTC serialization, interview linkage, and deterministic chronological ordering. Route tests prove success, invalid UUID, 404, and safe failure mapping. Focused component/page tests cover accessibility, all event labels, loading/empty/error/retry behavior, cache scoping/refetch, ID encoding, and F03–F07 regressions. `tests/e2e/activity-history.spec.ts` exercises creation, a real application-status change, interview scheduling and a representative interview state change; verifies chronological persistence, exactly-once display after refresh, same-state idempotence, current search/view preservation, and no full-page reload. Formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated scope.
- **Relevant Constraints**: `Server-only database access; History Route Handler -> History Service -> History Database Query Module; service-owned Zod input/output validation; existing application/interview mutations and history inserts remain atomic; same-state mutations remain idempotent; UUIDs and database-generated UTC timestamps; shared ActivityEventType; no migration or dependency change; TanStack Query remains the single network-state owner; strict TypeScript; no any; accessible responsive UI; F09 company-wide history is explicitly excluded; preserve F01–F07 behavior and unrelated work; one logical Generator commit; Generator must read the relevant Next.js 16.3 App Router Route Handler, fetching-data, mutating-data, and caching docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/lib/history.ts; src/server/db/queries/history.ts; bounded refactors to application/interview history writers; src/services/history.ts and PostgreSQL-backed tests; src/app/api/applications/[id]/history/route.ts and focused tests; src/lib/history-query.ts; a bounded activity-history component integrated into src/components/active-application-list.tsx plus focused tests; page/create/status/interview regressions only as needed; tests/e2e/activity-history.spec.ts; seed/test helpers only when needed for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/history.test.ts src/app/api/applications/[id]/history/route.test.ts src/components/active-application-list.test.tsx src/app/page.test.tsx src/services/application.test.ts src/services/interview.test.ts; pnpm test:e2e tests/e2e/activity-history.spec.ts tests/e2e/status-transitions.spec.ts tests/e2e/interviews.spec.ts tests/e2e/filters.spec.ts tests/e2e/search.spec.ts tests/e2e/list-view.spec.ts tests/e2e/create-application.spec.ts tests/e2e/landing.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `704e8c96f23c3662d35258b024dc882916137f17` (bounded test correction; initial implementation `c87d4893b60dbaa486f28b7a8820769ff3a17aa9`)
- **Changed Files**: `Initial: 14 files for shared activity-history domain/query/service/API, per-card activity UI, application/interview writer and cache refactors, and focused/E2E tests. Correction: only src/components/active-application-list.test.tsx and tests/e2e/activity-history.spec.ts for explicit loading/empty, affected-only cache invalidation, and chronological-order evidence.`
- **Tests Run**: `Correction PASS: focused component 15/15; focused E2E 1/1; full Vitest 113/113; full Playwright 8/8; format:check; lint; typecheck; git diff --check. Build attempted twice but the Generator sandbox denied Turbopack's internal port bind; independent build rerun is required. Initial implementation targeted/full verification results are recorded in the prior Evaluator report.`
- **Known Risks**: `Independent production build remains required for the corrected exact commit. One focused E2E fixture setup was externally interfered with before an isolated retry passed; full Playwright subsequently passed 8/8. Host Node is 26 rather than declared 22.23.1.`

## Evaluator Report

- **Verdict**: `pending correction evaluation`
- **Commit Verified**: `pending exact commit 704e8c96f23c3662d35258b024dc882916137f17`
- **Checks Run**: `Prior FAIL evidence retained in git history at e6b5610; corrected exact-commit verification pending.`
- **Findings**: `pending`
- **Required Fix**: `pending`

## Current Status

- **Active**: `F08 — evaluating exact corrected Generator commit 704e8c96f23c3662d35258b024dc882916137f17`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F07 are passing. F08 bounded correction is committed at `704e8c96f23c3662d35258b024dc882916137f17` and awaits independent clean-workspace re-evaluation.

## Next Step

1. `Evaluator verifies exact corrected Generator commit 704e8c96f23c3662d35258b024dc882916137f17 in a clean workspace, including production build, and returns PASS, FAIL, or BLOCKED.`

## Verification Status

- **Build**: `PASS at 5271688650be136fd68a4e973b39776ee2403130`
- **Lint**: `PASS at 5271688650be136fd68a4e973b39776ee2403130`
- **Unit/Integration**: `PASS twice (105 tests) at 5271688650be136fd68a4e973b39776ee2403130`
- **E2E**: `PASS (7/7) at 5271688650be136fd68a4e973b39776ee2403130`

## Current Session Handoff Report

- **Decisions Made**: `Activate F08 as a typed, immutable, application-scoped activity timeline. Preserve and consolidate the automatic atomic writers already introduced by F02/F06/F07; add the missing validated read API and per-card UI. Keep F09 company-wide history out of scope.`
- **Context Summary**: `F00 through F07 are passing. F08 corrected commit 704e8c96f23c3662d35258b024dc882916137f17 adds only the test evidence required by the prior FAIL and is ready for independent clean-workspace verification.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Evaluator verifies exact corrected Generator commit 704e8c96f23c3662d35258b024dc882916137f17.`
