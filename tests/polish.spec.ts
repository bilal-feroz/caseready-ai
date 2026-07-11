import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Demo123!");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

test("no placeholder (#) links on core routes", async ({ page }) => {
  await signIn(page, "coordinator@caseready.demo");
  for (const route of ["/", "/cases", "/cases/CR-1051", "/actions", "/slot-rescue", "/audit", "/analytics", "/settings"]) {
    await page.goto(route);
    await expect(page.locator('a[href="#"]')).toHaveCount(0);
  }
});

test("command centre KPI tiles link to filtered cases", async ({ page }) => {
  await signIn(page, "coordinator@caseready.demo");
  await page.getByRole("link", { name: /Blocked . view in cases/i }).click();
  await expect(page).toHaveURL(/\/cases\?status=blocked/);
  await expect(page.getByRole("heading", { name: "Surgical Cases" })).toBeVisible();
  // The filtered list shows blocked cases (CR-1051) and excludes ready ones (CR-1001).
  await expect(page.getByRole("cell", { name: "CR-1051" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "CR-1001" })).toHaveCount(0);
});

test("coordinator sees settings as read-only; administrator can save", async ({ page }) => {
  // Coordinator: no Save button, config disabled.
  await signIn(page, "coordinator@caseready.demo");
  await page.goto("/settings");
  await expect(page.getByText(/read-only for your role/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Settings" })).toHaveCount(0);

  // Administrator: can save and gets confirmation.
  await page.getByRole("button", { name: /Log Out/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, "admin@caseready.demo");
  await page.goto("/settings");
  await page.locator("#warn").fill("88");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
});

test("notifications panel loads real items", async ({ page }) => {
  await signIn(page, "coordinator@caseready.demo");
  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
  // Seed contains an overdue action + review items, so there is at least one entry.
  await expect(page.getByRole("dialog", { name: "Notifications" }).getByRole("link").first()).toBeVisible();
});
