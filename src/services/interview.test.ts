import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ApplicationStatus } from "@/lib/application";
import { InterviewStatus } from "@/lib/interview";
import {
  activityHistory,
  companies,
  interviews,
  jobApplications,
} from "@/server/db/schema";
import {
  ApplicationNotFoundError,
  createInterview,
  InterviewNotFoundError,
  listInterviews,
  updateInterviewStatus,
} from "@/services/interview";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("Interview integration tests require TEST_DATABASE_URL.");
const client = postgres(url, { max: 1 });
const db = drizzle(client);

async function seedApplication(status = ApplicationStatus.Interviewing) {
  const [company] = await db
    .insert(companies)
    .values({ name: `Interview ${randomUUID()}` })
    .returning();
  const [application] = await db
    .insert(jobApplications)
    .values({
      companyId: company!.id,
      positionTitle: "Interview role",
      appliedDate: "2026-08-10",
      status,
    })
    .returning();
  return application!;
}

describe("interview service", () => {
  beforeEach(async () => {
    await db.delete(activityHistory);
    await db.delete(interviews);
    await db.delete(jobApplications);
    await db.delete(companies);
  });

  it("creates scheduled interviews with UTC database timestamps and lists deterministically", async () => {
    const application = await seedApplication(ApplicationStatus.Offer);
    const later = await createInterview({
      applicationId: application.id,
      scheduledAt: "2026-08-12T13:30:00+04:00",
    });
    const earlier = await createInterview({
      applicationId: application.id,
      scheduledAt: "2026-08-11T08:00:00Z",
    });
    expect(later).toMatchObject({
      applicationId: application.id,
      status: InterviewStatus.Scheduled,
    });
    expect(later.scheduledAt.toISOString()).toBe("2026-08-12T09:30:00.000Z");
    expect(later.createdAt.toISOString()).toMatch(/Z$/);
    expect(
      (await listInterviews({ applicationId: application.id })).map(
        ({ id }) => id,
      ),
    ).toEqual([earlier.id, later.id]);
    const history = await db
      .select()
      .from(activityHistory)
      .where(eq(activityHistory.applicationId, application.id));
    expect(history).toHaveLength(2);
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          interviewId: later.id,
          eventType: "interview_scheduled",
          status: "Offer",
        }),
        expect.objectContaining({
          interviewId: earlier.id,
          eventType: "interview_scheduled",
          status: "Offer",
        }),
      ]),
    );
  });

  it.each([
    {},
    { applicationId: "bad", scheduledAt: "2026-08-10T10:00:00Z" },
    { applicationId: randomUUID(), scheduledAt: "2026-08-10" },
    {
      applicationId: randomUUID(),
      scheduledAt: "2026-08-10T10:00:00",
      extra: true,
    },
    { applicationId: 42, scheduledAt: "2026-08-10T10:00:00Z" },
    { applicationId: randomUUID(), scheduledAt: 42 },
  ])(
    "rejects strict invalid creation input without mutation: %j",
    async (input) => {
      await expect(createInterview(input)).rejects.toBeDefined();
      expect(await db.select().from(interviews)).toHaveLength(0);
    },
  );

  it("handles missing applications and ownership mismatches", async () => {
    await expect(
      createInterview({
        applicationId: randomUUID(),
        scheduledAt: "2026-08-10T10:00:00Z",
      }),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
    const owner = await seedApplication();
    const other = await seedApplication();
    const interview = await createInterview({
      applicationId: owner.id,
      scheduledAt: "2026-08-10T10:00:00Z",
    });
    await expect(
      updateInterviewStatus({
        applicationId: other.id,
        interviewId: interview.id,
        status: "Completed",
      }),
    ).rejects.toBeInstanceOf(InterviewNotFoundError);
    await expect(
      updateInterviewStatus({
        applicationId: owner.id,
        interviewId: randomUUID(),
        status: "Completed",
      }),
    ).rejects.toBeInstanceOf(InterviewNotFoundError);
  });

  it.each(Object.values(InterviewStatus))(
    "changes to %s with one matching history row without changing application status",
    async (status) => {
      const application = await seedApplication(ApplicationStatus.Offer);
      const interview = await createInterview({
        applicationId: application.id,
        scheduledAt: "2026-08-10T10:00:00Z",
      });
      await db.delete(activityHistory);
      if (status === InterviewStatus.Scheduled)
        await db
          .update(interviews)
          .set({ status: InterviewStatus.Completed })
          .where(eq(interviews.id, interview.id));
      const updated = await updateInterviewStatus({
        applicationId: application.id,
        interviewId: interview.id,
        status,
      });
      expect(updated.status).toBe(status);
      const history = await db.select().from(activityHistory);
      expect(history).toEqual([
        expect.objectContaining({
          interviewId: interview.id,
          eventType: `interview_${status.toLowerCase()}`,
          status: "Offer",
        }),
      ]);
      expect(
        (
          await db
            .select()
            .from(jobApplications)
            .where(eq(jobApplications.id, application.id))
        )[0]!.status,
      ).toBe("Offer");
    },
  );

  it("keeps same-state requests idempotent without history or timestamp churn", async () => {
    const application = await seedApplication();
    const interview = await createInterview({
      applicationId: application.id,
      scheduledAt: "2026-08-10T10:00:00Z",
    });
    await db.delete(activityHistory);
    const updated = await updateInterviewStatus({
      applicationId: application.id,
      interviewId: interview.id,
      status: InterviewStatus.Scheduled,
    });
    expect(updated.updatedAt).toEqual(interview.updatedAt);
    expect(await db.select().from(activityHistory)).toHaveLength(0);
  });

  it.each([
    {},
    {
      applicationId: "bad",
      interviewId: randomUUID(),
      status: InterviewStatus.Completed,
    },
    {
      applicationId: randomUUID(),
      interviewId: "bad",
      status: InterviewStatus.Completed,
    },
    {
      applicationId: randomUUID(),
      interviewId: randomUUID(),
      status: "Pending",
    },
    {
      applicationId: randomUUID(),
      interviewId: randomUUID(),
      status: InterviewStatus.Completed,
      extra: true,
    },
  ])("rejects invalid status input without mutation: %j", async (input) => {
    const application = await seedApplication();
    const interview = await createInterview({
      applicationId: application.id,
      scheduledAt: "2026-08-10T10:00:00Z",
    });
    await db.delete(activityHistory);
    await expect(updateInterviewStatus(input)).rejects.toBeDefined();
    expect(await db.select().from(interviews)).toEqual([interview]);
    expect(await db.select().from(activityHistory)).toHaveLength(0);
  });

  it("rolls back creation and state changes when history insertion fails", async () => {
    const application = await seedApplication();
    const existing = await createInterview({
      applicationId: application.id,
      scheduledAt: "2026-08-10T10:00:00Z",
    });
    await client`CREATE OR REPLACE FUNCTION reject_f07_history() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced history failure'; END; $$ LANGUAGE plpgsql`;
    await client`CREATE TRIGGER reject_f07_history BEFORE INSERT ON activity_history FOR EACH ROW EXECUTE FUNCTION reject_f07_history()`;
    try {
      await expect(
        createInterview({
          applicationId: application.id,
          scheduledAt: "2026-08-11T10:00:00Z",
        }),
      ).rejects.toBeDefined();
      await expect(
        updateInterviewStatus({
          applicationId: application.id,
          interviewId: existing.id,
          status: "Cancelled",
        }),
      ).rejects.toBeDefined();
      const persisted = await db.select().from(interviews);
      expect(persisted).toHaveLength(1);
      expect(persisted[0]!.status).toBe("Scheduled");
    } finally {
      await client`DROP TRIGGER reject_f07_history ON activity_history`;
      await client`DROP FUNCTION reject_f07_history()`;
    }
  });
});

afterAll(() => client.end());
