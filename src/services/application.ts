import { z } from "zod";

import {
  ApplicationListView,
  type ApplicationListView as ApplicationListViewValue,
  ApplicationStatus,
} from "@/lib/application";
import {
  insertApplicationWithHistory,
  type JobApplication,
  selectApplicationsByStatuses,
  updateApplicationStatusWithHistory,
} from "@/server/db/queries/application";

const activeApplicationStatuses = [
  ApplicationStatus.Applied,
  ApplicationStatus.Interviewing,
  ApplicationStatus.Offer,
] as const;

const closedApplicationStatuses = [
  ApplicationStatus.Accepted,
  ApplicationStatus.Rejected,
  ApplicationStatus.Withdrawn,
  ApplicationStatus.Archived,
] as const;

const applicationStatusesByView = {
  [ApplicationListView.Active]: activeApplicationStatuses,
  [ApplicationListView.Closed]: closedApplicationStatuses,
} satisfies Record<ApplicationListViewValue, readonly ApplicationStatus[]>;

const applicationListItemFields = {
  id: z.uuid(),
  companyId: z.uuid(),
  companyName: z.string(),
  companyNotes: z.string().nullable(),
  positionTitle: z.string(),
  appliedDate: z.iso.date(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
};

const activeApplicationSchema = z.strictObject({
  ...applicationListItemFields,
  status: z.enum(activeApplicationStatuses),
});
const closedApplicationSchema = z.strictObject({
  ...applicationListItemFields,
  status: z.enum(closedApplicationStatuses),
});
const activeApplicationListSchema = z.array(activeApplicationSchema);
const closedApplicationListSchema = z.array(closedApplicationSchema);
export type ApplicationListItem =
  | z.infer<typeof activeApplicationSchema>
  | z.infer<typeof closedApplicationSchema>;

export const listApplicationsInputSchema = z
  .strictObject({
    view: z.enum(ApplicationListView).default(ApplicationListView.Active),
    status: z.enum(ApplicationStatus).optional(),
    search: z
      .string()
      .trim()
      .max(200, "Search must be 200 characters or fewer.")
      .transform((value) => value || undefined)
      .optional(),
  })
  .superRefine(({ view, status }, context) => {
    if (
      status &&
      !applicationStatusesByView[view].some(
        (allowedStatus) => allowedStatus === status,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: `${status} is not a valid status for the ${view} view.`,
      });
    }
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

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("The application does not exist.");
    this.name = "ApplicationNotFoundError";
  }
}

export const applicationStatusBodySchema = z.strictObject({
  status: z.enum(ApplicationStatus),
});
export const updateApplicationStatusInputSchema =
  applicationStatusBodySchema.extend({
    id: z.uuid(),
  });

const jobApplicationSchema = z.strictObject({
  id: z.uuid(),
  companyId: z.uuid(),
  positionTitle: z.string(),
  appliedDate: z.iso.date(),
  status: z.enum(ApplicationStatus),
  description: z.string().nullable(),
  referenceLinks: z.array(z.string()),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export async function updateApplicationStatus(input: unknown) {
  const parsed = updateApplicationStatusInputSchema.parse(input);
  const updated = await updateApplicationStatusWithHistory(
    parsed.id,
    parsed.status,
  );
  if (!updated) throw new ApplicationNotFoundError();
  return jobApplicationSchema.parse(updated);
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

export async function listApplications(
  input: unknown = {},
): Promise<ApplicationListItem[]> {
  const criteria = listApplicationsInputSchema.parse(input);
  const { view, search, status } = criteria;
  const applications = await selectApplicationsByStatuses(
    status ? [status] : [...applicationStatusesByView[view]],
    { search },
  );
  return view === ApplicationListView.Active
    ? activeApplicationListSchema.parse(applications)
    : closedApplicationListSchema.parse(applications);
}
