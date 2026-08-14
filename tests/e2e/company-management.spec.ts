import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("manages companies and permanently deletes the selected ownership tree", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("Company management E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const originalName = `Managed ${suffix}`;
  const renamedName = `Alpha ${suffix}`;
  const otherName = `Isolated ${suffix}`;
  let companyId = "";
  let otherId = "";
  try {
    [{ id: otherId }] = await sql<
      { id: string }[]
    >`INSERT INTO companies (name) VALUES (${otherName}) RETURNING id`;

    await page.goto("/");
    await page.getByRole("link", { name: "Companies" }).click();
    await expect(page).toHaveURL(/\/companies$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Companies",
    );

    await page.getByLabel("Company name").fill(originalName);
    await page
      .getByLabel("Company notes (Markdown)")
      .fill(
        "**Useful** <script>alert(1)</script> [unsafe](javascript:alert(1))",
      );
    await page.getByRole("button", { name: "Create company" }).click();
    const companyCard = page.locator("li").filter({ hasText: originalName });
    await expect(companyCard).toContainText("Useful");
    await expect(companyCard.locator("script")).toHaveCount(0);
    await expect(companyCard.getByRole("link", { name: "unsafe" })).toHaveCount(
      0,
    );

    [{ id: companyId }] = await sql<
      { id: string }[]
    >`SELECT id FROM companies WHERE name = ${originalName}`;
    const [{ id: applicationId }] = await sql<
      { id: string }[]
    >`INSERT INTO job_applications (company_id, position_title, applied_date, status) VALUES (${companyId}, ${`Owned ${suffix}`}, '2026-08-14', 'Applied') RETURNING id`;
    const [{ id: interviewId }] = await sql<
      { id: string }[]
    >`INSERT INTO interviews (application_id, scheduled_at) VALUES (${applicationId}, '2026-08-15T12:00:00Z') RETURNING id`;
    await sql`INSERT INTO activity_history (application_id, interview_id, event_type, status) VALUES (${applicationId}, ${interviewId}, 'interview_scheduled', 'Applied')`;

    await page.getByRole("button", { name: `Edit ${originalName}` }).click();
    const editName = page.getByLabel("Company name").last();
    await editName.fill("Discarded draft");
    await page.getByRole("button", { name: "Cancel editing" }).click();
    await expect(
      companyCard.getByRole("heading", { name: originalName }),
    ).toBeVisible();

    await page.getByRole("button", { name: `Edit ${originalName}` }).click();
    await page.getByLabel("Company name").last().fill(renamedName);
    await page
      .getByLabel("Company notes (Markdown)")
      .last()
      .fill("Renamed notes");
    await page.getByRole("button", { name: "Save company" }).click();
    await expect(
      page.getByRole("heading", { name: renamedName }),
    ).toBeVisible();

    await page.getByLabel("Company name").fill(renamedName.toUpperCase());
    await page.getByRole("button", { name: "Create company" }).click();
    await expect(
      page.getByText("A company with that name already exists.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel(/Company name/).first()).toHaveValue(
      renamedName.toUpperCase(),
    );

    await page.getByRole("button", { name: `Delete ${renamedName}` }).click();
    const dialog = page.getByRole("alertdialog", {
      name: `Delete ${renamedName}`,
    });
    await expect(dialog).toContainText("permanently removed");
    await dialog.getByRole("button", { name: "Cancel deletion" }).click();
    await expect(
      page.getByRole("heading", { name: renamedName }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Delete ${renamedName}` }).click();
    await page
      .getByRole("button", { name: `Confirm delete ${renamedName}` })
      .click();
    await expect(page.getByRole("heading", { name: renamedName })).toHaveCount(
      0,
    );

    const [{ ownedRows, isolatedRows }] = await sql<
      { ownedRows: number; isolatedRows: number }[]
    >`SELECT
      ((SELECT count(*) FROM companies WHERE id = ${companyId}) +
       (SELECT count(*) FROM job_applications WHERE id = ${applicationId}) +
       (SELECT count(*) FROM interviews WHERE id = ${interviewId}) +
       (SELECT count(*) FROM activity_history WHERE application_id = ${applicationId}))::int AS "ownedRows",
      (SELECT count(*)::int FROM companies WHERE id = ${otherId}) AS "isolatedRows"`;
    expect(ownedRows).toBe(0);
    expect(isolatedRows).toBe(1);

    await page.getByRole("link", { name: "Applications" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page
      .getByRole("searchbox", { name: "Search active applications" })
      .fill(`Owned ${suffix}`);
    await expect(page.getByText(`Owned ${suffix}`)).toHaveCount(0);
  } finally {
    if (companyId || otherId) {
      await sql`DELETE FROM activity_history WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (${companyId || randomUUID()}, ${otherId || randomUUID()}))`;
      await sql`DELETE FROM interviews WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (${companyId || randomUUID()}, ${otherId || randomUUID()}))`;
      await sql`DELETE FROM job_applications WHERE company_id IN (${companyId || randomUUID()}, ${otherId || randomUUID()})`;
      await sql`DELETE FROM companies WHERE id IN (${companyId || randomUUID()}, ${otherId || randomUUID()})`;
    }
    await sql.end();
  }
});

test("shows company loading failures and retries without leaving the page", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/companies", async (route) => {
    attempts += 1;
    if (attempts === 1) await route.fulfill({ status: 503, body: "{}" });
    else await route.continue();
  });
  await page.goto("/companies");
  await expect(
    page.getByText("Companies could not be loaded.", { exact: true }),
  ).toContainText("Companies could not be loaded.");
  await page.getByRole("button", { name: "Retry loading companies" }).click();
  await expect(
    page.getByRole("heading", { name: "Company list" }),
  ).toBeVisible();
  expect(attempts).toBeGreaterThanOrEqual(2);
});
