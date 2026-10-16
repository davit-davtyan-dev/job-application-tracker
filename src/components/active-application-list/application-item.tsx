import { ApplicationListItem } from "@/services/application";
import { ApplicationStatusControl } from "./application-status-control";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ApplicationMarkdownSection } from "./application-markdown-section";
import { InterviewSection } from "../interview-section";
import { ActivityHistorySection } from "../activity-history-section";
import { CompanyHistorySection } from "../company-history-section";
import { format, parseISO } from "date-fns";
import { useState } from "react";

interface ApplicationItemProps {
  application: ApplicationListItem;
}

export function ApplicationItem({ application }: ApplicationItemProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <li
      className="rounded-2xl border border-slate-200 bg-white p-4 pb-2 shadow-sm"
      data-application-id={application.id}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-950">
              {application.positionTitle}
            </h3>
            <p className="mt-1 text-slate-600">{application.companyName}</p>
          </div>
          <div>
            <ApplicationStatusControl application={application} />
            <p className="mt-2 w-max text-sm text-slate-500">
              Applied{" "}
              <time dateTime={application.appliedDate}>
                {format(parseISO(application.appliedDate), "MMM d, yyyy")}
              </time>
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="flex w-100 items-center justify-center"
            aria-expanded={detailsExpanded}
            onClick={() => setDetailsExpanded((value) => !value)}
          >
            {detailsExpanded ? (
              <ChevronUp className="size-6" />
            ) : (
              <ChevronDown className="size-6" />
            )}
          </button>
          {detailsExpanded && (
            <div className="pb-2">
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
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
