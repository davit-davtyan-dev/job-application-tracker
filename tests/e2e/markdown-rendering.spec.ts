import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("renders persisted Markdown formatting without executable content", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Markdown E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const companyName = `Markdown Company ${suffix}`;
  const position = `Markdown Engineer ${suffix}`;
  let companyId = "";
  try {
    [{ id: companyId }] = await sql<{ id: string }[]>`
      INSERT INTO companies (name, notes)
      VALUES (${companyName}, ${"### Company principles\n\n- Remote-first\n- Accessible"})
      RETURNING id
    `;
    await sql`
      INSERT INTO job_applications
        (company_id, position_title, applied_date, status, description, notes)
      VALUES (
        ${companyId},
        ${position},
        '2026-08-13',
        'Applied',
        ${"## Build secure tools\n\nUse **TypeScript** and `pnpm test`.\n\n[Safe job link](https://example.com/job)"},
        ${'<script>window.__markdownExecuted = true</script>\n<img src=x onerror="window.__markdownExecuted = true">\n\n[Unsafe link](javascript:window.__markdownExecuted=true)'}
      )
    `;

    await page.addInitScript(() => {
      window.__markdownExecuted = false;
    });
    await page.goto("/");
    await page
      .getByRole("searchbox", { name: "Search active applications" })
      .fill(position);
    const card = page.locator("li", { hasText: position });

    await expect(
      card.getByRole("heading", { level: 2, name: "Build secure tools" }),
    ).toBeVisible();
    await expect(card.locator("strong")).toHaveText("TypeScript");
    await expect(card.locator("code")).toHaveText("pnpm test");
    await expect(
      card.getByRole("link", { name: "Safe job link" }),
    ).toHaveAttribute("href", "https://example.com/job");
    await expect(
      card.getByRole("heading", { level: 3, name: "Company principles" }),
    ).toBeVisible();
    await expect(card.getByText("Remote-first")).toBeVisible();
    await expect(card.locator("script, img, [onclick], [onerror]")).toHaveCount(
      0,
    );
    await expect(card.getByRole("link", { name: "Unsafe link" })).toHaveCount(
      0,
    );
    expect(await page.evaluate(() => window.__markdownExecuted)).toBe(false);
  } finally {
    if (companyId) {
      await sql`DELETE FROM activity_history WHERE application_id IN (SELECT id FROM job_applications WHERE company_id = ${companyId})`;
      await sql`DELETE FROM job_applications WHERE company_id = ${companyId}`;
      await sql`DELETE FROM companies WHERE id = ${companyId}`;
    }
    await sql.end();
  }
});

declare global {
  interface Window {
    __markdownExecuted: boolean;
  }
}
