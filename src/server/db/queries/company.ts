import "server-only";

import { database } from "@/server/db/client";
import { asc, eq, inArray, sql } from "drizzle-orm";

import {
  activityHistory,
  companies,
  interviews,
  jobApplications,
} from "@/server/db/schema";

export type NewCompany = typeof companies.$inferInsert;
export type Company = typeof companies.$inferSelect;

export async function insertCompany(company: NewCompany): Promise<Company> {
  const [createdCompany] = await database
    .insert(companies)
    .values(company)
    .returning();

  if (!createdCompany) {
    throw new Error("Company insert did not return the stored record.");
  }

  return createdCompany;
}

export async function selectCompanies(): Promise<Company[]> {
  return database
    .select()
    .from(companies)
    .orderBy(asc(sql`lower(${companies.name})`), asc(companies.name));
}

export async function updateCompanyRecord(
  id: string,
  values: Pick<NewCompany, "name" | "notes">,
): Promise<Company | null> {
  const [company] = await database
    .update(companies)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(companies.id, id))
    .returning();
  return company ?? null;
}

export async function deleteCompanyOwnershipTree(
  id: string,
): Promise<Company | null> {
  return database.transaction(async (transaction) => {
    const [company] = await transaction
      .select()
      .from(companies)
      .where(eq(companies.id, id));
    if (!company) return null;

    const applicationIds = transaction
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .where(eq(jobApplications.companyId, id));

    await transaction
      .delete(activityHistory)
      .where(inArray(activityHistory.applicationId, applicationIds));
    await transaction
      .delete(interviews)
      .where(inArray(interviews.applicationId, applicationIds));
    await transaction
      .delete(jobApplications)
      .where(eq(jobApplications.companyId, id));
    await transaction.delete(companies).where(eq(companies.id, id));
    return company;
  });
}
