import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanyManagement } from "./company-management";

const now = "2026-08-14T12:00:00.000Z";
const acmeId = "0f1db9a6-4ce4-4ab9-a8d8-f585f9fb3df8";

function renderManagement(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <CompanyManagement />
      </QueryClientProvider>,
    ),
  };
}

describe("CompanyManagement", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders safe Markdown and supports edit cancel without a request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json([
        {
          id: acmeId,
          name: "Acme",
          notes:
            "**Trusted** <script>alert(1)</script> [bad](javascript:alert(1))",
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );
    renderManagement(fetchMock);

    expect(await screen.findByText("Trusted")).toBeVisible();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.queryByRole("link", { name: "bad" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit Acme" }));
    const editName = screen.getAllByLabelText(/Company name/)[1]!;
    await user.clear(editName);
    await user.type(editName, "Draft");
    await user.click(screen.getByRole("button", { name: "Cancel editing" }));
    expect(screen.getByRole("heading", { name: "Acme" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates, creates, updates, and invalidates shared caches", async () => {
    const user = userEvent.setup();
    let company = {
      id: acmeId,
      name: "Acme",
      notes: null as string | null,
      createdAt: now,
      updatedAt: now,
    };
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          company = { ...company, name: "Beta", notes: "notes" };
          return Response.json(company, { status: 201 });
        }
        if (init?.method === "PATCH") {
          company = { ...company, name: "Alpha", notes: "updated" };
          return Response.json(company);
        }
        return Response.json(company.name === "Acme" ? [] : [company]);
      },
    );
    const { client } = renderManagement(fetchMock);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await screen.findByText("No companies yet. Add your first company above.");
    await user.click(screen.getByRole("button", { name: "Create company" }));
    expect(await screen.findByText("Company name is required.")).toBeVisible();
    await user.type(screen.getByLabelText(/Company name/), "Beta");
    await user.type(screen.getByLabelText("Company notes (Markdown)"), "notes");
    await user.click(screen.getByRole("button", { name: "Create company" }));
    expect(await screen.findByRole("heading", { name: "Beta" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Edit Beta" }));
    const editName = screen.getAllByLabelText(/Company name/)[1]!;
    await user.clear(editName);
    await user.type(editName, "Alpha");
    await user.click(screen.getByRole("button", { name: "Save company" }));
    expect(await screen.findByRole("heading", { name: "Alpha" })).toBeVisible();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["applications"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["companies"] });
  });

  it("requires confirmation, supports cancel, and prevents double deletion", async () => {
    const user = userEvent.setup();
    let companies = [
      { id: acmeId, name: "Acme", notes: null, createdAt: now, updatedAt: now },
    ];
    let resolveDelete: (() => void) | undefined;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          await new Promise<void>((resolve) => {
            resolveDelete = resolve;
          });
          companies = [];
          return new Response(null, { status: 204 });
        }
        return Response.json(companies);
      },
    );
    renderManagement(fetchMock);
    await screen.findByRole("heading", { name: "Acme" });

    await user.click(screen.getByRole("button", { name: "Delete Acme" }));
    expect(
      screen.getByRole("alertdialog", { name: "Delete Acme" }),
    ).toHaveTextContent("permanently removed");
    await user.click(screen.getByRole("button", { name: "Cancel deletion" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Delete Acme" }));
    const confirm = screen.getByRole("button", { name: "Confirm delete Acme" });
    await user.click(confirm);
    expect(confirm).toBeDisabled();
    resolveDelete?.();
    await waitFor(() =>
      expect(
        screen.getByText("No companies yet. Add your first company above."),
      ).toBeVisible(),
    );
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(1);
  });

  it("shows load failures with retry and preserves failed mutation drafts", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "A company with that name already exists." } },
          { status: 409 },
        ),
      );
    renderManagement(fetchMock);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Companies could not be loaded.",
    );
    await user.click(
      screen.getByRole("button", { name: "Retry loading companies" }),
    );
    await screen.findByText("No companies yet. Add your first company above.");
    await user.type(screen.getByLabelText("Company name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Create company" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "already exists",
    );
    expect(screen.getByLabelText("Company name")).toHaveValue("Acme");
  });
});
