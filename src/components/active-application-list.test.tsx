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
      "/api/applications?view=active&search=Acme+%26+Sons",
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledWith("/api/applications?view=active");
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
    resolvers.get("/api/applications?view=active&search=current")?.(
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
    resolvers.get("/api/applications?view=active&search=older")?.(
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

  it("switches accessibly between keyed views while preserving search and cached results", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            applications: url.includes("view=closed")
              ? [
                  {
                    id: "closed",
                    companyName: "Closed Co",
                    positionTitle: "Closed role",
                    appliedDate: "2026-08-08",
                    status: "Rejected",
                  },
                ]
              : [
                  {
                    id: "active",
                    companyName: "Active Co",
                    positionTitle: "Active role",
                    appliedDate: "2026-08-09",
                    status: "Applied",
                  },
                ],
          }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderList();

    const active = screen.getByRole("button", { name: "Active" });
    const closed = screen.getByRole("button", { name: "Closed" });
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(closed).toHaveAttribute("aria-pressed", "false");
    expect(await screen.findByText("Active role")).toBeVisible();

    const search = screen.getByRole("searchbox", {
      name: "Search active applications",
    });
    await userEvent.type(search, "Acme & Sons");
    await userEvent.click(closed);
    expect(search).toHaveValue("Acme & Sons");
    expect(closed).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: "Closed applications" }),
    ).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "Search closed applications" }),
    ).toBe(search);
    expect(await screen.findByText("Closed role")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications?view=closed&search=Acme+%26+Sons",
    );

    await userEvent.click(active);
    expect(await screen.findByText("Active role")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications?view=active&search=Acme+%26+Sons",
    );
  });

  it("uses selected-view loading, count, empty, error, and retry copy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ applications: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("no", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            applications: [
              {
                id: "closed",
                companyName: "Done Co",
                positionTitle: "Done role",
                appliedDate: "2026-08-09",
                status: "Accepted",
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderList();
    await screen.findByText(/No active applications yet/);
    await userEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Closed applications could not be loaded",
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Done role")).toBeVisible();
    expect(screen.getByText("1 closed")).toBeVisible();
  });

  it("offers all labelled statuses and refreshes a same-group change", async () => {
    let status = "Applied";
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        status = "Offer";
        return Promise.resolve(
          new Response(JSON.stringify({ status }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            applications: [
              {
                id: "app/encoded",
                companyName: "Acme",
                positionTitle: "Engineer",
                appliedDate: "2026-08-09",
                status,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    renderList();
    const selector = await screen.findByRole("combobox", {
      name: "Status for Engineer",
    });
    expect(screen.getAllByRole("option")).toHaveLength(7);
    await userEvent.selectOptions(selector, "Offer");
    expect(await screen.findByText("Status updated.")).toBeVisible();
    expect(selector).toHaveValue("Offer");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications/app%2Fencoded/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "Offer" }),
      }),
    );
  });

  it("isolates pending controls and removes a cross-group result after refetch", async () => {
    let resolvePatch: (() => void) | undefined;
    let moved = false;
    const applications = [
      {
        id: "one",
        companyName: "One",
        positionTitle: "First",
        appliedDate: "2026-08-09",
        status: "Applied",
      },
      {
        id: "two",
        companyName: "Two",
        positionTitle: "Second",
        appliedDate: "2026-08-08",
        status: "Interviewing",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "PATCH")
          return new Promise<Response>((resolve) => {
            resolvePatch = () => {
              moved = true;
              resolve(new Response("{}", { status: 200 }));
            };
          });
        return Promise.resolve(
          new Response(
            JSON.stringify({
              applications: moved ? applications.slice(1) : applications,
            }),
            { status: 200 },
          ),
        );
      }),
    );
    renderList();
    const first = await screen.findByRole("combobox", {
      name: "Status for First",
    });
    const second = screen.getByRole("combobox", { name: "Status for Second" });
    await userEvent.selectOptions(first, "Rejected");
    expect(first).toBeDisabled();
    expect(second).toBeEnabled();
    resolvePatch?.();
    expect(await screen.findByText("1 active")).toBeVisible();
    expect(screen.queryByText("First")).toBeNull();
  });

  it("retains persisted status after failure and permits another selection", async () => {
    let status = "Applied";
    let patchAttempts = 0;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        patchAttempts += 1;
        if (patchAttempts === 1) {
          return Promise.resolve(new Response("no", { status: 500 }));
        }
        status = "Interviewing";
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            applications: [
              {
                id: "retry",
                companyName: "Retry Co",
                positionTitle: "Retry role",
                appliedDate: "2026-08-09",
                status,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    renderList();

    const selector = await screen.findByRole("combobox", {
      name: "Status for Retry role",
    });
    await userEvent.selectOptions(selector, "Rejected");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Status update failed",
    );
    expect(selector).toHaveValue("Applied");
    expect(selector).toBeEnabled();

    await userEvent.selectOptions(selector, "Interviewing");
    expect(await screen.findByText("Status updated.")).toBeVisible();
    expect(selector).toHaveValue("Interviewing");
    expect(patchAttempts).toBe(2);
  });

  it("loads, creates, and updates interviews within one encoded application card", async () => {
    const applicationId = "app/encoded";
    const interviewId = "interview/encoded";
    let interviewStatus = "Scheduled";
    let interviewCount = 1;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/applications?view=active")
        return Promise.resolve(
          Response.json({
            applications: [
              {
                id: applicationId,
                companyName: "Interview Co",
                positionTitle: "Interview role",
                appliedDate: "2026-08-10",
                status: "Interviewing",
              },
            ],
          }),
        );
      if (init?.method === "POST") {
        interviewCount = 2;
        return Promise.resolve(Response.json({}, { status: 201 }));
      }
      if (init?.method === "PATCH") {
        interviewStatus = "Completed";
        return Promise.resolve(Response.json({}));
      }
      return Promise.resolve(
        Response.json({
          interviews: Array.from({ length: interviewCount }, (_, index) => ({
            id: index === 0 ? interviewId : "second",
            applicationId,
            scheduledAt:
              index === 0
                ? "2026-08-12T09:30:00.000Z"
                : "2026-08-13T09:30:00.000Z",
            status: index === 0 ? interviewStatus : "Scheduled",
            createdAt: "2026-08-10T10:00:00.000Z",
            updatedAt: "2026-08-10T10:00:00.000Z",
          })),
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    renderList();
    await userEvent.click(
      await screen.findByRole("button", { name: "Manage interviews" }),
    );
    expect(
      screen.getByRole("region", { name: "Interviews for Interview role" }),
    ).toBeVisible();
    const selector = await screen.findByRole("combobox", {
      name: /Status for interview/,
    });
    expect(selector).toHaveValue("Scheduled");
    await userEvent.selectOptions(selector, "Completed");
    expect(await screen.findByText("Interview updated.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications/app%2Fencoded/interviews/interview%2Fencoded/status",
      expect.objectContaining({ method: "PATCH" }),
    );
    fireEvent.change(screen.getByLabelText("Schedule interview"), {
      target: { value: "2026-08-14T10:30" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Add interview" }),
    );
    expect(await screen.findByText("Interview scheduled.")).toBeVisible();
    expect(
      screen.getAllByRole("combobox", { name: /Status for interview/ }),
    ).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications/app%2Fencoded/interviews",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
