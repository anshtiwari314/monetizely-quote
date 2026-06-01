import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured) return configured;
  if (process.env.VERCEL) {
    return "/tmp/monetizely.db";
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "monetizely.db");
}

function tableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table);
  return row != null;
}

export function columnExists(db: Database.Database, table: string, column: string): boolean {
  if (!tableExists(db, table)) return false;
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

/** Idempotent upgrades for databases created before companies / client_name existed. */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (tableExists(db, "products") && !columnExists(db, "products", "company_id")) {
    db.exec(`ALTER TABLE products ADD COLUMN company_id TEXT REFERENCES companies(id)`);
  }
  if (tableExists(db, "quotes") && !columnExists(db, "quotes", "company_id")) {
    db.exec(`ALTER TABLE quotes ADD COLUMN company_id TEXT REFERENCES companies(id)`);
  }
  if (tableExists(db, "quotes") && !columnExists(db, "quotes", "client_name")) {
    db.exec(`ALTER TABLE quotes ADD COLUMN client_name TEXT`);
    if (columnExists(db, "quotes", "customer_name")) {
      db.exec(`UPDATE quotes SET client_name = customer_name WHERE client_name IS NULL`);
    }
  }
  if (
    tableExists(db, "quotes") &&
    columnExists(db, "quotes", "customer_name") &&
    columnExists(db, "quotes", "client_name")
  ) {
    db.exec(
      `UPDATE quotes SET customer_name = client_name WHERE client_name IS NOT NULL AND (customer_name IS NULL OR customer_name = '')`
    );
    db.exec(
      `UPDATE quotes SET client_name = customer_name WHERE client_name IS NULL AND customer_name IS NOT NULL`
    );
  }
  if (tableExists(db, "quote_addons") && !columnExists(db, "quote_addons", "addon_percent")) {
    db.exec(`ALTER TABLE quote_addons ADD COLUMN addon_percent REAL`);
  }
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tiers (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      base_price_per_seat REAL NOT NULL,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS feature_tier_availability (
      feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
      tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
      availability TEXT NOT NULL CHECK (availability IN ('included', 'addon', 'not_available')),
      PRIMARY KEY (feature_id, tier_id)
    );

    CREATE TABLE IF NOT EXISTS addon_pricing (
      feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
      tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
      pricing_model TEXT NOT NULL CHECK (pricing_model IN ('fixed', 'per_seat', 'percent')),
      value REAL NOT NULL,
      PRIMARY KEY (feature_id, tier_id)
    );

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
    );

    CREATE TABLE IF NOT EXISTS quote_addons (
      quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      feature_id TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      addon_seats INTEGER,
      addon_percent REAL,
      PRIMARY KEY (quote_id, feature_id)
    );
  `);

  runMigrations(db);
}

function createDb(): Database.Database {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.sqlite) {
    globalForDb.sqlite = createDb();
    // Seed on every new connection (each Vercel serverless instance has its own /tmp DB).
    const { ensureAcmeCompany } = require("./seed") as typeof import("./seed");
    ensureAcmeCompany();
  } else {
    // Re-run after hot reload so older cached connections pick up new tables/columns.
    runMigrations(globalForDb.sqlite);
  }
  return globalForDb.sqlite;
}
