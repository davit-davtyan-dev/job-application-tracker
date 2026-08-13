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
- **Generator Commit**: `3d89edab9b3d006e593fc08de433060f7ba334da`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F12`
- **Scope**: Safely render every persisted Markdown content field that is relevant to the application list experience: job description, application notes, and company notes. Extend the existing application-list read model only as needed to expose those already-persisted values, introduce one reusable Markdown presentation boundary, and render non-empty content in each application card with clear accessible labels. Support ordinary Markdown structure without allowing Markdown input to execute scripts, inject active HTML, use unsafe link protocols, or otherwise create executable DOM. Add component and end-to-end evidence for formatting, absent-content behavior, and hostile input. Preserve raw Markdown storage, all write contracts, list/search/view/status behavior, histories, transactions, and F01–F11 behavior. Do not implement exact-status filtering or any F13 behavior.
- **Acceptance Criteria**:
  1. Application list records expose nullable job description, application notes, and company notes from the existing persisted columns through the established `Route Handler -> Service -> server-only Database Query Module` flow; no direct client or route database query is introduced.
  2. One reusable Markdown renderer presents common Markdown semantics including headings, paragraphs, emphasis, lists, code, and links as semantic React elements rather than raw source text.
  3. Raw HTML/script payloads never create executable elements or event handlers, and unsafe URL schemes such as `javascript:` or equivalent active-content links are removed or rendered inert. Rendering must not use unsanitized `dangerouslySetInnerHTML`.
  4. Each non-empty description or notes field is shown in its owning application card with an accessible visible label that distinguishes job description, application notes, and company notes. Null, empty, and whitespace-only content produces no empty Markdown section.
  5. Markdown remains stored and transported as raw source; create-company and create-application request/response behavior, server-side validation, trimming/null normalization, and persistence schema remain unchanged.
  6. Component tests cover representative Markdown structure, all three content labels, omitted/blank content, and hostile HTML/link input. The required Playwright test creates or arranges persisted Markdown and proves formatted visible output and absence/inertness of executable content in the browser.
  7. Existing Active/Closed views, search, status transitions, interview/activity/company history behavior, query invalidation, UUID/UTC handling, and all F01–F11 behavior remain unchanged; F13 exact-status filtering is not introduced.
  8. Any new Markdown dependency is narrowly justified, actively maintained, compatible with React 19/Next.js 16, and lockfile-pinned. Formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated changes or `any`.
- **Relevant Constraints**: `Read relevant Next.js 16.3.0 guides in node_modules/next/dist/docs before code changes; Route Handler -> Service -> server-only Database Query Module; raw Markdown remains the persisted source; reusable safe rendering boundary; no unsanitized dangerouslySetInnerHTML; no new endpoints, migrations, fields, editor/preview workflow, remote content fetching, or F13 filtering; preserve transactions, validation, API error envelopes, UUIDs, UTC timestamps, caches, and prior behavior; strict TypeScript; no any; pragmatic DRY; one logical Generator commit; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `A reusable component such as src/components/markdown-content.tsx plus its component test; src/components/active-application-list.tsx and its test; the application list types/schema and server-only selection projection in src/services/application.ts and src/server/db/queries/application.ts with focused tests as needed; tests/e2e/markdown-rendering.spec.ts; package.json and pnpm-lock.yaml only if a Markdown/sanitization dependency is required. No database migration, write-service, form, history, interview, status-filter, or unrelated UI changes.`
- **Targeted Verification**: `pnpm test src/components/markdown-content.test.tsx src/components/active-application-list.test.tsx src/services/application.test.ts; pnpm test:e2e tests/e2e/markdown-rendering.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `3d89edab9b3d006e593fc08de433060f7ba334da`
- **Changed Files**: `package.json; pnpm-lock.yaml; src/components/active-application-list.tsx; src/components/active-application-list.test.tsx; src/components/markdown-content.tsx; src/components/markdown-content.test.tsx; src/server/db/queries/application.ts; src/services/application.ts; src/services/application.test.ts; tests/e2e/markdown-rendering.spec.ts.`
- **Tests Run**: `PASS: Markdown/list component tests 19/19; application service tests 41/41; required Markdown Playwright test 1/1; full Vitest 142/142; correctly configured full Playwright 10/10; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check. Production build was attempted twice but the execution sandbox denied Turbopack's internal port bind before compilation with Operation not permitted.`
- **Known Risks**: `The Evaluator must rerun pnpm build in a clean workspace with process/port permissions. The Generator's first full Playwright attempt mismatched the test database and app-server database and failed 9/10; after correcting both to the same database, the unchanged commit candidate passed 10/10.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `3d89edab9b3d006e593fc08de433060f7ba334da`
- **Checks Run**: `PASS in a clean isolated checkout: targeted Vitest 3 files / 60 tests; required Markdown Playwright 1/1; pnpm format:check; pnpm lint from a clean generated-output state; pnpm typecheck; full Vitest 17 files / 142 tests; full Playwright 10/10 with the app and tests using localhost:5433/job_tracker_test; pnpm build with explicit DATABASE_URL; git diff --check HEAD^ HEAD; exact-HEAD and clean-worktree checks.`
- **Findings**: `All F12 acceptance criteria passed. The three nullable Markdown fields flow through Route Handler -> validated Service DTO -> server-only query module. One reusable react-markdown renderer supplies semantic formatting, skips raw HTML, removes unsafe URL schemes, and uses no dangerouslySetInnerHTML. Accessible labels and blank omission are covered. Raw storage and write contracts remain unchanged; no F13 behavior, migration, endpoint, transaction, UUID/UTC change, prohibited any, or unrelated change was introduced. react-markdown 10.1.0 is exactly pinned and React 19 compatible.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Queued**: `F13 — exact-status sub-filtering within the existing Active and Closed application views`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS); F08 — complete and expose application-scoped activity history (704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS); F09 — company-scoped chronological application history (b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS); F10 — transactional status/history updates (f5159c184d92445af1d89edba99ba8a05618d5a9 / Evaluator PASS); F11 — server-side Zod validation evidence (d089a8efced85c944f93a54d50a58c2e62293d38 / Evaluator PASS); F12 — safe Markdown rendering (3d89edab9b3d006e593fc08de433060f7ba334da / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F12 are passing. The Evaluator verified exact F12 Generator commit `3d89edab9b3d006e593fc08de433060f7ba334da` in a clean checkout and returned PASS after all targeted checks and the full completion pipeline. F13 remains queued as `not_started`.

## Next Step

1. `Activate F13 with a new sprint contract in the next orchestration cycle.`

## Verification Status

- **Build**: `PASS at 3d89edab9b3d006e593fc08de433060f7ba334da`
- **Lint**: `PASS at 3d89edab9b3d006e593fc08de433060f7ba334da`
- **Unit/Integration**: `PASS (142/142) at 3d89edab9b3d006e593fc08de433060f7ba334da`
- **E2E**: `PASS (10/10) at 3d89edab9b3d006e593fc08de433060f7ba334da`

## Current Session Handoff Report

- **Decisions Made**: `Accepted F12 after independent PASS. Raw persisted Markdown is rendered through one react-markdown boundary that skips raw HTML and applies the library's safe URL transform; the application list read model exposes existing description/application-note/company-note columns without changing write contracts.`
- **Context Summary**: `F00 through F12 are passing. Exact F12 Generator commit 3d89edab9b3d006e593fc08de433060f7ba334da received Evaluator PASS after targeted tests, 142/142 Vitest tests, 10/10 Playwright tests, formatting, lint, typecheck, production build, diff, and clean-worktree checks passed.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator may activate F13 in the next cycle.`
