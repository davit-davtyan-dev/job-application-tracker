import { expect, test } from "@playwright/test";

test("imports, replaces, permits edits, and retains the sole source reference", async ({
  page,
}) => {
  const companyId = "bc76d153-54f0-46d5-86ff-b5d65b60bccb";
  let submitted: unknown;
  await page.route("**/api/companies", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: companyId, name: "Acme" }]),
    });
  });
  await page.route("**/api/job-posting-extraction", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceUrl: "https://jobs.example.com/platform-engineer",
        companyName: "ACME",
        positionTitle: "Platform Engineer",
        description: "Build reliable systems.",
      }),
    });
  });
  await page.route("**/api/applications", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "application-id", companyId }),
    });
  });

  await page.goto("/");
  const importInput = page.getByLabel("Job-posting URL");
  await expect(importInput).toHaveAttribute("type", "url");
  await expect(importInput).toHaveJSProperty("id", "job-posting-url");
  expect(
    await importInput.evaluate(
      (element) =>
        element instanceof HTMLInputElement &&
        element.form?.elements.item(0) === element,
    ),
  ).toBe(true);

  await page.getByLabel("New company").check();
  await page.getByLabel("New company name").fill("Dirty company");
  await page.getByLabel("Position title").fill("Dirty title");
  await page.getByLabel("Job description (Markdown)").fill("Dirty description");
  await page.getByLabel("Application notes").fill("Keep this note");
  await page.locator("select#status").selectOption("Interviewing");
  await page.getByRole("button", { name: "Add link" }).click();
  await page.locator("input#reference-0").fill("https://stale.example.com");
  await importInput.fill("https://jobs.example.com/platform-engineer");
  await page.getByRole("button", { name: "Import details" }).click();

  await expect(page.getByText("Job-posting details imported.")).toBeVisible();
  await expect(page.getByLabel("Existing company")).toBeChecked();
  await expect(page.locator("select#company")).toHaveValue(companyId);
  await expect(page.getByLabel("Position title")).toHaveValue(
    "Platform Engineer",
  );
  await expect(page.getByLabel("Job description (Markdown)")).toHaveValue(
    "Build reliable systems.",
  );
  await expect(page.locator("input#reference-0")).toHaveValue(
    "https://jobs.example.com/platform-engineer",
  );
  await expect(page.getByLabel("Application notes")).toHaveValue(
    "Keep this note",
  );
  await expect(page.locator("select#status")).toHaveValue("Interviewing");

  await page.getByLabel("Position title").fill("Edited Platform Engineer");
  await page.getByRole("button", { name: "Create application" }).click();
  await expect(
    page.getByText(/Application for Edited Platform Engineer/),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    companyId,
    positionTitle: "Edited Platform Engineer",
    description: "Build reliable systems.",
    notes: "Keep this note",
    status: "Interviewing",
    referenceLinks: ["https://jobs.example.com/platform-engineer"],
  });
});

test("rejects an empty import without making an extraction request", async ({
  page,
}) => {
  let extractionRequests = 0;
  await page.route("**/api/job-posting-extraction", async (route) => {
    extractionRequests += 1;
    await route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Import details" }).click();
  await expect(page.getByText("Enter a valid job-posting URL.")).toBeVisible();
  expect(extractionRequests).toBe(0);
});
