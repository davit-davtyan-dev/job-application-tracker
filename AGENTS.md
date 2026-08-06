# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## **Project Overview**

The **Job Application Tracker** is a full-stack web application designed for a single user to track and manage job applications after submission. The core experience involves a list of active applications that can be searched by company name or position title and filtered by status. It provides a chronological history of significant events for each application, such as status changes and interview records.

## **Technical Stack & Versions**

- **Node.js**: `22.23.1`
- **pnpm**: `11.20.0`
- **Framework**: Next.js (App Router), TypeScript (Strict Mode)
- **Database**: PostgreSQL, Drizzle ORM, postgres.js driver
- **API/Data Fetching**: Next.js Route Handlers, TanStack Query
- **Validation**: Zod (for requests, forms, and environment variables)
- **UI/Styles**: Tailwind CSS, shadcn/ui, Lucide icons, date-fns
- **Client State**: Zustand
- **Testing**: Vitest, React Testing Library, Playwright
- **Infrastructure**: Docker Compose for PostgreSQL

## **Orchestration Roles**

### Orchestrator

**Owns** scope, sequencing, task state, handoffs, and acceptance.

Must:

1. Read `AGENTS.md`, `PROGRESS.md`, `FEATURES.md`, and `DECISIONS.md`.
2. Keep exactly one feature active or evaluating.
3. Write the sprint contract in `PROGRESS.md`.
4. Assign work to the Generator.
5. Send the exact Generator commit to the Evaluator.
6. Accept only an Evaluator `PASS` verdict.
7. Update `FEATURES.md`, `PROGRESS.md`, and `DECISIONS.md` when required.

Must not implement product code or issue the verification verdict.

### Generator

**Owns** implementation and feature tests.

Must:

1. Read the active sprint contract.
2. Output a short pre-change plan listing files or layers and tests.
3. Implement only the approved scope.
4. Add or update required tests.
5. Run targeted verification.
6. Produce one logical commit.
7. Report the commit hash, changed files, test results, and known risks.

Must not change project state, expand scope, or grade its own work.

### Evaluator

**Owns** independent verification.

Must:

1. Verify the exact Generator commit in a clean workspace.
2. Check all acceptance criteria and architectural constraints.
3. Run targeted tests and the full completion pipeline.
4. Return exactly one verdict: `PASS`, `FAIL`, or `BLOCKED`.
5. Include command results and precise fix instructions for failures.

Must not modify implementation code or project state.

## **State Ownership**

Only the Orchestrator may change:

- `FEATURES.md` state, owner, or evidence
- `PROGRESS.md` orchestration state
- `DECISIONS.md`

## **Required Lifecycle**

```text
not_started -> active -> evaluating -> passing
                         |-> active after FAIL
                         |-> blocked
```

## **Hard Constraints**

- **WIP=1**: Only one feature may be `active` or `evaluating`; finish or block it before starting another.
- **Context Reset**: If session context exceeds 60% of the window, the agent must stop, perform a clean handoff in PROGRESS.md, and request a session reset to prevent "rushed finish" behavior.
- **Server-Only Database**: All database access must remain in server-only modules; pages and client components must not contain direct queries.
- **Atomic Logic**: Operations updating multiple related records (e.g., status changes and history entries) must use database transactions.
- **No `any`**: The use of the `any` type is prohibited unless explicitly justified.
- **Data Integrity**: All data must be validated on the server with Zod, regardless of client-side checks.
- **Atomic Commits**: Each logical operation (e.g., "add endpoint and update tests") must be a single git commit.

## **Topic Documents**

- **[Feature List](FEATURES.md)**: The machine-readable list of behaviors, verification commands, and states.
- **[Current Progress](PROGRESS.md)**: The state of the current session and next steps.
- **[Architecture & Flow](docs/architecture.md)**: Preferred request flows and layer responsibilities.
- **[Database Rules](docs/database.md)**: UUIDs, UTC timestamps, and migration standards.
- **[Testing Standards](docs/testing.md)**: Requirements for unit, integration, and E2E suites.

## **Project Commands**

- **Install Dependencies**: `pnpm install`
- **Local Development**: `pnpm dev`
- **Start Docker (DB)**: `docker compose up`
- **Run Migrations**: `pnpm db:migrate`
- **Seed Database**: `pnpm db:seed`
- **Linting**: `pnpm lint`
- **Testing (Unit/Integration)**: `pnpm test`
- **Testing (E2E)**: `pnpm test:e2e`
- **Build**: `pnpm build`

## **Startup Readiness Checklist**

1.  [ ] Run `pnpm install` to ensure a clean dependency tree.
2.  [ ] Run `docker compose up` and verify PostgreSQL health.
3.  [ ] Run `pnpm db:seed` to initialize the test environment state.
4.  [ ] Read `PROGRESS.md` and `FEATURES.md` to identify the single active feature.
5.  [ ] Confirm the active sprint contract is complete before Generator work starts.
6.  [ ] Run `pnpm test` on an example test to verify the runner is functional.

## **Clean Handoff Checklist**

1.  [ ] Build passes (`pnpm build`).
2.  [ ] Full pipeline passes (`pnpm lint`, `pnpm test`, `pnpm test:e2e`).
3.  [ ] The Evaluator verdict and verified commit are recorded.
4.  [ ] `PROGRESS.md` is updated and `FEATURES.md` state and evidence are current.
5.  [ ] All temporary artifacts, debug logs, and `TODO` markers are removed.

## **Completion Rule**

A feature is complete only when:

1. The Generator commits the implementation.
2. The Evaluator returns `PASS` for that exact commit.
3. The Orchestrator records the evidence and marks the feature `passing`.
