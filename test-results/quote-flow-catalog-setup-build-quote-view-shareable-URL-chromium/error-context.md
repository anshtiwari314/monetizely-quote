# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quote-flow.spec.ts >> catalog setup, build quote, view shareable URL
- Location: e2e/quote-flow.spec.ts:10:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: Test timeout of 60000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3000/quotes/new", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Monetizely Quote" [ref=e5] [cursor=pointer]:
        - /url: /
      - navigation [ref=e6]:
        - link "Catalog" [ref=e7] [cursor=pointer]:
          - /url: /catalog
        - link "New quote" [ref=e8] [cursor=pointer]:
          - /url: /quotes/new
        - link "Quotes" [ref=e9] [cursor=pointer]:
          - /url: /quotes
  - main [ref=e10]:
    - generic [ref=e11]:
      - heading "New quote" [level=1] [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: Quote name
          - textbox "Quote name" [ref=e16]:
            - /placeholder: Acme Corp - Q3 2026 proposal
        - generic [ref=e17]:
          - generic [ref=e18]: Customer name
          - textbox "Customer name" [ref=e19]
        - generic [ref=e20]:
          - generic [ref=e21]: Product
          - combobox "Product" [ref=e22]:
            - option "Analytics Suite" [selected]
        - generic [ref=e23]:
          - generic [ref=e24]: Tier
          - combobox "Tier" [ref=e25]:
            - option "Starter — $25/seat/mo"
            - option "Growth — $50/seat/mo" [selected]
            - option "Enterprise — $100/seat/mo"
        - generic [ref=e26]:
          - generic [ref=e27]: Seats
          - spinbutton "Seats" [ref=e28]: "25"
        - generic [ref=e29]:
          - generic [ref=e30]: Term length
          - combobox "Term length" [ref=e31]:
            - option "Monthly (no discount)"
            - option "Annual — 15% off per-seat price" [selected]
            - option "Two-year — 25% off per-seat price"
        - group "Available add-ons (Growth)" [ref=e32]:
          - generic [ref=e33]: Available add-ons (Growth)
          - list [ref=e34]:
            - listitem [ref=e35]:
              - generic [ref=e36]:
                - checkbox "API access (per seat / month, 50 USD)" [ref=e37]
                - generic [ref=e38]:
                  - text: API access
                  - generic [ref=e39]: (per seat / month, 50 USD)
            - listitem [ref=e40]:
              - generic [ref=e41]:
                - checkbox "Single Sign-On (SSO) (fixed monthly, 200 USD)" [ref=e42]
                - generic [ref=e43]:
                  - text: Single Sign-On (SSO)
                  - generic [ref=e44]: (fixed monthly, 200 USD)
            - listitem [ref=e45]:
              - generic [ref=e46]:
                - checkbox "Advanced anomaly detection (% of product cost, 10%)" [ref=e47]
                - generic [ref=e48]:
                  - text: Advanced anomaly detection
                  - generic [ref=e49]: (% of product cost, 10%)
            - listitem [ref=e50]:
              - generic [ref=e51]:
                - checkbox "White-label option (fixed monthly, 500 USD)" [ref=e52]
                - generic [ref=e53]:
                  - text: White-label option
                  - generic [ref=e54]: (fixed monthly, 500 USD)
            - listitem [ref=e55]:
              - generic [ref=e56]:
                - checkbox "Custom integrations (fixed monthly, 1000 USD)" [ref=e57]
                - generic [ref=e58]:
                  - text: Custom integrations
                  - generic [ref=e59]: (fixed monthly, 1000 USD)
        - generic [ref=e60]:
          - generic [ref=e61]: Quote discount (%)
          - spinbutton "Quote discount (%)" [ref=e62]: "0"
        - button "Save quote" [ref=e63]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import fs from "fs";
  3  | import path from "path";
  4  | 
  5  | test.beforeAll(() => {
  6  |   const dbPath = path.join(process.cwd(), "data", "test-e2e.db");
  7  |   if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  8  | });
  9  | 
  10 | test("catalog setup, build quote, view shareable URL", async ({ page }) => {
  11 |   await page.goto("/catalog");
  12 |   await expect(page.getByRole("heading", { name: "Product catalog" })).toBeVisible();
  13 |   await expect(page.getByText("Analytics Suite")).toBeVisible();
  14 | 
> 15 |   await page.goto("/quotes/new");
     |              ^ Error: page.goto: Test timeout of 60000ms exceeded.
  16 |   await page.getByLabel("Quote name").waitFor({ state: "visible" });
  17 |   await page.getByLabel("Quote name").fill("Acme Corp - Q3 2026 Proposal");
  18 |   await page.getByLabel("Customer name").fill("Acme Corporation");
  19 |   await page.getByLabel("Tier").selectOption({ label: "Growth — $50/seat/mo" });
  20 |   await page.getByLabel("Seats").fill("25");
  21 |   await page.getByLabel("Term length").selectOption({
  22 |     label: "Annual — 15% off per-seat price",
  23 |   });
  24 | 
  25 |   await page.getByRole("checkbox", { name: /Single Sign-On/ }).check();
  26 |   await page.getByRole("checkbox", { name: /API access/ }).check();
  27 |   await page.getByPlaceholder("Add-on seats").fill("5");
  28 | 
  29 |   await page.getByRole("button", { name: "Save quote" }).click();
  30 | 
  31 |   await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+$/);
  32 |   const quoteId = page.url().split("/quotes/")[1]!;
  33 |   await expect(page.getByRole("link", { name: "Monetizely Quote" })).toBeVisible();
  34 |   await expect(page.getByRole("heading", { name: "Acme Corp - Q3 2026 Proposal" })).toBeVisible();
  35 |   await expect(page.getByText("$18,150")).toBeVisible();
  36 | 
  37 |   await page.goto(`/q/${quoteId}`);
  38 |   await expect(page.getByRole("link", { name: "Monetizely Quote" })).not.toBeVisible();
  39 |   await expect(page.getByText("$18,150")).toBeVisible();
  40 | 
  41 |   await page.goto(`/quotes/${quoteId}/edit`);
  42 |   await page.getByLabel("Seats").fill("30");
  43 |   await page.getByRole("button", { name: "Update quote" }).click();
  44 |   await expect(page.getByRole("link", { name: "Edit quote" })).toBeVisible();
  45 | });
  46 | 
```