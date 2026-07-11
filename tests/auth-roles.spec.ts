import { expect, test } from "@playwright/test";

const demoUsers = [
  "coordinator@caseready.demo",
  "clinician@caseready.demo",
  "scheduling@caseready.demo",
  "admin@caseready.demo",
];

test.describe("demo account authentication", () => {
  for (const email of demoUsers) {
    test(`${email} can sign in`, async ({ page }) => {
      await page.goto("/login");
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill("Demo123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "CaseReady AI" }).first()).toBeVisible();
    });
  }
});
