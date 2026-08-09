"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Search, X } from "lucide-react";
import { useState } from "react";

import {
  applicationsQueryKey,
  applicationsQueryRoot,
  fetchApplications,
  normalizeApplicationSearch,
  updateApplicationStatusRequest,
} from "@/lib/application-query";
import { ApplicationListView, ApplicationStatus } from "@/lib/application";

function ApplicationStatusControl({
  application,
}: {
  application: { id: string; status: ApplicationStatus; positionTitle: string };
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: ApplicationStatus) =>
      updateApplicationStatusRequest(application.id, status),
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: applicationsQueryRoot }),
  });
  return (
    <div className="text-right">
      <select
        id={`status-${application.id}`}
        aria-label={`Status for ${application.positionTitle}`}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
        value={application.status}
        disabled={mutation.isPending}
        onChange={(event) =>
          mutation.mutate(event.target.value as ApplicationStatus)
        }
      >
        {Object.values(ApplicationStatus).map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      {mutation.isPending && (
        <p role="status" className="mt-1 text-xs">
          Updating status…
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="mt-1 text-xs text-emerald-700">
          Status updated.
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="mt-1 text-xs text-rose-700">
          Status update failed. Select a status to try again.
        </p>
      )}
    </div>
  );
}

export function ActiveApplicationList() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ApplicationListView>(
    ApplicationListView.Active,
  );
  const normalizedSearch = normalizeApplicationSearch(search);
  const selectedLabel =
    view === ApplicationListView.Active ? "Active" : "Closed";
  const selectedLabelLower = selectedLabel.toLowerCase();
  const applications = useQuery({
    queryKey: applicationsQueryKey(view, normalizedSearch),
    queryFn: () => fetchApplications(view, normalizedSearch),
  });

  return (
    <section aria-labelledby="applications-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Your pipeline</p>
          <h2
            id="applications-heading"
            className="text-2xl font-semibold text-slate-950"
          >
            {selectedLabel} applications
          </h2>
        </div>
        {applications.data && applications.data.length > 0 && (
          <p className="text-sm text-slate-500">
            {applications.data.length} {selectedLabelLower}
          </p>
        )}
      </div>

      <div
        className="mt-6 inline-flex rounded-xl border border-slate-300 bg-slate-50 p-1"
        role="group"
        aria-label="Application view"
      >
        {Object.values(ApplicationListView).map((option) => {
          const label =
            option === ApplicationListView.Active ? "Active" : "Closed";
          return (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === option
                  ? "bg-slate-950 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
              onClick={() => setView(option)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 max-w-xl">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="application-search"
        >
          Search {selectedLabelLower} applications
        </label>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="application-search"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-24 pl-10 text-base text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Company or position title"
            aria-controls="application-results"
          />
          {normalizedSearch && (
            <button
              className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              type="button"
              onClick={() => setSearch("")}
            >
              <X className="size-4" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div id="application-results" aria-live="polite">
        {applications.isPending && (
          <p className="mt-6 rounded-2xl bg-slate-100 p-6" role="status">
            Loading {selectedLabelLower} applications…
          </p>
        )}
        {applications.isError && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <p role="alert">
              {selectedLabel} applications could not be loaded.
            </p>
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
            {normalizedSearch
              ? `No ${selectedLabelLower} applications match “${normalizedSearch}”.`
              : view === ApplicationListView.Active
                ? "No active applications yet. Add one to start your pipeline."
                : "No closed applications yet."}
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
                  <ApplicationStatusControl application={application} />
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
      </div>
    </section>
  );
}
