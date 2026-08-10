import { z } from "zod";

import { activityHistoryItemSchema } from "@/lib/history";
import { selectApplicationHistory } from "@/server/db/queries/history";

export const historyInputSchema = z.strictObject({ applicationId: z.uuid() });

const databaseHistoryItemSchema = activityHistoryItemSchema.extend({
  createdAt: z.date(),
});

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("The application does not exist.");
    this.name = "ApplicationNotFoundError";
  }
}

export async function listApplicationHistory(input: unknown) {
  const { applicationId } = historyInputSchema.parse(input);
  const records = await selectApplicationHistory(applicationId);
  if (!records) throw new ApplicationNotFoundError();
  return z.array(activityHistoryItemSchema).parse(
    z
      .array(databaseHistoryItemSchema)
      .parse(records)
      .map((record) => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
      })),
  );
}
