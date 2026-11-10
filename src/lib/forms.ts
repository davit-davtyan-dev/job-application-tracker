import { z } from "zod";
import { ApplicationStatus } from "./application";

export const formSchema = z
  .object({
    companyId: z.string(),
    companyName: z.string(),
    positionTitle: z.string().trim().min(1, "Position title is required."),
    appliedDate: z.string().min(1, "Applied date is required."),
    status: z.enum(ApplicationStatus),
    description: z.string(),
    referenceLinks: z.array(
      z.object({
        value: z.union([z.literal(""), z.url("Enter a valid URL.")]),
      }),
    ),
    notes: z.string(),
  })
  .superRefine((value, context) => {
    if (!(value.companyId || value.companyName).trim())
      context.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Company is required.",
      });
  });

export type FormValues = z.input<typeof formSchema>;

export const importUrlSchema = z
  .url("Enter a valid job-posting URL.")
  .refine(
    (value) =>
      URL.canParse(value) &&
      ["http:", "https:"].includes(new URL(value).protocol),
    { message: "Only HTTP(S) job-posting URLs are supported." },
  );

export const importResultSchema = z.strictObject({
  sourceUrl: z.url(),
  companyName: z.string().nullable(),
  positionTitle: z.string().nullable(),
  description: z.string().nullable(),
});

export const apiErrorSchema = z.object({
  error: z.object({ message: z.string() }),
});
