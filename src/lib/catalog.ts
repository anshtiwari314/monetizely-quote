import { productsCol, type ProductDoc } from "./db";
import { uuidv4 } from "./uuid";
import type {
  AddonPricing,
  Feature,
  FeatureAvailability,
  FeatureTierCell,
  Product,
  ProductDetail,
  Tier,
} from "./types";

function toProductDetail(doc: ProductDoc): ProductDetail {
  return {
    id: doc._id,
    name: doc.name,
    companyId: doc.companyId,
    tiers: doc.tiers,
    features: doc.features,
    matrix: doc.matrix,
    addonPricing: doc.addonPricing,
  };
}

export async function listProducts(companyId: string): Promise<Product[]> {
  const col = await productsCol();
  const docs = await col
    .find({ companyId })
    .sort({ createdAt: -1 })
    .project<{ _id: string; name: string; companyId: string }>({
      _id: 1,
      name: 1,
      companyId: 1,
    })
    .toArray();
  return docs.map((d) => ({ id: d._id, name: d.name, companyId: d.companyId }));
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  const col = await productsCol();
  const doc = await col.findOne({ _id: productId });
  return doc ? toProductDetail(doc) : null;
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

function buildProductDoc(
  companyId: string,
  productId: string,
  input: CreateProductInput
): ProductDoc {
  const tierIds = input.tiers.map(() => uuidv4());
  const featureIds = input.features.map(() => uuidv4());

  const tiers = input.tiers.map((tier, i) => ({
    id: tierIds[i],
    productId,
    name: tier.name,
    basePricePerSeat: tier.basePricePerSeat,
    notes: tier.notes ?? null,
    sortOrder: i,
  }));

  const features = input.features.map((feature, i) => ({
    id: featureIds[i],
    productId,
    name: feature.name,
    sortOrder: i,
  }));

  const matrix = input.matrix.map((cell) => ({
    featureId: featureIds[cell.featureIndex],
    tierId: tierIds[cell.tierIndex],
    availability: cell.availability,
  }));

  const addonPricing = input.addonPricing.map((ap) => ({
    featureId: featureIds[ap.featureIndex],
    tierId: tierIds[ap.tierIndex],
    pricingModel: ap.pricingModel,
    value: ap.value,
  }));

  return {
    _id: productId,
    companyId,
    name: input.name,
    createdAt: new Date().toISOString(),
    tiers,
    features,
    matrix,
    addonPricing,
  };
}

export async function createProduct(
  companyId: string,
  input: CreateProductInput,
  productId?: string
): Promise<string> {
  const id = productId ?? uuidv4();
  const col = await productsCol();
  await col.insertOne(buildProductDoc(companyId, id, input));
  return id;
}

export async function updateProduct(
  productId: string,
  input: CreateProductInput
): Promise<void> {
  const col = await productsCol();
  const existing = await col.findOne({ _id: productId });
  if (!existing) return;

  const doc = buildProductDoc(existing.companyId, productId, input);
  doc.createdAt = existing.createdAt;
  await col.replaceOne({ _id: productId }, doc);
}

export async function deleteProduct(
  productId: string,
  companyId: string
): Promise<boolean> {
  const col = await productsCol();
  const result = await col.deleteOne({ _id: productId, companyId });
  return result.deletedCount > 0;
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
