"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { applicationsQueryRoot } from "@/lib/application-query";
import {
  companiesQueryKey,
  type CompanyResponse,
  createCompanyRequest,
  deleteCompanyRequest,
  fetchCompanies,
  updateCompanyRequest,
} from "@/lib/company-query";

interface Draft {
  name: string;
  notes: string;
}

const blankDraft = (): Draft => ({ name: "", notes: "" });

export function CompanyManagement() {
  const queryClient = useQueryClient();
  const companies = useQuery({
    queryKey: companiesQueryKey,
    queryFn: fetchCompanies,
    retry: false,
  });
  const [createDraft, setCreateDraft] = useState(blankDraft);
  const [createAttempted, setCreateAttempted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(blankDraft);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const refreshConsumers = async (companyId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: companiesQueryKey }),
      queryClient.invalidateQueries({ queryKey: applicationsQueryRoot }),
      ...(companyId
        ? [
            queryClient.invalidateQueries({
              queryKey: ["companies", companyId, "history"],
            }),
          ]
        : []),
    ]);
  };

  const create = useMutation({
    mutationFn: createCompanyRequest,
    onSuccess: async () => {
      setCreateDraft(blankDraft());
      setCreateAttempted(false);
      await refreshConsumers();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: Draft }) =>
      updateCompanyRequest(id, draft),
    onSuccess: async (company) => {
      setEditingId(null);
      await refreshConsumers(company.id);
    },
  });
  const remove = useMutation({
    mutationFn: deleteCompanyRequest,
    onSuccess: async (_result, id) => {
      setConfirmingId(null);
      await refreshConsumers(id);
    },
  });

  const createNameError =
    createAttempted && !createDraft.name.trim()
      ? "Company name is required."
      : undefined;

  return (
    <div className="mt-8 space-y-8">
      <form
        className="rounded-2xl border bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          setCreateAttempted(true);
          create.reset();
          if (!createDraft.name.trim()) return;
          create.mutate(createDraft);
        }}
        noValidate
      >
        <h2 className="text-lg font-semibold">Add a company</h2>
        <CompanyFields
          prefix="create"
          draft={createDraft}
          onChange={setCreateDraft}
          nameError={createNameError}
        />
        {create.isError && (
          <p role="alert" className="error">
            {create.error.message}
          </p>
        )}
        <Button className="mt-4" type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create company"}
        </Button>
      </form>

      <section aria-labelledby="company-list-heading">
        <h2 id="company-list-heading" className="text-xl font-semibold">
          Company list
        </h2>
        {companies.isPending && (
          <p role="status" className="mt-4">
            Loading companies…
          </p>
        )}
        {companies.isError && (
          <div className="mt-4 rounded-xl border bg-white p-5" role="alert">
            <p>{companies.error.message}</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => companies.refetch()}
            >
              Retry loading companies
            </Button>
          </div>
        )}
        {companies.isSuccess && companies.data.length === 0 && (
          <p className="mt-4 rounded-xl border bg-white p-5">
            No companies yet. Add your first company above.
          </p>
        )}
        {companies.isSuccess && companies.data.length > 0 && (
          <ul className="mt-4 space-y-4">
            {companies.data.map((company) => (
              <li
                key={company.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                {editingId === company.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      update.reset();
                      if (!editDraft.name.trim()) return;
                      update.mutate({ id: company.id, draft: editDraft });
                    }}
                    noValidate
                  >
                    <CompanyFields
                      prefix={`edit-${company.id}`}
                      draft={editDraft}
                      onChange={setEditDraft}
                      nameError={
                        !editDraft.name.trim()
                          ? "Company name is required."
                          : undefined
                      }
                    />
                    {update.isError && (
                      <p role="alert" className="error">
                        {update.error.message}
                      </p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button type="submit" disabled={update.isPending}>
                        {update.isPending ? "Saving…" : "Save company"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={update.isPending}
                        onClick={() => {
                          update.reset();
                          setEditingId(null);
                        }}
                      >
                        Cancel editing
                      </Button>
                    </div>
                  </form>
                ) : (
                  <CompanySummary company={company} />
                )}

                {editingId !== company.id && confirmingId !== company.id && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        update.reset();
                        setEditingId(company.id);
                        setEditDraft({
                          name: company.name,
                          notes: company.notes ?? "",
                        });
                      }}
                    >
                      Edit {company.name}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        remove.reset();
                        setConfirmingId(company.id);
                      }}
                    >
                      Delete {company.name}
                    </Button>
                  </div>
                )}
                {confirmingId === company.id && (
                  <div
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
                    role="alertdialog"
                    aria-label={`Delete ${company.name}`}
                  >
                    <p className="font-medium">
                      Permanently delete {company.name}?
                    </p>
                    <p className="mt-1 text-sm">
                      All applications, interviews, and activity history owned
                      by this company will be permanently removed.
                    </p>
                    {remove.isError && (
                      <p role="alert" className="error">
                        {remove.error.message}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(company.id)}
                      >
                        {remove.isPending
                          ? "Deleting…"
                          : `Confirm delete ${company.name}`}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={remove.isPending}
                        onClick={() => {
                          remove.reset();
                          setConfirmingId(null);
                        }}
                      >
                        Cancel deletion
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CompanySummary({ company }: { company: CompanyResponse }) {
  return (
    <div>
      <h3 className="text-lg font-semibold">{company.name}</h3>
      <div className="mt-3">
        {company.notes ? (
          <MarkdownContent>{company.notes}</MarkdownContent>
        ) : (
          <p className="text-sm text-slate-500 italic">No notes.</p>
        )}
      </div>
    </div>
  );
}

function CompanyFields({
  prefix,
  draft,
  onChange,
  nameError,
}: {
  prefix: string;
  draft: Draft;
  onChange: (draft: Draft) => void;
  nameError?: string;
}) {
  const nameErrorId = `${prefix}-name-error`;
  return (
    <div className="mt-4 grid gap-4">
      <label className="text-sm font-medium" htmlFor={`${prefix}-name`}>
        Company name
        <input
          className="input mt-1"
          id={`${prefix}-name`}
          value={draft.name}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? nameErrorId : undefined}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
        {nameError && (
          <span className="error" id={nameErrorId}>
            {nameError}
          </span>
        )}
      </label>
      <label className="text-sm font-medium" htmlFor={`${prefix}-notes`}>
        Company notes (Markdown)
        <textarea
          className="input mt-1 min-h-24"
          id={`${prefix}-notes`}
          value={draft.notes}
          onChange={(event) =>
            onChange({ ...draft, notes: event.target.value })
          }
        />
      </label>
    </div>
  );
}
