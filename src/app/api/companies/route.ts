import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  CompanyNameConflictError,
  createCompany,
  listCompanies,
} from "@/services/company";

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
    const company = await createCompany(input);
    return Response.json(company, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Company input is invalid.",
        status: 400,
        issues: error.issues,
      });
    }

    if (error instanceof CompanyNameConflictError) {
      return apiErrorResponse({
        code: "COMPANY_NAME_CONFLICT",
        message: error.message,
        status: 409,
      });
    }

    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Company could not be created.",
      status: 500,
    });
  }
}

export async function GET(): Promise<Response> {
  try {
    return Response.json(await listCompanies());
  } catch {
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Companies could not be loaded.",
      status: 500,
    });
  }
}
