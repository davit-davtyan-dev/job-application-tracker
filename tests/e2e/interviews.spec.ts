import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("manages multiple interviews without changing application state or navigation", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("Interview E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const company = `Interview Company ${suffix}`;
  const position = `Interview Role ${suffix}`;
  try {
    const [{ id: companyId }] = await sql<
      { id: string }[]
    >`INSERT INTO companies (name) VALUES (${company}) RETURNING id`;
    const [{ id: applicationId }] = await sql<
      { id: string }[]
    >`INSERT INTO job_applications (company_id, position_title, applied_date, status) VALUES (${companyId}, ${position}, '2026-08-10', 'Interviewing') RETURNING id`;
    await page.goto("/");
    await page
      .getByRole("searchbox", { name: "Search active applications" })
      .fill(position);
    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );
    await page
      .getByRole("button", { name: "Manage interviews" })
      .press("Enter");
    const date = page.getByLabel("Schedule interview");
    await date.fill("2026-08-15T10:30");
    await page.getByRole("button", { name: "Add interview" }).press("Enter");
    await expect(page.getByText("Interview scheduled.")).toBeVisible();
    await date.fill("2026-08-16T14:45");
    await page.getByRole("button", { name: "Add interview" }).press("Enter");
    await expect(
      page.getByRole("combobox", { name: /Status for interview/ }),
    ).toHaveCount(2);
    const statuses = page.getByRole("combobox", {
      name: /Status for interview/,
    });
    await statuses.nth(0).selectOption("Completed");
    await expect(page.getByText("Interview updated.")).toBeVisible();
    await statuses.nth(1).selectOption("Cancelled");
    await expect(page.getByText("Interview updated.")).toBeVisible();
    await statuses.nth(1).selectOption("Cancelled");
    await expect(
      page.getByRole("searchbox", { name: "Search active applications" }),
    ).toHaveValue(position);
    expect(
      await page.evaluate(
        () => performance.getEntriesByType("navigation").length,
      ),
    ).toBe(navigationCount);

    const [application] = await sql<
      { status: string }[]
    >`SELECT status FROM job_applications WHERE id = ${applicationId}`;
    const records = await sql<
      { id: string; status: string }[]
    >`SELECT id, status FROM interviews WHERE application_id = ${applicationId} ORDER BY scheduled_at`;
    const history = await sql<
      { interview_id: string; event_type: string }[]
    >`SELECT interview_id, event_type FROM activity_history WHERE application_id = ${applicationId} AND interview_id IS NOT NULL ORDER BY created_at, id`;
    expect(application?.status).toBe("Interviewing");
    expect(records.map(({ status }) => status)).toEqual([
      "Completed",
      "Cancelled",
    ]);
    expect(history).toEqual([
      { interview_id: records[0]!.id, event_type: "interview_scheduled" },
      { interview_id: records[1]!.id, event_type: "interview_scheduled" },
      { interview_id: records[0]!.id, event_type: "interview_completed" },
      { interview_id: records[1]!.id, event_type: "interview_cancelled" },
    ]);
  } finally {
    await sql`DELETE FROM activity_history WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company}))`;
    await sql`DELETE FROM interviews WHERE application_id IN (SELECT id FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company}))`;
    await sql`DELETE FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company})`;
    await sql`DELETE FROM companies WHERE name = ${company}`;
    await sql.end();
  }
});
