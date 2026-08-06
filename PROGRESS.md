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
- **Generator Commit**: `de12250608b3210ec4b4506bfb6176a1360a2eab`
- **Evaluator Verdict**: `PASS`

## Active Sprint Contract

- **Feature ID**: `F00`
- **Scope**: Bootstrap the empty repository as a runnable single-app Next.js project with the agreed stack and development infrastructure. Do not implement product-domain features F01-F12.
- **Acceptance Criteria**:
  1. A Next.js App Router application uses strict TypeScript, Tailwind CSS, ESLint, Prettier/import sorting, and the `src/` layout, and displays a minimal accessible tracker landing page.
  2. Runtime foundations are installed and minimally wired: Drizzle ORM with postgres.js in server-only modules, Zod-validated environment variables, TanStack Query provider, Zustand, React Hook Form/Zod resolver, Lucide, date-fns, and shadcn/ui configuration with one reusable component.
  3. PostgreSQL development/test configuration includes `.env.example`, Docker Compose health checks and named storage, baseline Drizzle configuration and migration, and idempotent migration/seed scripts that can run against a healthy database.
  4. Vitest + React Testing Library and Playwright are configured with passing smoke tests. Scripts include `dev`, `build`, `lint`, `test`, `test:e2e`, `db:migrate`, `db:seed`, and `verify`.
  5. Repository quality tooling includes `.gitignore`, `.editorconfig`, Prettier, lint-staged, Husky pre-commit configuration, and Conventional Commit guidance. No secrets, generated build output, or `any` types are committed.
  6. A multi-stage production Dockerfile and Compose `app` service are present; the app service waits for PostgreSQL health.
  7. Setup and local workflow are documented in `README.md`; dependency versions are locked with pnpm and the project declares Node 22.23.1 and pnpm 11.20.0.
- **Relevant Constraints**: `No product behavior; server-only database access; strict TypeScript; no any; UUID/UTC schema defaults; Zod environment validation; preserve all existing planning documents.`
- **Expected Files or Layers**: `package/tooling configs; src/app; src/components/ui; src/lib/providers; src/server/db; drizzle; tests; public; Dockerfile; compose.yaml; README.md; environment templates.`
- **Targeted Verification**: `pnpm verify; docker compose config; pnpm db:generate or equivalent migration consistency check; migration and seed against healthy PostgreSQL when Docker is available.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `de12250608b3210ec4b4506bfb6176a1360a2eab`
- **Changed Files**: `Project tooling and dependency configuration; tracker landing UI and runtime providers; server-only Drizzle/PostgreSQL foundation; baseline migration and database scripts; Dockerfile and Compose services; Vitest/RTL and Playwright smoke tests; README and environment templates.`
- **Tests Run**: `PASS: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test (2 files/2 tests), docker compose config --quiet, pnpm db:generate consistency, git diff --check, no-any scan. BLOCKED in Generator environment: Playwright Chromium installation, production build port binding, live PostgreSQL migration/seed, Docker service startup.`
- **Known Risks**: `Evaluator must independently verify E2E, production build, live migration/seed, and containers; Generator shell reported Node 26 rather than declared Node 22.23.1.`

## Evaluator Report

- **Verdict**: `PASS`
- **Commit Verified**: `de12250608b3210ec4b4506bfb6176a1360a2eab`
- **Checks Run**: `PASS: clean Prettier, ESLint, TypeScript, Vitest (2/2), Drizzle migration consistency, Docker Compose validation, architecture/timestamp inspection; local Playwright install, healthy development/test PostgreSQL, db:migrate, db:seed, full pnpm verify including E2E and production build.`
- **Findings**: `All F00 acceptance criteria and applicable architectural constraints are satisfied. Independent live-database duplication was sandbox-restricted, while the local full pipeline and healthy service evidence passed.`
- **Required Fix**: `none`

## Current Status

- **Active**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 established the complete application foundation at commit `de12250608b3210ec4b4506bfb6176a1360a2eab`. The Evaluator returned `PASS` after clean static/test checks and a successful local full pipeline with healthy development and test PostgreSQL services.

## Next Step

1. `Orchestrator may select F01 and write its sprint contract when the user is ready to begin product work.`

## Verification Status

- **Build**: `Passing`
- **Lint**: `Passing`
- **Unit/Integration**: `Passing (2 files/2 tests)`
- **E2E**: `Passing`

## Current Session Handoff Report

- **Decisions Made**: `Track initial repository bootstrap as F00 so the lifecycle remains explicit and WIP=1; accept corrected foundation commit de12250608b3210ec4b4506bfb6176a1360a2eab after Evaluator PASS.`
- **Context Summary**: `Runnable Next.js foundation with validated server-only PostgreSQL/Drizzle setup, Docker services, quality tooling, unit/E2E smoke tests, and documented workflow. No product-domain feature is active.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Orchestrator selects F01 when requested.`
