import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("lists only active applications newest first and refreshes after creation", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("List E2E test requires DATABASE_URL.");
  const sql = postgres(databaseUrl, { max: 1 });
  const suffix = randomUUID();
  const company = `List Company ${suffix}`;
  const tieIds = [randomUUID(), randomUUID()].sort();
  const tieLowId = tieIds[0]!;
  const tieHighId = tieIds[1]!;
  const positions = {
    newest: `Newest ${suffix}`,
    tieHigh: `Tie high ${suffix}`,
    tieLow: `Tie low ${suffix}`,
    closed: `Closed ${suffix}`,
    created: `Created ${suffix}`,
  };
  try {
    const [{ id: companyId }] = await sql<{ id: string }[]>`
      INSERT INTO companies (name) VALUES (${company}) RETURNING id
    `;
    await sql`
      INSERT INTO job_applications
        (id, company_id, position_title, applied_date, status, created_at)
      VALUES
        (${tieLowId}, ${companyId}, ${positions.tieLow}, '2026-08-08', 'Applied', '2026-08-08T10:00:00Z'),
        (${tieHighId}, ${companyId}, ${positions.tieHigh}, '2026-08-08', 'Offer', '2026-08-08T10:00:00Z'),
        (${randomUUID()}, ${companyId}, ${positions.newest}, '2026-08-09', 'Interviewing', '2026-08-09T10:00:00Z'),
        (${randomUUID()}, ${companyId}, ${positions.closed}, '2026-08-10', 'Rejected', '2026-08-10T10:00:00Z')
    `;

    await page.goto("/");
    const region = page.getByRole("region", { name: "Active applications" });
    await expect(region.getByText(positions.newest)).toBeVisible();
    await expect(region.getByText(positions.closed)).toHaveCount(0);
    const visibleText = await region.locator("li").allTextContents();
    const relevant = visibleText.filter((text) => text.includes(suffix));
    expect(relevant).toHaveLength(3);
    expect(relevant[0]).toContain(positions.newest);
    expect(relevant[1]).toContain(positions.tieHigh);
    expect(relevant[2]).toContain(positions.tieLow);

    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );
    await page.getByLabel("New company").check();
    await page.getByLabel("New company name").fill(`Created Co ${suffix}`);
    await page.getByLabel("Position title").fill(positions.created);
    await page.getByRole("button", { name: "Create application" }).click();
    await expect(region.getByText(positions.created)).toBeVisible();
    expect(
      await page.evaluate(
        () => performance.getEntriesByType("navigation").length,
      ),
    ).toBe(navigationCount);
  } finally {
    await sql`
      DELETE FROM activity_history
      WHERE application_id IN (
        SELECT a.id FROM job_applications a
        JOIN companies c ON c.id = a.company_id
        WHERE c.name IN (${company}, ${`Created Co ${suffix}`})
      )
    `;
    await sql`
      DELETE FROM job_applications
      WHERE company_id IN (
        SELECT id FROM companies
        WHERE name IN (${company}, ${`Created Co ${suffix}`})
      )
    `;
    await sql`DELETE FROM companies WHERE name IN (${company}, ${`Created Co ${suffix}`})`;
    await sql.end();
  }
});
