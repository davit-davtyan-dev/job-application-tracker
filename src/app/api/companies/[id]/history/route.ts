import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  companyHistoryInputSchema,
  CompanyHistoryNotFoundError,
  listCompanyHistory,
} from "@/services/company-history";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const parsed = companyHistoryInputSchema.safeParse({ companyId: id });
  if (!parsed.success)
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Company history request is invalid.",
      status: 400,
      issues: parsed.error.issues,
    });
  try {
    return Response.json(
      { history: await listCompanyHistory(parsed.data) },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof CompanyHistoryNotFoundError)
      return apiErrorResponse({
        code: "COMPANY_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    if (error instanceof z.ZodError)
      return apiErrorResponse({
        code: "INTERNAL_ERROR",
        message: "Company history could not be loaded.",
        status: 500,
      });
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Company history could not be loaded.",
      status: 500,
    });
  }
}
