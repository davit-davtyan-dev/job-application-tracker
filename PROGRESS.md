# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `evaluating`
- **Active Feature**: `F05`
- **Generator Commit**: `d7a40faab134fd82bcadde2348961785d2842aeb`
- **Evaluator Verdict**: `pending`

## Active Sprint Contract

- **Feature ID**: `F05`
- **Scope**: Add a two-state filter to the existing application list so the single user can switch between Active and Closed applications without full-page navigation. Active remains the default and contains exactly `Applied`, `Interviewing`, and `Offer`; Closed contains exactly `Accepted`, `Rejected`, `Withdrawn`, and `Archived`. The selected filter composes with the existing trimmed case-insensitive company/title search and preserves deterministic ordering and the existing list projection. Extend the existing `GET /api/applications` flow through Route Handler -> Service -> Database Query Module and the current TanStack Query UI. Include PostgreSQL-backed service coverage, focused route/component/page regressions, and `tests/e2e/filters.spec.ts`. Do not add an all-status view, per-status filtering, URL persistence, counts requiring extra queries, status mutation, detail/history, edit/delete, interview records, schema changes, or new dependencies unless an unavoidable defect is first escalated to the Orchestrator.
- **Acceptance Criteria**:
  1. The server accepts an optional `view` query parameter whose only valid values are `active` and `closed`; omission defaults to `active`. Invalid, empty, repeated/ambiguous, or otherwise unsupported values return the existing structured client-safe `INVALID_REQUEST` response with HTTP 400 and do not call the service. Existing bounded search parsing and normalization remain intact.
  2. Filtering follows `GET Route Handler -> Service -> Database Query Module`. The service owns both exact status groups, validates normalized input and database output with Zod, and passes the selected status set plus normalized search criteria to the server-only query module. Shared `ApplicationStatus` remains authoritative, pages/client components contain no database access, and no `any` is introduced.
  3. The database query combines the selected status predicate with the existing parameterized search predicate when present, selects only the existing list projection, and preserves ordering by `appliedDate DESC`, `createdAt DESC`, then `id DESC`. Active results never contain closed statuses and closed results never contain active statuses, including when search text matches both groups.
  4. Valid active and closed requests return the stable `{ applications: [...] }` response with HTTP 200. Omitted `view` remains backward-compatible with the F03/F04 active list; unexpected failures map to the structured `INTERNAL_ERROR` response without database details; POST behavior is unchanged.
  5. The landing-page list exposes an accessible, keyboard-operable Active/Closed control with clear selected-state semantics. Active is initially selected; changing it updates results without full-page navigation. Labels, heading/count text, loading, error/retry, and no-applications messaging accurately describe the selected view and remain usable at narrow and wide viewports.
  6. Filter state composes with the existing search: switching views preserves the entered search term, searching in Closed queries only closed records, clearing search restores the complete selected view, and each view has an unambiguous search-specific no-match state. No stale result from another view/search combination replaces the current result.
  7. TanStack Query remains the sole network-state owner. Its query key includes both selected view and normalized search, its request uses `URLSearchParams`, and switching back may reuse correctly keyed cached data. Focused component tests cover default selection, switching both ways, accessibility, composed search, clear, loading/error/retry/empty/count copy, request encoding, and existing create/list/search regressions.
  8. PostgreSQL-backed and route tests prove exact status partitioning, default-active compatibility, closed retrieval, search-plus-filter composition, deterministic ordering, no matches, valid parsing, invalid/repeated values, and safe failure mapping. `tests/e2e/filters.spec.ts` seeds distinguishable records across every status group, verifies default Active and Closed views, search composition, clear behavior, group isolation, empty feedback, keyboard operation, and no full-page reload. Existing F01–F04 regressions, formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated scope.
- **Relevant Constraints**: `Server-only database access; GET Route Handler -> Service -> Database Query Module; service-owned exact active and closed status groups with Zod input/output validation; parameterized database predicates; reuse shared ApplicationStatus; preserve F03 ordering and projection plus F04 search normalization; no schema/migration or dependency changes expected; TanStack Query remains the single network-state owner; strict TypeScript; no any; accessible responsive UI; preserve unrelated work; one logical Generator commit; Generator must read the relevant Next.js 16.3 App Router/Route Handler and data-fetching docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/services/application.ts and PostgreSQL-backed service tests; src/server/db/queries/application.ts only if its generic status/search contract needs adjustment; GET query parsing in src/app/api/applications/route.ts and route tests; src/lib/application-query.ts query-key/request updates; src/components/active-application-list.tsx (rename only if justified) and focused tests; page regressions as needed; tests/e2e/filters.spec.ts; test helpers only when needed for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/application.test.ts src/app/api/applications/route.test.ts src/components/active-application-list.test.tsx src/components/create-application-form.test.tsx src/app/page.test.tsx; pnpm test:e2e tests/e2e/filters.spec.ts; pnpm test:e2e tests/e2e/search.spec.ts tests/e2e/list-view.spec.ts tests/e2e/create-application.spec.ts tests/e2e/landing.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `d7a40faab134fd82bcadde2348961785d2842aeb`
- **Changed Files**: `src/lib/application.ts; src/services/application.ts and tests; src/app/api/applications/route.ts and tests; src/lib/application-query.ts; src/components/active-application-list.tsx and tests; create-form and page copy/regression tests; tests/e2e/filters.spec.ts; tests/e2e/landing.spec.ts.`
- **Tests Run**: `PASS: targeted Vitest (5 files/44 tests); new filters E2E (1/1); search/list/create/landing E2E regressions (4/4); pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Known Risks**: `Environment uses Node v26 instead of required v22.23.1 and emits the existing engine warning. Existing ESLint configuration can scan generated .next-e2e output if lint follows Playwright; Generator removed only that reproducible artifact before lint. Existing generic database query required no change.`

## Evaluator Report

- **Verdict**: `pending`
- **Commit Verified**: `pending`
- **Checks Run**: `pending independent clean-workspace evaluation`
- **Findings**: `pending`
- **Required Fix**: `pending`

## Current Status

- **Active**: `F05 — evaluating Generator commit d7a40faab134fd82bcadde2348961785d2842aeb`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F04 are passing. F05 implementation is committed at `d7a40faab134fd82bcadde2348961785d2842aeb` and awaits independent Evaluator verification.

## Next Step

1. `Evaluator verifies exact Generator commit d7a40faab134fd82bcadde2348961785d2842aeb in a clean workspace and returns PASS, FAIL, or BLOCKED.`

## Verification Status

- **Build**: `PASS at 60a739174effc0f8e5745abce8faf651c15876af`
- **Lint**: `PASS at 60a739174effc0f8e5745abce8faf651c15876af`
- **Unit/Integration**: `PASS (45 tests) at 60a739174effc0f8e5745abce8faf651c15876af`
- **E2E**: `PASS (4/4) at 60a739174effc0f8e5745abce8faf651c15876af`

## Current Session Handoff Report

- **Decisions Made**: `Activate F05 as a two-state Active/Closed filter; Active is Applied/Interviewing/Offer and remains the default; Closed is Accepted/Rejected/Withdrawn/Archived; filter composes with F04 search; defer all-status/per-status filters, URL persistence, and status mutation.`
- **Context Summary**: `F00 through F04 are passing. F05 Generator implementation and tests are committed at d7a40faab134fd82bcadde2348961785d2842aeb; targeted checks passed; independent full evaluation is pending.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Evaluator verifies exact commit d7a40faab134fd82bcadde2348961785d2842aeb without modifying implementation or orchestration state.`
