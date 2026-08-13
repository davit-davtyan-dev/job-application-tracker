import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { companies } from "@/server/db/schema";
import { createCompany } from "@/services/company";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "Company integration tests require TEST_DATABASE_URL. Fix: define it in .env.test and rerun the test command.",
  );
}

const sqlClient = postgres(testDatabaseUrl, { max: 1 });
const testDatabase = drizzle(sqlClient);

describe("createCompany", () => {
  afterAll(async () => {
    await sqlClient.end();
  });

  it("trims the name and persists omitted notes as null", async () => {
    const name = `Acme ${randomUUID()}`;

    const created = await createCompany({ name: `  ${name}  ` });
    const [stored] = await testDatabase
      .select()
      .from(companies)
      .where(eq(companies.id, created.id));

    expect(created).toMatchObject({ name, notes: null });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
    expect(stored).toEqual(created);

    await testDatabase.delete(companies).where(eq(companies.id, created.id));
  });

  it.each([
    {},
    { name: "   " },
    { name: 42 },
    { name: "Valid", notes: 42 },
    { name: "Valid", extra: true },
  ])(
    "rejects malformed input without inserting a record: %j",
    async (input) => {
      const [{ countBefore }] = await sqlClient<
        { countBefore: number }[]
      >`SELECT count(*)::int AS "countBefore" FROM companies`;

      await expect(createCompany(input)).rejects.toBeDefined();

      const [{ countAfter }] = await sqlClient<
        { countAfter: number }[]
      >`SELECT count(*)::int AS "countAfter" FROM companies`;
      expect(countAfter).toBe(countBefore);
    },
  );
});
