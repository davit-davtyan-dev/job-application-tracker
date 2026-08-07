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
- **Generator Commit**: `cd0333b99f212f10771fefdd7fb6460eb1316387`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F02`
- **Scope**: Add the complete manual job-application creation vertical slice. A user can open a form from the landing page, choose an existing company or create a company inline, enter a required position title, choose an applied date defaulting to the user's current date, choose one of the seven fixed application statuses with `Applied` as the default, optionally enter a Markdown job description, reference links, and application notes, submit the form, and receive an accessible success confirmation. Persist the application and its initial `application_created` activity entry atomically through the required Route Handler -> Service -> Database Query Module flow. Include the PostgreSQL schema/migration, validated API, minimal company lookup needed by the form, client form/mutation UI, integration/route/component tests, and `tests/e2e/create-application.spec.ts`. Do not add the application list, search/filtering, status-change behavior, interview records, history display, company history, Markdown rendering, or edit/delete workflows.
- **Acceptance Criteria**:
  1. Committed Drizzle schema and migration introduce `job_applications` and the minimal `activity_history` structure needed for the creation event. Record identifiers are database-generated UUIDs; every application references an existing company; position title, applied date, and fixed status are non-null; optional Markdown description and notes are nullable; reference links use a validated durable representation; and all timestamps are UTC-aware. The seven exact statuses are `Applied`, `Interviewing`, `Offer`, `Accepted`, `Rejected`, `Withdrawn`, and `Archived`.
  2. Application creation follows `Route Handler -> Service -> Database Query Module`; all database imports and queries remain server-only. The service validates unknown input with Zod when invoked independently, trims required text, validates company UUID/date/status/reference URLs, rejects unknown fields, and rejects invalid input without writing either an application or history row.
  3. Creation of the application and its initial `application_created` activity entry occurs in one database transaction. A missing company or any failure in either write leaves neither row committed. The stored application status defaults to `Applied` when omitted, and the initial history row identifies the created application and its initial status without introducing F08 history-display behavior.
  4. `POST /api/applications` accepts valid JSON, delegates to the application service, returns the created application with HTTP 201, returns a consistent structured 400 error for invalid JSON/input, returns a structured client-safe not-found response for a missing company, and never exposes internal database details or logs job descriptions/notes. A minimal read endpoint may list companies for the form, but it must preserve the same layered/server-only boundaries.
  5. The landing-page workflow exposes an accessible manual-creation form. The user can select an existing company or create one inline, enter position, applied date (defaulted in the browser to the user's current date), fixed status (default `Applied`), optional description, zero or more valid reference URLs, and optional notes. Client validation gives usable field errors, successful submission prevents duplicate submits and shows an unambiguous confirmation containing company and position, and server errors remain recoverable without discarding entered values.
  6. PostgreSQL-backed service tests prove successful persistence, defaults, inline-company workflow coordination, validation no-write behavior, missing-company behavior, and transactional rollback of the application/history pair. Focused route and component tests cover request/error mapping and core form behavior. `tests/e2e/create-application.spec.ts` creates an application through the browser and verifies its success confirmation and persisted application plus initial history data through a supported API/database-observable boundary.
  7. The migration applies cleanly to the healthy test database and generated migration metadata has no drift. Existing company creation and landing regressions remain green; formatting, strict TypeScript, lint, full Vitest, F02 Playwright, full Playwright, and production build pass; no `any` or unrelated product scope is introduced.
- **Relevant Constraints**: `Server-only database access; Route Handler -> Service -> Database Query Module; Zod validation at API and service boundaries; application + initial history transaction; UUID primary keys; UTC-aware timestamps; fixed status vocabulary; Markdown stored but not rendered; React Hook Form/Zod/TanStack Query for the client workflow where applicable; strict TypeScript; no any; accessible responsive UI; preserve unrelated work; one logical Generator commit; Generator must read the relevant Next.js 16.3 docs under node_modules/next/dist/docs before coding; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/server/db/schema.ts and committed Drizzle migration; server-only application/history and company-read query modules; application schemas/service and PostgreSQL integration tests; application and minimal company-list Route Handlers with focused tests; feature-specific client creation form and tests; landing-page integration; tests/e2e/create-application.spec.ts; minimal seed/test utilities only where needed for deterministic isolation.`
- **Targeted Verification**: `pnpm test src/services/application.test.ts; focused application/company-list route and creation-form tests; pnpm test:e2e tests/e2e/create-application.spec.ts; pnpm test src/services/company.test.ts src/app/api/companies/route.test.ts src/app/page.test.tsx; pnpm db:generate no-drift check; migrate/seed healthy test PostgreSQL; pnpm format:check; pnpm lint; pnpm typecheck.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `cd0333b99f212f10771fefdd7fb6460eb1316387` (bounded correction; original feature commit `8ee087d6c502bc2ca5f4d25d08ea9327fb85eadc`)
- **Changed Files**: `Original 21-file F02 vertical slice plus bounded correction in playwright.config.ts, create-application-form.tsx, its component test, and the focused F02 E2E spec. The correction aligns browser/dev-server origin and renders per-reference URL errors with aria-describedby.`
- **Tests Run**: `PASS after correction: format; lint; strict typecheck; focused component 3/3; focused amended suite 6 files/30 tests; literal F02 Playwright 1/1; full Playwright 2/2; production build.`
- **Known Risks**: `none identified within the bounded correction scope; Evaluator clean-workspace rerun remains authoritative.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `cd0333b99f212f10771fefdd7fb6460eb1316387`
- **Checks Run**: `PASS in fresh clean detached worktree: test/dev PostgreSQL migrations and seed; pnpm db:generate no drift; focused Vitest 6 files/30 tests; literal F02 Playwright 1/1; pnpm format:check; pnpm lint; pnpm typecheck; full Vitest 7 files/31 tests; full Playwright 2/2; production build; corrected FEATURES.md command; exact-commit clean status.`
- **Findings**: `All F02 acceptance criteria pass. The prior hydration failure is fixed by consistent localhost Playwright/dev-server URLs. Per-reference URL errors are visible and associated with aria-describedby/aria-invalid, and invalid input sends no POST. Schema, UUID, UTC, FK, strict Zod, atomic application/history transaction, server-only layering, ApplicationStatus enum, shared API response utility, no-any, accessibility, and bounded scope audits pass.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F02 is complete at `cd0333b99f212f10771fefdd7fb6460eb1316387`. The exact correction commit passed independent clean-worktree database, migration, focused/full unit, focused/full browser, static, accessibility, architecture, and production-build verification.

## Next Step

1. `Orchestrator may select F03 and write its sprint contract when the user is ready.`

## Verification Status

- **Build**: `Passing`
- **Lint**: `Passing`
- **Unit/Integration**: `Passing (31 tests)`
- **E2E**: `Passing (2/2)`

## Current Session Handoff Report

- **Decisions Made**: `Complete F02 as one manual-creation vertical slice; use a string ApplicationStatus enum as the single Drizzle/Zod/UI source of truth; share structured API error construction through src/app/api/responses.ts; align Playwright and Next dev-server origin at localhost; expose per-reference URL validation accessibly.`
- **Context Summary**: `F00, F01, and F02 are passing. No feature is active, and WIP=1 is clear. F02's exact correction commit cd0333b99f212f10771fefdd7fb6460eb1316387 has independent Evaluator PASS evidence.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator selects F03 when requested.`
