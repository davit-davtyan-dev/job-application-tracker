import type { ActivityHistoryItem } from "@/lib/history";

export const historyQueryKey = (applicationId: string) =>
  ["applications", applicationId, "history"] as const;

export async function fetchApplicationHistory(applicationId: string) {
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/history`,
  );
  if (!response.ok) throw new Error("Activity history could not be loaded.");
  const body = (await response.json()) as { history: ActivityHistoryItem[] };
  return body.history;
}
