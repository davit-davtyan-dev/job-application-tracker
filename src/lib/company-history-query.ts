import { z } from "zod";

import { companyHistoryItemSchema } from "@/lib/company-history";

export const companyHistoryQueryKey = (companyId: string) =>
  ["companies", companyId, "history"] as const;

export async function fetchCompanyHistory(companyId: string) {
  const response = await fetch(
    `/api/companies/${encodeURIComponent(companyId)}/history`,
  );

  if (!response.ok) {
    throw new Error("Company history could not be loaded.");
  }

  const body: unknown = await response.json();

  return z
    .strictObject({ history: z.array(companyHistoryItemSchema) })
    .parse(body).history;
}
