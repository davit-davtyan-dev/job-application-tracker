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
- **Generator Commit**: `60a739174effc0f8e5745abce8faf651c15876af`
- **Evaluator Verdict**: `PASS`

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

- **Commit**: `60a739174effc0f8e5745abce8faf651c15876af`
- **Changed Files**: `tests/e2e/landing.spec.ts only; stale removed hero/readiness assertions now cover the intentional current navigation, primary workflows, and accessible search/results linkage. src/app/page.tsx and orchestration state files were not changed by the Generator.`
- **Tests Run**: `PASS: pnpm test src/app/page.test.tsx (1/1); pnpm format:check; pnpm typecheck; pnpm lint; pnpm test:e2e (4/4); git diff --check.`
- **Known Risks**: `Existing Node v26 versus requested v22.23.1 engine warning. The existing ESLint ignore configuration can scan generated .next-e2e output if lint runs after E2E without isolating that artifact.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `60a739174effc0f8e5745abce8faf651c15876af`
- **Checks Run**: `Clean exported workspace: PASS git diff --check; focused Vitest (5 files/33 tests); focused search Playwright (1/1); pnpm format:check; pnpm typecheck; pnpm lint; full pnpm test (8 files/45 tests); full pnpm test:e2e (4/4); pnpm build.`
- **Findings**: `All F04 acceptance criteria and architectural constraints pass. The intentional src/app/page.tsx content remains unchanged; the landing E2E validates the current navigation, primary workflows, and accessible search/results linkage. No implementation or project-state files were modified during evaluation.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F04 passed independent evaluation at exact Generator correction commit `60a739174effc0f8e5745abce8faf651c15876af`. The user intentionally retained the landing-page changes and aligned the page unit test in commit `6acd3a76440ddb39e72cb3bd42a175acb98a610d`; those changes were not restored from `d1e65b4524a1e7206038086a55da9af0d6a47828`. F00 through F04 are passing and no feature is active.

## Next Step

1. `Orchestrator may activate F05 in a new sprint when requested.`

## Verification Status

- **Build**: `PASS at 60a739174effc0f8e5745abce8faf651c15876af`
- **Lint**: `PASS at 60a739174effc0f8e5745abce8faf651c15876af`
- **Unit/Integration**: `PASS (45 tests) at 60a739174effc0f8e5745abce8faf651c15876af`
- **E2E**: `PASS (4/4) at 60a739174effc0f8e5745abce8faf651c15876af`

## Current Session Handoff Report

- **Decisions Made**: `Activate F04 as case-insensitive trimmed substring search across active application company names and position titles; blank search restores the full active list; preserve F03 projection, ordering, and active-only semantics; defer filtering, fuzzy ranking, highlighting, pagination, and URL persistence.`
- **Context Summary**: `F00 through F04 are passing. F04 search and the intentional landing-page baseline were independently verified at 60a739174effc0f8e5745abce8faf651c15876af. No feature is active.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator activates F05 only when requested.`
