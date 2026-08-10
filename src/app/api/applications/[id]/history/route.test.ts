import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listApplicationHistory: vi.fn(),
  ApplicationNotFoundError: class extends Error {},
}));
vi.mock("@/services/history", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/history")>()),
  ...mocks,
}));
import { GET } from "./route";

const id = "2b033428-a730-42c8-acf8-02574373b250";
const context = (routeId = id) => ({
  params: Promise.resolve({ id: routeId }),
});

describe("application history route", () => {
  beforeEach(() => mocks.listApplicationHistory.mockReset());

  it("returns an application timeline", async () => {
    mocks.listApplicationHistory.mockResolvedValue([{ id: "history" }]);
    const response = await GET(new Request("http://local"), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ history: [{ id: "history" }] });
    expect(mocks.listApplicationHistory).toHaveBeenCalledWith({
      applicationId: id,
    });
  });

  it("rejects an invalid UUID", async () => {
    const response = await GET(new Request("http://local"), context("invalid"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("maps missing applications and unexpected errors safely", async () => {
    mocks.listApplicationHistory.mockRejectedValueOnce(
      new mocks.ApplicationNotFoundError(),
    );
    const missing = await GET(new Request("http://local"), context());
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("APPLICATION_NOT_FOUND");
    mocks.listApplicationHistory.mockRejectedValueOnce(
      new Error("database-secret"),
    );
    const failed = await GET(new Request("http://local"), context());
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain("database-secret");
  });
});
