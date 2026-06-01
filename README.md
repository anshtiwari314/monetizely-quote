# Monetizely Quote Tool

Next.js + TypeScript + **Turso** (libSQL / SQLite). Each company has its own catalogue and quotes. Client share link: `/q/[id]` (no app header).

**Browser:** Use Google Chrome as your primary browser — this site has been tested on Chrome.

## Run locally

1. Copy env and add your Turso credentials:

```bash
cp .env.example .env
```

Get URL and token from Turso:

```bash
turso db show monetizely --url
turso db tokens create monetizely
```

2. Start the app:

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

Without `TURSO_*` env vars, the app falls back to a local file at `data/monetizely.db`.

## Deploy on Vercel

1. Import the `monetizely-quote` folder as the project root.
2. Framework preset: **Next.js** (default).
3. Add environment variables (Project → Settings → Environment Variables):
   - `TURSO_DATABASE_URL` — from `turso db show <db-name> --url`
   - `TURSO_AUTH_TOKEN` — from `turso db tokens create <db-name>`
4. Deploy.

Schema is created automatically on first request.

## Assumptions

- Catalogue and quotes are scoped per company (`company_id`).
- % add-ons use the discounted product line; quote % discount applies to the full subtotal.
- Per-seat add-on seats are independent of product seats.
- % add-ons can be adjusted when building a quote (catalogue default applies).
- USD only, no tax. Quotes can be edited after save.

## Decisions

- **Turso (libSQL)** — persistent SQLite in the cloud; works on Vercel serverless.
- **ACME sample seed only** for the default company (not every new company).
- **`/q/[id]`** for clients; `/quotes/...` and `/companies/...` for internal use.

## Next

- Quote preview before save, PDF export.
