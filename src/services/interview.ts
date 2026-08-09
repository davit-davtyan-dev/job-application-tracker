import { z } from "zod";

import { interviewSchema, interviewStatusSchema } from "@/lib/interview";
import {
  insertInterviewWithHistory,
  selectInterviews,
  updateInterviewStatusWithHistory,
} from "@/server/db/queries/interview";

export const applicationIdSchema = z.strictObject({ applicationId: z.uuid() });
export const createInterviewBodySchema = z.strictObject({
  scheduledAt: z.iso.datetime({ offset: true }),
});
export const createInterviewInputSchema = applicationIdSchema.extend({
  scheduledAt: z.iso.datetime({ offset: true }),
});
export const interviewStatusBodySchema = z.strictObject({
  status: interviewStatusSchema,
});
export const updateInterviewStatusInputSchema = applicationIdSchema.extend({
  interviewId: z.uuid(),
  status: interviewStatusSchema,
});

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("The application does not exist.");
    this.name = "ApplicationNotFoundError";
  }
}

export class InterviewNotFoundError extends Error {
  constructor() {
    super("The interview does not exist for this application.");
    this.name = "InterviewNotFoundError";
  }
}

export async function listInterviews(input: unknown) {
  const { applicationId } = applicationIdSchema.parse(input);
  return z.array(interviewSchema).parse(await selectInterviews(applicationId));
}

export async function createInterview(input: unknown) {
  const parsed = createInterviewInputSchema.parse(input);
  const created = await insertInterviewWithHistory(
    parsed.applicationId,
    new Date(parsed.scheduledAt),
  );
  if (!created) throw new ApplicationNotFoundError();
  return interviewSchema.parse(created);
}

export async function updateInterviewStatus(input: unknown) {
  const parsed = updateInterviewStatusInputSchema.parse(input);
  const updated = await updateInterviewStatusWithHistory(
    parsed.applicationId,
    parsed.interviewId,
    parsed.status,
  );
  if (!updated) throw new InterviewNotFoundError();
  return interviewSchema.parse(updated);
}
