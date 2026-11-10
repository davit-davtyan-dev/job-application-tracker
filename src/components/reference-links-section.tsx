"use client";

import { useState } from "react";
import { ApplicationListItem } from "@/services/application";
import Link from "next/link";

// Map domain suffixes/keywords to clean labels
const DOMAIN_RULES: { pattern: string; label: string }[] = [
  { pattern: "linkedin.com", label: "LinkedIn" },
  { pattern: "lnkd.in", label: "LinkedIn" },
  { pattern: "t.me", label: "Telegram" },
  { pattern: "ashbyhq.com", label: "Ashby" },
  { pattern: "recruitee.com", label: "Recruitee" },
  { pattern: "keka.com", label: "Keka" },
  { pattern: "personio.com", label: "Personio" },
  { pattern: "jobgether.com", label: "Jobgether" },
  { pattern: "rvc.global", label: "RVC" },
  { pattern: "ycombinator.com", label: "Y Combinator" },
  { pattern: "weworkremotely.com", label: "We Work Remotely" },
  { pattern: "findmyremote.ai", label: "Find My Remote" },
  { pattern: "hirechain.io", label: "Hirechain" },
];

function getLinkLabel(link: string): string {
  try {
    const url = new URL(link);
    const hostname = url.hostname.toLowerCase();

    // Find the first rule where the hostname ends with or includes the pattern
    const matchedRule = DOMAIN_RULES.find(
      (rule) =>
        hostname === rule.pattern || hostname.endsWith(`.${rule.pattern}`),
    );

    if (matchedRule) {
      return matchedRule.label;
    }

    // Fallback: Clean up the domain name if no rule matches (e.g., "codingjobboard.com" -> "codingjobboard.com")
    return hostname.replace(/^www\./, "");
  } catch {
    // Handle invalid URLs safely
    return "External Link";
  }
}

interface ReferenceLinksSectionProps {
  application: ApplicationListItem;
}

export function ReferenceLinksSection({
  application,
}: ReferenceLinksSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!application.referenceLinks.length) {
    return null;
  }

  return (
    <section
      className="mt-1 border-t border-slate-100 pt-1"
      aria-label={`Company history for ${application.companyName}`}
    >
      <button
        type="button"
        className="text-sm font-semibold text-slate-800"
        aria-expanded={expanded}
        aria-controls={`reference-links-${application.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide reference links" : "View reference links"}
      </button>
      {expanded && <ReferenceLinksContent application={application} />}
    </section>
  );
}

interface ReferenceLinksContentProps {
  application: ApplicationListItem;
}

function ReferenceLinksContent({ application }: ReferenceLinksContentProps) {
  return (
    <div
      id={`reference-links-content-${application.id}`}
      className="mt-3 text-sm"
    >
      {application.referenceLinks.map((item, index) => (
        <div key={index}>
          <Link
            href={item}
            className="flex p-3 text-blue-600 underline transition-colors hover:text-blue-800 hover:no-underline"
            target="_blank"
          >
            {getLinkLabel(item)}
          </Link>
        </div>
      ))}
    </div>
  );
}
