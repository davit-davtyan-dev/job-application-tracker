import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnvironment } from "../src/server/environment";

const sqlClient = postgres(serverEnvironment.DATABASE_URL, { max: 1 });
const database = drizzle(sqlClient);

try {
  await migrate(database, { migrationsFolder: "drizzle" });
  console.info("Database migrations are up to date.");
} catch (error: unknown) {
  console.error(
    "Migration failed. The database schema cannot be trusted until every committed migration applies. Fix: verify DATABASE_URL, start PostgreSQL, and rerun pnpm db:migrate.",
    error,
  );
  process.exitCode = 1;
} finally {
  await sqlClient.end();
}
