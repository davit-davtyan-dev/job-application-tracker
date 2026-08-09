# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `active`
- **Active Feature**: `F04`
- **Generator Commit**: `6dc64877aba9b85a5b451b1596422c1cff44ac28`
- **Evaluator Verdict**: `FAIL`

## Active Sprint Contract

- **Feature ID**: `F04`
- **Scope**: Add search to the existing active-application list so the single user can find applications by company name or position title. Search is a trimmed, case-insensitive substring match across either field and remains limited to the F03 active-status set. A blank or whitespace-only search restores the complete active list. Extend the existing `GET /api/applications` flow through Route Handler -> Service -> Database Query Module, and integrate an accessible search control with the current TanStack Query list while preserving all F02/F03 behavior. Include PostgreSQL-backed service coverage, focused route/component/page regression tests, and `tests/e2e/search.spec.ts`. Do not add active/closed filtering, fuzzy/ranked search, pagination, highlighting, URL persistence, status changes, detail/history, edit/delete, interview records, schema changes, or new dependencies unless an unavoidable defect is first escalated to the Orchestrator.
- **Acceptance Criteria**:
  1. The server accepts an optional `search` query parameter, normalizes it by trimming surrounding whitespace, and treats an omitted, empty, or whitespace-only value as no search. Non-empty input is validated with a bounded Zod schema; invalid input returns the existing structured client-safe `INVALID_REQUEST` response with HTTP 400 and does not call the service.
  2. Search follows `GET Route Handler -> Service -> Database Query Module`. The service continues to own the exact active-status set (`Applied`, `Interviewing`, and `Offer`), validates input and database output with Zod, and passes only normalized search criteria to the server-only query module. Pages and client components contain no database imports or queries, shared status definitions remain authoritative, and no `any` is introduced.
  3. The database query performs a parameterized, case-insensitive substring match against either company name or position title, combines it with the active-status predicate, selects only the existing list projection, and preserves F03 ordering (`appliedDate DESC`, `createdAt DESC`, `id DESC`). Closed applications never appear even when their company or title matches.
  4. `GET /api/applications?search=...` returns the same stable `{ applications: [...] }` shape with HTTP 200 for valid searches. Unexpected failures still map to the structured `INTERNAL_ERROR` response without database details, and existing unsearched GET and POST behavior remains unchanged.
  5. The landing page exposes a clearly labelled search input associated with the active-applications region. Typing a query updates the list without full-page navigation; a visible, keyboard-operable clear action appears when useful and restores the complete active list. Search state and results remain usable at narrow and wide viewports.
  6. TanStack Query owns search request state using a query key that includes the normalized term, URL encoding is delegated to `URLSearchParams`, and stale responses do not replace results for the current term. Loading and recoverable error states remain accessible. A valid search with no matches has an unambiguous search-specific empty state distinct from the existing no-applications state.
  7. PostgreSQL-backed tests prove company/title matching, mixed case, substring matching, surrounding-whitespace normalization, active-only enforcement, deterministic ordering, no matches, and unsearched regression behavior. Focused route tests cover parsed/normalized search, invalid input, successful response, and safe failure mapping; component/page tests cover search, clear, search-specific empty/error/loading behavior, encoding, and existing list/create regressions.
  8. `tests/e2e/search.spec.ts` creates or seeds distinguishable active applications plus at least one matching closed application, verifies company and title searches case-insensitively, verifies no-match feedback, verifies clear restores the active list, verifies the closed match never appears, and observes no full-page reload. Existing F01–F03 regressions, formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated scope.
- **Relevant Constraints**: `Server-only database access; GET Route Handler -> Service -> Database Query Module; service-owned active-status rule and Zod input/output validation; parameterized database predicates; reuse shared ApplicationStatus; preserve F03 deterministic ordering and response projection; no schema/migration or dependency changes expected; TanStack Query remains the single network-state owner; strict TypeScript; no any; accessible responsive UI; preserve unrelated work; one logical Generator commit; Generator must read the relevant Next.js 16.3 App Router/Route Handler and data-fetching docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/server/db/queries/application.ts and PostgreSQL-backed service tests; search input schema/service in src/services/application.ts; GET query parsing in src/app/api/applications/route.ts and route tests; src/lib/application-query.ts query-key/request updates; active-list search UI and focused component tests; landing-page regression tests as needed; tests/e2e/search.spec.ts; test helpers only when needed for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/application.test.ts src/app/api/applications/route.test.ts src/components/active-application-list.test.tsx src/components/create-application-form.test.tsx src/app/page.test.tsx; pnpm test:e2e tests/e2e/search.spec.ts; pnpm test:e2e tests/e2e/list-view.spec.ts tests/e2e/create-application.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `6dc64877aba9b85a5b451b1596422c1cff44ac28`
- **Changed Files**: `11 files: server-only application query; application service and PostgreSQL tests; GET route and tests; shared TanStack Query key/fetch utility; active-list search UI and tests; landing-page composition/tests; tests/e2e/search.spec.ts.`
- **Tests Run**: `PASS: required focused Vitest command (29 tests across five files); focused active-list component Vitest 6/6; search Playwright 1/1; list/create regression Playwright 2/2 on unchanged rerun; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check. One earlier regression Playwright invocation failed during transient Next web-server startup before tests ran, then passed unchanged on immediate rerun.`
- **Known Risks**: `Evaluator must authoritatively run the exact-commit clean-workspace full pipeline and probe the reported transient browser web-server startup. Generator environment reported Node 26.0.0 while package.json requests Node 22.23.1.`

## Evaluator Report

- **Verdict**: `FAIL`
- **Commit Verified**: `6dc64877aba9b85a5b451b1596422c1cff44ac28`
- **Checks Run**: `Clean detached workspace: PASS git diff --check; pnpm format:check; pnpm lint; pnpm typecheck; focused Vitest; full pnpm test (8 files/45 tests); focused search Playwright 1/1; list/create Playwright regressions 2/2; pnpm build. FAIL full pnpm test:e2e: 3 passed, 1 failed.`
- **Findings**: `The full Playwright suite deterministically fails tests/e2e/landing.spec.ts because src/app/page.tsx removed the established level-one heading "Keep every application moving forward" and the expected "Workspace ready" content. This violates F04 criterion 8 requiring all existing browser regressions to pass. The earlier web-server startup issue was sandbox localhost EPERM rather than an implementation defect. /usr/local/bin/node and pnpm exec node report the required 22.23.1; pnpm's Node 26 engine warning is misleading and did not affect verification.`
- **Required Fix**: `One bounded correction: restore the established landing hero/foundation content in src/app/page.tsx, including the semantic h1 and Workspace ready indicator, while retaining the new search link/control and all F04 behavior. Update only directly affected tests if necessary, then prove with pnpm test:e2e plus directly affected static/unit checks and produce one atomic correction commit for re-evaluation.`

## Current Status

- **Active**: `F04 — search active applications by company name or position title`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F04 returned to active after Evaluator FAIL on exact Generator commit `6dc64877aba9b85a5b451b1596422c1cff44ac28`. F00 through F03 remain passing. The Generator owns the single bounded landing-page regression correction recorded above.

## Next Step

1. `Generator restores the established landing h1 and Workspace ready content without changing F04 search behavior, verifies the full browser suite, and returns one atomic correction commit.`

## Verification Status

- **Build**: `Baseline passing; F04 pending`
- **Lint**: `Baseline passing; F04 pending`
- **Unit/Integration**: `Baseline passing (38 tests); F04 pending`
- **E2E**: `Baseline passing (3/3); F04 pending`

## Current Session Handoff Report

- **Decisions Made**: `Activate F04 as case-insensitive trimmed substring search across active application company names and position titles; blank search restores the full active list; preserve F03 projection, ordering, and active-only semantics; defer filtering, fuzzy ranking, highlighting, pagination, and URL persistence.`
- **Context Summary**: `F00 through F03 are passing. F04 is the sole active feature with a complete sprint contract; Generator implementation and independent evaluation remain.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Generator applies the bounded Evaluator correction.`
