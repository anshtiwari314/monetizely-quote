# Monetizely Quote Tool

Next.js + TypeScript + SQLite (`better-sqlite3`). Each company has its own catalogue and quotes. Client share link: `/q/[id]` (no app header).

## Run locally

```bash
cd monetizely-quote
npm install
npm run dev
```

Open http://localhost:3000. Default company **ACME** is created with sample **Analytics Suite** catalogue. Use **Reset all data** on the home page to start fresh.

```bash
npm test          # pricing unit tests
npm run test:e2e  # catalogue → quote → share URL
npm run build && npm start
```

Database: `data/monetizely.db` (set `DATABASE_PATH` to override).

## Deploy on Vercel

1. Import the `monetizely-quote` folder as the project root.
2. Framework preset: **Next.js** (default).
3. Optional env: `DATABASE_PATH=/tmp/monetizely.db` (auto-used on Vercel if unset).
4. Deploy.

**Note:** Serverless storage is ephemeral — data may reset on cold starts. Fine for demos; use Turso/Neon or a persistent host for production.

## Assumptions

- Catalogue and quotes are scoped per company (`company_id`).
- % add-ons use the discounted product line; quote % discount applies to the full subtotal.
- Per-seat add-on seats are independent of product seats.
- % add-ons can be adjusted when building a quote (catalogue default applies).
- USD only, no tax. Quotes can be edited after save.

## Decisions

- **SQLite + better-sqlite3** — no external DB service; file at `data/` locally, `/tmp` on Vercel.
- **ACME sample seed only** for the default company (not every new company).
- **`/q/[id]`** for clients; `/quotes/...` and `/companies/...` for internal use.

## Next

- Quote preview before save, PDF export, persistent hosted database.
