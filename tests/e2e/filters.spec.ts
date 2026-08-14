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
    const statusFilter = page.locator("#application-status-filter");
    await expect(statusFilter).toHaveAccessibleName(
      "Filter active applications by exact status",
    );
    await expect(statusFilter.getByRole("button")).toHaveText([
      "All",
      "Applied",
      "Interviewing",
      "Offer",
    ]);
    await expect(
      statusFilter.getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const status of statuses.slice(0, 3)) {
      await expect(results.getByText(positions[status])).toBeVisible();
    }
    for (const status of statuses.slice(3)) {
      await expect(results.getByText(positions[status])).toHaveCount(0);
    }

    const interviewingFilter = statusFilter.getByRole("button", {
      name: "Interviewing",
    });
    await interviewingFilter.focus();
    await interviewingFilter.press("Enter");
    await expect(interviewingFilter).toHaveAttribute("aria-pressed", "true");
    await expect(results.getByText(positions.Interviewing)).toBeVisible();
    await expect(results.getByText(positions.Applied)).toHaveCount(0);
    await expect(results.getByText(positions.Offer)).toHaveCount(0);

    await closedButton.focus();
    await closedButton.press("Enter");
    await expect(closedButton).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", { name: "Closed applications" }),
    ).toBeVisible();
    await expect(statusFilter).toHaveAccessibleName(
      "Filter closed applications by exact status",
    );
    await expect(statusFilter.getByRole("button")).toHaveText([
      "All",
      "Accepted",
      "Rejected",
      "Withdrawn",
      "Archived",
    ]);
    await expect(
      statusFilter.getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const status of statuses.slice(3)) {
      await expect(results.getByText(positions[status])).toBeVisible();
    }
    for (const status of statuses.slice(0, 3)) {
      await expect(results.getByText(positions[status])).toHaveCount(0);
    }

    const search = page.locator("#application-search");
    await expect(search).toHaveAccessibleName("Search closed applications");
    await search.fill(`filter ${suffix}`);
    const rejectedFilter = statusFilter.getByRole("button", {
      name: "Rejected",
    });
    await rejectedFilter.focus();
    await rejectedFilter.press(" ");
    await expect(rejectedFilter).toHaveAttribute("aria-pressed", "true");
    await expect(results.getByText(positions.Rejected)).toBeVisible();
    await expect(results.getByText(positions.Accepted)).toHaveCount(0);

    await activeButton.focus();
    await activeButton.press(" ");
    await expect(activeButton).toHaveAttribute("aria-pressed", "true");
    await expect(search).toHaveAccessibleName("Search active applications");
    await expect(search).toHaveValue(`filter ${suffix}`);
    await expect(
      statusFilter.getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const status of statuses.slice(0, 3)) {
      await expect(results.getByText(positions[status])).toBeVisible();
    }

    await activeButton.press(" ");
    await closedButton.press(" ");
    await expect(
      statusFilter.getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
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
