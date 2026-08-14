import { z } from "zod";

import {
  type Company,
  deleteCompanyOwnershipTree,
  insertCompany,
  selectCompanies,
  updateCompanyRecord,
} from "@/server/db/queries/company";

export const createCompanyInputSchema = z.strictObject({
  name: z.string().trim().min(1, "Company name is required."),
  notes: z.string().optional(),
});

export type CreateCompanyInput = z.input<typeof createCompanyInputSchema>;

export const companyIdSchema = z.uuid();
export const updateCompanyInputSchema = createCompanyInputSchema.extend({
  id: companyIdSchema,
});

export class CompanyNameConflictError extends Error {
  constructor() {
    super("A company with that name already exists.");
    this.name = "CompanyNameConflictError";
  }
}

export class CompanyNotFoundError extends Error {
  constructor() {
    super("The company does not exist.");
    this.name = "CompanyNotFoundError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

export async function createCompany(input: unknown): Promise<Company> {
  const company = createCompanyInputSchema.parse(input);

  try {
    return await insertCompany({
      name: company.name,
      notes: company.notes?.trim() || null,
    });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) throw new CompanyNameConflictError();
    throw error;
  }
}

export async function listCompanies(): Promise<Company[]> {
  return selectCompanies();
}

export async function updateCompany(input: unknown): Promise<Company> {
  const company = updateCompanyInputSchema.parse(input);
  try {
    const updated = await updateCompanyRecord(company.id, {
      name: company.name,
      notes: company.notes?.trim() || null,
    });
    if (!updated) throw new CompanyNotFoundError();
    return updated;
  } catch (error: unknown) {
    if (isUniqueViolation(error)) throw new CompanyNameConflictError();
    throw error;
  }
}

export async function deleteCompany(input: unknown): Promise<Company> {
  const id = companyIdSchema.parse(input);
  const deleted = await deleteCompanyOwnershipTree(id);
  if (!deleted) throw new CompanyNotFoundError();
  return deleted;
}
