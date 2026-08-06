import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("tracker landing page", () => {
  it("identifies the application and its current readiness", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /keep every application moving forward/i,
      }),
    ).toBeVisible();
    expect(screen.getByText("Workspace ready")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add first application" }),
    ).toBeDisabled();
  });
});
