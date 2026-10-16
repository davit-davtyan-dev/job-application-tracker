"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useState } from "react";

import {
  companyHistoryQueryKey,
  fetchCompanyHistory,
} from "@/lib/company-history-query";

interface ApplicationIdentity {
  id: string;
  companyId: string;
  companyName: string;
  positionTitle: string;
}

export function CompanyHistorySection({
  application,
}: {
  application: ApplicationIdentity;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className="mt-1 border-t border-slate-100 pt-1"
      aria-label={`Company history for ${application.companyName}`}
    >
      <button
        type="button"
        className="text-sm font-semibold text-slate-800"
        aria-expanded={expanded}
        aria-controls={`company-history-${application.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide company history" : "View company history"}
      </button>
      {expanded && <CompanyHistoryContent application={application} />}
    </section>
  );
}

function CompanyHistoryContent({
  application,
}: {
  application: ApplicationIdentity;
}) {
  const history = useQuery({
    queryKey: companyHistoryQueryKey(application.companyId),
    queryFn: () => fetchCompanyHistory(application.companyId),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <div id={`company-history-${application.id}`} className="mt-3 text-sm">
      <p className="font-medium text-slate-700">{application.companyName}</p>
      {history.isPending && <p role="status">Loading company history…</p>}
      {history.isError && (
        <div>
          <p role="alert">Company history could not be loaded.</p>
          <button
            type="button"
            className="underline"
            onClick={() => void history.refetch()}
          >
            Retry company history
          </button>
        </div>
      )}
      {history.isSuccess && history.data.length === 0 && (
        <p className="text-slate-500">
          No applications recorded for this company.
        </p>
      )}
      {history.isSuccess && history.data.length > 0 && (
        <ol className="mt-2 space-y-3">
          {history.data.map((item) => {
            const current = item.id === application.id;
            return (
              <li
                key={item.id}
                className="rounded-lg bg-slate-50 p-3"
                aria-current={current ? "true" : undefined}
              >
                <p className="font-medium">
                  {item.positionTitle}
                  {current && <span> (Current application)</span>}
                </p>
                <p className="text-slate-600">
                  Applied{" "}
                  <time dateTime={item.appliedDate}>
                    {format(parseISO(item.appliedDate), "MMM d, yyyy")}
                  </time>
                </p>
                <p className="text-slate-600">Status: {item.status}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
