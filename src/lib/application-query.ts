import type {
  ApplicationListView,
  ApplicationStatus,
} from "@/lib/application";
import type { ApplicationListItem } from "@/services/application";

export const normalizeApplicationSearch = (search: string) => search.trim();

export const applicationsQueryRoot = ["applications"] as const;
export const applicationsQueryKey = (
  view: ApplicationListView,
  search: string,
) =>
  [...applicationsQueryRoot, view, normalizeApplicationSearch(search)] as const;

interface ApplicationsResponse {
  applications: ApplicationListItem[];
}

export async function fetchApplications(
  view: ApplicationListView,
  search: string,
): Promise<ApplicationListItem[]> {
  const normalizedSearch = normalizeApplicationSearch(search);
  const parameters = new URLSearchParams({ view });
  if (normalizedSearch) parameters.set("search", normalizedSearch);
  const query = parameters.toString();
  const response = await fetch(`/api/applications${query ? `?${query}` : ""}`);
  if (!response.ok) throw new Error("Applications could not be loaded.");
  const body = (await response.json()) as ApplicationsResponse;
  return body.applications;
}

export async function updateApplicationStatusRequest(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const response = await fetch(
    `/api/applications/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) throw new Error("Status could not be updated.");
}
