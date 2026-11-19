const { test, expect } = require("@playwright/test");

const employees = require("./fixtures/employees.json");
const employeeRecords = Object.values(employees);
const USER_COUNT = employeeRecords.length;

test("20 concurrent browser users complete a mixed Loy Krathong journey", async ({ browser }) => {
  const contexts = [];
  const pageErrors = [];
  const employeeCodes = employeeRecords.map((employee) => employee.employeeCode);

  try {
    // Each browser context has isolated cookies and localStorage, like a separate user session.
    for (let index = 0; index < USER_COUNT; index += 1) {
      contexts.push(await browser.newContext({
        viewport: { width: 1365, height: 900 }
      }));
    }

    const pages = await Promise.all(contexts.map(async (context) => {
      const page = await context.newPage();
      page.on("pageerror", (error) => pageErrors.push(error.message));
      return page;
    }));

    // Phase 1: all 20 users open the landing page at nearly the same time.
    await Promise.all(pages.map((page) =>
      page.goto("/index.html?mock=1", { waitUntil: "domcontentloaded" })
    ));

    for (const page of pages) {
      await expect(page).toHaveTitle(/Loy Krathong/i);
    }

    // Phase 2: all users use the actual home-page CTA to enter the create flow.
    // The query flag keeps each session on the repository's safe local mock database.
    await Promise.all(pages.map(async (page) => {
      const createLink = page.locator('a[href="./pages/create.html"]');
      await expect(createLink).toBeVisible();
      await createLink.evaluate((link) => {
        link.search = "mock=1";
      });
      await createLink.click();
      await expect(page).toHaveURL(/\/pages\/create\.html\?mock=1$/);
    }));

    await Promise.all(pages.map(async (page, index) => {
      await expect(page.locator("#selection-view")).toBeVisible();
      await page.locator('[data-flower="lotus"]').click();
      await page.locator("#start-button").click();

      await expect(page.locator("#wish-form")).toBeVisible();
      await page.locator("#employee-code").fill(employeeRecords[index].employeeCode);
      await page.locator("#employee-name").fill(employeeRecords[index].fullName);
      await page.locator("#department").selectOption({ label: employeeRecords[index].department });
      await page.locator("#prayer").fill(`ทดสอบการใช้งานพร้อมกัน ลำดับที่ ${index + 1}`);
    }));

    // Phase 3: submit all 20 wishes concurrently.
    await Promise.all(pages.map(async (page) => {
      await page.locator('#wish-form button[type="submit"]').click();
      await expect(page.locator("#success-view")).toBeVisible();
      await expect(page.locator("#success-countdown")).toContainText("กำลังกลับหน้าหลัก");
    }));

    // Phase 4: each session opens the wishes page and verifies its own saved record.
    await Promise.all(pages.map(async (page, index) => {
      await page.goto("/pages/wishes.html?mock=1", { waitUntil: "domcontentloaded" });
      await expect(page.locator("#wishGrid .wish-item")).toHaveCount(1);
      await expect(page.locator("#wishGrid")).toContainText(employeeRecords[index].fullName);
      await expect(page.locator("#wishGrid")).toContainText(
        `ทดสอบการใช้งานพร้อมกัน ลำดับที่ ${index + 1}`
      );
    }));

    expect(new Set(employeeCodes).size).toBe(USER_COUNT);
    expect(pageErrors, "No uncaught browser JavaScript errors").toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
