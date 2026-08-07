import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("creates an application and its initial history entry", async ({
  page,
}) => {
  const company = `E2E Company ${randomUUID()}`;
  const position = `Engineer ${randomUUID()}`;
  await page.goto("/");
  await page.getByLabel("New company").check();
  await page.getByLabel("New company name").fill(company);
  await page.getByLabel("Position title").fill(position);
  await page.getByRole("button", { name: "Add link" }).click();
  await page
    .getByRole("textbox", { name: "Reference URL 1", exact: true })
    .fill("https://example.com/jobs/engineer");
  await page.getByRole("button", { name: "Create application" }).click();
  await expect(page.getByRole("status")).toContainText(
    `Application for ${position} at ${company} was created.`,
  );

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error(
      "E2E persistence verification requires DATABASE_URL or TEST_DATABASE_URL.",
    );
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const rows = await sql<
      { position_title: string; event_type: string; status: string }[]
    >`
      SELECT a.position_title, h.event_type, h.status
      FROM job_applications a
      JOIN companies c ON c.id = a.company_id
      JOIN activity_history h ON h.application_id = a.id
      WHERE c.name = ${company} AND a.position_title = ${position}
    `;
    expect(rows).toEqual([
      {
        position_title: position,
        event_type: "application_created",
        status: "Applied",
      },
    ]);
  } finally {
    await sql.end();
  }
});
