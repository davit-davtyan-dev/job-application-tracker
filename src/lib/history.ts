import { z } from "zod";

import { ApplicationStatus } from "@/lib/application";

export const ActivityEventType = {
  ApplicationCreated: "application_created",
  StatusChanged: "status_changed",
  InterviewScheduled: "interview_scheduled",
  InterviewCompleted: "interview_completed",
  InterviewCancelled: "interview_cancelled",
} as const;

export type ActivityEventType =
  (typeof ActivityEventType)[keyof typeof ActivityEventType];

export const activityEventTypeSchema = z.enum(ActivityEventType);

export const activityHistoryItemSchema = z.strictObject({
  id: z.uuid(),
  applicationId: z.uuid(),
  interviewId: z.uuid().nullable(),
  eventType: activityEventTypeSchema,
  status: z.enum(ApplicationStatus),
  createdAt: z.iso.datetime({ offset: true }),
});

export type ActivityHistoryItem = z.infer<typeof activityHistoryItemSchema>;
