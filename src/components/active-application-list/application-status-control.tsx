import { ApplicationStatus } from "@/lib/application";
import {
  applicationsQueryRoot,
  updateApplicationStatusRequest,
} from "@/lib/application-query";
import { companyHistoryQueryKey } from "@/lib/company-history-query";
import { historyQueryKey } from "@/lib/history-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function ApplicationStatusControl({
  application,
}: {
  application: {
    id: string;
    companyId: string;
    status: ApplicationStatus;
    positionTitle: string;
  };
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: ApplicationStatus) =>
      updateApplicationStatusRequest(application.id, status),
    onSuccess: async (_data, status) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: applicationsQueryRoot }),
        queryClient.invalidateQueries({
          queryKey: historyQueryKey(application.id),
        }),
      ];
      if (status !== application.status)
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: companyHistoryQueryKey(application.companyId),
          }),
        );
      await Promise.all(invalidations);
    },
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
