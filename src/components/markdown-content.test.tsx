import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  afterEach(cleanup);

  it("renders common Markdown as semantic React elements", () => {
    render(
      <MarkdownContent>{`# Role overview

A **strong** paragraph with [the job](https://example.com/job).

- TypeScript
- PostgreSQL

1. Apply
2. Interview

Use \`pnpm test\`.

\`\`\`ts
const safe = true;
\`\`\``}</MarkdownContent>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Role overview" }),
    ).toBeVisible();
    expect(screen.getByText("strong").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "the job" })).toHaveAttribute(
      "href",
      "https://example.com/job",
    );
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getByText("pnpm test").tagName).toBe("CODE");
    expect(screen.getByText("const safe = true;").tagName).toBe("CODE");
  });

  it("does not create active DOM from hostile HTML or URL schemes", () => {
    const { container } = render(
      <MarkdownContent>{`<script>window.pwned = true</script>
<img src=x onerror="window.pwned = true">
<a href="javascript:alert(1)" onclick="window.pwned = true">raw link</a>

[unsafe](javascript:alert(1)) [safe](https://example.com)`}</MarkdownContent>,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onclick], [onerror]")).toBeNull();
    expect(screen.queryByText("raw link")).toBeNull();
    expect(screen.getByText("unsafe")).not.toHaveAttribute("href");
    expect(screen.getByRole("link", { name: "safe" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(
      within(container).queryByRole("link", { name: "unsafe" }),
    ).toBeNull();
  });
});
