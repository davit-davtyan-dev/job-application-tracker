import { format } from "date-fns";
import { BriefcaseBusiness, CheckCircle2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateApplicationForm } from "@/components/create-application-form";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <header className="flex items-center justify-between border-b border-slate-200 pb-6">
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
        <time
          className="hidden text-sm text-slate-500 sm:block"
          dateTime={new Date().toISOString()}
        >
          {format(new Date(), "MMMM d, yyyy")}
        </time>
      </header>

      <section
        className="flex flex-1 items-center py-16"
        aria-labelledby="tracker-heading"
      >
        <div className="grid w-full gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Workspace ready
            </div>
            <h1
              id="tracker-heading"
              className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl"
            >
              Keep every application moving forward.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              A focused place to organize applications, follow interviews, and
              keep the next step visible.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
                href="#create-application"
              >
                Add first application
              </a>
              <Button variant="outline" disabled>
                <Search className="size-4" aria-hidden="true" />
                Search applications
              </Button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Add the details you want to remember after submitting.
            </p>
          </div>

          <aside
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            aria-label="Foundation status"
          >
            <h2 className="font-semibold text-slate-950">Foundation status</h2>
            <ul className="mt-5 space-y-4 text-sm text-slate-600">
              {[
                "Accessible application shell",
                "Validated server environment",
                "PostgreSQL migration workflow",
                "Automated quality checks",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2
                    className="size-5 text-emerald-600"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
      <div id="create-application" className="pb-16">
        <CreateApplicationForm />
      </div>
    </main>
  );
}
