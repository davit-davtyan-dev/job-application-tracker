# Testing Standards

## Verification Hierarchy

Only a full pipeline run counts as real verification. A task is not "Done" until it passes all three layers:

1. **Static Analysis**: `pnpm lint` and TypeScript strict checks pass.
2. **Behavioral Verification**: Unit and integration tests pass via `pnpm test`.
3. **System-Level Confirmation**: End-to-end flows pass via `pnpm test:e2e`.

## Tooling & Mandates

- **End-to-End**: Use the **Playwright MCP** to interact with the application like a real user.
- **Environment Seeding**: Run `pnpm db:seed` to reset the PostgreSQL test database to a known state before running integration or E2E suites.

## Agent Verification Responsibilities

### Generator

- Add tests with the implementation.
- Run the feature verification command from `FEATURES.md`.
- Run directly affected regression tests.
- Report exact commands and results.
- Must not issue a completion verdict.

### Evaluator

- Verify the exact Generator commit in a clean workspace.
- Run the feature verification command.
- Check architectural and database invariants.
- Run `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.
- Must not modify implementation code.

### Orchestrator

- Accept only an Evaluator `PASS` verdict.
- Record the verified commit and verdict in `FEATURES.md` and `PROGRESS.md`.

## Evaluator Verdicts

- `PASS`: all required checks pass and every acceptance criterion is met.
- `FAIL`: implementation, test, architecture, or acceptance failure.
- `BLOCKED`: verification cannot run because of an external environment failure.

Any required command failure prevents `PASS`.

## Agent-Oriented Error Messages

When creating new tests or scripts that an agent might trigger, error messages must include three elements: what went wrong, why it is an architectural violation, and specific fix instructions.
_Example_: "FAILED: Direct database query found in [File]. Reason: Violates Layered Architecture. Fix: Move the query to a dedicated module in `src/db/` and call it from the Service layer."

## Initial E2E Suite Requirements

Every new feature must be added to the Playwright suite, ensuring the following flows remain functional:

- Application Creation
- Search & Filter
- Status Transitions
- Interview Records
- Company History
