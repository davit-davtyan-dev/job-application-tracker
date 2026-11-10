"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ApplicationStatus } from "@/lib/application";
import { applicationsQueryRoot } from "@/lib/application-query";
import { companyHistoryQueryKey } from "@/lib/company-history-query";
import { companiesQueryKey, fetchCompanies } from "@/lib/company-query";
import { Field } from "./ui/field";
import { CompanyNameField } from "./company-name-field";
import {
  apiErrorSchema,
  formSchema,
  FormValues,
  importResultSchema,
  importUrlSchema,
} from "@/lib/forms";

const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

async function responseJson(response: Response): Promise<unknown> {
  return response.json();
}

export function CreateApplicationForm() {
  const [importUrl, setImportUrl] = useState("");
  const [importValidationError, setImportValidationError] = useState<
    string | null
  >(null);
  const queryClient = useQueryClient();
  const companies = useQuery({
    queryKey: companiesQueryKey,
    queryFn: fetchCompanies,
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: "",
      companyName: "",
      positionTitle: "",
      appliedDate: localDate(),
      status: ApplicationStatus.Applied,
      description: "",
      referenceLinks: [],
      notes: "",
    },
  });
  const links = useFieldArray({
    control: form.control,
    name: "referenceLinks",
  });
  const companyId = useWatch({ control: form.control, name: "companyId" });
  const importMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch("/api/job-posting-extraction", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await responseJson(response);
      if (!response.ok) {
        const parsedError = apiErrorSchema.safeParse(body);
        throw new Error(
          parsedError.success
            ? parsedError.data.error.message
            : "Job-posting details could not be imported. Try again.",
        );
      }
      return importResultSchema.parse(body);
    },
    onSuccess: (imported) => {
      const company = imported.companyName
        ? companies.data?.find(
            ({ name }) =>
              name.toLocaleLowerCase() ===
              (imported.companyName ?? "").toLocaleLowerCase(),
          )
        : undefined;
      if (company) {
        form.setValue("companyId", company.id, { shouldDirty: true });
        form.setValue("companyName", "", { shouldDirty: true });
      } else if (imported.companyName) {
        form.setValue("companyId", "", { shouldDirty: true });
        form.setValue("companyName", imported.companyName, {
          shouldDirty: true,
        });
      } else {
        form.setValue("companyId", "", { shouldDirty: true });
        form.setValue("companyName", "", { shouldDirty: true });
      }
      form.setValue("positionTitle", imported.positionTitle ?? "", {
        shouldDirty: true,
      });
      form.setValue("description", imported.description ?? "", {
        shouldDirty: true,
      });
      links.replace([{ value: imported.sourceUrl }]);
      form.clearErrors([
        "companyId",
        "companyName",
        "positionTitle",
        "referenceLinks",
      ]);
    },
  });
  const startImport = () => {
    const parsed = importUrlSchema.safeParse(importUrl.trim());
    if (!parsed.success) {
      setImportValidationError(
        parsed.error.issues[0]?.message ?? "Invalid URL.",
      );
      return;
    }
    setImportValidationError(null);
    importMutation.reset();
    importMutation.mutate(parsed.data);
  };
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(values.companyId
            ? { companyId: values.companyId }
            : { companyName: values.companyName }),
          positionTitle: values.positionTitle,
          appliedDate: values.appliedDate,
          status: values.status,
          description: values.description || undefined,
          referenceLinks: values.referenceLinks
            .map(({ value }) => value)
            .filter(Boolean),
          notes: values.notes || undefined,
        }),
      });
      const body = await responseJson(response);
      if (!response.ok)
        throw new Error(
          "Application could not be saved. Check the form and try again.",
        );
      return z.strictObject({ companyId: z.uuid() }).passthrough().parse(body);
    },
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationsQueryRoot }),
        queryClient.invalidateQueries({
          queryKey: companyHistoryQueryKey(created.companyId),
        }),
      ]);
    },
  });
  const successCompany = companyId
    ? companies.data?.find(({ id }) => id === companyId)?.name
    : form.getValues("companyName");

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-labelledby="create-heading"
    >
      <h2 id="create-heading" className="text-xl font-semibold">
        Add an application
      </h2>
      <form
        className="mt-4 space-y-2"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <div>
          <label
            className="block text-sm font-medium"
            htmlFor="job-posting-url"
          >
            Job-posting URL
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="job-posting-url"
              className="input"
              type="url"
              value={importUrl}
              onChange={(event) => {
                setImportUrl(event.target.value);
                setImportValidationError(null);
                importMutation.reset();
              }}
              aria-invalid={Boolean(importValidationError)}
              aria-describedby={
                importValidationError ? "job-posting-url-error" : undefined
              }
            />
            <Button
              type="button"
              variant="outline"
              disabled={importMutation.isPending || companies.isPending}
              onClick={startImport}
            >
              {importMutation.isPending ? "Importing…" : "Import details"}
            </Button>
          </div>
          {importValidationError && (
            <p className="error" id="job-posting-url-error" role="alert">
              {importValidationError}
            </p>
          )}
          {importMutation.isError && (
            <p className="error" role="alert">
              {importMutation.error.message}
            </p>
          )}
          {importMutation.isSuccess && (
            <p className="mt-1 text-sm text-emerald-700" role="status">
              Job-posting details imported. Review them before saving.
            </p>
          )}
        </div>
        <CompanyNameField companies={companies.data} form={form} />
        <Field
          label="Position title"
          error={form.formState.errors.positionTitle?.message}
        >
          <input className="input" {...form.register("positionTitle")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Applied date"
            error={form.formState.errors.appliedDate?.message}
          >
            <input
              className="input"
              type="date"
              {...form.register("appliedDate")}
            />
          </Field>
          <Field label="Status" error={form.formState.errors.status?.message}>
            <select className="input" {...form.register("status")}>
              {Object.values(ApplicationStatus).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Job description (Markdown)">
          <textarea
            className="input min-h-24"
            {...form.register("description")}
          />
        </Field>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reference links</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => links.append({ value: "" })}
            >
              <Plus className="size-4" /> Add link
            </Button>
          </div>
          {links.fields.map((field, index) => {
            const error =
              form.formState.errors.referenceLinks?.[index]?.value?.message;
            const errorId = `reference-${index}-error`;

            return (
              <div className="mt-2" key={field.id}>
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor={`reference-${index}`}>
                    Reference URL {index + 1}
                  </label>
                  <input
                    id={`reference-${index}`}
                    className="input"
                    type="url"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    {...form.register(`referenceLinks.${index}.value`)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Remove reference URL ${index + 1}`}
                    onClick={() => links.remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {error && (
                  <p className="error" id={errorId}>
                    {error}
                  </p>
                )}
              </div>
            );
          })}
          {form.formState.errors.referenceLinks?.root?.message && (
            <p className="error">
              {form.formState.errors.referenceLinks.root.message}
            </p>
          )}
        </div>
        <Field label="Application notes">
          <textarea className="input min-h-20" {...form.register("notes")} />
        </Field>
        {mutation.isError && (
          <p className="error" role="alert">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p
            className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            Application for {form.getValues("positionTitle")} at{" "}
            {successCompany} was created.
          </p>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Create application"}
        </Button>
      </form>
    </section>
  );
}
