import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractJobPosting } = vi.hoisted(() => ({
  extractJobPosting: vi.fn(),
}));
vi.mock("@/services/job-posting-extraction", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/services/job-posting-extraction")
  >()),
  extractJobPosting,
}));

import { JobPostingExtractionError } from "@/services/job-posting-extraction";

import { dynamic, POST } from "./route";

const request = (body: string) =>
  new Request("http://localhost/api/job-posting-extraction", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

describe("POST /api/job-posting-extraction", () => {
  beforeEach(() => {
    extractJobPosting.mockReset();
  });

  it("is dynamic, delegates validated input, and disables response caching", async () => {
    const result = {
      sourceUrl: "https://example.com/job",
      companyName: "Acme",
      positionTitle: "Engineer",
      description: "Build products.",
    };
    extractJobPosting.mockResolvedValue(result);
    const response = await POST(
      request(JSON.stringify({ url: "https://example.com/job" })),
    );
    expect(dynamic).toBe("force-dynamic");
    expect(extractJobPosting).toHaveBeenCalledWith({
      url: "https://example.com/job",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(result);
  });

  it.each([
    ["{", "Request body must be valid JSON."],
    [JSON.stringify({ url: "" }), "Job-posting URL is invalid."],
    [
      JSON.stringify({ url: "file:///etc/passwd" }),
      "Job-posting URL is invalid.",
    ],
    [
      JSON.stringify({ url: "https://example.com", extra: true }),
      "Job-posting URL is invalid.",
    ],
  ])(
    "rejects malformed input without calling the service",
    async (body, message) => {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "INVALID_REQUEST", message },
      });
      expect(extractJobPosting).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["UNSAFE_DESTINATION", 400],
    ["UNSUPPORTED_CONTENT", 422],
    ["RESPONSE_TOO_LARGE", 422],
    ["FETCH_TIMEOUT", 422],
    ["FETCH_FAILED", 422],
    ["NOTHING_EXTRACTED", 422],
  ] as const)("maps %s to a safe structured error", async (code, status) => {
    extractJobPosting.mockRejectedValue(
      new JobPostingExtractionError(code, "Actionable public message."),
    );
    const response = await POST(
      request(JSON.stringify({ url: "https://example.com/job" })),
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: { code, message: "Actionable public message." },
    });
  });

  it("does not expose unexpected network internals", async () => {
    extractJobPosting.mockRejectedValue(new Error("token=secret ECONNRESET"));
    const response = await POST(
      request(JSON.stringify({ url: "https://example.com/job" })),
    );
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).not.toContain("secret");
    expect(JSON.parse(body)).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Job-posting details could not be imported.",
      },
    });
  });
});
