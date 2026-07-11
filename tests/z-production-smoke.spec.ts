import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Demo123!");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

test("production route and secondary-control smoke", async ({ page, request }) => {
  await page.goto("/cases");
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[type="email"]').fill("coordinator@caseready.demo");
  await page.locator('input[type="password"]').fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();

  await signIn(page, "coordinator@caseready.demo");
  await page.reload();
  await expect(page.getByRole("heading", { name: "CaseReady AI" }).first()).toBeVisible();

  for (const route of ["/", "/cases", "/cases/CR-1051", "/actions", "/slot-rescue", "/audit", "/analytics", "/settings"]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
    await expect(page.getByText("CaseReady AI").first()).toBeVisible();
  }

  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(page.getByText("Notifications").last()).toBeVisible();

  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(page.getByText("CaseReady AI Help")).toBeVisible();
  await page.getByRole("button", { name: "close" }).last().click();

  await page.getByRole("button", { name: "Language" }).click();
  await expect(page.getByRole("button", { name: /Language/i })).toContainText("ar");

  await page.getByRole("button", { name: /contact_support Support/i }).click();
  await expect(page.getByText("Demo Support")).toBeVisible();
  await expect(page.getByText("healthy")).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.getByRole("button", { name: /Log Out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("administrator can reset demo data when demo mode is enabled", async ({ page }) => {
  await signIn(page, "admin@caseready.demo");
  await page.goto("/settings");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset Database Demo Data" }).click();
  await expect(page).toHaveURL("/", { timeout: 20000 });
});
