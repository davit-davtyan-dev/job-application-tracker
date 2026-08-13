import Markdown, { type Components, defaultUrlTransform } from "react-markdown";

interface MarkdownContentProps {
  children: string;
}

const markdownComponents: Components = {
  a: ({ children, href, title }) =>
    href ? (
      <a href={href} title={title}>
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
};

export function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <div className="space-y-2 text-sm text-slate-700 [&_a]:font-medium [&_a]:text-emerald-700 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown
        skipHtml
        components={markdownComponents}
        urlTransform={defaultUrlTransform}
      >
        {children}
      </Markdown>
    </div>
  );
}
