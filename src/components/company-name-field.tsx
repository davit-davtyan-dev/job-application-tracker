import { Edit } from "lucide-react";
import type { CompanyResponse } from "@/lib/company-query";
import { Field } from "./ui/field";
import { UseFormReturn, useWatch } from "react-hook-form";
import { FormValues } from "@/lib/forms";

interface CompanyNameFieldProps {
  companies: CompanyResponse[] | undefined;
  form: UseFormReturn<FormValues>;
}

export function CompanyNameField({ companies, form }: CompanyNameFieldProps) {
  const inputValue = useWatch({ control: form.control, name: "companyName" });
  const companyId = useWatch({ control: form.control, name: "companyId" });

  const searchTerms = inputValue
    .toLowerCase()
    .split(" ")
    .filter((i) => !!i.trim())
    .map((i) => i.trim());

  const filteredCompanies = companies?.filter((company) =>
    searchTerms.some((term) => company.name.toLowerCase().includes(term)),
  );

  const selectedCompany = companies?.find(
    (company) => company.id === companyId,
  );

  if (selectedCompany) {
    return (
      <div className="">
        <button
          className="flex items-center gap-2 rounded border border-blue-500 bg-transparent px-3 py-1 font-semibold text-blue-700 hover:border-transparent hover:bg-blue-500 hover:text-white"
          onClick={() => {
            form.setValue("companyId", "", { shouldDirty: true });
            form.setValue("companyName", selectedCompany.name, {
              shouldDirty: true,
            });
          }}
        >
          {selectedCompany.name}
          <Edit className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Field
        label="Company name"
        error={form.formState.errors.companyName?.message}
      >
        <input className="input" {...form.register("companyName")} />
      </Field>
      <div className="flex gap-2 pt-1">
        {filteredCompanies?.slice(0, 5).map((company) => (
          <button
            key={company.id}
            className="rounded border border-blue-500 bg-transparent px-2 pt-1 text-sm font-semibold text-blue-700 hover:border-transparent hover:bg-blue-500 hover:text-white"
            onClick={() => {
              form.setValue("companyId", company.id, { shouldDirty: true });
              form.setValue("companyName", "", { shouldDirty: true });
            }}
          >
            {company.name}
          </button>
        ))}
      </div>
    </>
  );
}
