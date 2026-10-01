import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Demo123!");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

test("slot rescue proposal requires scheduling officer approval", async ({ page }) => {
  await signIn(page, "coordinator@caseready.demo");

  await page.goto("/slot-rescue");
  await expect(page.getByRole("heading", { name: "Slot Rescue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Standby Candidates Comparison" })).toBeVisible();
  await expect(page.getByText("Best Match")).toBeVisible();
  await expect(page.getByText("Original: Endoscopic sinus surgery")).toBeVisible();

  // A second tab loaded before the proposal still shows enabled Propose buttons.
  const staleTab = await page.context().newPage();
  await staleTab.goto("/slot-rescue");

  await page.getByRole("button", { name: "Propose replacement" }).click();
  await expect(page.getByText(/awaiting scheduling officer approval/i)).toBeVisible();
  await expect(page.getByText(/Status:/).filter({ hasText: "PENDING" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Propose", exact: true }).first()).toBeDisabled();

  // The server refuses a competing proposal for the same slot.
  await staleTab.getByRole("button", { name: "Propose", exact: true }).nth(1).click();
  await expect(staleTab.getByText(/already awaiting scheduling-officer review/i)).toBeVisible();
  await staleTab.close();

  await page.getByRole("button", { name: /Log Out/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, "scheduling@caseready.demo");
  await page.goto("/slot-rescue");
  await expect(page.getByText(/Status:/).filter({ hasText: "PENDING" })).toBeVisible();

  await page.getByRole("button", { name: "Approve Swap" }).click();
  await expect(page.getByText("Status: Rescued")).toBeVisible();
  await expect(page.getByText(/Status:/).filter({ hasText: "APPROVED" })).toBeVisible();
  await expect(page.getByText("Original: Endoscopic sinus surgery")).toBeVisible();

  await page.goto("/audit");
  await expect(page.locator("tbody").getByText(/proposal approved/i).first()).toBeVisible();
});
