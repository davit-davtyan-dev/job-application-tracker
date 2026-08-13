import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActiveApplicationList } from "./active-application-list";

function renderList(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(
    <QueryClientProvider client={client}>
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

  it("renders labelled Markdown fields and omits null or blank sections", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          applications: [
            {
              id: "markdown-app",
              companyId: "company-1",
              companyName: "Markdown Co",
              companyNotes: "- Remote-first\n- Kind team",
              positionTitle: "Markdown Engineer",
              appliedDate: "2026-08-09",
              status: "Applied",
              description: "## Build safely\n\nUse **TypeScript**.",
              notes: "Remember `pnpm test`.",
            },
            {
              id: "blank-app",
              companyId: "company-2",
              companyName: "Blank Co",
              companyNotes: null,
              positionTitle: "Blank role",
              appliedDate: "2026-08-08",
              status: "Applied",
              description: "   \n ",
              notes: null,
            },
          ],
        }),
      ),
    );
    renderList();

    const markdownCard = (await screen.findByText("Markdown Engineer")).closest(
      "li",
    );
    expect(markdownCard).not.toBeNull();
    const card = within(markdownCard!);
    expect(card.getByRole("region", { name: "Job description" })).toBeVisible();
    expect(
      card.getByRole("region", { name: "Application notes" }),
    ).toBeVisible();
    expect(card.getByRole("region", { name: "Company notes" })).toBeVisible();
    expect(
      card.getByRole("heading", { level: 2, name: "Build safely" }),
    ).toBeVisible();
    expect(card.getByText("TypeScript").tagName).toBe("STRONG");
    expect(card.getByText("pnpm test").tagName).toBe("CODE");

    const blankCard = screen.getByText("Blank role").closest("li");
    expect(blankCard).not.toBeNull();
    expect(
      within(blankCard!).queryByRole("region", { name: /notes|description/i }),
    ).toBeNull();
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

  it("reveals an isolated encoded activity timeline with every label and retry", async () => {
    let historyAttempts = 0;
    const events = [
      "application_created",
      "status_changed",
      "interview_scheduled",
      "interview_completed",
      "interview_cancelled",
    ];
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/applications?view=active")
        return Promise.resolve(
          Response.json({
            applications: [
              {
                id: "app/encoded",
                companyName: "History Co",
                positionTitle: "History role",
                appliedDate: "2026-08-10",
                status: "Interviewing",
              },
            ],
          }),
        );
      historyAttempts += 1;
      if (historyAttempts === 1)
        return Promise.resolve(new Response("no", { status: 500 }));
      return Promise.resolve(
        Response.json({
          history: events.map((eventType, index) => ({
            id: `event-${index}`,
            applicationId: "app/encoded",
            interviewId: eventType.startsWith("interview_")
              ? "interview-id"
              : null,
            eventType,
            status: "Interviewing",
            createdAt: `2026-08-10T10:0${index}:00.000Z`,
          })),
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    renderList();
    const button = await screen.findByRole("button", { name: "View activity" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Activity could not be loaded",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Retry activity" }),
    );
    for (const label of [
      "Application created",
      "Application status changed",
      "Interview scheduled",
      "Interview completed",
      "Interview cancelled",
    ])
      expect(await screen.findByText(label)).toBeVisible();
    expect(screen.getAllByText("Interview: interview-id")).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications/app%2Fencoded/history",
    );
  });

  it("shows the affected card's activity loading and empty states", async () => {
    let resolveHistory: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/applications?view=active")
          return Promise.resolve(
            Response.json({
              applications: [
                {
                  id: "pending-app",
                  companyName: "Pending Co",
                  positionTitle: "Pending role",
                  appliedDate: "2026-08-10",
                  status: "Applied",
                },
              ],
            }),
          );
        return new Promise<Response>((resolve) => {
          resolveHistory = resolve;
        });
      }),
    );
    renderList();
    await userEvent.click(
      await screen.findByRole("button", { name: "View activity" }),
    );
    const activity = screen.getByRole("region", {
      name: "Activity for Pending role",
    });
    expect(within(activity).getByRole("status")).toHaveTextContent(
      "Loading activity",
    );
    resolveHistory?.(Response.json({ history: [] }));
    expect(
      await within(activity).findByText("No activity recorded."),
    ).toBeVisible();
  });

  it("shares company history by company, identifies current items, and retries safely", async () => {
    const companyId = "2b033428-a730-42c8-acf8-02574373b250";
    let attempts = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/applications?view=active")
        return Promise.resolve(
          Response.json({
            applications: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                companyId,
                companyName: "Shared Co",
                positionTitle: "First role",
                appliedDate: "2026-08-10",
                status: "Applied",
              },
              {
                id: "22222222-2222-4222-8222-222222222222",
                companyId,
                companyName: "Shared Co",
                positionTitle: "Second role",
                appliedDate: "2026-08-11",
                status: "Interviewing",
              },
            ],
          }),
        );
      attempts += 1;
      if (attempts === 1)
        return Promise.resolve(new Response("no", { status: 500 }));
      return Promise.resolve(
        Response.json({
          history: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              companyId,
              positionTitle: "First role",
              appliedDate: "2026-08-10",
              status: "Applied",
            },
            {
              id: "22222222-2222-4222-8222-222222222222",
              companyId,
              positionTitle: "Second role",
              appliedDate: "2026-08-11",
              status: "Interviewing",
            },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    renderList();
    const buttons = await screen.findAllByRole("button", {
      name: "View company history",
    });
    expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(buttons[0]!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Company history could not be loaded",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Retry company history" }),
    );
    const firstRegion = screen.getAllByRole("region", {
      name: "Company history for Shared Co",
    })[0]!;
    expect(
      (await within(firstRegion).findByText(/Current application/)).closest(
        "li",
      ),
    ).toHaveTextContent("First role");
    expect(within(firstRegion).getByText("Second role")).toBeVisible();
    await userEvent.click(buttons[1]!);
    expect(
      screen.getAllByText(/Current application/)[1]!.closest("li"),
    ).toHaveTextContent("Second role");
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes("/api/companies/"),
      ).length,
    ).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/companies/${companyId}/history`,
    );
  });

  it("refreshes only the affected history cache for application and interview mutations", async () => {
    const firstId = "first-app";
    const secondId = "second-app";
    const interviewId = "first-interview";
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(
      ["applications", firstId, "history"],
      [{ id: "first-history" }],
    );
    const unrelatedHistory = [{ id: "second-history" }];
    queryClient.setQueryData(
      ["applications", secondId, "history"],
      unrelatedHistory,
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    let firstStatus = "Applied";
    let interviews = [
      {
        id: interviewId,
        applicationId: firstId,
        scheduledAt: "2026-08-12T09:30:00.000Z",
        status: "Scheduled",
        createdAt: "2026-08-10T10:00:00.000Z",
        updatedAt: "2026-08-10T10:00:00.000Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url === "/api/applications?view=active")
          return Promise.resolve(
            Response.json({
              applications: [
                {
                  id: firstId,
                  companyName: "First Co",
                  positionTitle: "First role",
                  appliedDate: "2026-08-10",
                  status: firstStatus,
                },
                {
                  id: secondId,
                  companyName: "Second Co",
                  positionTitle: "Second role",
                  appliedDate: "2026-08-09",
                  status: "Applied",
                },
              ],
            }),
          );
        if (url === `/api/applications/${firstId}/status`) {
          firstStatus = "Offer";
          return Promise.resolve(Response.json({}));
        }
        if (
          url === `/api/applications/${firstId}/interviews` &&
          init?.method === "POST"
        ) {
          interviews = [
            ...interviews,
            { ...interviews[0]!, id: "second-interview" },
          ];
          return Promise.resolve(Response.json({}, { status: 201 }));
        }
        if (url.includes(`/interviews/${interviewId}/status`)) {
          interviews = interviews.map((item) =>
            item.id === interviewId ? { ...item, status: "Completed" } : item,
          );
          return Promise.resolve(Response.json({}));
        }
        if (url === `/api/applications/${firstId}/interviews`)
          return Promise.resolve(Response.json({ interviews }));
        throw new Error(`Unexpected request: ${url}`);
      }),
    );
    renderList(queryClient);
    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Status for First role" }),
      "Offer",
    );
    expect(await screen.findByText("Status updated.")).toBeVisible();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Manage interviews" })[0]!,
    );
    await screen.findByRole("combobox", { name: /Status for interview/ });
    fireEvent.change(screen.getByLabelText("Schedule interview"), {
      target: { value: "2026-08-14T10:30" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Add interview" }),
    );
    expect(await screen.findByText("Interview scheduled.")).toBeVisible();
    await userEvent.selectOptions(
      screen.getAllByRole("combobox", { name: /Status for interview/ })[0]!,
      "Completed",
    );
    expect(await screen.findByText("Interview updated.")).toBeVisible();

    const historyInvalidations = invalidateSpy.mock.calls
      .map(([filters]) => filters?.queryKey)
      .filter(
        (queryKey) =>
          queryKey?.[0] === "applications" && queryKey?.[2] === "history",
      );
    expect(historyInvalidations).toEqual([
      ["applications", firstId, "history"],
      ["applications", firstId, "history"],
      ["applications", firstId, "history"],
    ]);
    expect(historyInvalidations).not.toContainEqual([
      "applications",
      secondId,
      "history",
    ]);
    expect(
      queryClient.getQueryData(["applications", secondId, "history"]),
    ).toBe(unrelatedHistory);
  });
});
