import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("reveals isolated company history and refreshes it after status changes", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("Company history E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const companyName = `History Company ${suffix}`;
  let companyId = "";
  let otherId = "";
  try {
    [{ id: companyId }] = await sql<
      { id: string }[]
    >`INSERT INTO companies (name) VALUES (${companyName}) RETURNING id`;
    [{ id: otherId }] = await sql<
      { id: string }[]
    >`INSERT INTO companies (name) VALUES (${`Other Company ${suffix}`}) RETURNING id`;
    const [{ id: olderId }] = await sql<
      { id: string }[]
    >`INSERT INTO job_applications (company_id, position_title, applied_date, status, created_at) VALUES (${companyId}, ${`Older ${suffix}`}, '2026-08-01', 'Rejected', '2026-08-02T00:00:00Z') RETURNING id`;
    const [{ id: currentId }] = await sql<
      { id: string }[]
    >`INSERT INTO job_applications (company_id, position_title, applied_date, status, created_at) VALUES (${companyId}, ${`Current ${suffix}`}, '2026-08-05', 'Applied', '2026-08-06T00:00:00Z') RETURNING id`;
    await sql`INSERT INTO job_applications (company_id, position_title, applied_date, status) VALUES (${otherId}, ${`Excluded ${suffix}`}, '2026-07-01', 'Applied')`;

    await page.goto("/");
    const search = page.getByRole("searchbox", {
      name: "Search active applications",
    });
    await search.fill(`Current ${suffix}`);
    await page.route(`**/api/companies/${companyId}/history`, async (route) =>
      route.fulfill({ status: 503, body: "{}" }),
    );
    await page
      .getByRole("button", { name: "View company history" })
      .press("Enter");
    await expect(
      page.getByText("Company history could not be loaded.", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await page.unroute(`**/api/companies/${companyId}/history`);
    await page.getByRole("button", { name: "Retry company history" }).click();
    const region = page.getByRole("region", {
      name: `Company history for ${companyName}`,
    });
    await expect(region.locator("li")).toHaveCount(2);
    await expect(region.locator("li").nth(0)).toContainText(`Older ${suffix}`);
    await expect(region.locator("li").nth(1)).toContainText(
      `Current ${suffix}`,
    );
    await expect(region.locator("li").nth(1)).toContainText(
      "Current application",
    );
    await expect(region).not.toContainText(`Excluded ${suffix}`);
    await expect(search).toHaveValue(`Current ${suffix}`);

    await page
      .getByRole("combobox", { name: `Status for Current ${suffix}` })
      .selectOption("Offer");
    await expect(region.getByText("Status: Offer")).toHaveCount(1);
    await page.reload();
    await search.fill(`Current ${suffix}`);
    await page.getByRole("button", { name: "View company history" }).click();
    await expect(
      page
        .getByRole("region", { name: `Company history for ${companyName}` })
        .getByText("Status: Offer"),
    ).toHaveCount(1);

    await page.getByRole("button", { name: "Closed" }).click();
    await page
      .getByRole("searchbox", { name: "Search closed applications" })
      .fill(`Older ${suffix}`);
    await page.getByRole("button", { name: "View company history" }).click();
    const closedRegion = page.getByRole("region", {
      name: `Company history for ${companyName}`,
    });
    await expect(closedRegion.locator("li")).toHaveCount(2);
    await expect(closedRegion.locator('[aria-current="true"]')).toContainText(
      `Older ${suffix}`,
    );
    expect(olderId).not.toBe(currentId);
  } finally {
    if (companyId && otherId) {
      await sql`DELETE FROM activity_history WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (${companyId}, ${otherId}))`;
      await sql`DELETE FROM job_applications WHERE company_id IN (${companyId}, ${otherId})`;
      await sql`DELETE FROM companies WHERE id IN (${companyId}, ${otherId})`;
    }
    await sql.end();
  }
});
