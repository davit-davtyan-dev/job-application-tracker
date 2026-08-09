import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
});
