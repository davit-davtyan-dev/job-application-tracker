import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { ApplicationStatus } from "@/lib/application";
import {
  activityHistory,
  companies,
  interviews,
  jobApplications,
} from "@/server/db/schema";
import {
  CompanyNameConflictError,
  CompanyNotFoundError,
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany,
} from "@/services/company";

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

  it("enforces case-insensitive uniqueness and allows an unchanged self-rename", async () => {
    const name = `Unique ${randomUUID()}`;
    const created = await createCompany({ name, notes: " one " });

    await expect(
      createCompany({ name: name.toUpperCase() }),
    ).rejects.toBeInstanceOf(CompanyNameConflictError);
    await expect(
      updateCompany({ id: created.id, name, notes: " updated " }),
    ).resolves.toMatchObject({ name, notes: "updated" });

    await testDatabase.delete(companies).where(eq(companies.id, created.id));
  });

  it("lists companies in deterministic case-insensitive name order", async () => {
    const suffix = randomUUID();
    const created = await Promise.all([
      createCompany({ name: `zulu ${suffix}` }),
      createCompany({ name: `Alpha ${suffix}` }),
    ]);

    const listed = (await listCompanies()).filter((company) =>
      company.name.endsWith(suffix),
    );
    expect(listed.map(({ name }) => name)).toEqual([
      `Alpha ${suffix}`,
      `zulu ${suffix}`,
    ]);

    await testDatabase
      .delete(companies)
      .where(eq(companies.id, created[0]!.id));
    await testDatabase
      .delete(companies)
      .where(eq(companies.id, created[1]!.id));
  });

  it("rejects invalid and missing updates without inappropriate writes", async () => {
    await expect(
      updateCompany({ id: "bad", name: "Valid" }),
    ).rejects.toBeDefined();
    await expect(
      updateCompany({ id: randomUUID(), name: "Valid" }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError);
  });

  it("deletes only the selected company's complete ownership tree", async () => {
    const selected = await createCompany({ name: `Delete ${randomUUID()}` });
    const isolated = await createCompany({ name: `Keep ${randomUUID()}` });
    const [{ id: selectedApplicationId }] = await testDatabase
      .insert(jobApplications)
      .values({
        companyId: selected.id,
        positionTitle: "Engineer",
        appliedDate: "2026-08-14",
      })
      .returning({ id: jobApplications.id });
    const [{ id: isolatedApplicationId }] = await testDatabase
      .insert(jobApplications)
      .values({
        companyId: isolated.id,
        positionTitle: "Designer",
        appliedDate: "2026-08-14",
      })
      .returning({ id: jobApplications.id });
    const [{ id: interviewId }] = await testDatabase
      .insert(interviews)
      .values({
        applicationId: selectedApplicationId!,
        scheduledAt: new Date("2026-08-15T12:00:00Z"),
      })
      .returning({ id: interviews.id });
    await testDatabase.insert(activityHistory).values({
      applicationId: selectedApplicationId!,
      interviewId,
      eventType: "interview_scheduled",
      status: ApplicationStatus.Applied,
    });

    await expect(deleteCompany(selected.id)).resolves.toMatchObject({
      id: selected.id,
    });
    const [{ count: selectedRows }] = await sqlClient<
      { count: number }[]
    >`SELECT (
      (SELECT count(*) FROM companies WHERE id = ${selected.id}) +
      (SELECT count(*) FROM job_applications WHERE company_id = ${selected.id}) +
      (SELECT count(*) FROM interviews WHERE application_id = ${selectedApplicationId}) +
      (SELECT count(*) FROM activity_history WHERE application_id = ${selectedApplicationId})
    )::int AS count`;
    expect(selectedRows).toBe(0);
    expect(
      await testDatabase
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.id, isolatedApplicationId!)),
    ).toHaveLength(1);

    await testDatabase
      .delete(jobApplications)
      .where(eq(jobApplications.id, isolatedApplicationId!));
    await testDatabase.delete(companies).where(eq(companies.id, isolated.id));
  });
});
