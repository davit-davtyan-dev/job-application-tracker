import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("searches active applications by company and title without navigation", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Search E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const companyMatch = `Nebula Works ${suffix}`;
  const otherCompany = `Other ${suffix}`;
  const companyPosition = `Analyst ${suffix}`;
  const titleMatch = `Distributed Systems ${suffix}`;
  const closedMatch = `Closed Nebula ${suffix}`;

  try {
    const companies = await sql<{ id: string; name: string }[]>`
      INSERT INTO companies (name)
      VALUES (${companyMatch}), (${otherCompany})
      RETURNING id, name
    `;
    const companyId = companies.find(({ name }) => name === companyMatch)!.id;
    const otherCompanyId = companies.find(
      ({ name }) => name === otherCompany,
    )!.id;
    await sql`
      INSERT INTO job_applications
        (company_id, position_title, applied_date, status)
      VALUES
        (${companyId}, ${companyPosition}, '2026-08-09', 'Applied'),
        (${otherCompanyId}, ${titleMatch}, '2026-08-08', 'Interviewing'),
        (${otherCompanyId}, ${closedMatch}, '2026-08-10', 'Rejected')
    `;

    await page.goto("/");
    const region = page.getByRole("region", { name: "Active applications" });
    const search = region.getByRole("searchbox", {
      name: "Search active applications",
    });
    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );

    await search.fill("nEbUlA wOrKs");
    await expect(region.getByText(companyPosition)).toBeVisible();
    await expect(region.getByText(titleMatch)).toHaveCount(0);
    await expect(region.getByText(closedMatch)).toHaveCount(0);

    await search.fill(`systems ${suffix.slice(0, 8)}`);
    await expect(region.getByText(titleMatch)).toBeVisible();
    await expect(region.getByText(closedMatch)).toHaveCount(0);

    await search.fill(`missing ${suffix}`);
    await expect(
      region.getByText(/No active applications match/),
    ).toBeVisible();

    await region.getByRole("button", { name: "Clear" }).click();
    await expect(search).toHaveValue("");
    await expect(region.getByText(companyPosition)).toBeVisible();
    await expect(region.getByText(titleMatch)).toBeVisible();
    await expect(region.getByText(closedMatch)).toHaveCount(0);
    expect(
      await page.evaluate(
        () => performance.getEntriesByType("navigation").length,
      ),
    ).toBe(navigationCount);
  } finally {
    await sql`
      DELETE FROM job_applications
      WHERE company_id IN (
        SELECT id FROM companies WHERE name IN (${companyMatch}, ${otherCompany})
      )
    `;
    await sql`DELETE FROM companies WHERE name IN (${companyMatch}, ${otherCompany})`;
    await sql.end();
  }
});
