# Architecture & Flow

## Layer Responsibilities

To ensure reliable execution and data integrity, the application follows a strict layered domain architecture. Dependencies must flow strictly forward: **Route Handler -> Service -> Database Query**.

### 1. Route Handlers (API Boundary)

- **Primary Role**: Parse incoming HTTP requests using Zod and return standardized JSON responses.
- **Constraint**: Must not contain direct Drizzle queries. Must delegate all business logic to Services.

### 2. Service Layer (Business Logic)

- **Primary Role**: Implement application logic and coordinate database transactions.
- **Transaction Coordination**: Any operation updating multiple related records (e.g., updating an application status AND creating an activity history entry) **MUST** be wrapped in a Drizzle transaction.
- **Validation**: Re-verify all data with Zod regardless of client-side checks.

### 3. Database Query Modules

- **Primary Role**: Contain pure Drizzle/Postgres queries.
- **Constraint**: Must be isolated from Route Handler or UI logic.

## Architectural Boundaries

- **Server-Only Enforcement**: Database access is restricted to server-only modules. Pages and client components are prohibited from direct queries.
- **WIP=1 Enforcement**: Only one feature may be active or evaluating at a time.
- **Sprint Contracts**: Before implementation, the Orchestrator must define the feature ID, exact scope, acceptance criteria, relevant constraints, expected files or layers, and verification commands.
- **State Ownership**: Only the Orchestrator may change task state in `FEATURES.md` or `PROGRESS.md`.

## Agent Orchestration Flow

Agent dependencies flow strictly forward:

```text
Orchestrator -> Generator -> Evaluator -> Orchestrator
```

### Orchestrator

- Selects one feature from `FEATURES.md`.
- Writes the sprint contract in `PROGRESS.md`.
- Assigns implementation to the Generator.
- Sends the exact Generator commit to the Evaluator.
- Marks the feature `passing` only after Evaluator `PASS`.

### Generator

- Implements only the active sprint contract.
- Outputs a brief plan before edits.
- Writes tests with the implementation.
- Produces one logical commit.
- Must not approve its own work or change task state.

### Evaluator

- Verifies the exact Generator commit in a clean workspace.
- Checks acceptance criteria and architectural constraints.
- Runs targeted verification and the full completion pipeline.
- Returns exactly one verdict: `PASS`, `FAIL`, or `BLOCKED`.
- Must not modify implementation code or task state.

### Failure Loop

- `PASS`: Orchestrator records evidence and marks the feature `passing`.
- `FAIL`: Orchestrator returns one bounded correction task to the Generator.
- `BLOCKED`: Orchestrator records the external blocker and stops the feature.
