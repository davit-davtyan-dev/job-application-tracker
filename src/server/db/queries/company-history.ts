import "server-only";

import { asc, eq } from "drizzle-orm";

import { database } from "@/server/db/client";
import { companies, jobApplications } from "@/server/db/schema";

export async function selectCompanyHistory(companyId: string) {
  const [company] = await database
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, companyId));

  if (!company) {
    return null;
  }

  return database
    .select({
      id: jobApplications.id,
      companyId: jobApplications.companyId,
      positionTitle: jobApplications.positionTitle,
      appliedDate: jobApplications.appliedDate,
      status: jobApplications.status,
    })
    .from(jobApplications)
    .where(eq(jobApplications.companyId, companyId))
    .orderBy(
      asc(jobApplications.appliedDate),
      asc(jobApplications.createdAt),
      asc(jobApplications.id),
    );
}
