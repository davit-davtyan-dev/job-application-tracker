# DECISIONS.md

## Usage Instructions for Agents

- **Read Before Refactoring**: Consult this log before changing existing patterns to understand their original intent.
- **Durable Knowledge**: Any design choice that must survive across sessions (e.g., library choice, API structure) must be recorded here.
- **Format**: Each entry must include the **Date**, the **Decision**, and the **Reasoning** (including rejected alternatives).
- **Ownership**: Only the Orchestrator may edit this file.

## Log

### 2024-08-04: Service Layer Implementation

- **Decision**: Introduce a Service Layer between Route Handlers and Database Query modules.
- **Reasoning**: To encapsulate business logic and coordinate Drizzle transactions. This ensures that operations like status changes and history logging are atomic and prevents direct DB queries in UI components.

### 2024-08-04: Standardized Identifiers

- **Decision**: Use UUIDs for all primary keys.
- **Reasoning**: To ensure global uniqueness and simplify data synchronization across environments.

### 2024-08-04: Testing Framework Selection

- **Decision**: Use Vitest for unit/integration and Playwright for E2E.
- **Reasoning**: Aligns with Next.js ecosystem and provides the required system-level verification needed to close the "Verification Gap".

### 2026-08-06: Three-Agent Orchestration

- **Decision**: Use exactly three permanent agents: Orchestrator, Generator, and Evaluator.
- **Reasoning**: Separates scope control, implementation, and independent verification while preserving WIP=1.

### 2026-08-06: Foundation Tracked as F00

- **Decision**: Treat initial application and tooling bootstrap as feature F00 before starting product feature F01.
- **Reasoning**: The empty repository needs a reproducible, independently verified platform first. Tracking it explicitly preserves WIP=1 and prevents foundational setup from being mixed into the first domain feature.

### 2026-08-07: Shared Application Status and API Error Primitives

- **Decision**: Reuse one string `ApplicationStatus` enum across Drizzle, Zod, and UI options, and build Route Handler errors with `src/app/api/responses.ts`.
- **Reasoning**: Shared primitives prevent vocabulary and response-shape drift. An `as const` tuple was unnecessary because Drizzle and Zod accept the enum directly.

### 2026-08-10: Atomic and Idempotent Application Status Mutation

- **Decision**: Use a dedicated endpoint for unrestricted status changes; atomically record one history event for real changes and treat same-status requests as no-ops.
- **Reasoning**: This preserves status/history integrity without imposing an unrequested transition policy or creating duplicate history and timestamp churn.

### 2026-08-10: Minimal Interview Records and Serialized Database Tests

- **Decision**: Store application-owned interviews with a UTC schedule and fixed state; record real state changes atomically and serialize database-backed Vitest files.
- **Reasoning**: The minimal model avoids premature metadata, while transactions preserve history integrity. Serialization prevents shared-database interference; isolated schemas were disproportionate for the suite size.

### 2026-08-10: Immutable Application-Scoped Activity Timeline

- **Decision**: Keep activity history as an immutable, application-scoped audit trail with a shared event vocabulary, deterministic UTC ordering, and read-only per-card access.
- **Reasoning**: This prevents event drift and provides reliable audit evidence without manual editing. Company-wide history remains a separate concern.

### 2026-08-10: Company History as a Shared Application Timeline

- **Decision**: Show company history as a read-only, deterministically ordered list of application summaries, identified and cached by company UUID.
- **Reasoning**: Application summaries support reviewing prior roles without duplicating activity events. UUID lookup avoids ambiguous names; interview changes need no refetch.

### 2026-08-10: Exact Status Refinement Within Application Views

- **Decision**: Add a subordinate `aria-pressed` exact-status button group to Active and Closed views; keep All UI-only, reset it on view changes, and preserve search.
- **Reasoning**: This adds precise filtering without status leakage or changing aggregate views. A select was rejected because visible buttons match the existing controls.

### 2026-08-13: Safe Markdown Presentation Boundary

- **Decision**: Store and transport raw Markdown, rendering all supported fields through one reusable `react-markdown` boundary without raw HTML or unsafe URLs.
- **Reasoning**: This centralizes safe rendering without changing write contracts or storing HTML. Sanitized raw HTML and custom parsing add unnecessary complexity and risk.

### 2026-08-14: Dedicated Company Management and Ownership-Tree Deletion

- **Decision**: Manage companies on `/companies`, enforce case-insensitive name uniqueness, and make confirmed deletion atomically remove all related application data.
- **Reasoning**: This keeps shared records discoverable and unambiguous while preventing partial deletion. Blocking deletion and soft deletion were rejected in favor of the requested permanent cascade.
