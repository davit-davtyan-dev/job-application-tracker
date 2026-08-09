import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateInterviewStatus: vi.fn(),
  InterviewNotFoundError: class extends Error {},
}));
vi.mock("@/services/interview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/interview")>()),
  ...mocks,
}));
import { PATCH } from "./route";

const id = "2b033428-a730-42c8-acf8-02574373b250";
const interviewId = "7ae89511-3113-45e5-80c1-ea250156613d";
const call = (body: string, app = id, interview = interviewId) =>
  PATCH(new Request("http://local", { method: "PATCH", body }), {
    params: Promise.resolve({ id: app, interviewId: interview }),
  });

describe("interview status route", () => {
  beforeEach(() => mocks.updateInterviewStatus.mockReset());
  it.each(["Scheduled", "Completed", "Cancelled"])(
    "accepts %s",
    async (status) => {
      mocks.updateInterviewStatus.mockResolvedValue({
        id: interviewId,
        status,
      });
      expect((await call(JSON.stringify({ status }))).status).toBe(200);
      expect(mocks.updateInterviewStatus).toHaveBeenCalledWith({
        applicationId: id,
        interviewId,
        status,
      });
    },
  );
  it.each([
    ["malformed", "{", id, interviewId],
    ["bad app", JSON.stringify({ status: "Completed" }), "bad", interviewId],
    ["bad interview", JSON.stringify({ status: "Completed" }), id, "bad"],
    ["missing", "{}", id, interviewId],
    [
      "extra",
      JSON.stringify({ status: "Completed", extra: true }),
      id,
      interviewId,
    ],
  ])("rejects %s", async (_label, body, app, interview) => {
    const response = await call(body, app, interview);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });
  it("maps ownership/not-found and unexpected errors safely", async () => {
    mocks.updateInterviewStatus.mockRejectedValueOnce(
      new mocks.InterviewNotFoundError(),
    );
    expect((await call(JSON.stringify({ status: "Completed" }))).status).toBe(
      404,
    );
    mocks.updateInterviewStatus.mockRejectedValueOnce(
      new Error("database-secret"),
    );
    const response = await call(JSON.stringify({ status: "Completed" }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("database-secret");
  });
});
