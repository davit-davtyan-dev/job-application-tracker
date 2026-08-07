import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  activityHistory,
  companies,
  jobApplications,
} from "@/server/db/schema";
import {
  CompanyNotFoundError,
  createApplication,
} from "@/services/application";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("Application integration tests require TEST_DATABASE_URL.");
const client = postgres(url, { max: 1 });
const db = drizzle(client);

describe("createApplication", () => {
  beforeEach(async () => {
    await db.delete(activityHistory);
    await db.delete(jobApplications);
    await db.delete(companies);
  });
  afterAll(() => client.end());

  it("persists an existing-company application and initial history with defaults", async () => {
    const [company] = await db
      .insert(companies)
      .values({ name: "Acme" })
      .returning();
    const created = await createApplication({
      companyId: company!.id,
      positionTitle: "  Engineer  ",
      appliedDate: "2026-08-07",
    });
    expect(created).toMatchObject({
      companyId: company!.id,
      positionTitle: "Engineer",
      status: "Applied",
      description: null,
      notes: null,
      referenceLinks: [],
    });
    const rows = await db
      .select()
      .from(activityHistory)
      .where(eq(activityHistory.applicationId, created.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      eventType: "application_created",
      status: "Applied",
    });
  });

  it("creates an inline company in the same workflow", async () => {
    const created = await createApplication({
      companyName: "  New Co  ",
      positionTitle: "Designer",
      appliedDate: "2026-08-07",
      status: "Interviewing",
      referenceLinks: ["https://example.com/job"],
    });
    expect(created.status).toBe("Interviewing");
    expect(
      (
        await db
          .select()
          .from(companies)
          .where(eq(companies.id, created.companyId))
      )[0]?.name,
    ).toBe("New Co");
  });

  it.each([
    {},
    {
      companyId: randomUUID(),
      companyName: "Both",
      positionTitle: "X",
      appliedDate: "2026-08-07",
    },
    { companyName: "X", positionTitle: " ", appliedDate: "2026-08-07" },
    { companyName: "X", positionTitle: "X", appliedDate: "2026-02-31" },
    {
      companyName: "X",
      positionTitle: "X",
      appliedDate: "2026-08-07",
      status: "Maybe",
    },
    {
      companyName: "X",
      positionTitle: "X",
      appliedDate: "2026-08-07",
      referenceLinks: ["nope"],
    },
    {
      companyName: "X",
      positionTitle: "X",
      appliedDate: "2026-08-07",
      extra: true,
    },
  ])("rejects invalid input without writes: %j", async (input) => {
    await expect(createApplication(input)).rejects.toBeDefined();
    expect(await db.select().from(jobApplications)).toHaveLength(0);
    expect(await db.select().from(activityHistory)).toHaveLength(0);
  });

  it("rejects a missing company without writes", async () => {
    await expect(
      createApplication({
        companyId: randomUUID(),
        positionTitle: "X",
        appliedDate: "2026-08-07",
      }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError);
    expect(await db.select().from(jobApplications)).toHaveLength(0);
  });

  it("rolls back the application when history insertion fails", async () => {
    const [company] = await db
      .insert(companies)
      .values({ name: "Rollback Co" })
      .returning();
    await client`CREATE OR REPLACE FUNCTION reject_f02_history() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced history failure'; END; $$ LANGUAGE plpgsql`;
    await client`CREATE TRIGGER reject_f02_history BEFORE INSERT ON activity_history FOR EACH ROW EXECUTE FUNCTION reject_f02_history()`;
    try {
      await expect(
        createApplication({
          companyId: company!.id,
          positionTitle: "X",
          appliedDate: "2026-08-07",
        }),
      ).rejects.toBeDefined();
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobApplications);
      expect(count).toBe(0);
    } finally {
      await client`DROP TRIGGER reject_f02_history ON activity_history`;
      await client`DROP FUNCTION reject_f02_history()`;
    }
  });
});
