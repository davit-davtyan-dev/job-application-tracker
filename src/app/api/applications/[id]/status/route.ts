import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  ApplicationNotFoundError,
  applicationStatusBodySchema,
  updateApplicationStatus,
  updateApplicationStatusInputSchema,
} from "@/services/application";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
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
  const parsedBody = applicationStatusBodySchema.safeParse(body);
  const { id } = await context.params;
  const parsed = parsedBody.success
    ? updateApplicationStatusInputSchema.safeParse({ id, ...parsedBody.data })
    : parsedBody;
  if (!parsed.success) {
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Status update request is invalid.",
      status: 400,
      issues: parsed.error.issues,
    });
  }
  try {
    return Response.json(await updateApplicationStatus(parsed.data));
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Status update request is invalid.",
        status: 400,
        issues: error.issues,
      });
    }
    if (error instanceof ApplicationNotFoundError) {
      return apiErrorResponse({
        code: "APPLICATION_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    }
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Application status could not be updated.",
      status: 500,
    });
  }
}
