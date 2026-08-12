import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ApplicationStatus } from "@/lib/application";
import {
  activityHistory,
  companies,
  interviews,
  jobApplications,
} from "@/server/db/schema";
import {
  ApplicationNotFoundError,
  CompanyNotFoundError,
  createApplication,
  listApplications,
  updateApplicationStatus,
} from "@/services/application";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("Application integration tests require TEST_DATABASE_URL.");
const client = postgres(url, { max: 1 });
const db = drizzle(client);

describe("createApplication", () => {
  beforeEach(async () => {
    await db.delete(activityHistory);
    await db.delete(interviews);
    await db.delete(jobApplications);
    await db.delete(companies);
  });

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

describe("listApplications", () => {
  beforeEach(async () => {
    await db.delete(activityHistory);
    await db.delete(interviews);
    await db.delete(jobApplications);
    await db.delete(companies);
  });

  it("returns the exact active projection with company names and deterministic ordering", async () => {
    const [company] = await db
      .insert(companies)
      .values({ name: "List Co" })
      .returning();
    const olderId = "10000000-0000-4000-8000-000000000000";
    const newerId = "20000000-0000-4000-8000-000000000000";
    const applications: (typeof jobApplications.$inferInsert)[] = [
      {
        id: olderId,
        companyId: company!.id,
        positionTitle: "Tie one",
        appliedDate: "2026-08-08",
        status: ApplicationStatus.Applied,
        createdAt: new Date("2026-08-08T10:00:00Z"),
      },
      {
        id: newerId,
        companyId: company!.id,
        positionTitle: "Tie two",
        appliedDate: "2026-08-08",
        status: ApplicationStatus.Offer,
        createdAt: new Date("2026-08-08T10:00:00Z"),
      },
      {
        companyId: company!.id,
        positionTitle: "New date",
        appliedDate: "2026-08-09",
        status: ApplicationStatus.Interviewing,
      },
      ...(
        [
          ApplicationStatus.Accepted,
          ApplicationStatus.Rejected,
          ApplicationStatus.Withdrawn,
          ApplicationStatus.Archived,
        ] as const
      ).map((status) => ({
        companyId: company!.id,
        positionTitle: `Closed ${status}`,
        appliedDate: "2026-08-10",
        status,
      })),
    ];
    await db.insert(jobApplications).values(applications);

    expect(await listApplications()).toEqual([
      {
        id: expect.any(String),
        companyId: company!.id,
        companyName: "List Co",
        positionTitle: "New date",
        appliedDate: "2026-08-09",
        status: "Interviewing",
      },
      {
        id: newerId,
        companyId: company!.id,
        companyName: "List Co",
        positionTitle: "Tie two",
        appliedDate: "2026-08-08",
        status: "Offer",
      },
      {
        id: olderId,
        companyId: company!.id,
        companyName: "List Co",
        positionTitle: "Tie one",
        appliedDate: "2026-08-08",
        status: "Applied",
      },
    ]);
  });

  it("returns an empty list when there are no active applications", async () => {
    expect(await listApplications()).toEqual([]);
  });

  it("searches company or title by trimmed case-insensitive substring while preserving active ordering", async () => {
    const [matchingCompany, otherCompany] = await db
      .insert(companies)
      .values([{ name: "Northstar Labs" }, { name: "Other Company" }])
      .returning();
    const orderedIds = [
      "10000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000002",
    ];
    await db.insert(jobApplications).values([
      {
        id: orderedIds[0],
        companyId: matchingCompany!.id,
        positionTitle: "Engineer",
        appliedDate: "2026-08-08",
        status: ApplicationStatus.Applied,
        createdAt: new Date("2026-08-08T10:00:00Z"),
      },
      {
        id: orderedIds[1],
        companyId: otherCompany!.id,
        positionTitle: "NorthStar platform lead",
        appliedDate: "2026-08-09",
        status: ApplicationStatus.Offer,
      },
      {
        companyId: matchingCompany!.id,
        positionTitle: "Closed match",
        appliedDate: "2026-08-10",
        status: ApplicationStatus.Rejected,
      },
      {
        companyId: otherCompany!.id,
        positionTitle: "Unrelated active",
        appliedDate: "2026-08-11",
        status: ApplicationStatus.Interviewing,
      },
    ]);

    const matches = await listApplications({
      search: "  nOrThStAr  ",
    });
    expect(matches.map(({ id }) => id)).toEqual([orderedIds[1], orderedIds[0]]);
    expect(await listApplications({ search: "no matches" })).toEqual([]);
    expect(await listApplications({ search: "   " })).toHaveLength(3);
  });

  it("rejects overlong or unexpected search criteria before querying", async () => {
    await expect(
      listApplications({ search: "x".repeat(201) }),
    ).rejects.toBeDefined();
    await expect(
      listApplications({ search: "x", unexpected: true }),
    ).rejects.toBeDefined();
  });

  it("returns exactly the closed partition and composes it with search", async () => {
    const [company] = await db
      .insert(companies)
      .values({ name: "Closed Search Co" })
      .returning();
    await db.insert(jobApplications).values([
      ...(
        [
          ApplicationStatus.Accepted,
          ApplicationStatus.Rejected,
          ApplicationStatus.Withdrawn,
          ApplicationStatus.Archived,
        ] as const
      ).map((status, index) => ({
        companyId: company!.id,
        positionTitle: `Closed match ${status}`,
        appliedDate: `2026-08-0${index + 1}`,
        status,
      })),
      {
        companyId: company!.id,
        positionTitle: "Active match",
        appliedDate: "2026-08-09",
        status: ApplicationStatus.Applied,
      },
    ]);

    const closed = await listApplications({ view: "closed" });
    expect(closed.map(({ status }) => status)).toEqual([
      ApplicationStatus.Archived,
      ApplicationStatus.Withdrawn,
      ApplicationStatus.Rejected,
      ApplicationStatus.Accepted,
    ]);
    expect(
      await listApplications({ view: "closed", search: "  WITHDRAWN  " }),
    ).toMatchObject([{ status: ApplicationStatus.Withdrawn }]);
    expect(
      await listApplications({ view: "active", search: "match" }),
    ).toMatchObject([{ status: ApplicationStatus.Applied }]);
    expect(
      await listApplications({ view: "closed", search: "no matches" }),
    ).toEqual([]);
  });

  it.each([{ view: "all" }, { view: "" }, { view: "closed", extra: true }])(
    "rejects invalid view criteria before querying: %j",
    async (input) => {
      await expect(listApplications(input)).rejects.toBeDefined();
    },
  );
});

describe("updateApplicationStatus", () => {
  beforeEach(async () => {
    await db.delete(activityHistory);
    await db.delete(interviews);
    await db.delete(jobApplications);
    await db.delete(companies);
  });

  async function seed(status: ApplicationStatus = ApplicationStatus.Applied) {
    const [company] = await db
      .insert(companies)
      .values({ name: `Status ${randomUUID()}` })
      .returning();
    const [application] = await db
      .insert(jobApplications)
      .values({
        companyId: company!.id,
        positionTitle: "Status role",
        appliedDate: "2026-08-09",
        status,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      })
      .returning();
    return application!;
  }

  it.each(Object.values(ApplicationStatus))(
    "persists %s with exactly one history row",
    async (status) => {
      const original = await seed(
        status === ApplicationStatus.Applied
          ? ApplicationStatus.Offer
          : ApplicationStatus.Applied,
      );
      const transitionStartedAt = new Date();
      const updated = await updateApplicationStatus({
        id: original.id,
        status,
      });
      const transitionFinishedAt = new Date();
      expect(updated.status).toBe(status);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        original.updatedAt.getTime(),
      );
      const rows = await db
        .select()
        .from(activityHistory)
        .where(eq(activityHistory.applicationId, original.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        applicationId: original.id,
        eventType: "status_changed",
        status,
      });
      expect(rows[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        transitionStartedAt.getTime(),
      );
      expect(rows[0]!.createdAt.getTime()).toBeLessThanOrEqual(
        transitionFinishedAt.getTime(),
      );
      expect(rows[0]!.createdAt.toISOString()).toMatch(/Z$/);
    },
  );

  it("is idempotent without timestamp or history churn", async () => {
    const original = await seed(ApplicationStatus.Interviewing);
    const updated = await updateApplicationStatus({
      id: original.id,
      status: ApplicationStatus.Interviewing,
    });
    expect(updated.updatedAt).toEqual(original.updatedAt);
    expect(await db.select().from(activityHistory)).toHaveLength(0);
  });

  it("reports a missing application and validates unknown input", async () => {
    await expect(
      updateApplicationStatus({ id: randomUUID(), status: "Applied" }),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
    expect(await db.select().from(activityHistory)).toHaveLength(0);
    await expect(
      updateApplicationStatus({ id: randomUUID(), status: "Nope" }),
    ).rejects.toBeDefined();
  });

  it("rolls back the status update when history insertion fails", async () => {
    const original = await seed();
    try {
      await client`CREATE OR REPLACE FUNCTION reject_f10_history() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced history failure'; END; $$ LANGUAGE plpgsql`;
      await client`CREATE TRIGGER reject_f10_history BEFORE INSERT ON activity_history FOR EACH ROW EXECUTE FUNCTION reject_f10_history()`;
      await expect(
        updateApplicationStatus({ id: original.id, status: "Rejected" }),
      ).rejects.toBeDefined();
      const [persisted] = await db
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.id, original.id));
      expect(persisted!.status).toBe("Applied");
      expect(persisted!.updatedAt).toEqual(original.updatedAt);
      expect(await db.select().from(activityHistory)).toHaveLength(0);
    } finally {
      await client`DROP TRIGGER IF EXISTS reject_f10_history ON activity_history`;
      await client`DROP FUNCTION IF EXISTS reject_f10_history()`;
    }
  });
});

afterAll(() => client.end());
