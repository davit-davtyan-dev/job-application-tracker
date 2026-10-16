"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

import { type Interview, InterviewStatus } from "@/lib/interview";
import {
  createInterviewRequest,
  fetchInterviews,
  interviewsQueryKey,
  updateInterviewStatusRequest,
} from "@/lib/interview-query";
import { historyQueryKey } from "@/lib/history-query";

export function InterviewSection({
  application,
}: {
  application: { id: string; positionTitle: string };
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section
      className="mt-1 border-t border-slate-100 pt-1"
      aria-label={`Interviews for ${application.positionTitle}`}
    >
      <button
        type="button"
        className="text-sm font-semibold text-slate-800"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide interviews" : "Manage interviews"}
      </button>
      {expanded && <InterviewContent application={application} />}
    </section>
  );
}

function InterviewContent({
  application,
}: {
  application: { id: string; positionTitle: string };
}) {
  const queryClient = useQueryClient();
  const queryKey = interviewsQueryKey(application.id);
  const interviews = useQuery({
    queryKey,
    queryFn: () => fetchInterviews(application.id),
  });
  const create = useMutation({
    mutationFn: (scheduledAt: string) =>
      createInterviewRequest(application.id, scheduledAt),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({
          queryKey: historyQueryKey(application.id),
        }),
      ]);
    },
  });
  const [scheduledAt, setScheduledAt] = useState("");

  return (
    <div className="mt-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const instant = new Date(scheduledAt);
          if (!scheduledAt || Number.isNaN(instant.getTime())) return;
          create.mutate(instant.toISOString(), {
            onSuccess: () => setScheduledAt(""),
          });
        }}
      >
        <label
          className="block text-sm text-slate-700"
          htmlFor={`interview-date-${application.id}`}
        >
          Schedule interview
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id={`interview-date-${application.id}`}
            type="datetime-local"
            required
            value={scheduledAt}
            disabled={create.isPending}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-slate-950 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
          >
            Add interview
          </button>
        </div>
      </form>
      {create.isPending && (
        <p role="status" className="mt-2 text-xs">
          Scheduling interview…
        </p>
      )}
      {create.isSuccess && (
        <p role="status" className="mt-2 text-xs text-emerald-700">
          Interview scheduled.
        </p>
      )}
      {create.isError && (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          Interview could not be scheduled. Submit again to retry.
        </p>
      )}
      {interviews.isPending && (
        <p role="status" className="mt-3 text-sm">
          Loading interviews…
        </p>
      )}
      {interviews.isError && (
        <div className="mt-3 text-sm">
          <p role="alert">Interviews could not be loaded.</p>
          <button
            type="button"
            className="underline"
            onClick={() => void interviews.refetch()}
          >
            Retry interviews
          </button>
        </div>
      )}
      {interviews.isSuccess && interviews.data.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">No interviews scheduled.</p>
      )}
      {interviews.isSuccess && (
        <ul className="mt-3 space-y-3">
          {interviews.data.map((interview) => (
            <InterviewRow
              key={interview.id}
              applicationId={application.id}
              interview={interview}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InterviewRow({
  applicationId,
  interview,
}: {
  applicationId: string;
  interview: Interview;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["interview-status", interview.id],
    scope: { id: `interview-status-${interview.id}` },
    mutationFn: (status: InterviewStatus) =>
      updateInterviewStatusRequest(applicationId, interview.id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: interviewsQueryKey(applicationId),
        }),
        queryClient.invalidateQueries({
          queryKey: historyQueryKey(applicationId),
        }),
      ]);
    },
  });

  return (
    <li className="rounded-lg bg-slate-50 p-3 text-sm">
      <time dateTime={interview.scheduledAt.toISOString()}>
        {format(interview.scheduledAt, "MMM d, yyyy h:mm a")}
      </time>
      <div className="mt-2">
        <select
          aria-label={`Status for interview on ${format(interview.scheduledAt, "MMM d, yyyy h:mm a")}`}
          value={interview.status}
          disabled={mutation.isPending}
          onChange={(event) =>
            mutation.mutate(event.target.value as InterviewStatus)
          }
          className="rounded-lg border border-slate-300 bg-white px-2 py-1"
        >
          {Object.values(InterviewStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {mutation.isPending && (
          <p role="status" className="mt-1 text-xs">
            Updating interview…
          </p>
        )}
        {mutation.isSuccess && (
          <p role="status" className="mt-1 text-xs text-emerald-700">
            Interview updated.
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="mt-1 text-xs text-rose-700">
            Update failed. Select a status to retry.
          </p>
        )}
      </div>
    </li>
  );
}
