import { Building2 } from "lucide-react";

import { CompanyManagement } from "@/components/company-management";
import { SiteNavigation } from "@/components/site-navigation";

export default function CompaniesPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-10 lg:px-12">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <span
            className="rounded-xl bg-slate-950 p-2.5 text-white"
            aria-hidden
          >
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Personal workspace
            </p>
            <p className="font-semibold text-slate-950">
              Job Application Tracker
            </p>
          </div>
        </div>
        <SiteNavigation />
      </header>
      <section className="py-10" aria-labelledby="companies-heading">
        <h1
          id="companies-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          Companies
        </h1>
        <p className="mt-2 text-slate-600">
          Create and maintain the companies connected to your applications.
        </p>
        <CompanyManagement />
      </section>
    </main>
  );
}
