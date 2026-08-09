import { z } from "zod";

import {
  CompanyNotFoundError,
  createApplication,
  createApplicationInputSchema,
  listActiveApplications,
  listActiveApplicationsInputSchema,
} from "@/services/application";
import { apiErrorResponse } from "@/app/api/responses";

const isZodError = (error: unknown): error is z.ZodError =>
  (typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ZodError" &&
    "issues" in error &&
    Array.isArray(error.issues)) ||
  error instanceof z.ZodError;

export async function GET(request: Request): Promise<Response> {
  const parsed = listActiveApplicationsInputSchema.safeParse({
    search: new URL(request.url).searchParams.get("search") ?? undefined,
  });
  if (!parsed.success) {
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Application search is invalid.",
      status: 400,
      issues: parsed.error.issues,
    });
  }

  try {
    return Response.json(
      { applications: await listActiveApplications(parsed.data) },
      { status: 200 },
    );
  } catch {
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Applications could not be loaded.",
      status: 500,
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }

  try {
    const parsed = createApplicationInputSchema.safeParse(input);
    if (!parsed.success) {
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Application input is invalid.",
        status: 400,
        issues: parsed.error.issues,
      });
    }
    return Response.json(await createApplication(parsed.data), { status: 201 });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Application input is invalid.",
        status: 400,
        issues: error.issues,
      });
    }
    if (error instanceof CompanyNotFoundError) {
      return apiErrorResponse({
        code: "COMPANY_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    }
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Application could not be created.",
      status: 500,
    });
  }
}
