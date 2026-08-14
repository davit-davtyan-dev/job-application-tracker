import { Search, X } from "lucide-react";

interface SearchAreaProps {
  search: string;
  setSearch: (value: string) => void;
  selectedLabelLower: string;
  normalizedSearch: string;
}

export function SearchArea({
  search,
  setSearch,
  selectedLabelLower,
  normalizedSearch,
}: SearchAreaProps) {
  return (
    <div className="mt-6 max-w-xl">
      <label
        className="text-sm font-medium text-slate-700"
        htmlFor="application-search"
      >
        Search {selectedLabelLower} applications
      </label>
      <div className="relative mt-2">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id="application-search"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-24 pl-10 text-base text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Company or position title"
          aria-controls="application-results"
        />
        {normalizedSearch && (
          <button
            className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
            type="button"
            onClick={() => setSearch("")}
          >
            <X className="size-4" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
