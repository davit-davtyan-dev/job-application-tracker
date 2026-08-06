# Job Application Tracker

A single-user Next.js application for tracking job applications after submission. The repository currently contains the verified application foundation; product workflows are delivered feature by feature.

## Requirements

- Node.js `22.23.1`
- pnpm `11.20.0`
- Docker Engine with Docker Compose

Corepack can activate the pinned package manager:

```bash
corepack enable
corepack prepare pnpm@11.20.0 --activate
```

## Local setup

Install the locked dependencies and create a local environment file:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Start the development and test PostgreSQL services, then initialize the development database:

```bash
docker compose up -d postgres postgres-test
pnpm db:migrate
pnpm db:seed
```

Start the application at [http://localhost:3000](http://localhost:3000):

```bash
pnpm dev
```

The seed command is idempotent and may be rerun whenever a known foundation state is required. To target the test database, set `DATABASE_URL` to the value documented as `TEST_DATABASE_URL` in `.env.example` before running migration or seed commands.

## Database workflow

Schema definitions live in `src/server/db/schema.ts`; database access lives under `src/server/` and must never be imported by client components. After a schema change:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Commit generated migrations under `drizzle/`. Identifiers use PostgreSQL UUID defaults and stored timestamps use UTC-aware columns.

## Verification

Run an individual layer while developing:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Run the complete local completion pipeline with:

```bash
pnpm verify
```

Playwright starts the Next.js development server automatically. Install its Chromium binary once if it is not already available:

```bash
pnpm exec playwright install chromium
```

## Containers

`docker compose up --build` starts PostgreSQL and the production Next.js container. The app service starts only after PostgreSQL passes its health check. Development data is stored in the named `postgres_data` volume; test data is intentionally ephemeral.

## Code quality and commits

Prettier, ESLint, strict TypeScript, Vitest, and Playwright form the quality gate. Husky runs lint-staged before commits. Use Conventional Commit messages, for example:

```text
feat(applications): add application creation
fix(database): preserve status history transaction
chore(tooling): update test configuration
```

Do not commit `.env.local`, secrets, build output, coverage, or browser-test artifacts.
