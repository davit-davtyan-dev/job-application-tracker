import { z } from "zod";

import { createCompany } from "@/services/company";

const invalidRequest = (message: string, issues?: z.core.$ZodIssue[]) =>
  Response.json(
    {
      error: {
        code: "INVALID_REQUEST",
        message,
        ...(issues ? { issues } : {}),
      },
    },
    { status: 400 },
  );

export async function POST(request: Request): Promise<Response> {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return invalidRequest("Request body must be valid JSON.");
  }

  try {
    const company = await createCompany(input);
    return Response.json(company, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return invalidRequest("Company input is invalid.", error.issues);
    }

    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Company could not be created.",
        },
      },
      { status: 500 },
    );
  }
}
