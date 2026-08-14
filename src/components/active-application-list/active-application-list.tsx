"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useState } from "react";

import {
  applicationsQueryKey,
  fetchApplications,
  normalizeApplicationSearch,
} from "@/lib/application-query";
import { ApplicationListView, ApplicationStatus } from "@/lib/application";
import { InterviewSection } from "@/components/interview-section";
import { ActivityHistorySection } from "@/components/activity-history-section";
import { CompanyHistorySection } from "@/components/company-history-section";
import { ApplicationStatusControl } from "./application-status-control";
import { ApplicationMarkdownSection } from "./application-markdown-section";
import { SearchArea } from "./search-area";
import { StatusFilterArea } from "./status-filter-area";

export function ActiveApplicationList() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ApplicationListView>(
    ApplicationListView.Active,
  );
  const [status, setStatus] = useState<ApplicationStatus | undefined>();
  const normalizedSearch = normalizeApplicationSearch(search);
  const selectedLabel =
    view === ApplicationListView.Active ? "Active" : "Closed";
  const selectedLabelLower = selectedLabel.toLowerCase();
  const applications = useQuery({
    queryKey: applicationsQueryKey(view, normalizedSearch, status),
    queryFn: () => fetchApplications(view, normalizedSearch, status),
  });

  const selectView = (nextView: ApplicationListView) => {
    if (nextView === view) {
      return;
    }
    setStatus(undefined);
    setView(nextView);
  };

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

      <StatusFilterArea
        view={view}
        handleSelectView={selectView}
        selectedLabelLower={selectedLabelLower}
        setStatus={setStatus}
      />

      <SearchArea
        search={search}
        setSearch={setSearch}
        selectedLabelLower={selectedLabelLower}
        normalizedSearch={normalizedSearch}
      />

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
            {normalizedSearch && status
              ? `No ${selectedLabelLower} applications with status “${status}” match “${normalizedSearch}”.`
              : normalizedSearch
                ? `No ${selectedLabelLower} applications match “${normalizedSearch}”.`
                : status
                  ? `No ${selectedLabelLower} applications have status “${status}”.`
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
                <ApplicationMarkdownSection
                  label="Job description"
                  content={application.description}
                />
                <ApplicationMarkdownSection
                  label="Application notes"
                  content={application.notes}
                />
                <ApplicationMarkdownSection
                  label="Company notes"
                  content={application.companyNotes}
                />
                <InterviewSection application={application} />
                <ActivityHistorySection application={application} />
                <CompanyHistorySection application={application} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
