import { expect, test } from "@playwright/test";

const baseURL = process.env.STAGING_BASE_URL;
test.skip(!baseURL, "Set STAGING_BASE_URL to run the staging smoke suite.");
test.use({ baseURL });

test("public release surfaces respond with the privacy boundary", async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("heading", { name: "StuLock" })).toBeVisible();
  await page.goto("/privacy"); await expect(page.getByRole("heading", { name: /Privacy built into the product/i })).toBeVisible();
  await expect(page.getByText(/Raw camera frames/i)).toBeVisible();
});

test("sensitive account routes redirect an unauthenticated visitor", async ({ page }) => {
  await page.goto("/dashboard"); await expect(page).toHaveURL(/\/login|\/onboarding/);
});
