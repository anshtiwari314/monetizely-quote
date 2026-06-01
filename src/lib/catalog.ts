import { randomUUID } from "crypto";
import { getDb } from "./db";
import type {
  AddonPricing,
  Feature,
  FeatureAvailability,
  FeatureTierCell,
  Product,
  ProductDetail,
  Tier,
} from "./types";

export function listProducts(companyId: string): Product[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, name, company_id as companyId FROM products
       WHERE company_id = ? ORDER BY created_at DESC`
    )
    .all(companyId) as Product[];
}

export function getProductDetail(productId: string): ProductDetail | null {
  const db = getDb();
  const product = db
    .prepare("SELECT id, name, company_id as companyId FROM products WHERE id = ?")
    .get(productId) as Product | undefined;
  if (!product) return null;

  const tiers = db
    .prepare(
      `SELECT id, product_id as productId, name, base_price_per_seat as basePricePerSeat,
              notes, sort_order as sortOrder
       FROM tiers WHERE product_id = ? ORDER BY sort_order, name`
    )
    .all(productId) as Tier[];

  const features = db
    .prepare(
      `SELECT id, product_id as productId, name, sort_order as sortOrder
       FROM features WHERE product_id = ? ORDER BY sort_order, name`
    )
    .all(productId) as Feature[];

  const matrix = db
    .prepare(
      `SELECT fta.feature_id as featureId, fta.tier_id as tierId, fta.availability
       FROM feature_tier_availability fta
       JOIN features f ON f.id = fta.feature_id
       WHERE f.product_id = ?`
    )
    .all(productId) as FeatureTierCell[];

  const addonPricing = db
    .prepare(
      `SELECT ap.feature_id as featureId, ap.tier_id as tierId,
              ap.pricing_model as pricingModel, ap.value
       FROM addon_pricing ap
       JOIN features f ON f.id = ap.feature_id
       WHERE f.product_id = ?`
    )
    .all(productId) as AddonPricing[];

  return { ...product, tiers, features, matrix, addonPricing };
}

export interface CreateProductInput {
  name: string;
  tiers: { name: string; basePricePerSeat: number; notes?: string }[];
  features: { name: string }[];
  matrix: { featureIndex: number; tierIndex: number; availability: FeatureAvailability }[];
  addonPricing: {
    featureIndex: number;
    tierIndex: number;
    pricingModel: "fixed" | "per_seat" | "percent";
    value: number;
  }[];
}

export function createProduct(companyId: string, input: CreateProductInput): string {
  const db = getDb();
  const productId = randomUUID();

  const insertProduct = db.transaction(() => {
    db.prepare("INSERT INTO products (id, name, company_id) VALUES (?, ?, ?)").run(
      productId,
      input.name,
      companyId
    );

    const tierIds: string[] = [];
    input.tiers.forEach((tier, i) => {
      const tierId = randomUUID();
      tierIds.push(tierId);
      db.prepare(
        `INSERT INTO tiers (id, product_id, name, base_price_per_seat, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        tierId,
        productId,
        tier.name,
        tier.basePricePerSeat,
        tier.notes ?? null,
        i
      );
    });

    const featureIds: string[] = [];
    input.features.forEach((feature, i) => {
      const featureId = randomUUID();
      featureIds.push(featureId);
      db.prepare(
        `INSERT INTO features (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)`
      ).run(featureId, productId, feature.name, i);
    });

    for (const cell of input.matrix) {
      db.prepare(
        `INSERT INTO feature_tier_availability (feature_id, tier_id, availability)
         VALUES (?, ?, ?)`
      ).run(
        featureIds[cell.featureIndex],
        tierIds[cell.tierIndex],
        cell.availability
      );
    }

    for (const ap of input.addonPricing) {
      db.prepare(
        `INSERT INTO addon_pricing (feature_id, tier_id, pricing_model, value)
         VALUES (?, ?, ?, ?)`
      ).run(
        featureIds[ap.featureIndex],
        tierIds[ap.tierIndex],
        ap.pricingModel,
        ap.value
      );
    }
  });

  insertProduct();
  return productId;
}

export function updateProduct(
  productId: string,
  input: CreateProductInput
): void {
  const db = getDb();

  const update = db.transaction(() => {
    db.prepare("UPDATE products SET name = ? WHERE id = ?").run(
      input.name,
      productId
    );
    db.prepare("DELETE FROM tiers WHERE product_id = ?").run(productId);
    db.prepare("DELETE FROM features WHERE product_id = ?").run(productId);

    const tierIds: string[] = [];
    input.tiers.forEach((tier, i) => {
      const tierId = randomUUID();
      tierIds.push(tierId);
      db.prepare(
        `INSERT INTO tiers (id, product_id, name, base_price_per_seat, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        tierId,
        productId,
        tier.name,
        tier.basePricePerSeat,
        tier.notes ?? null,
        i
      );
    });

    const featureIds: string[] = [];
    input.features.forEach((feature, i) => {
      const featureId = randomUUID();
      featureIds.push(featureId);
      db.prepare(
        `INSERT INTO features (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)`
      ).run(featureId, productId, feature.name, i);
    });

    for (const cell of input.matrix) {
      db.prepare(
        `INSERT INTO feature_tier_availability (feature_id, tier_id, availability)
         VALUES (?, ?, ?)`
      ).run(
        featureIds[cell.featureIndex],
        tierIds[cell.tierIndex],
        cell.availability
      );
    }

    for (const ap of input.addonPricing) {
      db.prepare(
        `INSERT INTO addon_pricing (feature_id, tier_id, pricing_model, value)
         VALUES (?, ?, ?, ?)`
      ).run(
        featureIds[ap.featureIndex],
        tierIds[ap.tierIndex],
        ap.pricingModel,
        ap.value
      );
    }
  });

  update();
}

export function deleteProduct(productId: string, companyId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(`SELECT company_id as companyId FROM products WHERE id = ?`)
    .get(productId) as { companyId: string | null } | undefined;
  if (!row || row.companyId !== companyId) return false;
  db.prepare(`DELETE FROM products WHERE id = ? AND company_id = ?`).run(
    productId,
    companyId
  );
  return true;
}

export function getAddonsForTier(
  productId: string,
  tierId: string
): { feature: Feature; pricing: AddonPricing }[] {
  const detail = getProductDetail(productId);
  if (!detail) return [];

  const tierFeatures = detail.matrix.filter(
    (c) => c.tierId === tierId && c.availability === "addon"
  );

  return tierFeatures
    .map((cell) => {
      const feature = detail.features.find((f) => f.id === cell.featureId);
      const pricing = detail.addonPricing.find(
        (p) => p.featureId === cell.featureId && p.tierId === tierId
      );
      if (!feature || !pricing) return null;
      return { feature, pricing };
    })
    .filter((x): x is { feature: Feature; pricing: AddonPricing } => x !== null);
}
