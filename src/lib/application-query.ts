import type { ActiveApplication } from "@/services/application";

export const normalizeApplicationSearch = (search: string) => search.trim();

export const activeApplicationsQueryKey = ["applications", "active"] as const;
export const activeApplicationsSearchQueryKey = (search: string) =>
  [...activeApplicationsQueryKey, normalizeApplicationSearch(search)] as const;

interface ActiveApplicationsResponse {
  applications: ActiveApplication[];
}

export async function fetchActiveApplications(
  search: string,
): Promise<ActiveApplication[]> {
  const normalizedSearch = normalizeApplicationSearch(search);
  const parameters = new URLSearchParams();
  if (normalizedSearch) parameters.set("search", normalizedSearch);
  const query = parameters.toString();
  const response = await fetch(`/api/applications${query ? `?${query}` : ""}`);
  if (!response.ok) throw new Error("Applications could not be loaded.");
  const body = (await response.json()) as ActiveApplicationsResponse;
  return body.applications;
}
