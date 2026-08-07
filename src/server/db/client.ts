import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnvironment } from "@/server/env";

import * as schema from "./schema";

const createClient = () =>
  postgres(
    serverEnvironment.NODE_ENV === "test" && serverEnvironment.TEST_DATABASE_URL
      ? serverEnvironment.TEST_DATABASE_URL
      : serverEnvironment.DATABASE_URL,
    {
      max: serverEnvironment.NODE_ENV === "production" ? 10 : 1,
    },
  );

type SqlClient = ReturnType<typeof createClient>;

const globalDatabase = globalThis as typeof globalThis & {
  jobTrackerSql?: SqlClient;
};

export const sqlClient = globalDatabase.jobTrackerSql ?? createClient();

if (serverEnvironment.NODE_ENV !== "production") {
  globalDatabase.jobTrackerSql = sqlClient;
}

export const database = drizzle(sqlClient, { schema });
