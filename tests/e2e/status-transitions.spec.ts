import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("changes status by keyboard across active and closed views without navigation", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("Status transition E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const company = `Status Company ${suffix}`;
  try {
    const [{ id: companyId }] = await sql<
      { id: string }[]
    >`INSERT INTO companies (name) VALUES (${company}) RETURNING id`;
    const [{ id }] = await sql<
      { id: string }[]
    >`INSERT INTO job_applications (company_id, position_title, applied_date, status) VALUES (${companyId}, ${`Transition ${suffix}`}, '2026-08-09', 'Applied') RETURNING id`;
    await page.goto("/");
    const search = page.locator("#application-search");
    await search.fill(`Transition ${suffix}`);
    const selector = page.getByRole("combobox", {
      name: `Status for Transition ${suffix}`,
    });
    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );

    await selector.focus();
    await page.route(`**/api/applications/${id}/status`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Temporary failure." },
        }),
      });
    });
    await selector.selectOption("Interviewing");
    await expect(
      page.getByText("Status update failed. Select a status to try again.", {
        exact: true,
      }),
    ).toHaveAttribute("role", "alert");
    await expect(selector).toHaveValue("Applied");
    const [unchanged] = await sql<
      { status: string }[]
    >`SELECT status FROM job_applications WHERE id = ${id}`;
    expect(unchanged?.status).toBe("Applied");

    await page.unroute(`**/api/applications/${id}/status`);
    await selector.selectOption("Interviewing");
    await expect(selector).toHaveValue("Interviewing");
    await expect(page.getByText("Status updated.")).toBeVisible();
    await selector.selectOption("Offer");
    await expect(selector).toHaveValue("Offer");
    await expect(page.getByText("Status updated.")).toBeVisible();
    await selector.selectOption("Rejected");
    await expect(page.getByText(/No active applications match/)).toBeVisible();
    await page.getByRole("button", { name: "Closed" }).press("Enter");
    await expect(search).toHaveValue(`Transition ${suffix}`);
    const closedSelector = page.getByRole("combobox", {
      name: `Status for Transition ${suffix}`,
    });
    await expect(closedSelector).toHaveValue("Rejected");
    await closedSelector.selectOption("Applied");
    await expect(page.getByText(/No closed applications match/)).toBeVisible();
    expect(
      await page.evaluate(
        () => performance.getEntriesByType("navigation").length,
      ),
    ).toBe(navigationCount);

    const [persisted] = await sql<
      { status: string }[]
    >`SELECT status FROM job_applications WHERE id = ${id}`;
    const history = await sql<
      { status: string }[]
    >`SELECT status FROM activity_history WHERE application_id = ${id} AND event_type = 'status_changed' ORDER BY created_at`;
    expect(persisted?.status).toBe("Applied");
    expect(history.map((row) => row.status)).toEqual([
      "Interviewing",
      "Offer",
      "Rejected",
      "Applied",
    ]);
  } finally {
    await sql`DELETE FROM activity_history WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company}))`;
    await sql`DELETE FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company})`;
    await sql`DELETE FROM companies WHERE name = ${company}`;
    await sql.end();
  }
});
