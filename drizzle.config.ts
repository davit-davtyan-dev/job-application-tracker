import { defineConfig } from "drizzle-kit";

import { serverEnvironment } from "./src/server/environment";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dbCredentials: {
    url: serverEnvironment.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
