import { createClient, type Client } from "@libsql/client";

const globalForDb = globalThis as unknown as { libsql?: Client; schemaReady?: Promise<void> };

function createClientFromEnv(): Client {
  console.log("TURSO_DATABASE_URL:", process.env.TURSO_DATABASE_URL);
  console.log("TURSO_AUTH_TOKEN:", process.env.TURSO_AUTH_TOKEN);
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    return createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  const path = process.env.DATABASE_PATH ?? "./data/monetizely.db";
  const url = path.startsWith("file:") ? path : `file:${path}`;
  return createClient({ url });
}

export function getClient(): Client {
  if (!globalForDb.libsql) {
    globalForDb.libsql = createClientFromEnv();
  }
  return globalForDb.libsql;
}

async function tableExists(table: string): Promise<boolean> {
  const result = await getClient().execute({
    sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [table],
  });
  return result.rows.length > 0;
}

export async function columnExists(table: string, column: string): Promise<boolean> {
  if (!(await tableExists(table))) return false;
  const result = await getClient().execute({ sql: `PRAGMA table_info(${table})` });
  return result.rows.some((r) => String(r.name) === column);
}

async function runMigrations(): Promise<void> {
  const client = getClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if ((await tableExists("products")) && !(await columnExists("products", "company_id"))) {
    await client.execute(`ALTER TABLE products ADD COLUMN company_id TEXT REFERENCES companies(id)`);
  }
  if ((await tableExists("quotes")) && !(await columnExists("quotes", "company_id"))) {
    await client.execute(`ALTER TABLE quotes ADD COLUMN company_id TEXT REFERENCES companies(id)`);
  }
  if ((await tableExists("quotes")) && !(await columnExists("quotes", "client_name"))) {
    await client.execute(`ALTER TABLE quotes ADD COLUMN client_name TEXT`);
    if (await columnExists("quotes", "customer_name")) {
      await client.execute(
        `UPDATE quotes SET client_name = customer_name WHERE client_name IS NULL`
      );
    }
  }
  if (
    (await tableExists("quotes")) &&
    (await columnExists("quotes", "customer_name")) &&
    (await columnExists("quotes", "client_name"))
  ) {
    await client.execute(
      `UPDATE quotes SET customer_name = client_name WHERE client_name IS NOT NULL AND (customer_name IS NULL OR customer_name = '')`
    );
    await client.execute(
      `UPDATE quotes SET client_name = customer_name WHERE client_name IS NULL AND customer_name IS NOT NULL`
    );
  }
  if (
    (await tableExists("quote_addons")) &&
    !(await columnExists("quote_addons", "addon_percent"))
  ) {
    await client.execute(`ALTER TABLE quote_addons ADD COLUMN addon_percent REAL`);
  }
}

async function initSchema(): Promise<void> {
  const client = getClient();
  await client.batch(
    [
      {
        sql: `
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
      },
      {
        sql: `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
      },
      {
        sql: `
    CREATE TABLE IF NOT EXISTS tiers (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      base_price_per_seat REAL NOT NULL,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );`,
      },
      {
        sql: `
    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );`,
      },
      {
        sql: `
    CREATE TABLE IF NOT EXISTS feature_tier_availability (
      feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
      tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
      availability TEXT NOT NULL CHECK (availability IN ('included', 'addon', 'not_available')),
      PRIMARY KEY (feature_id, tier_id)
    );`,
      },
      {
        sql: `
    CREATE TABLE IF NOT EXISTS addon_pricing (
      feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
      tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
      pricing_model TEXT NOT NULL CHECK (pricing_model IN ('fixed', 'per_seat', 'percent')),
      value REAL NOT NULL,
      PRIMARY KEY (feature_id, tier_id)
    );`,
      },
      {
        sql: `
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      tier_id TEXT NOT NULL,
      seats INTEGER NOT NULL,
      term_length TEXT NOT NULL CHECK (term_length IN ('monthly', 'annual', 'two_year')),
      discount_percent REAL NOT NULL DEFAULT 0,
      breakdown_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      valid_until TEXT NOT NULL
    );`,
      },
      {
        sql: `
    CREATE TABLE IF NOT EXISTS quote_addons (
      quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      feature_id TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      addon_seats INTEGER,
      addon_percent REAL,
      PRIMARY KEY (quote_id, feature_id)
    );`,
      },
    ],
    "write"
  );
  await runMigrations();
}

export async function ensureSchema(): Promise<void> {
  if (!globalForDb.schemaReady) {
    globalForDb.schemaReady = initSchema();
  }
  await globalForDb.schemaReady;
}

export type SqlArgs = (string | number | null | bigint)[];

export async function queryAll<T>(sql: string, args: SqlArgs = []): Promise<T[]> {
  await ensureSchema();
  const result = await getClient().execute({ sql, args });
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      obj[key] =
        typeof value === "bigint"
          ? Number(value)
          : value;
    }
    return obj as T;
  });
}

export async function queryOne<T>(sql: string, args: SqlArgs = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, args);
  return rows[0] ?? null;
}

export async function execute(sql: string, args: SqlArgs = []): Promise<number> {
  await ensureSchema();
  const result = await getClient().execute({ sql, args });
  return result.rowsAffected;
}

export async function batch(
  statements: { sql: string; args?: SqlArgs }[]
): Promise<void> {
  await ensureSchema();
  await getClient().batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write"
  );
}
