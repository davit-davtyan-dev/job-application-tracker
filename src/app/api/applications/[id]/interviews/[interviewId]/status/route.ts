import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  InterviewNotFoundError,
  interviewStatusBodySchema,
  updateInterviewStatus,
  updateInterviewStatusInputSchema,
} from "@/services/interview";

interface RouteContext {
  params: Promise<{ id: string; interviewId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
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
  const parsedBody = interviewStatusBodySchema.safeParse(body);
  const { id, interviewId } = await context.params;
  const parsed = parsedBody.success
    ? updateInterviewStatusInputSchema.safeParse({
        applicationId: id,
        interviewId,
        ...parsedBody.data,
      })
    : parsedBody;
  if (!parsed.success) return invalid(parsed.error);
  try {
    return Response.json(await updateInterviewStatus(parsed.data));
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return invalid(error);
    if (error instanceof InterviewNotFoundError)
      return apiErrorResponse({
        code: "INTERVIEW_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Interview status could not be updated.",
      status: 500,
    });
  }
}

function invalid(error: z.ZodError) {
  return apiErrorResponse({
    code: "INVALID_REQUEST",
    message: "Interview status request is invalid.",
    status: 400,
    issues: error.issues,
  });
}
