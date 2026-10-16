"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useState } from "react";

import {
  ActivityEventType,
  type ActivityEventType as ActivityEventTypeValue,
} from "@/lib/history";
import { fetchApplicationHistory, historyQueryKey } from "@/lib/history-query";

const eventLabels = {
  [ActivityEventType.ApplicationCreated]: "Application created",
  [ActivityEventType.StatusChanged]: "Application status changed",
  [ActivityEventType.InterviewScheduled]: "Interview scheduled",
  [ActivityEventType.InterviewCompleted]: "Interview completed",
  [ActivityEventType.InterviewCancelled]: "Interview cancelled",
} satisfies Record<ActivityEventTypeValue, string>;

export function ActivityHistorySection({
  application,
}: {
  application: { id: string; positionTitle: string };
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section
      className="mt-1 border-t border-slate-100 pt-1"
      aria-label={`Activity for ${application.positionTitle}`}
    >
      <button
        type="button"
        className="text-sm font-semibold text-slate-800"
        aria-expanded={expanded}
        aria-controls={`activity-${application.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide activity" : "View activity"}
      </button>
      {expanded && <ActivityContent application={application} />}
    </section>
  );
}

function ActivityContent({ application }: { application: { id: string } }) {
  const history = useQuery({
    queryKey: historyQueryKey(application.id),
    queryFn: () => fetchApplicationHistory(application.id),
  });
  return (
    <div id={`activity-${application.id}`} className="mt-3 text-sm">
      {history.isPending && <p role="status">Loading activity…</p>}
      {history.isError && (
        <div>
          <p role="alert">Activity could not be loaded.</p>
          <button
            type="button"
            className="underline"
            onClick={() => void history.refetch()}
          >
            Retry activity
          </button>
        </div>
      )}
      {history.isSuccess && history.data.length === 0 && (
        <p className="text-slate-500">No activity recorded.</p>
      )}
      {history.isSuccess && history.data.length > 0 && (
        <ol className="space-y-3">
          {history.data.map((item) => (
            <li key={item.id} className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium">{eventLabels[item.eventType]}</p>
              <p className="text-slate-600">Status: {item.status}</p>
              {item.interviewId && (
                <p className="text-slate-600">Interview: {item.interviewId}</p>
              )}
              <time className="text-slate-500" dateTime={item.createdAt}>
                {format(parseISO(item.createdAt), "MMM d, yyyy h:mm a")}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
