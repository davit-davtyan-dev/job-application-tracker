import { z } from "zod";

export enum InterviewStatus {
  Scheduled = "Scheduled",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

export const interviewStatusSchema = z.enum(InterviewStatus);

export const interviewSchema = z.strictObject({
  id: z.uuid(),
  applicationId: z.uuid(),
  scheduledAt: z.date(),
  status: interviewStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Interview = z.infer<typeof interviewSchema>;
