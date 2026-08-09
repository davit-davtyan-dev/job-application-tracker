import { expect, test } from "@playwright/test";

test("shows the application navigation and primary workflows", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Job Application Tracker/);
  await expect(page.getByText("Job Application Tracker")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add first application" }),
  ).toHaveAttribute("href", "#create-application");
  await expect(
    page.getByRole("heading", { name: "Add an application" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Active applications" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Search applications" }),
  ).toHaveAttribute("href", "#active-application-search");
  await expect(
    page.getByRole("searchbox", { name: "Search active applications" }),
  ).toHaveAttribute("aria-controls", "active-application-results");
  await expect(page.locator("#create-application")).toBeVisible();
  await expect(page.locator("#active-application-search")).toBeVisible();
  await expect(page.locator("#active-application-results")).toBeVisible();
});
