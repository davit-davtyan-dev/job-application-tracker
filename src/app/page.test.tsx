import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

describe("tracker landing page", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the application navigation and primary workflows", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Home />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Job Application Tracker")).toBeVisible();
    expect(screen.getByRole("link", { name: "Companies" })).toHaveAttribute(
      "href",
      "/companies",
    );
    expect(
      screen.getByRole("link", { name: "Add first application" }),
    ).toHaveAttribute("href", "#create-application");
    expect(
      screen.getByRole("heading", { name: "Add an application" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Active applications" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Search applications" }),
    ).toHaveAttribute("href", "#application-search");
    expect(
      screen.getByRole("searchbox", { name: "Search active applications" }),
    ).toHaveAttribute("aria-controls", "application-results");
  });
});
