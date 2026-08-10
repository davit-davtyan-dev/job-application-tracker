import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  ApplicationNotFoundError,
  historyInputSchema,
  listApplicationHistory,
} from "@/services/history";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = historyInputSchema.safeParse({ applicationId: id });
  if (!parsed.success) return invalid(parsed.error);
  try {
    return Response.json({
      history: await listApplicationHistory(parsed.data),
    });
  } catch (error: unknown) {
    if (error instanceof ApplicationNotFoundError)
      return apiErrorResponse({
        code: "APPLICATION_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Activity history could not be loaded.",
      status: 500,
    });
  }
}

function invalid(error: z.ZodError) {
  return apiErrorResponse({
    code: "INVALID_REQUEST",
    message: "Activity history request is invalid.",
    status: 400,
    issues: error.issues,
  });
}
