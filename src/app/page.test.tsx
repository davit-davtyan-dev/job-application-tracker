import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("tracker landing page", () => {
  it("identifies the application and its current readiness", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Home />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /keep every application moving forward/i,
      }),
    ).toBeVisible();
    expect(screen.getByText("Workspace ready")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Add first application" }),
    ).toHaveAttribute("href", "#create-application");
    expect(
      screen.getByRole("heading", { name: "Add an application" }),
    ).toBeVisible();
  });
});
