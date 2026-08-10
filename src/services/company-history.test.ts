import { randomUUID } from "node:crypto";

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
  CompanyHistoryNotFoundError,
  listCompanyHistory,
} from "@/services/company-history";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Company history tests require TEST_DATABASE_URL.");
const client = postgres(url, { max: 1 });
const db = drizzle(client);

describe("company history service", () => {
  beforeEach(async () => {
    await db.delete(activityHistory);
    await db.delete(interviews);
    await db.delete(jobApplications);
    await db.delete(companies);
  });

  it("validates input and distinguishes missing from empty companies", async () => {
    await expect(
      listCompanyHistory({ companyId: "bad" }),
    ).rejects.toBeDefined();
    await expect(
      listCompanyHistory({ companyId: randomUUID(), extra: true }),
    ).rejects.toBeDefined();
    await expect(
      listCompanyHistory({ companyId: randomUUID() }),
    ).rejects.toBeInstanceOf(CompanyHistoryNotFoundError);
    const [company] = await db
      .insert(companies)
      .values({ name: "Empty" })
      .returning();
    await expect(
      listCompanyHistory({ companyId: company!.id }),
    ).resolves.toEqual([]);
  });

  it("returns all statuses in ascending deterministic order without crossing companies", async () => {
    const [company, other] = await db
      .insert(companies)
      .values([{ name: "Target" }, { name: "Other" }])
      .returning();
    const instant = new Date("2026-08-10T10:00:00Z");
    const statuses = Object.values(ApplicationStatus);
    await db.insert(jobApplications).values(
      statuses.map((status, index) => ({
        id: `00000000-0000-4000-8000-00000000000${6 - index}`,
        companyId: company!.id,
        positionTitle: status,
        appliedDate: index < 3 ? "2026-08-09" : "2026-08-10",
        status,
        createdAt: instant,
      })),
    );
    await db.insert(jobApplications).values({
      companyId: other!.id,
      positionTitle: "Excluded",
      appliedDate: "2026-08-01",
    });
    const result = await listCompanyHistory({ companyId: company!.id });
    expect(result).toHaveLength(7);
    expect(result.map(({ id }) => id)).toEqual([
      "00000000-0000-4000-8000-000000000004",
      "00000000-0000-4000-8000-000000000005",
      "00000000-0000-4000-8000-000000000006",
      "00000000-0000-4000-8000-000000000000",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
    ]);
    expect(new Set(result.map(({ status }) => status))).toEqual(
      new Set(statuses),
    );
    expect(
      result.some(({ positionTitle }) => positionTitle === "Excluded"),
    ).toBe(false);
  });
});

afterAll(() => client.end());
