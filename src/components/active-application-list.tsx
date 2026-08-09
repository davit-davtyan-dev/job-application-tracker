"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

import {
  activeApplicationsQueryKey,
  fetchActiveApplications,
} from "@/lib/application-query";

export function ActiveApplicationList() {
  const applications = useQuery({
    queryKey: activeApplicationsQueryKey,
    queryFn: fetchActiveApplications,
  });

  return (
    <section aria-labelledby="active-applications-heading">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Your pipeline</p>
          <h2
            id="active-applications-heading"
            className="text-2xl font-semibold text-slate-950"
          >
            Active applications
          </h2>
        </div>
        {applications.data && applications.data.length > 0 && (
          <p className="text-sm text-slate-500">
            {applications.data.length} active
          </p>
        )}
      </div>

      {applications.isPending && (
        <p className="mt-6 rounded-2xl bg-slate-100 p-6" role="status">
          Loading active applications…
        </p>
      )}
      {applications.isError && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p role="alert">Active applications could not be loaded.</p>
          <button
            className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            type="button"
            onClick={() => void applications.refetch()}
          >
            Try again
          </button>
        </div>
      )}
      {applications.isSuccess && applications.data.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          No active applications yet. Add one to start your pipeline.
        </p>
      )}
      {applications.isSuccess && applications.data.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {applications.data.map((application) => (
            <li
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              key={application.id}
              data-application-id={application.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-950">
                    {application.positionTitle}
                  </h3>
                  <p className="mt-1 text-slate-600">
                    {application.companyName}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                  {application.status}
                </span>
              </div>
              <p className="mt-5 text-sm text-slate-500">
                Applied{" "}
                <time dateTime={application.appliedDate}>
                  {format(parseISO(application.appliedDate), "MMM d, yyyy")}
                </time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
