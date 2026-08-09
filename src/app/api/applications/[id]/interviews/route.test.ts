import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listInterviews: vi.fn(),
  createInterview: vi.fn(),
  ApplicationNotFoundError: class extends Error {},
}));
vi.mock("@/services/interview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/interview")>()),
  ...mocks,
}));
import { GET, POST } from "./route";

const id = "2b033428-a730-42c8-acf8-02574373b250";
const context = (routeId = id) => ({
  params: Promise.resolve({ id: routeId }),
});

describe("application interview collection route", () => {
  beforeEach(() => {
    mocks.listInterviews.mockReset();
    mocks.createInterview.mockReset();
  });
  it("lists and creates interviews", async () => {
    mocks.listInterviews.mockResolvedValue([{ id: "one" }]);
    expect(
      await (await GET(new Request("http://local"), context())).json(),
    ).toEqual({ interviews: [{ id: "one" }] });
    mocks.createInterview.mockResolvedValue({ id: "two" });
    const response = await POST(
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ scheduledAt: "2026-08-10T10:00:00Z" }),
      }),
      context(),
    );
    expect(response.status).toBe(201);
    expect(mocks.createInterview).toHaveBeenCalledWith({
      applicationId: id,
      scheduledAt: "2026-08-10T10:00:00Z",
    });
  });
  it.each([
    ["bad id", "{}", "nope"],
    ["malformed", "{", id],
    ["missing", "{}", id],
    [
      "local datetime",
      JSON.stringify({ scheduledAt: "2026-08-10T10:00:00" }),
      id,
    ],
    [
      "extra",
      JSON.stringify({ scheduledAt: "2026-08-10T10:00:00Z", extra: true }),
      id,
    ],
  ])("rejects %s", async (_label, body, routeId) => {
    const response = await POST(
      new Request("http://local", { method: "POST", body }),
      context(routeId),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    expect(mocks.createInterview).not.toHaveBeenCalled();
  });
  it("maps not found and unexpected errors safely", async () => {
    mocks.createInterview.mockRejectedValueOnce(
      new mocks.ApplicationNotFoundError(),
    );
    expect(
      (
        await POST(
          new Request("http://local", {
            method: "POST",
            body: JSON.stringify({ scheduledAt: "2026-08-10T10:00:00Z" }),
          }),
          context(),
        )
      ).status,
    ).toBe(404);
    mocks.listInterviews.mockRejectedValueOnce(new Error("database-secret"));
    const response = await GET(new Request("http://local"), context());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("database-secret");
  });
});
