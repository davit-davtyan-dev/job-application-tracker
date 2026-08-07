import { z } from "zod";

import {
  type Company,
  insertCompany,
  selectCompanies,
} from "@/server/db/queries/company";

export const createCompanyInputSchema = z.strictObject({
  name: z.string().trim().min(1, "Company name is required."),
  notes: z.string().optional(),
});

export type CreateCompanyInput = z.input<typeof createCompanyInputSchema>;

export async function createCompany(input: unknown): Promise<Company> {
  const company = createCompanyInputSchema.parse(input);

  return insertCompany({
    name: company.name,
    notes: company.notes ?? null,
  });
}

export async function listCompanies(): Promise<Company[]> {
  return selectCompanies();
}
