import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.beforeAll(() => {
  const dbPath = path.join(process.cwd(), "data", "test-e2e.db");
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

test("catalog setup, build quote, view shareable URL", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ACME")).toBeVisible();
  await page.getByRole("button", { name: "ACME" }).click();
  await page.getByRole("link", { name: "Catalogue" }).click();
  await expect(page.getByText("Analytics Suite")).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "ACME" }).click();
  await page.getByRole("link", { name: "Quotes" }).click();
  await page.getByRole("link", { name: "New quote" }).click();
  await page.getByLabel("Quote name").waitFor({ state: "visible" });
  await page.getByLabel("Quote name").fill("Acme Corp - Q3 2026 Proposal");
  await page.getByLabel("Client name").fill("Acme Corporation");
  await page.getByLabel("Tier").selectOption({ label: "Growth — $50/seat/mo" });
  await page.getByLabel("Seats").fill("25");
  await page.getByLabel("Term length").selectOption({
    label: "Annual — 15% off per-seat price",
  });

  await page.getByRole("checkbox", { name: /Single Sign-On/ }).check();
  await page.getByRole("checkbox", { name: /API access/ }).check();
  await page.getByPlaceholder("Add-on seats").fill("5");

  await page.getByRole("button", { name: "Save quote" }).click();

  await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+$/);
  const quoteId = page.url().split("/quotes/")[1]!;
  await expect(page.getByRole("link", { name: "Monetizely Quote" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acme Corp - Q3 2026 Proposal" })).toBeVisible();
  await expect(page.getByText("$18,150")).toBeVisible();

  await page.goto(`/q/${quoteId}`);
  await expect(page.getByRole("link", { name: "Monetizely Quote" })).not.toBeVisible();
  await expect(page.getByText("$18,150")).toBeVisible();

  await page.goto(`/quotes/${quoteId}/edit`);
  await page.getByLabel("Seats").fill("30");
  await page.getByRole("button", { name: "Update quote" }).click();
  await expect(page.getByRole("link", { name: "Edit quote" })).toBeVisible();
});
