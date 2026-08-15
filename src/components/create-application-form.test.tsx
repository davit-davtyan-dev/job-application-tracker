import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateApplicationForm } from "./create-application-form";

const renderForm = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <CreateApplicationForm />
    </QueryClientProvider>,
  );
  return { client, ...view };
};

describe("CreateApplicationForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defaults date/status, validates fields, and confirms a successful creation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "bc76d153-54f0-46d5-86ff-b5d65b60bccb", name: "Acme" },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "app",
            companyId: "bc76d153-54f0-46d5-86ff-b5d65b60bccb",
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderForm();
    const invalidateQueries = vi.spyOn(client, "invalidateQueries");

    expect(screen.getByLabelText("Status")).toHaveValue("Applied");
    expect(screen.getByLabelText("Applied date")).toHaveValue(
      localDateForTest(),
    );
    await user.click(
      screen.getByRole("button", { name: "Create application" }),
    );
    expect(
      await screen.findByText("Position title is required."),
    ).toBeVisible();
    await user.selectOptions(
      await screen.findByRole("combobox", { name: /Company/ }),
      "bc76d153-54f0-46d5-86ff-b5d65b60bccb",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Position title/ }),
      "Engineer",
    );
    await user.click(
      screen.getByRole("button", { name: "Create application" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Application for Engineer at Acme was created.",
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["applications"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        "companies",
        "bc76d153-54f0-46d5-86ff-b5d65b60bccb",
        "history",
      ],
    });
  });

  it("supports inline company and preserves values after a server error", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("[]", { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: {} }), { status: 500 }),
        ),
    );
    renderForm();
    await user.click(screen.getByLabelText("New company"));
    await user.type(screen.getByLabelText("New company name"), "New Co");
    await user.type(screen.getByLabelText("Position title"), "Designer");
    await user.click(
      screen.getByRole("button", { name: "Create application" }),
    );
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByLabelText("New company name")).toHaveValue("New Co");
  });

  it("shows an associated URL error and does not submit invalid links", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "bc76d153-54f0-46d5-86ff-b5d65b60bccb", name: "Acme" },
          ]),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await screen.findByRole("option", { name: "Acme" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Company" }),
      "bc76d153-54f0-46d5-86ff-b5d65b60bccb",
    );
    await user.type(screen.getByLabelText("Position title"), "Engineer");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    const urlInput = screen.getByLabelText("Reference URL 1");
    await user.type(urlInput, "not-a-url");
    await user.click(
      screen.getByRole("button", { name: "Create application" }),
    );

    const error = await screen.findByText("Enter a valid URL.");
    expect(error).toBeVisible();
    expect(urlInput).toHaveAccessibleDescription("Enter a valid URL.");
    expect(urlInput).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/companies");
  });

  it("rejects an invalid import URL without a request and exposes an accessible error", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    await screen.findByLabelText("Job-posting URL");
    const input = screen.getByLabelText("Job-posting URL");
    expect(input).toHaveAttribute("type", "url");
    await user.type(input, "not a URL");
    await user.click(screen.getByRole("button", { name: "Import details" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid job-posting URL.",
    );
    expect(input).toHaveAccessibleDescription("Enter a valid job-posting URL.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/companies");
  });

  it("replaces dirty posting fields, matches company case-insensitively, and preserves user-owned fields", async () => {
    const user = userEvent.setup();
    const companyId = "bc76d153-54f0-46d5-86ff-b5d65b60bccb";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: companyId, name: "Acme & Co" }])),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sourceUrl: "https://jobs.example.com/engineer",
            companyName: "acme & co",
            positionTitle: "Imported Engineer",
            description: "Imported description",
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    await screen.findByRole("option", { name: "Acme & Co" });

    await user.click(screen.getByLabelText("New company"));
    await user.type(screen.getByLabelText("New company name"), "Stale Co");
    await user.type(screen.getByLabelText("Position title"), "Stale title");
    await user.type(
      screen.getByLabelText("Job description (Markdown)"),
      "Stale description",
    );
    await user.clear(screen.getByLabelText("Applied date"));
    await user.type(screen.getByLabelText("Applied date"), "2026-08-01");
    await user.selectOptions(screen.getByLabelText("Status"), "Interviewing");
    await user.type(screen.getByLabelText("Application notes"), "Keep notes");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(
      screen.getByLabelText("Reference URL 1"),
      "https://stale.example.com",
    );
    await user.type(
      screen.getByLabelText("Job-posting URL"),
      "https://jobs.example.com/engineer",
    );
    await user.click(screen.getByRole("button", { name: "Import details" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Job-posting details imported",
    );
    expect(screen.getByLabelText("Existing company")).toBeChecked();
    expect(screen.getByLabelText("Company")).toHaveValue(companyId);
    expect(screen.getByLabelText("Position title")).toHaveValue(
      "Imported Engineer",
    );
    expect(screen.getByLabelText("Job description (Markdown)")).toHaveValue(
      "Imported description",
    );
    expect(screen.getByLabelText("Reference URL 1")).toHaveValue(
      "https://jobs.example.com/engineer",
    );
    expect(screen.queryByLabelText("Reference URL 2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Applied date")).toHaveValue("2026-08-01");
    expect(screen.getByLabelText("Status")).toHaveValue("Interviewing");
    expect(screen.getByLabelText("Application notes")).toHaveValue(
      "Keep notes",
    );
  });

  it.each([
    ["New Company", "new", "New Company"],
    [null, "existing", ""],
  ] as const)(
    "handles imported company %s using %s mode and clears missing posting fields",
    async (companyName, expectedMode, expectedCompanyName) => {
      const user = userEvent.setup();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response("[]"))
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                sourceUrl: "https://example.com/job",
                companyName,
                positionTitle: null,
                description: null,
              }),
            ),
          ),
      );
      renderForm();
      await user.click(screen.getByLabelText("New company"));
      await user.type(screen.getByLabelText("New company name"), "Stale");
      await user.type(screen.getByLabelText("Position title"), "Stale");
      await user.type(
        screen.getByLabelText("Job description (Markdown)"),
        "Stale",
      );
      await user.type(
        screen.getByLabelText("Job-posting URL"),
        "https://example.com/job",
      );
      await user.click(screen.getByRole("button", { name: "Import details" }));
      await screen.findByText(/Job-posting details imported/);

      expect(
        screen.getByLabelText(
          `${expectedMode === "new" ? "New" : "Existing"} company`,
        ),
      ).toBeChecked();
      if (expectedMode === "new") {
        expect(screen.getByLabelText("New company name")).toHaveValue(
          expectedCompanyName,
        );
      } else {
        expect(screen.getByLabelText("Company")).toHaveValue("");
      }
      expect(screen.getByLabelText("Position title")).toHaveValue("");
      expect(screen.getByLabelText("Job description (Markdown)")).toHaveValue(
        "",
      );
    },
  );

  it("prevents duplicate clicks while importing and reports server failures", async () => {
    const user = userEvent.setup();
    let resolveImport: ((response: Response) => void) | undefined;
    const importResponse = new Promise<Response>((resolve) => {
      resolveImport = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("[]"))
      .mockReturnValueOnce(importResponse);
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    await user.type(
      screen.getByLabelText("Job-posting URL"),
      "https://example.com/job",
    );
    const button = screen.getByRole("button", { name: "Import details" });
    await user.click(button);
    expect(screen.getByRole("button", { name: "Importing…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Importing…" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolveImport?.(
      new Response(
        JSON.stringify({ error: { message: "The page is not HTML." } }),
        { status: 422 },
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The page is not HTML.",
    );
  });
});

function localDateForTest() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}
