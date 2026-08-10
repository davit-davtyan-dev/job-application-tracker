import { z } from "zod";

import { ApplicationStatus } from "@/lib/application";

export const companyHistoryItemSchema = z.strictObject({
  id: z.uuid(),
  companyId: z.uuid(),
  positionTitle: z.string(),
  appliedDate: z.iso.date(),
  status: z.enum(ApplicationStatus),
});

export type CompanyHistoryItem = z.infer<typeof companyHistoryItemSchema>;
