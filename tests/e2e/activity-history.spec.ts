import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("keeps an exactly-once chronological application activity trail without navigation", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Activity E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const company = `Activity Company ${suffix}`;
  const position = `Activity Role ${suffix}`;
  try {
    const [{ id: companyId }] = await sql<
      { id: string }[]
    >`INSERT INTO companies (name) VALUES (${company}) RETURNING id`;
    const [{ id: applicationId }] = await sql<
      { id: string }[]
    >`INSERT INTO job_applications (company_id, position_title, applied_date, status) VALUES (${companyId}, ${position}, '2026-08-10', 'Applied') RETURNING id`;
    await sql`INSERT INTO activity_history (application_id, event_type, status) VALUES (${applicationId}, 'application_created', 'Applied')`;
    await page.goto("/");
    const search = page.getByRole("searchbox", {
      name: "Search active applications",
    });
    await search.fill(position);
    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );
    await page
      .getByRole("combobox", { name: `Status for ${position}` })
      .selectOption("Interviewing");
    await expect(page.getByText("Status updated.")).toBeVisible();
    await page.getByRole("button", { name: "Manage interviews" }).click();
    await page.getByLabel("Schedule interview").fill("2026-08-15T10:30");
    await page.getByRole("button", { name: "Add interview" }).click();
    const interviewStatus = page.getByRole("combobox", {
      name: /Status for interview/,
    });
    await interviewStatus.selectOption("Completed");
    await interviewStatus.selectOption("Completed");
    await page.getByRole("button", { name: "View activity" }).click();
    const activity = page.getByRole("region", {
      name: `Activity for ${position}`,
    });
    await expect(activity.getByText("Application created")).toHaveCount(1);
    await expect(activity.getByText("Application status changed")).toHaveCount(
      1,
    );
    await expect(activity.getByText("Interview scheduled")).toHaveCount(1);
    await expect(activity.getByText("Interview completed")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => performance.getEntriesByType("navigation").length,
      ),
    ).toBe(navigationCount);
    await expect(search).toHaveValue(position);
    await page.reload();
    await page
      .getByRole("searchbox", { name: "Search active applications" })
      .fill(position);
    await page.getByRole("button", { name: "View activity" }).click();
    const refreshedActivity = page.getByRole("region", {
      name: `Activity for ${position}`,
    });
    await expect(
      refreshedActivity.getByText("Application created"),
    ).toHaveCount(1);
    await expect(
      refreshedActivity.getByText("Application status changed"),
    ).toHaveCount(1);
    await expect(
      refreshedActivity.getByText("Interview scheduled"),
    ).toHaveCount(1);
    await expect(
      refreshedActivity.getByText("Interview completed"),
    ).toHaveCount(1);
  } finally {
    await sql`DELETE FROM activity_history WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company}))`;
    await sql`DELETE FROM interviews WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company}))`;
    await sql`DELETE FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company})`;
    await sql`DELETE FROM companies WHERE name = ${company}`;
    await sql.end();
  }
});
