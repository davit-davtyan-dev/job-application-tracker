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

- **Decision**: Define the fixed job-application status vocabulary once as the string `ApplicationStatus` enum and reuse it across Drizzle, Zod, and UI options. Construct structured Route Handler errors through the shared `src/app/api/responses.ts` utility.
- **Reasoning**: The installed Drizzle and Zod versions accept enum objects directly, so an `as const` tuple adds no required capability. A single enum prevents status vocabulary drift across persistence, validation, and rendering. Centralizing the common API error envelope removes duplicated response construction while preserving route-specific codes, messages, issues, and statuses.

### 2026-08-10: Atomic and Idempotent Application Status Mutation

- **Decision**: Update one application's status through a dedicated status endpoint. Allow direct movement to any shared `ApplicationStatus`. For a real change, atomically update the application and append exactly one `status_changed` activity-history row; treat a same-status request as a successful no-op without history or `updated_at` churn.
- **Reasoning**: Direct transitions match the single-user tracker scope without introducing an unrequested workflow policy. The transaction preserves the required status/history invariant, while idempotent same-status requests avoid misleading duplicate activity and timestamp changes. Invalidating the application query root lets existing Active/Closed and search caches settle consistently after a mutation.

### 2026-08-10: Minimal Interview Records and Serialized Database Tests

- **Decision**: Model each interview as an application-owned record with a required UTC scheduled time and one fixed state (`Scheduled`, `Completed`, or `Cancelled`). Allow direct state changes, atomically record each real interview event in activity history, and treat same-state updates as idempotent. Serialize Vitest files because PostgreSQL integration suites share one database and install global failure triggers.
- **Reasoning**: The minimal record satisfies the product brief without prematurely introducing interview rounds or auxiliary metadata. Transactions preserve interview/history integrity and direct states match the existing unrestricted status model. File serialization prevents destructive cleanup and test-only triggers from crossing integration-file boundaries; isolated schemas would add disproportionate infrastructure complexity at the current suite size.

### 2026-08-10: Immutable Application-Scoped Activity Timeline

- **Decision**: Treat activity history as an immutable application-owned audit trail with one shared fixed event vocabulary for application creation, real application-status changes, interview scheduling, interview completion, and interview cancellation. Expose it through an application-scoped read-only service/API and per-card chronological timeline; refresh only the affected application's history cache after related mutations.
- **Reasoning**: A typed vocabulary prevents writer, validation, and presentation drift while preserving the existing atomic transaction guarantees. Application-scoped reads keep F08 bounded and cache invalidation precise; cross-application company history remains a separate F09 concern. Immutable, deterministic UTC ordering provides reliable audit evidence without introducing manual history editing or ambiguous derived events.

### 2026-08-10: Company History as a Shared Application Timeline

- **Decision**: Represent company history as a read-only company-scoped chronological list of all persisted applications, ordered by applied date, creation timestamp, and UUID. Expose position, applied date, and current status from existing application cards; use one TanStack Query cache per company and invalidate it only when an application is created or its status really changes.
- **Reasoning**: The product goal is to review prior roles at the same company before another application, which requires application summaries rather than duplicating the F08 activity-event audit trail. A company UUID prevents ambiguous name lookup, deterministic ordering makes the timeline stable, and shared company-scoped caching keeps multiple cards consistent while avoiding unrelated or interview-driven refetches.

### 2026-08-10: Exact Status Refinement Within Application Views

- **Decision**: Add an accessible exact-status filter beneath Active (All, Applied, Interviewing, Offer) and Closed (All, Accepted, Rejected, Withdrawn, Archived). All is the default and resets on view changes while search persists. Validate view/status combinations; keep All UI-only.
- **Reasoning**: This preserves existing aggregate views while enabling precise filtering. Resetting avoids cross-view status leakage, and a subordinate keyboard-operable control maintains a clear, accessible hierarchy.

### 2026-08-13: Safe Markdown Presentation Boundary

- **Decision**: Keep job descriptions, application notes, and company notes as raw Markdown in persistence and transport, and render them through one reusable `react-markdown` boundary. Skip embedded raw HTML and retain the renderer's safe URL transformation so active HTML and unsafe link protocols do not enter the DOM.
- **Reasoning**: A single presentation boundary gives all Markdown fields consistent semantic output and security behavior without changing write contracts or storing derived HTML. Allowing raw HTML with a sanitizer would add unnecessary parsing surface and dependencies for the current product; custom Markdown parsing would duplicate mature library behavior and carry greater correctness and security risk.
