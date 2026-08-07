import "server-only";

import { database } from "@/server/db/client";
import { companies } from "@/server/db/schema";

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
