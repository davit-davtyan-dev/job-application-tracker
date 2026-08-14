import { z } from "zod";

export const companiesQueryKey = ["companies"] as const;

export const companySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  notes: z.string().nullable().default(null),
});

export type CompanyResponse = z.infer<typeof companySchema>;

interface ApiErrorBody {
  error?: { message?: string };
}

async function responseBody(response: Response): Promise<unknown> {
  return response.json();
}

async function responseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const body = (await responseBody(response).catch(
    () => null,
  )) as ApiErrorBody | null;
  return new Error(body?.error?.message || fallback);
}

export async function fetchCompanies(): Promise<CompanyResponse[]> {
  const response = await fetch("/api/companies");
  if (!response.ok)
    throw await responseError(response, "Companies could not be loaded.");
  return z.array(companySchema).parse(await responseBody(response));
}

export async function createCompanyRequest(input: {
  name: string;
  notes: string;
}): Promise<CompanyResponse> {
  const response = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok)
    throw await responseError(response, "Company could not be created.");
  return companySchema.parse(await responseBody(response));
}

export async function updateCompanyRequest(
  id: string,
  input: { name: string; notes: string },
): Promise<CompanyResponse> {
  const response = await fetch(`/api/companies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok)
    throw await responseError(response, "Company could not be updated.");
  return companySchema.parse(await responseBody(response));
}

export async function deleteCompanyRequest(id: string): Promise<void> {
  const response = await fetch(`/api/companies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok)
    throw await responseError(response, "Company could not be deleted.");
}
