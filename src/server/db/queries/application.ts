import "server-only";

import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { ActivityEventType } from "@/lib/history";
import { database } from "@/server/db/client";
import {
  activityHistory,
  companies,
  jobApplications,
} from "@/server/db/schema";

export type JobApplication = typeof jobApplications.$inferSelect;

export interface CreateApplicationRecord {
  companyId?: string;
  companyName?: string;
  positionTitle: string;
  appliedDate: string;
  status: JobApplication["status"];
  description: string | null;
  referenceLinks: string[];
  notes: string | null;
}

export interface ApplicationListRecord {
  id: string;
  companyName: string;
  positionTitle: string;
  appliedDate: string;
  status: JobApplication["status"];
}

export async function updateApplicationStatusWithHistory(
  id: string,
  status: JobApplication["status"],
): Promise<JobApplication | null> {
  return database.transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, id));
    if (!current) return null;
    if (current.status === status) return current;

    const [updated] = await transaction
      .update(jobApplications)
      .set({ status, updatedAt: new Date() })
      .where(eq(jobApplications.id, id))
      .returning();
    if (!updated) throw new Error("Application update returned no record.");
    await transaction.insert(activityHistory).values({
      applicationId: id,
      eventType: ActivityEventType.StatusChanged,
      status,
    });
    return updated;
  });
}

export async function selectApplicationsByStatuses(
  statuses: JobApplication["status"][],
  criteria: { search?: string } = {},
): Promise<ApplicationListRecord[]> {
  if (statuses.length === 0) return [];

  return database
    .select({
      id: jobApplications.id,
      companyName: companies.name,
      positionTitle: jobApplications.positionTitle,
      appliedDate: jobApplications.appliedDate,
      status: jobApplications.status,
    })
    .from(jobApplications)
    .innerJoin(companies, eq(jobApplications.companyId, companies.id))
    .where(
      and(
        inArray(jobApplications.status, statuses),
        criteria.search
          ? or(
              ilike(companies.name, `%${criteria.search}%`),
              ilike(jobApplications.positionTitle, `%${criteria.search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(
      desc(jobApplications.appliedDate),
      desc(jobApplications.createdAt),
      desc(jobApplications.id),
    );
}

export async function insertApplicationWithHistory(
  input: CreateApplicationRecord,
): Promise<JobApplication | null> {
  return database.transaction(async (transaction) => {
    let companyId = input.companyId;

    if (input.companyName) {
      const [company] = await transaction
        .insert(companies)
        .values({ name: input.companyName })
        .returning({ id: companies.id });
      companyId = company?.id;
    } else if (companyId) {
      const [company] = await transaction
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, companyId));
      if (!company) return null;
    }

    if (!companyId) return null;

    const [application] = await transaction
      .insert(jobApplications)
      .values({
        companyId,
        positionTitle: input.positionTitle,
        appliedDate: input.appliedDate,
        status: input.status,
        description: input.description,
        referenceLinks: input.referenceLinks,
        notes: input.notes,
      })
      .returning();
    if (!application) throw new Error("Application insert returned no record.");

    await transaction.insert(activityHistory).values({
      applicationId: application.id,
      eventType: ActivityEventType.ApplicationCreated,
      status: application.status,
    });

    return application;
  });
}
