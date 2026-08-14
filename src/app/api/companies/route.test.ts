import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CompanyNameConflictError } from "@/services/company";

const { createCompany, listCompanies } = vi.hoisted(() => ({
  createCompany: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock("@/services/company", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/company")>()),
  createCompany,
  listCompanies,
}));

import { GET, POST } from "./route";

const request = (body: string) =>
  new Request("http://localhost/api/companies", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

describe("POST /api/companies", () => {
  beforeEach(() => {
    createCompany.mockReset();
    listCompanies.mockReset();
  });

  it("delegates to the service and returns the created company", async () => {
    const company = {
      id: "0f1db9a6-4ce4-4ab9-a8d8-f585f9fb3df8",
      name: "Acme",
      notes: null,
      createdAt: new Date("2026-08-07T08:00:00.000Z"),
      updatedAt: new Date("2026-08-07T08:00:00.000Z"),
    };
    createCompany.mockResolvedValue(company);

    const response = await POST(request(JSON.stringify({ name: " Acme " })));

    expect(createCompany).toHaveBeenCalledWith({ name: " Acme " });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ...company,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    });
  });

  it("returns a structured error for malformed JSON", async () => {
    const response = await POST(request("{"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: "Request body must be valid JSON.",
      },
    });
    expect(createCompany).not.toHaveBeenCalled();
  });

  it("returns validation issues from the service as a client error", async () => {
    const result = z
      .strictObject({ name: z.string().min(1) })
      .safeParse({ name: "" });
    if (result.success) {
      throw new Error("Expected the route test fixture to fail validation.");
    }
    createCompany.mockRejectedValue(result.error);

    const response = await POST(request(JSON.stringify({ name: "" })));
    const body: unknown = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: { code: "INVALID_REQUEST", message: "Company input is invalid." },
    });
  });

  it("does not expose internal errors", async () => {
    createCompany.mockRejectedValue(new Error("password=database-secret"));

    const response = await POST(request(JSON.stringify({ name: "Acme" })));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("database-secret");
    expect(JSON.parse(body)).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Company could not be created.",
      },
    });
  });

  it("maps duplicate names to a structured conflict", async () => {
    createCompany.mockRejectedValue(new CompanyNameConflictError());
    const response = await POST(request(JSON.stringify({ name: "Acme" })));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "COMPANY_NAME_CONFLICT",
        message: "A company with that name already exists.",
      },
    });
  });
});

describe("GET /api/companies", () => {
  it("returns companies from the service", async () => {
    listCompanies.mockResolvedValue([{ id: "1", name: "Acme" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "1", name: "Acme" }]);
  });

  it("hides internal list errors", async () => {
    listCompanies.mockRejectedValue(new Error("secret"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
});
