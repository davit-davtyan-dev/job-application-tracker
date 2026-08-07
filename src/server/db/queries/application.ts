import "server-only";

import { eq } from "drizzle-orm";

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
      eventType: "application_created",
      status: application.status,
    });

    return application;
  });
}
