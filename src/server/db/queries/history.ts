import "server-only";

import { asc, eq } from "drizzle-orm";

import { database } from "@/server/db/client";
import { activityHistory, jobApplications } from "@/server/db/schema";

export async function selectApplicationHistory(applicationId: string) {
  const [application] = await database
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(eq(jobApplications.id, applicationId));
  if (!application) return null;

  return database
    .select({
      id: activityHistory.id,
      applicationId: activityHistory.applicationId,
      interviewId: activityHistory.interviewId,
      eventType: activityHistory.eventType,
      status: activityHistory.status,
      createdAt: activityHistory.createdAt,
    })
    .from(activityHistory)
    .where(eq(activityHistory.applicationId, applicationId))
    .orderBy(asc(activityHistory.createdAt), asc(activityHistory.id));
}
