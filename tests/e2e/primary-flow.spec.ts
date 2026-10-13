import { expect, test } from "@playwright/test";

test("landing page leads into the discovery feed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find something worth wondering about.");
  await page.getByTestId("landing-cta").click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByTestId("discovery-card").first()).toBeVisible();
});

test("browse, ask a starter question, save, and persist across reload (demo mode)", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByTestId("mode-badge").first()).toBeVisible();

  const firstCard = page.getByTestId("discovery-card").first();
  await expect(firstCard).toBeVisible();
  const title = (await firstCard.getByRole("heading").textContent())?.trim();
  expect(title).toBeTruthy();

  await firstCard.getByTestId("starter-question").first().click();
  await expect(page).toHaveURL(/\/d\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);

  const answer = page.getByTestId("assistant-message").first();
  await expect(answer).toBeVisible({ timeout: 30_000 });
  await expect(answer.getByTestId("demo-badge")).toBeVisible();

  const save = page.getByTestId("save-button");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.getByTestId("save-button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("assistant-message").first()).toBeVisible();

  await page.goto("/saved");
  await expect(page.getByTestId("saved-item").filter({ hasText: title! })).toBeVisible();
});
