import { z } from "zod";

import { companyHistoryItemSchema } from "@/lib/company-history";
import { selectCompanyHistory } from "@/server/db/queries/company-history";

export const companyHistoryInputSchema = z.strictObject({
  companyId: z.uuid(),
});

export class CompanyHistoryNotFoundError extends Error {
  constructor() {
    super("The company does not exist.");
    this.name = "CompanyHistoryNotFoundError";
  }
}

export async function listCompanyHistory(input: unknown) {
  const { companyId } = companyHistoryInputSchema.parse(input);
  const records = await selectCompanyHistory(companyId);

  if (!records) {
    throw new CompanyHistoryNotFoundError();
  }

  return z.array(companyHistoryItemSchema).parse(records);
}
