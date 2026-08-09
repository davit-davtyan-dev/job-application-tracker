import "server-only";

import { asc, eq } from "drizzle-orm";

import { InterviewStatus } from "@/lib/interview";
import { database } from "@/server/db/client";
import {
  activityHistory,
  interviews,
  jobApplications,
} from "@/server/db/schema";

export type InterviewRecord = typeof interviews.$inferSelect;

export async function selectInterviews(applicationId: string) {
  return database
    .select()
    .from(interviews)
    .where(eq(interviews.applicationId, applicationId))
    .orderBy(
      asc(interviews.scheduledAt),
      asc(interviews.createdAt),
      asc(interviews.id),
    );
}

export async function insertInterviewWithHistory(
  applicationId: string,
  scheduledAt: Date,
): Promise<InterviewRecord | null> {
  return database.transaction(async (transaction) => {
    const [application] = await transaction
      .select({ status: jobApplications.status })
      .from(jobApplications)
      .where(eq(jobApplications.id, applicationId));
    if (!application) return null;
    const [interview] = await transaction
      .insert(interviews)
      .values({ applicationId, scheduledAt })
      .returning();
    if (!interview) throw new Error("Interview insert returned no record.");
    await transaction.insert(activityHistory).values({
      applicationId,
      interviewId: interview.id,
      eventType: "interview_scheduled",
      status: application.status,
    });
    return interview;
  });
}

export async function updateInterviewStatusWithHistory(
  applicationId: string,
  interviewId: string,
  status: InterviewStatus,
): Promise<InterviewRecord | null> {
  return database.transaction(async (transaction) => {
    const [current] = await transaction
      .select({
        interview: interviews,
        applicationStatus: jobApplications.status,
      })
      .from(interviews)
      .innerJoin(
        jobApplications,
        eq(jobApplications.id, interviews.applicationId),
      )
      .where(eq(interviews.id, interviewId));
    if (!current || current.interview.applicationId !== applicationId)
      return null;
    if (current.interview.status === status) return current.interview;
    const [updated] = await transaction
      .update(interviews)
      .set({ status, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId))
      .returning();
    if (!updated) throw new Error("Interview update returned no record.");
    const eventType = {
      [InterviewStatus.Scheduled]: "interview_scheduled",
      [InterviewStatus.Completed]: "interview_completed",
      [InterviewStatus.Cancelled]: "interview_cancelled",
    }[status];
    await transaction.insert(activityHistory).values({
      applicationId,
      interviewId,
      eventType,
      status: current.applicationStatus,
    });
    return updated;
  });
}
