import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  applicationIdSchema,
  ApplicationNotFoundError,
  createInterview,
  createInterviewBodySchema,
  createInterviewInputSchema,
  listInterviews,
} from "@/services/interview";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = applicationIdSchema.safeParse({ applicationId: id });
  if (!parsed.success)
    return invalid(parsed.error, "Interview list request is invalid.");
  try {
    return Response.json({ interviews: await listInterviews(parsed.data) });
  } catch {
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Interviews could not be loaded.",
      status: 500,
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
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
  const parsedBody = createInterviewBodySchema.safeParse(body);
  const { id } = await context.params;
  const parsed = parsedBody.success
    ? createInterviewInputSchema.safeParse({
        applicationId: id,
        ...parsedBody.data,
      })
    : parsedBody;
  if (!parsed.success)
    return invalid(parsed.error, "Interview input is invalid.");
  try {
    return Response.json(await createInterview(parsed.data), { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError)
      return invalid(error, "Interview input is invalid.");
    if (error instanceof ApplicationNotFoundError)
      return apiErrorResponse({
        code: "APPLICATION_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Interview could not be created.",
      status: 500,
    });
  }
}

function invalid(error: z.ZodError, message: string) {
  return apiErrorResponse({
    code: "INVALID_REQUEST",
    message,
    status: 400,
    issues: error.issues,
  });
}
