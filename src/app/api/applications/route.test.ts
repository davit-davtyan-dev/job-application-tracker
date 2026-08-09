import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApplication,
  CompanyNotFoundError,
  createApplicationInputSchema,
  listActiveApplications,
  listActiveApplicationsInputSchema,
} = vi.hoisted(() => ({
  createApplication: vi.fn(),
  CompanyNotFoundError: class extends Error {},
  createApplicationInputSchema: {
    safeParse: vi.fn(
      (
        input: unknown,
      ):
        | { success: true; data: unknown }
        | {
            success: false;
            error: {
              issues: { code: string; path: string[]; message: string }[];
            };
          } => ({ success: true, data: input }),
    ),
  },
  listActiveApplications: vi.fn(),
  listActiveApplicationsInputSchema: {
    safeParse: vi.fn((input: { search?: string }) => {
      const search = input.search?.trim() || undefined;
      return search && search.length > 200
        ? {
            success: false as const,
            error: {
              issues: [
                {
                  code: "too_big",
                  path: ["search"],
                  message: "Search must be 200 characters or fewer.",
                },
              ],
            },
          }
        : { success: true as const, data: { search } };
    }),
  },
}));
vi.mock("@/services/application", () => ({
  createApplication,
  CompanyNotFoundError,
  createApplicationInputSchema,
  listActiveApplications,
  listActiveApplicationsInputSchema,
}));

import { GET, POST } from "./route";

const request = (body: string) =>
  new Request("http://localhost/api/applications", { method: "POST", body });

describe("GET /api/applications", () => {
  beforeEach(() => listActiveApplications.mockReset());

  it("returns active applications in a stable object", async () => {
    const applications = [{ id: "app", status: "Applied" }];
    listActiveApplications.mockResolvedValueOnce(applications);
    const response = await GET(
      new Request("http://localhost/api/applications"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ applications });
    expect(listActiveApplications).toHaveBeenCalledWith({
      search: undefined,
    });
  });

  it("parses and normalizes a search query", async () => {
    listActiveApplications.mockResolvedValueOnce([]);
    const response = await GET(
      new Request("http://localhost/api/applications?search=%20AcMe%20"),
    );
    expect(response.status).toBe(200);
    expect(listActiveApplications).toHaveBeenCalledWith({ search: "AcMe" });
  });

  it("rejects an invalid search without calling the service", async () => {
    const response = await GET(
      new Request(
        `http://localhost/api/applications?search=${"x".repeat(201)}`,
      ),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
    expect(listActiveApplications).not.toHaveBeenCalled();
  });

  it("maps failures to a client-safe structured error", async () => {
    listActiveApplications.mockRejectedValueOnce(new Error("database-secret"));
    const response = await GET(
      new Request("http://localhost/api/applications"),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Applications could not be loaded.",
      },
    });
  });
});

describe("POST /api/applications", () => {
  beforeEach(() => {
    createApplication.mockReset();
    createApplicationInputSchema.safeParse.mockImplementation(
      (input: unknown) => ({ success: true, data: input }),
    );
  });

  it("returns a created application with 201", async () => {
    const application = {
      id: "2b033428-a730-42c8-acf8-02574373b250",
      positionTitle: "Engineer",
    };
    createApplication.mockResolvedValue(application);
    const input = {
      companyId: "bc76d153-54f0-46d5-86ff-b5d65b60bccb",
      positionTitle: "Engineer",
      appliedDate: "2026-08-07",
    };
    const response = await POST(request(JSON.stringify(input)));
    expect(response.status).toBe(201);
    expect(createApplication).toHaveBeenCalledWith(input);
    expect(await response.json()).toEqual(application);
  });

  it("maps malformed JSON to a structured 400 error", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: "Request body must be valid JSON.",
      },
    });
    expect(createApplication).not.toHaveBeenCalled();
  });

  it("returns service-schema issues without invoking creation", async () => {
    createApplicationInputSchema.safeParse.mockReturnValue({
      success: false,
      error: {
        issues: [
          { code: "custom", path: ["positionTitle"], message: "Required" },
        ],
      },
    });
    const response = await POST(request("{}"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
    expect(createApplication).not.toHaveBeenCalled();
  });

  it("maps missing company and hides internal details", async () => {
    createApplication.mockRejectedValueOnce(new CompanyNotFoundError());
    expect((await POST(request("{}"))).status).toBe(404);
    createApplication.mockRejectedValueOnce(new Error("database-secret"));
    const response = await POST(request("{}"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("database-secret");
  });
});
