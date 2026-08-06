# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `active`
- **Active Feature**: `F00`
- **Generator Commit**: `none`
- **Evaluator Verdict**: `pending`

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

- **Commit**: `[hash]`
- **Changed Files**: `[paths]`
- **Tests Run**: `[commands and results]`
- **Known Risks**: `[none or exact risks]`

## Evaluator Report

- **Verdict**: `PASS | FAIL | BLOCKED`
- **Commit Verified**: `[hash]`
- **Checks Run**: `[commands and results]`
- **Findings**: `[none or exact failures]`
- **Required Fix**: `[none or one bounded correction]`

## Current Status

- **Active**: `F00 — project foundation bootstrap`
- **Completed**: `none`
- **Blocked**: `none`

## Current Session Summary

The repository began with planning documents only and was not yet initialized as Git. Required Node, pnpm, Docker, and Docker Compose versions are available locally.

## Next Step

1. `Generator implements and commits the F00 sprint contract.`

## Verification Status

- **Build**: `Passing | Failing | Not Run`
- **Lint**: `Passing | Failing | Not Run`
- **Unit/Integration**: `Passing | Failing | Not Run`
- **E2E**: `Passing | Failing | Not Run`

## Current Session Handoff Report

- **Decisions Made**: `Track initial repository bootstrap as F00 so the lifecycle remains explicit and WIP=1.`
- **Context Summary**: `Empty application repository; exact setup contract above.`
- **Remaining Blockers**: `none known`
- **Next Owner**: `Generator`
