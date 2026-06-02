# Monetizely Quote Tool

Next.js + TypeScript + **MongoDB Atlas**. Each company has its own catalogue and quotes. Client share link: `/q/[id]` (no app header).

**Browser:** Use Google Chrome as your primary browser — this site has been tested on Chrome.

## Run locally

1. Copy env and set your MongoDB connection string:

```bash
cp .env.example .env.local
```

In `.env.local`:

```env
MONGODB_ATLAS_URL=mongodb+srv://...
```

Data is stored in the **`monetizely`** database on your cluster.

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

## Deploy on Vercel

1. Import the `monetizely-quote` folder as the project root.
2. Add **Environment Variable**: `MONGODB_ATLAS_URL` (your Atlas connection string).
3. In Atlas → Network Access, allow access from anywhere (`0.0.0.0/0`) or Vercel’s IPs for serverless.
4. Deploy.

## Assumptions

- Catalogue and quotes are scoped per company (`company_id`).
- % add-ons use the discounted product line; quote % discount applies to the full subtotal.
- Per-seat add-on seats are independent of product seats.
- % add-ons can be adjusted when building a quote (catalogue default applies).
- USD only, no tax. Quotes can be edited after save.

## Decisions

- **MongoDB Atlas** — persistent cloud DB; works on Vercel serverless.
- **ACME sample seed only** for the default company (not every new company).
- **`/q/[id]`** for clients; `/quotes/...` and `/companies/...` for internal use.

## Next

- Quote preview before save, PDF export.
