import { z } from "zod";

import { apiErrorResponse } from "@/app/api/responses";
import {
  extractJobPosting,
  JobPostingExtractionError,
  jobPostingExtractionInputSchema,
} from "@/services/job-posting-extraction";

export const dynamic = "force-dynamic";

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

  const parsed = jobPostingExtractionInputSchema.safeParse(input);
  if (!parsed.success) {
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Job-posting URL is invalid.",
      status: 400,
      issues: parsed.error.issues,
    });
  }

  try {
    return Response.json(await extractJobPosting(parsed.data), {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Job-posting URL is invalid.",
        status: 400,
        issues: error.issues,
      });
    }
    if (error instanceof JobPostingExtractionError) {
      const status = error.code === "UNSAFE_DESTINATION" ? 400 : 422;
      return apiErrorResponse({
        code: error.code,
        message: error.message,
        status,
      });
    }
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Job-posting details could not be imported.",
      status: 500,
    });
  }
}
