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
