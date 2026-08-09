import { z } from "zod";

import { ApplicationStatus } from "@/lib/application";
import {
  insertApplicationWithHistory,
  type JobApplication,
  selectApplicationsByStatuses,
} from "@/server/db/queries/application";

const activeApplicationStatuses = [
  ApplicationStatus.Applied,
  ApplicationStatus.Interviewing,
  ApplicationStatus.Offer,
];

export const activeApplicationSchema = z.strictObject({
  id: z.uuid(),
  companyName: z.string(),
  positionTitle: z.string(),
  appliedDate: z.iso.date(),
  status: z.enum(
    activeApplicationStatuses as [
      ApplicationStatus.Applied,
      ApplicationStatus.Interviewing,
      ApplicationStatus.Offer,
    ],
  ),
});

export const activeApplicationListSchema = z.array(activeApplicationSchema);
export type ActiveApplication = z.infer<typeof activeApplicationSchema>;

export const listActiveApplicationsInputSchema = z.strictObject({
  search: z
    .string()
    .trim()
    .max(200, "Search must be 200 characters or fewer.")
    .transform((value) => value || undefined)
    .optional(),
});

export const createApplicationInputSchema = z
  .strictObject({
    companyId: z.uuid().optional(),
    companyName: z
      .string()
      .trim()
      .min(1, "Company name is required.")
      .optional(),
    positionTitle: z.string().trim().min(1, "Position title is required."),
    appliedDate: z.iso.date("Applied date must use a valid YYYY-MM-DD date."),
    status: z.enum(ApplicationStatus).default(ApplicationStatus.Applied),
    description: z.string().optional(),
    referenceLinks: z
      .array(z.url("Reference links must be valid URLs."))
      .default([]),
    notes: z.string().optional(),
  })
  .refine((value) => Boolean(value.companyId) !== Boolean(value.companyName), {
    message: "Choose an existing company or create one inline.",
    path: ["companyId"],
  });

export class CompanyNotFoundError extends Error {
  constructor() {
    super("The selected company does not exist.");
    this.name = "CompanyNotFoundError";
  }
}

export async function createApplication(
  input: unknown,
): Promise<JobApplication> {
  const application = createApplicationInputSchema.parse(input);
  const created = await insertApplicationWithHistory({
    ...application,
    description: application.description?.trim() || null,
    notes: application.notes?.trim() || null,
  });
  if (!created) throw new CompanyNotFoundError();
  return created;
}

export async function listActiveApplications(
  input: unknown = {},
): Promise<ActiveApplication[]> {
  const criteria = listActiveApplicationsInputSchema.parse(input);
  const applications = await selectApplicationsByStatuses(
    activeApplicationStatuses,
    criteria,
  );
  return activeApplicationListSchema.parse(applications);
}
