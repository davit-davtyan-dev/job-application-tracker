import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CompaniesPage from "./page";

describe("companies page", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("has one page heading, client navigation, and the management workflow", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CompaniesPage />
      </QueryClientProvider>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Companies" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Companies" })).toHaveAttribute(
      "href",
      "/companies",
    );
    expect(
      screen.getByRole("heading", { name: "Add a company" }),
    ).toBeVisible();
  });
});
