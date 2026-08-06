import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { systemMetadata } from "../src/server/db/schema";
import { serverEnvironment } from "../src/server/environment";

const sqlClient = postgres(serverEnvironment.DATABASE_URL, { max: 1 });
const database = drizzle(sqlClient);

try {
  await database
    .insert(systemMetadata)
    .values({ key: "foundation", value: "ready" })
    .onConflictDoUpdate({
      target: systemMetadata.key,
      set: {
        updatedAt: sql`now()`,
        value: "ready",
      },
    });
  console.info("Database seed is up to date.");
} catch (error: unknown) {
  console.error(
    "Seed failed. Tests cannot rely on a known database state. Fix: run pnpm db:migrate against a healthy PostgreSQL database, then rerun pnpm db:seed.",
    error,
  );
  process.exitCode = 1;
} finally {
  await sqlClient.end();
}
