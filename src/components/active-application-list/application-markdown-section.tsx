import { useState } from "react";
import { MarkdownContent } from "../markdown-content";

export function ApplicationMarkdownSection({
  label,
  content,
}: {
  label: string;
  content: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!content?.trim()) return null;

  return (
    <section className="mt-5 border-t border-slate-100 pt-4" aria-label={label}>
      <button
        type="button"
        className="text-sm font-semibold text-slate-800"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {label}
      </button>
      {expanded && <MarkdownContent>{content}</MarkdownContent>}
    </section>
  );
}
