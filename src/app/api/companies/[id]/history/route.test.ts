import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listCompanyHistory: vi.fn(),
  CompanyHistoryNotFoundError: class extends Error {},
}));
vi.mock("@/services/company-history", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/company-history")>()),
  ...mocks,
}));
import { GET } from "./route";

const id = "2b033428-a730-42c8-acf8-02574373b250";
const context = (routeId = id) => ({
  params: Promise.resolve({ id: routeId }),
});

describe("company history route", () => {
  beforeEach(() => mocks.listCompanyHistory.mockReset());

  it("returns history including an empty history", async () => {
    mocks.listCompanyHistory.mockResolvedValueOnce([{ id: "application" }]);
    const response = await GET(new Request("http://local"), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ history: [{ id: "application" }] });
    mocks.listCompanyHistory.mockResolvedValueOnce([]);
    expect(
      await (await GET(new Request("http://local"), context())).json(),
    ).toEqual({ history: [] });
  });

  it("rejects invalid UUIDs", async () => {
    const response = await GET(new Request("http://local"), context("bad"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("maps missing companies and failures safely", async () => {
    mocks.listCompanyHistory.mockRejectedValueOnce(
      new mocks.CompanyHistoryNotFoundError(),
    );
    const missing = await GET(new Request("http://local"), context());
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("COMPANY_NOT_FOUND");
    mocks.listCompanyHistory.mockRejectedValueOnce(
      new Error("database-secret"),
    );
    const failed = await GET(new Request("http://local"), context());
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain("database-secret");
  });
});
