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
- **Generator Commit**: `22c535fd8ebd5cbcaf64d91ef65b8aab641d923f`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F01`
- **Scope**: Add the server-side vertical slice for creating and storing a Company independently, with a required company name and optional general notes. Include the PostgreSQL schema/migration, server-only query module, validated service, and a POST Route Handler. Do not add job applications, company listing/edit/delete behavior, activity history, Markdown rendering, or new product UI.
- **Acceptance Criteria**:
  1. A `companies` table is introduced through the Drizzle schema and a committed migration, with a database-generated UUID primary key, a non-null company name, nullable general notes, and UTC-aware `createdAt` and `updatedAt` timestamps.
  2. Company creation follows `Route Handler -> Service -> Database Query Module`; all database imports and queries remain in server-only modules, and neither the Route Handler nor UI code contains a direct Drizzle query.
  3. The service validates input with Zod even when called independently of the HTTP boundary. A valid trimmed name creates and returns the stored company; omitted notes are stored as `null`. Blank/whitespace-only names and malformed payloads are rejected without inserting a record.
  4. `POST /api/companies` parses JSON with Zod-compatible server validation, delegates to the company service, returns the created company with HTTP 201, returns a structured client error for invalid JSON or invalid input, and does not expose internal database error details.
  5. `src/services/company.test.ts` verifies successful persistence and invalid-input rejection against PostgreSQL, including the no-write guarantee for rejected input. Directly affected route behavior is covered by focused tests.
  6. The migration applies cleanly to a healthy test database, generated migration metadata remains consistent, strict TypeScript and lint pass, and no `any` type is introduced.
- **Relevant Constraints**: `Server-only database access; Route Handler -> Service -> Database Query Module; Zod validation at the service boundary; UUID primary keys; UTC-aware timestamps; strict TypeScript; no any; preserve unrelated work; one logical Generator commit; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `src/server/db/schema.ts and committed drizzle migration; server-only company query module; company validation/service module; src/app/api/companies/route.ts; src/services/company.test.ts plus focused route tests and any minimal test utilities required for database isolation.`
- **Targeted Verification**: `pnpm test src/services/company.test.ts; focused company route test command; pnpm db:generate consistency check; pnpm db:migrate against healthy PostgreSQL; pnpm lint; pnpm typecheck.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `22c535fd8ebd5cbcaf64d91ef65b8aab641d923f`
- **Changed Files**: `Company schema and Drizzle migration; server-only company query module; Zod-validated company service; POST /api/companies Route Handler; PostgreSQL-backed service tests; focused route tests; test database environment/client wiring and Vitest server-only shim.`
- **Tests Run**: `PASS: test PostgreSQL migration; pnpm test src/services/company.test.ts (5/5); focused route tests (4/4); full Vitest (11/11); pnpm lint; pnpm typecheck; pnpm format:check; pnpm db:generate no-drift check; pnpm build.`
- **Known Risks**: `Generator did not run pnpm test:e2e; integration tests require a migrated PostgreSQL instance and TEST_DATABASE_URL. Evaluator full pipeline remains authoritative.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `22c535fd8ebd5cbcaf64d91ef65b8aab641d923f`
- **Checks Run**: `PASS: live test-database migration; pnpm test src/services/company.test.ts (5/5); focused route tests (4/4); full pnpm test (11/11); pnpm test:e2e (1/1); pnpm format:check; pnpm lint; pnpm typecheck; pnpm db:generate no schema drift; clean-checkout pnpm build; UUID, UTC timestamp, Zod validation, server-only layering, and no-any inspection.`
- **Findings**: `All F01 acceptance criteria and completion gates are satisfied for exact Generator commit 22c535fd8ebd5cbcaf64d91ef65b8aab641d923f. The previously blocked production build passed in a clean checkout on a compatible host.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F01 is complete at `22c535fd8ebd5cbcaf64d91ef65b8aab641d923f`. The Evaluator returned PASS after the exact commit passed functional, database, E2E, static, architectural, and clean-checkout production-build verification.

## Next Step

1. `Orchestrator may select F02 and write its sprint contract when the user is ready.`

## Verification Status

- **Build**: `Passing`
- **Lint**: `Passing`
- **Unit/Integration**: `Passing (11 tests; F01 service 5/5, route 4/4)`
- **E2E**: `Passing (1/1)`

## Current Session Handoff Report

- **Decisions Made**: `Activate F01 as a bounded server-side vertical slice: schema/migration, query module, validated service, POST route, and focused tests; defer UI and all application/history behavior. Accept exact Generator commit 22c535fd8ebd5cbcaf64d91ef65b8aab641d923f after Evaluator PASS, including clean-checkout production-build evidence.`
- **Context Summary**: `F00 and F01 are passing. No feature is active, and WIP=1 is clear for the next sprint.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator selects F02 when requested.`
