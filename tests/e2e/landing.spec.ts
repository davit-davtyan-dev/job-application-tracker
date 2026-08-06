import { expect, test } from "@playwright/test";

test("shows the tracker foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Job Application Tracker/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Keep every application moving forward/,
  );
  await expect(page.getByText("Workspace ready")).toBeVisible();
});
