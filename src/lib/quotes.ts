import { getProductDetail } from "./catalog";
import { uuidv4 } from "./uuid";
import { quotesCol } from "./db";
import { buildQuoteBreakdown } from "./pricing";
import type { ProductDetail } from "./types";
import type { QuoteInput, QuoteRecord } from "./types";

function addMonthsIso(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function tierNameFromBreakdown(
  breakdown: QuoteRecord["breakdown"]
): string | null {
  const label = breakdown.lineItems?.[0]?.label ?? "";
  const match = label.match(/ - (.+?) tier$/i);
  return match?.[1] ?? null;
}

/** Map a quote to a current catalog tier when the saved tier id was replaced (catalog re-save). */
export function resolveQuoteTierId(
  product: ProductDetail,
  savedTierId: string,
  savedTierName: string
): string {
  if (product.tiers.some((t) => t.id === savedTierId)) return savedTierId;
  const byName = product.tiers.find(
    (t) => t.name.toLowerCase() === savedTierName.toLowerCase()
  );
  return byName?.id ?? product.tiers[0]?.id ?? savedTierId;
}

async function persistQuote(
  quoteId: string,
  input: QuoteInput,
  breakdown: ReturnType<typeof buildQuoteBreakdown>,
  featureNames: Record<string, string>,
  options: { createdAt: string; validUntil: string }
): Promise<void> {
  const col = await quotesCol();
  const addons = input.addons.map((addon) => ({
    featureId: addon.featureId,
    featureName: featureNames[addon.featureId] ?? addon.featureId,
    addonSeats: addon.addonSeats ?? null,
    addonPercent: addon.percentValue ?? null,
  }));

  await col.updateOne(
    { _id: quoteId },
    {
      $set: {
        name: input.name,
        clientName: input.clientName,
        companyId: input.companyId,
        productId: input.productId,
        tierId: input.tierId,
        seats: input.seats,
        termLength: input.termLength,
        discountPercent: input.discountPercent ?? 0,
        breakdown,
        validUntil: options.validUntil,
        addons,
      },
      $setOnInsert: {
        _id: quoteId,
        createdAt: options.createdAt,
      },
    },
    { upsert: true }
  );
}

async function computeQuotePayload(input: QuoteInput) {
  const detail = await getProductDetail(input.productId);
  if (!detail) throw new Error("Product not found");
  if (detail.companyId !== input.companyId) {
    throw new Error("Product does not belong to this company");
  }

  const tier = detail.tiers.find((t) => t.id === input.tierId);
  if (!tier) throw new Error("Tier not found");

  const tierMatrix = detail.matrix.filter((c) => c.tierId === input.tierId);
  const tierAddonPricing = detail.addonPricing.filter(
    (p) => p.tierId === input.tierId
  );
  const featureNames = Object.fromEntries(
    detail.features.map((f) => [f.id, f.name])
  );

  const breakdown = buildQuoteBreakdown({
    productName: detail.name,
    tierName: tier.name,
    basePricePerSeat: tier.basePricePerSeat,
    seats: input.seats,
    termLength: input.termLength,
    discountPercent: input.discountPercent ?? 0,
    matrix: tierMatrix,
    addonPricing: tierAddonPricing,
    featureNames,
    selectedAddons: input.addons,
  });

  return { breakdown, featureNames };
}

export async function createQuote(input: QuoteInput): Promise<string> {
  const { breakdown, featureNames } = await computeQuotePayload(input);
  const quoteId = uuidv4();
  const createdAt = new Date().toISOString();
  const validUntil = addMonthsIso(new Date(), 1);

  await persistQuote(quoteId, input, breakdown, featureNames, {
    createdAt,
    validUntil,
  });
  return quoteId;
}

export async function updateQuote(quoteId: string, input: QuoteInput): Promise<void> {
  const existing = await getQuote(quoteId);
  if (!existing) throw new Error("Quote not found");
  if (existing.companyId !== input.companyId) {
    throw new Error("Quote does not belong to this company");
  }

  const { breakdown, featureNames } = await computeQuotePayload(input);
  await persistQuote(quoteId, input, breakdown, featureNames, {
    createdAt: existing.createdAt,
    validUntil: addMonthsIso(new Date(), 1),
  });
}

export async function getQuote(quoteId: string): Promise<QuoteRecord | null> {
  const col = await quotesCol();
  const doc = await col.findOne({ _id: quoteId });
  if (!doc) return null;

  const product = await getProductDetail(doc.productId);
  const tierName =
    product?.tiers.find((t) => t.id === doc.tierId)?.name ??
    tierNameFromBreakdown(doc.breakdown) ??
    "Unknown tier";

  return {
    id: doc._id,
    name: doc.name,
    clientName: doc.clientName,
    companyId: doc.companyId,
    productId: doc.productId,
    productName: product?.name ?? "Unknown product",
    tierId: doc.tierId,
    tierName,
    seats: doc.seats,
    termLength: doc.termLength,
    discountPercent: doc.discountPercent,
    createdAt: doc.createdAt,
    validUntil: doc.validUntil,
    breakdown: doc.breakdown,
    selectedAddons: doc.addons,
  };
}

export interface QuoteListItem {
  id: string;
  name: string;
  clientName: string;
  createdAt: string;
  total: number;
}

export async function listQuotes(companyId: string): Promise<QuoteListItem[]> {
  const col = await quotesCol();
  const docs = await col.find({ companyId }).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => ({
    id: d._id,
    name: d.name,
    clientName: d.clientName,
    createdAt: d.createdAt,
    total: d.breakdown.total,
  }));
}

export async function deleteQuote(
  quoteId: string,
  companyId: string
): Promise<boolean> {
  const col = await quotesCol();
  const result = await col.deleteOne({ _id: quoteId, companyId });
  return result.deletedCount > 0;
}
