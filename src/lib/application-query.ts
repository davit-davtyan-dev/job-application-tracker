import type { ActiveApplication } from "@/services/application";

export const activeApplicationsQueryKey = ["applications", "active"] as const;

interface ActiveApplicationsResponse {
  applications: ActiveApplication[];
}

export async function fetchActiveApplications(): Promise<ActiveApplication[]> {
  const response = await fetch("/api/applications");
  if (!response.ok) throw new Error("Applications could not be loaded.");
  const body = (await response.json()) as ActiveApplicationsResponse;
  return body.applications;
}
