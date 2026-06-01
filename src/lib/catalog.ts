import { randomUUID } from "crypto";
import { batch, execute, queryAll, queryOne } from "./db";
import type {
  AddonPricing,
  Feature,
  FeatureAvailability,
  FeatureTierCell,
  Product,
  ProductDetail,
  Tier,
} from "./types";

export async function listProducts(companyId: string): Promise<Product[]> {
  return queryAll<Product>(
    `SELECT id, name, company_id as companyId FROM products
     WHERE company_id = ? ORDER BY created_at DESC`,
    [companyId]
  );
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  const product = await queryOne<Product>(
    "SELECT id, name, company_id as companyId FROM products WHERE id = ?",
    [productId]
  );
  if (!product) return null;

  const tiers = await queryAll<Tier>(
    `SELECT id, product_id as productId, name, base_price_per_seat as basePricePerSeat,
            notes, sort_order as sortOrder
     FROM tiers WHERE product_id = ? ORDER BY sort_order, name`,
    [productId]
  );

  const features = await queryAll<Feature>(
    `SELECT id, product_id as productId, name, sort_order as sortOrder
     FROM features WHERE product_id = ? ORDER BY sort_order, name`,
    [productId]
  );

  const matrix = await queryAll<FeatureTierCell>(
    `SELECT fta.feature_id as featureId, fta.tier_id as tierId, fta.availability
     FROM feature_tier_availability fta
     JOIN features f ON f.id = fta.feature_id
     WHERE f.product_id = ?`,
    [productId]
  );

  const addonPricing = await queryAll<AddonPricing>(
    `SELECT ap.feature_id as featureId, ap.tier_id as tierId,
            ap.pricing_model as pricingModel, ap.value
     FROM addon_pricing ap
     JOIN features f ON f.id = ap.feature_id
     WHERE f.product_id = ?`,
    [productId]
  );

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

export async function createProduct(
  companyId: string,
  input: CreateProductInput,
  productId?: string
): Promise<string> {
  const id = productId ?? randomUUID();
  const statements: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: "INSERT INTO products (id, name, company_id) VALUES (?, ?, ?)",
      args: [id, input.name, companyId],
    },
  ];

  const tierIds: string[] = [];
  input.tiers.forEach((tier, i) => {
    const tierId = randomUUID();
    tierIds.push(tierId);
    statements.push({
      sql: `INSERT INTO tiers (id, product_id, name, base_price_per_seat, notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [tierId, id, tier.name, tier.basePricePerSeat, tier.notes ?? null, i],
    });
  });

  const featureIds: string[] = [];
  input.features.forEach((feature, i) => {
    const featureId = randomUUID();
    featureIds.push(featureId);
    statements.push({
      sql: `INSERT INTO features (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      args: [featureId, id, feature.name, i],
    });
  });

  for (const cell of input.matrix) {
    statements.push({
      sql: `INSERT INTO feature_tier_availability (feature_id, tier_id, availability)
            VALUES (?, ?, ?)`,
      args: [featureIds[cell.featureIndex], tierIds[cell.tierIndex], cell.availability],
    });
  }

  for (const ap of input.addonPricing) {
    statements.push({
      sql: `INSERT INTO addon_pricing (feature_id, tier_id, pricing_model, value)
            VALUES (?, ?, ?, ?)`,
      args: [
        featureIds[ap.featureIndex],
        tierIds[ap.tierIndex],
        ap.pricingModel,
        ap.value,
      ],
    });
  }

  await batch(statements);
  return id;
}

export async function updateProduct(
  productId: string,
  input: CreateProductInput
): Promise<void> {
  const statements: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: "UPDATE products SET name = ? WHERE id = ?",
      args: [input.name, productId],
    },
    { sql: "DELETE FROM tiers WHERE product_id = ?", args: [productId] },
    { sql: "DELETE FROM features WHERE product_id = ?", args: [productId] },
  ];

  const tierIds: string[] = [];
  input.tiers.forEach((tier, i) => {
    const tierId = randomUUID();
    tierIds.push(tierId);
    statements.push({
      sql: `INSERT INTO tiers (id, product_id, name, base_price_per_seat, notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [tierId, productId, tier.name, tier.basePricePerSeat, tier.notes ?? null, i],
    });
  });

  const featureIds: string[] = [];
  input.features.forEach((feature, i) => {
    const featureId = randomUUID();
    featureIds.push(featureId);
    statements.push({
      sql: `INSERT INTO features (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      args: [featureId, productId, feature.name, i],
    });
  });

  for (const cell of input.matrix) {
    statements.push({
      sql: `INSERT INTO feature_tier_availability (feature_id, tier_id, availability)
            VALUES (?, ?, ?)`,
      args: [featureIds[cell.featureIndex], tierIds[cell.tierIndex], cell.availability],
    });
  }

  for (const ap of input.addonPricing) {
    statements.push({
      sql: `INSERT INTO addon_pricing (feature_id, tier_id, pricing_model, value)
            VALUES (?, ?, ?, ?)`,
      args: [
        featureIds[ap.featureIndex],
        tierIds[ap.tierIndex],
        ap.pricingModel,
        ap.value,
      ],
    });
  }

  await batch(statements);
}

export async function deleteProduct(
  productId: string,
  companyId: string
): Promise<boolean> {
  const row = await queryOne<{ companyId: string | null }>(
    `SELECT company_id as companyId FROM products WHERE id = ?`,
    [productId]
  );
  if (!row || row.companyId !== companyId) return false;
  const changes = await execute(
    `DELETE FROM products WHERE id = ? AND company_id = ?`,
    [productId, companyId]
  );
  return changes > 0;
}

export async function getAddonsForTier(
  productId: string,
  tierId: string
): Promise<{ feature: Feature; pricing: AddonPricing }[]> {
  const detail = await getProductDetail(productId);
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
