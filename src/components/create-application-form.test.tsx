import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateApplicationForm } from "./create-application-form";

const renderForm = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <CreateApplicationForm />
    </QueryClientProvider>,
  );

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
        new Response(JSON.stringify({ id: "app" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

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
});

function localDateForTest() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}
