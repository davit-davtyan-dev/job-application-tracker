import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApplication,
  CompanyNotFoundError,
  createApplicationInputSchema,
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
}));
vi.mock("@/services/application", () => ({
  createApplication,
  CompanyNotFoundError,
  createApplicationInputSchema,
}));

import { POST } from "./route";

const request = (body: string) =>
  new Request("http://localhost/api/applications", { method: "POST", body });

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
