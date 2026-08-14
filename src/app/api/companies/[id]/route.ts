import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  companyIdSchema,
  CompanyNameConflictError,
  CompanyNotFoundError,
  deleteCompany,
  updateCompany,
  updateCompanyBodySchema,
} from "@/services/company";

type CompanyRouteContext = { params: Promise<{ id: string }> };

async function routeId(context: CompanyRouteContext): Promise<string> {
  return (await context.params).id;
}

function serviceError(error: unknown, action: "updated" | "deleted"): Response {
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
  if (error instanceof CompanyNotFoundError) {
    return apiErrorResponse({
      code: "COMPANY_NOT_FOUND",
      message: error.message,
      status: 404,
    });
  }
  return apiErrorResponse({
    code: "INTERNAL_ERROR",
    message: `Company could not be ${action}.`,
    status: 500,
  });
}

export async function PATCH(
  request: Request,
  context: CompanyRouteContext,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }
  try {
    const id = companyIdSchema.parse(await routeId(context));
    const companyInput = updateCompanyBodySchema.parse(body);
    const company = await updateCompany({ id, ...companyInput });
    return Response.json(company);
  } catch (error: unknown) {
    return serviceError(error, "updated");
  }
}

export async function DELETE(
  _request: Request,
  context: CompanyRouteContext,
): Promise<Response> {
  try {
    await deleteCompany(await routeId(context));
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return serviceError(error, "deleted");
  }
}
