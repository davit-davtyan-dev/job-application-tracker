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
- **Generator Commit**: `7fcfc4220be3ac454354d11e69c0fa7ccf8512d0`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F13`
- **Scope**: Refine the existing Active and Closed application list views with one subordinate, accessible exact-status button group that matches the interaction and visual pattern of the existing ApplicationListView button group. Active offers All, Applied, Interviewing, and Offer; Closed offers All, Accepted, Rejected, Withdrawn, and Archived. All is the default UI selection, applies the existing aggregate view behavior, and is not transported as a domain status. Selecting an exact status narrows results through the established applications Route Handler, service validation, and server-only query module. Changing Active/Closed resets the exact-status selection to All while preserving the current search value; search and exact-status filtering compose without navigation. Preserve all application cards, Markdown rendering, mutations, histories, transactions, caching behavior, and F01–F12 behavior. Do not introduce new statuses, status-transition rules, endpoints, persistence fields, or migrations.
- **Acceptance Criteria**:
  1. The application-list UI exposes a clearly labelled, keyboard-operable exact-status button group subordinate to the Active/Closed view button group and styled with the same selected/unselected visual pattern. It must use buttons with `aria-pressed` selection state, not a select/combobox. Active buttons are exactly All, Applied, Interviewing, Offer; Closed buttons are exactly All, Accepted, Rejected, Withdrawn, Archived.
  2. All is selected on initial load and retains the existing aggregate behavior for the current view. All remains UI-only: it is not added to `ApplicationStatus`, persisted, or sent as a status query value.
  3. Selecting a concrete option requests and displays only applications whose persisted status exactly equals that option. Exact-status filtering composes with the existing company/position search, including correct empty-result messaging, without a full-page navigation.
  4. Switching between Active and Closed resets the exact-status selection to All before loading the destination aggregate view, prevents an incompatible status from leaking across views, and preserves the current search value. Re-selecting the current view does not create inconsistent state.
  5. The existing applications GET Route Handler parses at most one optional `status` query parameter and sends it to the service. Server-side Zod validation accepts only a concrete status valid for the selected/default view and rejects unknown, blank, duplicated, or cross-view status values with the established structured 400 error before any database query.
  6. The service remains the source of the Active/Closed status membership rule and passes either the selected singleton status or the full view status set to the existing server-only database query module. Search remains parameterized and composed with the status predicate; no direct database access is added to the route or client.
  7. Component, Route Handler, and service tests cover button-group option sets and `aria-pressed` state, default/reset behavior, search preservation/composition, exact filtering, and invalid/ambiguous/cross-view inputs. The required Playwright test covers both views, keyboard interaction with exact-status buttons, accessible pressed state, reset-to-All, persistent search, exact results, and no navigation.
  8. Existing status mutations and query invalidation continue to settle the currently selected view/status/search result correctly. Application cards, safe Markdown, creation, interviews, activity/company history, transactions, UUID/UTC handling, and all F01–F12 behavior remain unchanged. Formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated changes, dependency additions, or `any`.
- **Relevant Constraints**: `Read relevant Next.js 16.3.0 guides in node_modules/next/dist/docs before code changes; Route Handler -> Service -> server-only Database Query Module; server-side Zod validation; reuse the shared ApplicationStatus vocabulary and one service-owned view/status membership rule; All is UI-only; preserve parameterized queries, existing API error envelopes, query-key isolation/invalidation, transactions, validation, UUIDs, UTC timestamps, Markdown safety, and prior behavior; no new endpoint, migration, schema field, status, status-transition policy, dependency, or unrelated UI; strict TypeScript; no any; pragmatic DRY; one logical Generator commit; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/components/active-application-list.tsx and src/components/active-application-list.test.tsx; src/app/api/applications/route.ts and its route test; src/services/application.ts and src/services/application.test.ts; tests/e2e/filters.spec.ts. Change src/server/db/queries/application.ts only if the established status-array query contract cannot express the approved singleton filter. No migration, schema, write-service, history, interview, Markdown-renderer, dependency, or unrelated file changes.`
- **Targeted Verification**: `pnpm test src/app/api/applications/route.test.ts src/services/application.test.ts src/components/active-application-list.test.tsx; pnpm test:e2e tests/e2e/filters.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `7fcfc4220be3ac454354d11e69c0fa7ccf8512d0`
- **Changed Files**: `src/app/api/applications/route.ts; src/app/api/applications/route.test.ts; src/components/active-application-list.tsx; src/components/active-application-list.test.tsx; src/lib/application-query.ts; src/services/application.ts; src/services/application.test.ts; tests/e2e/filters.spec.ts.`
- **Tests Run**: `PASS: targeted Vitest 84/84 with local test-database access; final component suite 18/18; targeted Playwright filters flow 1/1; F13 files pass Prettier; pnpm lint; pnpm typecheck; git diff --check.`
- **Known Risks**: `Generator verification ran on Node v26.0.0 while package.json declares Node 22.23.1, producing engine warnings. Repository-wide format:check was deferred because Orchestrator-owned FEATURES.md and PROGRESS.md were modified outside the Generator commit; the Orchestrator formats those state files before evaluation.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `7fcfc4220be3ac454354d11e69c0fa7ccf8512d0`
- **Checks Run**: `PASS in a clean isolated checkout: targeted Vitest 3 files / 84 tests; required filters Playwright 1/1; pnpm format:check; pnpm lint; pnpm typecheck; full Vitest 17 files / 155 tests; full Playwright 10/10; pnpm build with the application database on localhost:5432; git diff --check; exact detached HEAD and clean tracked-worktree checks.`
- **Findings**: `All F13 acceptance criteria passed. The exact-status UI is a labelled subordinate aria-pressed button group with the required per-view option sets and matching selected/unselected pattern; no list-level combobox remains. All is UI-only/default, view changes reset it while preserving search, exact filtering composes with search without navigation, and empty-state copy reflects both filters. The Route Handler and service reject blank, duplicate, unknown, and cross-view statuses before database work. The service owns view/status membership and passes a singleton or aggregate set to the unchanged parameterized server-only query. Query keys isolate view/search/status combinations and existing root invalidation settles mutations. No dependency, migration, schema, endpoint, transaction, UUID/UTC, Markdown, history, interview, prohibited any, or unrelated change was introduced.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Queued**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS); F08 — complete and expose application-scoped activity history (704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS); F09 — company-scoped chronological application history (b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS); F10 — transactional status/history updates (f5159c184d92445af1d89edba99ba8a05618d5a9 / Evaluator PASS); F11 — server-side Zod validation evidence (d089a8efced85c944f93a54d50a58c2e62293d38 / Evaluator PASS); F12 — safe Markdown rendering (3d89edab9b3d006e593fc08de433060f7ba334da / Evaluator PASS); F13 — exact-status button-group filtering (7fcfc4220be3ac454354d11e69c0fa7ccf8512d0 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F13 are passing. The Evaluator independently verified exact F13 Generator commit `7fcfc4220be3ac454354d11e69c0fa7ccf8512d0` in a clean isolated checkout and returned PASS after all targeted checks and the full completion pipeline.

## Next Step

1. `No feature remains queued in FEATURES.md; the Orchestrator awaits the next requested feature.`

## Verification Status

- **Build**: `PASS at 7fcfc4220be3ac454354d11e69c0fa7ccf8512d0`
- **Lint**: `PASS at 7fcfc4220be3ac454354d11e69c0fa7ccf8512d0`
- **Unit/Integration**: `PASS (155/155) at 7fcfc4220be3ac454354d11e69c0fa7ccf8512d0`
- **E2E**: `PASS (10/10) at 7fcfc4220be3ac454354d11e69c0fa7ccf8512d0`

## Current Session Handoff Report

- **Decisions Made**: `Accepted F13 after independent PASS. Exact status uses a subordinate aria-pressed button group matching ApplicationListView, with All UI-only/default, per-view status sets, reset on view changes, and persistent search.`
- **Context Summary**: `F00 through F13 are passing. Exact F13 Generator commit 7fcfc4220be3ac454354d11e69c0fa7ccf8512d0 received Evaluator PASS after targeted tests, 155/155 Vitest tests, 10/10 Playwright tests, formatting, lint, typecheck, production build, diff, exact-HEAD, and clean-worktree checks passed.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator awaits the next requested feature.`
