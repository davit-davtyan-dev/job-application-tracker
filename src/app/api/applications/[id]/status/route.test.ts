import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateApplicationStatus, ApplicationNotFoundError } = vi.hoisted(
  () => ({
    updateApplicationStatus: vi.fn(),
    ApplicationNotFoundError: class extends Error {},
  }),
);
vi.mock("@/services/application", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/application")>();
  return { ...actual, updateApplicationStatus, ApplicationNotFoundError };
});

import { PATCH } from "./route";

const id = "2b033428-a730-42c8-acf8-02574373b250";
const call = (body: string, routeId = id) =>
  PATCH(
    new Request(`http://localhost/api/applications/${routeId}/status`, {
      method: "PATCH",
      body,
    }),
    {
      params: Promise.resolve({ id: routeId }),
    },
  );

describe("PATCH /api/applications/[id]/status", () => {
  beforeEach(() => updateApplicationStatus.mockReset());

  it("updates a valid status", async () => {
    updateApplicationStatus.mockResolvedValue({ id, status: "Offer" });
    const response = await call(JSON.stringify({ status: "Offer" }));
    expect(response.status).toBe(200);
    expect(updateApplicationStatus).toHaveBeenCalledWith({
      id,
      status: "Offer",
    });
  });

  it.each([
    ["malformed JSON", "{", id],
    ["invalid UUID", JSON.stringify({ status: "Applied" }), "nope"],
    ["missing status", "{}", id],
    ["extra field", JSON.stringify({ status: "Applied", extra: true }), id],
    ["unknown status", JSON.stringify({ status: "Maybe" }), id],
  ])("rejects %s", async (_label, body, routeId) => {
    const response = await call(body, routeId);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
    expect(updateApplicationStatus).not.toHaveBeenCalled();
  });

  it("maps missing and unexpected failures safely", async () => {
    updateApplicationStatus.mockRejectedValueOnce(
      new ApplicationNotFoundError(),
    );
    expect((await call(JSON.stringify({ status: "Rejected" }))).status).toBe(
      404,
    );
    updateApplicationStatus.mockRejectedValueOnce(new Error("database-secret"));
    const response = await call(JSON.stringify({ status: "Rejected" }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("database-secret");
  });
});
