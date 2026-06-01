# Monetizely Quote Tool

A lightweight SaaS quoting application: define product catalogs (tiers, features, add-on pricing) and build shareable quotes with transparent line-item math.

## Tech stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **better-sqlite3** — file-based SQLite, no external database service

## Run locally

```bash
cd monetizely-quote
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load, the sample **Analytics Suite** catalog (from the exercise Excel reference) is seeded automatically.

The database file is created at `data/monetizely.db`. Override the path with:

```bash
DATABASE_PATH=./data/my.db npm run dev
```

### Tests

```bash
npm test              # unit tests (pricing math)
npm run test:e2e      # Playwright E2E (starts dev server)
```

### Production build

```bash
npm run build
npm start
```

## Features

| Area | What it does |
|------|----------------|
| **Catalog** (`/catalog`) | Create/edit products, tiers, feature matrix, add-on pricing |
| **New quote** (`/quotes/new`) | Pick product/tier/seats/term, select add-ons, optional % discount |
| **Shareable quote** (`/q/[id]`) | Read-only quote view — no login |

### Pricing rules (implemented)

- **Term discounts** (all products): Monthly 0%, Annual 15%, Two-year 25% on per-seat base price
- **Add-on models**: Fixed monthly, per-seat/month (independent seat count), % of product line amount
- **Quote discount**: Percentage applied to subtotal after line items

## Assumptions

1. **Percent-of-product add-ons** use the tier’s discounted product line total (seats × base × months × term discount), not pre-discount list price.
2. **Quote discount** applies to the sum of all positive line items; shown as a separate negative line item.
3. **Valid until** is quote date + 1 calendar month.
4. **Editing quotes** after save is out of scope (per spec); new quotes only.
5. **USD only**, no tax.

## Decisions

| Choice | Why |
|--------|-----|
| **better-sqlite3** | Simple local/dev setup; single file DB; no hosted Postgres required for the exercise |
| **Seed on first API/page load** | Lets reviewers try the Acme example immediately without a separate migrate step |
| **`/q/[id]` for shareable URLs** | Short, public-friendly path separate from internal `/quotes` list |
| **Server Components + API routes** | DB access stays on the server; shareable pages are SSR’d |

## Vercel deployment note

Serverless functions have an **ephemeral filesystem**. For Vercel, set `DATABASE_PATH=/tmp/monetizely.db` in project env vars. Data will reset when the function cold-starts unless you attach persistent storage (e.g. Vercel Blob + restore, or switch to Turso/libSQL later). For a durable demo, running on a small Node host (Railway, Fly.io) with a persistent `data/` volume works out of the box.

## Questions we’d ask Monetizely

1. Should percent-of-product add-ons use pre–term-discount or post–term-discount product cost?
2. Is quote discount applied before or after add-ons (we applied to full subtotal)?
3. For two-year terms, do add-ons also multiply by 24 months (we assumed yes)?

## What we’d build next

- Quote preview before save
- Duplicate catalog product / quote templates
- Persistent DB on Vercel (Turso or Neon) with migration script
- PDF export of quote view
