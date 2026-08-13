import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ActivityEventType } from "@/lib/history";
import { ApplicationStatus } from "@/lib/application";
import {
  activityHistory,
  companies,
  interviews,
  jobApplications,
} from "@/server/db/schema";
import {
  ApplicationNotFoundError,
  listApplicationHistory,
} from "@/services/history";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("History integration tests require TEST_DATABASE_URL.");
const client = postgres(url, { max: 1 });
const db = drizzle(client);

describe("history service", () => {
  beforeEach(async () => {
    await db.delete(activityHistory);
    await db.delete(interviews);
    await db.delete(jobApplications);
    await db.delete(companies);
  });

  it("validates and returns all five linked UTC event shapes in deterministic order", async () => {
    const [company] = await db
      .insert(companies)
      .values({ name: `History ${randomUUID()}` })
      .returning();
    const [application] = await db
      .insert(jobApplications)
      .values({
        companyId: company!.id,
        positionTitle: "History role",
        appliedDate: "2026-08-10",
        status: ApplicationStatus.Offer,
      })
      .returning();
    const [interview] = await db
      .insert(interviews)
      .values({
        applicationId: application!.id,
        scheduledAt: new Date("2026-08-12T10:00:00Z"),
      })
      .returning();
    const instant = new Date("2026-08-10T10:00:00Z");
    const events = Object.values(ActivityEventType);
    await db.insert(activityHistory).values(
      events.map((eventType, index) => ({
        id: `00000000-0000-4000-8000-00000000000${4 - index}`,
        applicationId: application!.id,
        interviewId: eventType.startsWith("interview_") ? interview!.id : null,
        eventType,
        status: ApplicationStatus.Offer,
        createdAt: instant,
      })),
    );
    const result = await listApplicationHistory({
      applicationId: application!.id,
    });
    expect(result.map(({ id }) => id)).toEqual([
      "00000000-0000-4000-8000-000000000000",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000004",
    ]);
    expect(new Set(result.map(({ eventType }) => eventType))).toEqual(
      new Set(events),
    );
    expect(result.every(({ createdAt }) => createdAt.endsWith("Z"))).toBe(true);
    expect(result.filter(({ interviewId }) => interviewId)).toHaveLength(3);
  });

  it("rejects strict invalid input and distinguishes missing applications", async () => {
    for (const input of [
      {},
      { applicationId: "bad" },
      { applicationId: 42 },
      { applicationId: randomUUID(), extra: true },
    ]) {
      await expect(listApplicationHistory(input)).rejects.toBeDefined();
    }
    await expect(
      listApplicationHistory({ applicationId: randomUUID() }),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });
});

afterAll(() => client.end());
