import { MongoClient, type Collection, type Db } from "mongodb";

export const DB_NAME = "monetizely";

const globalForMongo = globalThis as unknown as {
  mongoClient?: MongoClient;
  mongoDb?: Db;
  indexesReady?: Promise<void>;
};

function stripEnvQuotes(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let trimmed = value.trim();
  if (trimmed.endsWith(";")) trimmed = trimmed.slice(0, -1).trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function resolveMongoUri(): string {
  const uri =
    stripEnvQuotes(process.env.MONGODB_ATLAS_URL) ??
    stripEnvQuotes(process.env.MONGODB_URI) ??
    stripEnvQuotes(process.env.DATABASE_URL);
  if (!uri?.startsWith("mongodb")) {
    throw new Error(
      "MongoDB connection string missing. Set MONGODB_ATLAS_URL in .env (see .env.example)."
    );
  }
  return uri;
}

export async function getDb(): Promise<Db> {
  if (!globalForMongo.mongoDb) {
    const client = new MongoClient(resolveMongoUri());
    await client.connect();
    globalForMongo.mongoClient = client;
    globalForMongo.mongoDb = client.db(DB_NAME);
  }
  if (!globalForMongo.indexesReady) {
    globalForMongo.indexesReady = ensureIndexes(globalForMongo.mongoDb);
  }
  await globalForMongo.indexesReady;
  return globalForMongo.mongoDb;
}

async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("companies").createIndex({ name: 1 }, { unique: true });
  await db.collection("products").createIndex({ companyId: 1, createdAt: -1 });
  await db.collection("quotes").createIndex({ companyId: 1, createdAt: -1 });
}

export async function companiesCol(): Promise<Collection<CompanyDoc>> {
  return (await getDb()).collection<CompanyDoc>("companies");
}

export async function productsCol(): Promise<Collection<ProductDoc>> {
  return (await getDb()).collection<ProductDoc>("products");
}

export async function quotesCol(): Promise<Collection<QuoteDoc>> {
  return (await getDb()).collection<QuoteDoc>("quotes");
}

export interface CompanyDoc {
  _id: string;
  name: string;
  createdAt: string;
}

export interface ProductDoc {
  _id: string;
  companyId: string;
  name: string;
  createdAt: string;
  tiers: {
    id: string;
    productId: string;
    name: string;
    basePricePerSeat: number;
    notes: string | null;
    sortOrder: number;
  }[];
  features: {
    id: string;
    productId: string;
    name: string;
    sortOrder: number;
  }[];
  matrix: {
    featureId: string;
    tierId: string;
    availability: "included" | "addon" | "not_available";
  }[];
  addonPricing: {
    featureId: string;
    tierId: string;
    pricingModel: "fixed" | "per_seat" | "percent";
    value: number;
  }[];
}

export interface QuoteDoc {
  _id: string;
  name: string;
  clientName: string;
  companyId: string;
  productId: string;
  tierId: string;
  seats: number;
  termLength: "monthly" | "annual" | "two_year";
  discountPercent: number;
  breakdown: import("./types").QuoteBreakdown;
  createdAt: string;
  validUntil: string;
  addons: {
    featureId: string;
    featureName: string;
    addonSeats: number | null;
    addonPercent: number | null;
  }[];
}
