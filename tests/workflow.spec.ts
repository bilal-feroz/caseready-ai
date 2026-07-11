import { test, expect } from "@playwright/test";

test("coordinator workflow", async ({ page }) => {
  // 1. Sign in
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "coordinator@caseready.demo");
  await page.fill('input[type="password"]', "Demo123!");
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL("http://localhost:3000/");

  // 2. Open CR-1051
  await page.goto("http://localhost:3000/cases/CR-1051");

  // 3. Open evidence (clicks requirement pre-op labs row to show panel)
  await page.click('text=Pre-op Labs');

  // 4. Acknowledge evidence
  await page.click('text=Acknowledge');

  // 5. Open Action Centre
  await page.goto("http://localhost:3000/actions");

  // 6. Approve one communication
  await page.click('text=#CR-902');
  await page.click('text=Approve and send');

  // 7. Verification of success message
  await expect(page.locator("text=draft approved")).toBeVisible();
});
