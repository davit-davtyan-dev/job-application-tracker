"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { cloneElement } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ApplicationStatus } from "@/lib/application";

const formSchema = z
  .object({
    companyMode: z.enum(["existing", "new"]),
    companyId: z.string(),
    companyName: z.string(),
    positionTitle: z.string().trim().min(1, "Position title is required."),
    appliedDate: z.string().min(1, "Applied date is required."),
    status: z.enum(ApplicationStatus),
    description: z.string(),
    referenceLinks: z.array(
      z.object({
        value: z.union([z.literal(""), z.url("Enter a valid URL.")]),
      }),
    ),
    notes: z.string(),
  })
  .superRefine((value, context) => {
    const field =
      value.companyMode === "existing" ? "companyId" : "companyName";
    if (!value[field].trim())
      context.addIssue({
        code: "custom",
        path: [field],
        message: "Company is required.",
      });
  });

type FormValues = z.input<typeof formSchema>;
type Company = { id: string; name: string };

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
  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await fetch("/api/companies");
      if (!response.ok) throw new Error("Companies could not be loaded.");
      return (await responseJson(response)) as Company[];
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyMode: "existing",
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
  const mode = useWatch({ control: form.control, name: "companyMode" });
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(values.companyMode === "existing"
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
      return body;
    },
  });
  const successCompany =
    mode === "existing"
      ? companies.data?.find(({ id }) => id === form.getValues("companyId"))
          ?.name
      : form.getValues("companyName");

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="create-heading"
    >
      <h2 id="create-heading" className="text-xl font-semibold">
        Add an application
      </h2>
      <form
        className="mt-5 space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <fieldset>
          <legend className="text-sm font-medium">Company choice</legend>
          <div className="mt-2 flex gap-4">
            <label>
              <input
                type="radio"
                value="existing"
                {...form.register("companyMode")}
              />{" "}
              Existing company
            </label>
            <label>
              <input
                type="radio"
                value="new"
                {...form.register("companyMode")}
              />{" "}
              New company
            </label>
          </div>
        </fieldset>
        {mode === "existing" ? (
          <Field
            label="Company"
            error={form.formState.errors.companyId?.message}
          >
            <select
              className="input"
              {...form.register("companyId")}
              disabled={companies.isPending}
            >
              <option value="">Select a company</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field
            label="New company name"
            error={form.formState.errors.companyName?.message}
          >
            <input className="input" {...form.register("companyName")} />
          </Field>
        )}
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
          {links.fields.map((field, index) => (
            <div className="mt-2 flex gap-2" key={field.id}>
              <label className="sr-only" htmlFor={`reference-${index}`}>
                Reference URL {index + 1}
              </label>
              <input
                id={`reference-${index}`}
                className="input"
                type="url"
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
          ))}
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
}) {
  const id = label.toLowerCase().replaceAll(/[^a-z]+/g, "-");
  return (
    <label className="block text-sm font-medium" htmlFor={id}>
      {label}
      <span className="mt-1 block">
        {cloneElement(children, {
          id,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? `${id}-error` : undefined,
        })}
      </span>
      {error && (
        <span className="error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
