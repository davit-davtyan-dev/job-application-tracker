import Link from "next/link";

export function SiteNavigation() {
  return (
    <nav aria-label="Primary" className="flex items-center gap-4 text-sm">
      <Link
        className="font-medium text-slate-700 hover:text-slate-950"
        href="/"
      >
        Applications
      </Link>
      <Link
        className="font-medium text-slate-700 hover:text-slate-950"
        href="/companies"
      >
        Companies
      </Link>
    </nav>
  );
}
