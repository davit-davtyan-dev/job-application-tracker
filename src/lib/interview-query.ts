import type { Interview, InterviewStatus } from "@/lib/interview";

export const interviewsQueryKey = (applicationId: string) =>
  ["applications", applicationId, "interviews"] as const;

export async function fetchInterviews(
  applicationId: string,
): Promise<Interview[]> {
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/interviews`,
  );
  if (!response.ok) throw new Error("Interviews could not be loaded.");
  const body = (await response.json()) as {
    interviews: Array<
      Omit<Interview, "scheduledAt" | "createdAt" | "updatedAt"> & {
        scheduledAt: string;
        createdAt: string;
        updatedAt: string;
      }
    >;
  };
  return body.interviews.map((item) => ({
    ...item,
    scheduledAt: new Date(item.scheduledAt),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }));
}

export async function createInterviewRequest(
  applicationId: string,
  scheduledAt: string,
) {
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/interviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt }),
    },
  );
  if (!response.ok) throw new Error("Interview could not be scheduled.");
}

export async function updateInterviewStatusRequest(
  applicationId: string,
  interviewId: string,
  status: InterviewStatus,
) {
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(interviewId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) throw new Error("Interview status could not be updated.");
}
