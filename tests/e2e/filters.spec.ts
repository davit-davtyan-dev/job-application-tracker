import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("filters active and closed applications while preserving search without navigation", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Filter E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const company = `Filter Company ${suffix}`;
  const statuses = [
    "Applied",
    "Interviewing",
    "Offer",
    "Accepted",
    "Rejected",
    "Withdrawn",
    "Archived",
  ] as const;
  const positions = Object.fromEntries(
    statuses.map((status) => [status, `${status} filter ${suffix}`]),
  ) as Record<(typeof statuses)[number], string>;

  try {
    const [{ id: companyId }] = await sql<{ id: string }[]>`
      INSERT INTO companies (name) VALUES (${company}) RETURNING id
    `;
    for (const [index, status] of statuses.entries()) {
      await sql`
        INSERT INTO job_applications
          (company_id, position_title, applied_date, status)
        VALUES
          (${companyId}, ${positions[status]}, ${`2026-08-0${index + 1}`}, ${status})
      `;
    }

    await page.goto("/");
    const activeButton = page.getByRole("button", { name: "Active" });
    const closedButton = page.getByRole("button", { name: "Closed" });
    const results = page.locator("#application-results");
    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );

    await expect(activeButton).toHaveAttribute("aria-pressed", "true");
    await expect(closedButton).toHaveAttribute("aria-pressed", "false");
    for (const status of statuses.slice(0, 3)) {
      await expect(results.getByText(positions[status])).toBeVisible();
    }
    for (const status of statuses.slice(3)) {
      await expect(results.getByText(positions[status])).toHaveCount(0);
    }

    await closedButton.focus();
    await closedButton.press("Enter");
    await expect(closedButton).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", { name: "Closed applications" }),
    ).toBeVisible();
    for (const status of statuses.slice(3)) {
      await expect(results.getByText(positions[status])).toBeVisible();
    }
    for (const status of statuses.slice(0, 3)) {
      await expect(results.getByText(positions[status])).toHaveCount(0);
    }

    const search = page.locator("#application-search");
    await expect(search).toHaveAccessibleName("Search closed applications");
    await search.fill(`Rejected filter ${suffix}`);
    await expect(results.getByText(positions.Rejected)).toBeVisible();
    await expect(results.getByText(positions.Accepted)).toHaveCount(0);

    await activeButton.focus();
    await activeButton.press(" ");
    await expect(activeButton).toHaveAttribute("aria-pressed", "true");
    await expect(search).toHaveAccessibleName("Search active applications");
    await expect(search).toHaveValue(`Rejected filter ${suffix}`);
    await expect(
      results.getByText(/No active applications match/),
    ).toBeVisible();

    await activeButton.press(" ");
    await closedButton.press(" ");
    await expect(results.getByText(positions.Rejected)).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(search).toHaveValue("");
    for (const status of statuses.slice(3)) {
      await expect(results.getByText(positions[status])).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => performance.getEntriesByType("navigation").length,
      ),
    ).toBe(navigationCount);
  } finally {
    await sql`DELETE FROM job_applications WHERE company_id IN (SELECT id FROM companies WHERE name = ${company})`;
    await sql`DELETE FROM companies WHERE name = ${company}`;
    await sql.end();
  }
});
