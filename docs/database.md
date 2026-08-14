# Database Standards

## Technical Stack

- **ORM**: Drizzle ORM.
- **Driver**: postgres.js.
- **Schema Management**: Drizzle Kit for migrations.

## Data Invariants

- **Identifiers**: All tables must use **UUIDs** as primary keys for record identifiers.
- **Timestamps**: All stored timestamps must be in **UTC**.
- **Hard Deletion**: Record deletion is permanent; there is no soft-delete mechanism unless specified.
- **Company Names**: Store trimmed names and enforce case-insensitive uniqueness in PostgreSQL.

## Transaction Rules

Operations involving multiple tables or related records must use the `.transaction()` block to ensure ACID compliance.

**Critical paths requiring transactions:**

- Job Application creation (Application + Initial History entry).
- Status changes (Application Update + Status History entry).
- Interview management (Interview Record + Activity History entry).
- Company deletion (Company + related Applications, Interviews, and Activity History).

## Migrations

- Migration files must be committed to the repository and applied explicitly via `pnpm db:migrate`.

## Agent Responsibilities

### Orchestrator

- Include affected invariants and migration requirements in the sprint contract.
- Require migration evidence before accepting schema work.

### Generator

- Keep queries in database query modules.
- Coordinate transactions in Services.
- Add integration tests for changed database behavior.

### Evaluator

- Inspect schema and migration diffs.
- Verify UUID, UTC, server-only, and transaction rules.
- Return `FAIL` for any violated invariant.
