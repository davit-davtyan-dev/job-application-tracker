import { ApplicationListView, ApplicationStatus } from "@/lib/application";

interface StatusFilterAreaProps {
  view: ApplicationListView;
  status: ApplicationStatus | undefined;
  handleSelectView: (view: ApplicationListView) => void;
  selectedLabelLower: string;
  setStatus: (status: ApplicationStatus | undefined) => void;
}

export function StatusFilterArea({
  view,
  status,
  handleSelectView,
  selectedLabelLower,
  setStatus,
}: StatusFilterAreaProps) {
  const statusOptions =
    view === ApplicationListView.Active
      ? [
          ApplicationStatus.Applied,
          ApplicationStatus.Interviewing,
          ApplicationStatus.Offer,
        ]
      : [
          ApplicationStatus.Accepted,
          ApplicationStatus.Rejected,
          ApplicationStatus.Withdrawn,
          ApplicationStatus.Archived,
        ];

  return (
    <>
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
              onClick={() => handleSelectView(option)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <p
          id="application-status-filter-label"
          className="text-sm font-medium text-slate-700"
        >
          Filter {selectedLabelLower} applications by exact status
        </p>
        <div
          id="application-status-filter"
          className="mt-2 inline-flex flex-wrap rounded-xl border border-slate-300 bg-slate-50 p-1"
          role="group"
          aria-labelledby="application-status-filter-label"
        >
          {[undefined, ...statusOptions].map((option) => {
            const isSelected = status === option;
            return (
              <button
                key={option ?? "all"}
                type="button"
                aria-pressed={isSelected}
                aria-controls="application-results"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-white"
                }`}
                onClick={() => setStatus(option)}
              >
                {option ?? "All"}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
