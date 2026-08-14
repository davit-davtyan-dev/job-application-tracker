# Job Application Tracker — Technical Context

## Application Architecture

Job Application Tracker is a full-stack Next.js application written in TypeScript.

The application uses:

- Next.js App Router
- React Server Components for initial rendering
- Next.js Route Handlers as the primary JSON API boundary
- TanStack Query for client-side data fetching, caching, and mutations
- PostgreSQL for persistent data storage

Server Actions may be used selectively when they provide a clear implementation benefit.

## Database

The database layer uses:

- PostgreSQL
- Drizzle ORM
- `postgres.js` as the PostgreSQL driver
- UUIDs for record identifiers
- UTC for stored timestamps

Database migrations are committed to the repository and applied explicitly.

Deletion permanently removes records.

Operations that update multiple related records must use database transactions. This includes operations such as changing a job application's status and creating the corresponding activity-history entry.

## Server-Side Structure

All database access must remain in server-only modules.

The preferred request flow is:

```text
Route Handler → Service → Database query module
```

Responsibilities:

- Route handlers parse requests and return API responses.
- Services implement application logic and coordinate transactions.
- Database query modules contain Drizzle queries.

Pages, client components, and route handlers must not contain direct database queries.

## Validation and Forms

Zod is used for:

- Request validation
- Form validation
- Environment-variable validation
- Shared domain input schemas where practical

All data must be validated again on the server, regardless of client-side validation.

Forms use:

- React Hook Form
- Zod
- `@hookform/resolvers`

Route Handlers use a consistent success and error response structure. Unexpected errors return a generic client-facing message while detailed information is written only to server logs.

## Client State

TanStack Query is the source of truth for persisted server data.

Zustand is used for interface state such as:

- Search and filters
- Drawer and modal state
- Table preferences
- View preferences

Zustand-managed state is persisted in browser storage by default.

## UI Foundation

The UI uses:

- Tailwind CSS
- shadcn/ui
- Lucide icons
- `date-fns`
- Dark-mode support

Reusable UI components are separated from feature-specific components.

## Content Storage

Job descriptions and notes are stored as Markdown.

Markdown content must be rendered safely before display.

## Company Management

`/companies` supports creating, renaming, editing Markdown notes, and confirmed deletion. Names are case-insensitively unique; deletion atomically removes related applications, interviews, and activity history.

## Testing

The project includes:

- Unit tests
- Component tests
- API and integration tests
- End-to-end tests

Testing tools:

- Vitest for unit and integration tests
- React Testing Library for component tests
- Playwright for end-to-end tests
- A dedicated PostgreSQL test database for integration tests

The initial end-to-end suite covers:

1. Creating a job application
2. Searching for a job application
3. Changing a job application's status
4. Adding an interview
5. Viewing a company's job-application history
6. Creating, editing, and permanently deleting companies

## Agent Orchestration

The project uses exactly three permanent agents:

```text
Orchestrator -> Generator -> Evaluator -> Orchestrator
```

- **Orchestrator** owns scope, sequencing, task state, handoffs, and acceptance.
- **Generator** owns implementation and feature tests.
- **Evaluator** owns the independent verification verdict.

Only one feature may be active or evaluating. The Evaluator must verify a clean checkout of the exact Generator commit.

Coordination sources:

- `AGENTS.md`: role rules and authority
- `FEATURES.md`: feature state and verification evidence
- `PROGRESS.md`: active sprint contract and reports
- `DECISIONS.md`: durable decisions

## Code Quality

The project uses:

- `pnpm`
- TypeScript strict mode
- ESLint
- Prettier
- Automatic import sorting
- Husky
- lint-staged
- Conventional Commits

The use of `any` is prohibited unless it is explicitly justified.

Pre-commit checks run formatting and linting against staged files.

## Environment Configuration

The supported environments are:

- Development
- Test
- Production

Environment variables are validated with Zod at application startup.

The repository includes an `.env.example` file containing every required variable without secret values.

## Logging

The application uses structured server-side console logging.

Logs must not contain sensitive content such as job descriptions or notes.

## Docker

Docker Compose defines separate services for:

- Next.js
- PostgreSQL

During normal development, PostgreSQL runs in Docker while Next.js runs on the host for faster hot reloading.

Docker Compose also supports running the complete application stack for production-like testing.

The Next.js service uses a multi-stage production Dockerfile.

PostgreSQL data is stored in a named Docker volume.

The PostgreSQL service includes a health check, and the Next.js service waits for the database to become healthy before starting.

## Project Commands

The project provides commands equivalent to:

```text
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm db:migrate
docker compose up
```

## Repository Organization

This is a single-application repository.

A suggested high-level organization is:

```text
src/
  app/
  components/
  features/
  lib/
  server/
docs/
tests/
drizzle/
agents/
```

Domain-specific code should be grouped by feature. Shared UI components should remain separate from feature-specific components.

Generated Drizzle migration files live in the top-level `drizzle/` directory.

## External Dependencies

Core application functionality must work without depending on third-party APIs.

## Browser Support

The application supports the latest two versions of:

- Chrome
- Firefox
- Safari
- Edge
