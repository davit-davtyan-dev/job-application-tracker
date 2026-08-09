import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActiveApplicationList } from "./active-application-list";

function renderList() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ActiveApplicationList />
    </QueryClientProvider>,
  );
}

describe("ActiveApplicationList", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an accessible loading state and then the empty state", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveResponse = resolve;
          }),
      ),
    );
    renderList();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading active applications",
    );
    resolveResponse?.(
      new Response(JSON.stringify({ applications: [] }), { status: 200 }),
    );
    expect(await screen.findByText(/No active applications yet/)).toBeVisible();
  });

  it("renders company, position, semantic date, and textual status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            applications: [
              {
                id: "app-1",
                companyName: "Acme",
                positionTitle: "Engineer",
                appliedDate: "2026-08-09",
                status: "Interviewing",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    renderList();
    expect(await screen.findByText("Engineer")).toBeVisible();
    expect(screen.getByText("Acme")).toBeVisible();
    expect(screen.getByText("Interviewing")).toBeVisible();
    expect(screen.getByText("Aug 9, 2026").closest("time")).toHaveAttribute(
      "datetime",
      "2026-08-09",
    );
  });

  it("offers a retry after an error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("no", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ applications: [] }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderList();
    expect(await screen.findByRole("alert")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/No active applications yet/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("searches with URL encoding and clears back to the complete list", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            applications: url.includes("search=Acme+%26+Sons")
              ? [
                  {
                    id: "match",
                    companyName: "Acme & Sons",
                    positionTitle: "Engineer",
                    appliedDate: "2026-08-09",
                    status: "Applied",
                  },
                ]
              : [],
          }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderList();
    const input = screen.getByRole("searchbox", {
      name: "Search active applications",
    });
    await userEvent.type(input, "  Acme & Sons  ");
    expect(await screen.findByText("Acme & Sons")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications?search=Acme+%26+Sons",
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledWith("/api/applications");
  });

  it("shows a search-specific empty state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ applications: [] }), { status: 200 }),
        ),
      ),
    );
    renderList();
    await userEvent.type(
      screen.getByRole("searchbox", {
        name: "Search active applications",
      }),
      "Missing",
    );
    expect(
      await screen.findByText("No active applications match “Missing”."),
    ).toBeVisible();
    expect(screen.queryByText(/No active applications yet/)).toBeNull();
  });

  it("does not replace the current search with a stale response", async () => {
    const resolvers = new Map<string, (response: Response) => void>();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string) =>
          new Promise<Response>((resolve) => resolvers.set(url, resolve)),
      ),
    );
    renderList();
    const input = screen.getByRole("searchbox", {
      name: "Search active applications",
    });
    fireEvent.change(input, { target: { value: "older" } });
    fireEvent.change(input, { target: { value: "current" } });
    resolvers.get("/api/applications?search=current")?.(
      new Response(
        JSON.stringify({
          applications: [
            {
              id: "current",
              companyName: "Current Company",
              positionTitle: "Current result",
              appliedDate: "2026-08-09",
              status: "Applied",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(await screen.findByText("Current result")).toBeVisible();
    resolvers.get("/api/applications?search=older")?.(
      new Response(
        JSON.stringify({
          applications: [
            {
              id: "older",
              companyName: "Older Company",
              positionTitle: "Stale result",
              appliedDate: "2026-08-08",
              status: "Applied",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(screen.getByText("Current result")).toBeVisible();
    expect(screen.queryByText("Stale result")).toBeNull();
  });
});
