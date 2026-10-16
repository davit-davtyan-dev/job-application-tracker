import { format } from "date-fns";
import { BriefcaseBusiness } from "lucide-react";

import { CreateApplicationForm } from "@/components/create-application-form";
import { ActiveApplicationList } from "@/components/active-application-list/active-application-list";
import { SiteNavigation } from "@/components/site-navigation";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-10 lg:px-12">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <span
            className="rounded-xl bg-slate-950 p-2.5 text-white"
            aria-hidden="true"
          >
            <BriefcaseBusiness className="size-5" />
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
        <div className="flex flex-col items-end gap-2">
          <SiteNavigation />
          <time
            className="hidden text-sm text-slate-500 sm:block"
            dateTime={new Date().toISOString()}
          >
            {format(new Date(), "MMMM d, yyyy")}
          </time>
        </div>
      </header>

      <section
        className="flex flex-1 items-center py-4"
        aria-labelledby="tracker-heading"
      >
        <div className="grid w-full gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-3">
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
                href="#create-application"
              >
                Add first application
              </a>
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
                href="#application-search"
              >
                Search applications
              </a>
            </div>
          </div>
        </div>
      </section>
      <div className="pb-16">
        <ActiveApplicationList />
      </div>
      <div id="create-application" className="pb-16">
        <CreateApplicationForm />
      </div>
    </main>
  );
}
