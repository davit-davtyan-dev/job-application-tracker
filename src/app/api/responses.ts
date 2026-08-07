import type { z } from "zod";

interface ApiErrorOptions {
  code: string;
  message: string;
  status: number;
  issues?: z.core.$ZodIssue[];
}

export function apiErrorResponse({
  code,
  message,
  status,
  issues,
}: ApiErrorOptions): Response {
  return Response.json(
    { error: { code, message, ...(issues ? { issues } : {}) } },
    { status },
  );
}
