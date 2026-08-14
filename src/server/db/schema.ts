import {
  date,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { ApplicationStatus } from "@/lib/application";
import { InterviewStatus } from "@/lib/interview";

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("companies_name_lower_unique").on(sql`lower(${table.name})`),
  ],
);

export const systemMetadata = pgTable("system_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const applicationStatus = pgEnum(
  "application_status",
  ApplicationStatus,
);

export const jobApplications = pgTable("job_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  positionTitle: text("position_title").notNull(),
  appliedDate: date("applied_date", { mode: "string" }).notNull(),
  status: applicationStatus("status")
    .notNull()
    .default(ApplicationStatus.Applied),
  description: text("description"),
  referenceLinks: jsonb("reference_links")
    .$type<string[]>()
    .notNull()
    .default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const interviewStatus = pgEnum("interview_status", InterviewStatus);

export const interviews = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => jobApplications.id),
  scheduledAt: timestamp("scheduled_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  status: interviewStatus("status")
    .notNull()
    .default(InterviewStatus.Scheduled),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activityHistory = pgTable("activity_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => jobApplications.id),
  interviewId: uuid("interview_id").references(() => interviews.id),
  eventType: text("event_type").notNull(),
  status: applicationStatus("status").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});
