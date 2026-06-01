import { randomUUID } from "crypto";
import { getProductDetail } from "./catalog";
import { batch, columnExists, execute, queryAll, queryOne } from "./db";
import { buildQuoteBreakdown } from "./pricing";
import type { ProductDetail } from "./types";
import type { QuoteInput, QuoteRecord } from "./types";

function addMonthsIso(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const CLIENT_NAME_SQL = `COALESCE(q.client_name, q.customer_name)`;

function tierNameFromBreakdown(breakdownJson: string): string | null {
  try {
    const breakdown = JSON.parse(breakdownJson) as {
      lineItems?: { label?: string }[];
    };
    const label = breakdown.lineItems?.[0]?.label ?? "";
    const match = label.match(/ - (.+?) tier$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
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
  options: { createdAt: string; validUntil: string; isNew: boolean }
): Promise<void> {
  const hasLegacyCustomerName = await columnExists("quotes", "customer_name");
  const statements: { sql: string; args: (string | number | null)[] }[] = [];

  if (options.isNew) {
    if (hasLegacyCustomerName) {
      statements.push({
        sql: `INSERT INTO quotes (
          id, name, client_name, customer_name, company_id, product_id, tier_id, seats,
          term_length, discount_percent, breakdown_json, created_at, valid_until
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          quoteId,
          input.name,
          input.clientName,
          input.clientName,
          input.companyId,
          input.productId,
          input.tierId,
          input.seats,
          input.termLength,
          input.discountPercent ?? 0,
          JSON.stringify(breakdown),
          options.createdAt,
          options.validUntil,
        ],
      });
    } else {
      statements.push({
        sql: `INSERT INTO quotes (
          id, name, client_name, company_id, product_id, tier_id, seats, term_length,
          discount_percent, breakdown_json, created_at, valid_until
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          quoteId,
          input.name,
          input.clientName,
          input.companyId,
          input.productId,
          input.tierId,
          input.seats,
          input.termLength,
          input.discountPercent ?? 0,
          JSON.stringify(breakdown),
          options.createdAt,
          options.validUntil,
        ],
      });
    }
  } else {
    if (hasLegacyCustomerName) {
      statements.push({
        sql: `UPDATE quotes SET
          name = ?, client_name = ?, customer_name = ?, product_id = ?, tier_id = ?, seats = ?,
          term_length = ?, discount_percent = ?, breakdown_json = ?, valid_until = ?
         WHERE id = ?`,
        args: [
          input.name,
          input.clientName,
          input.clientName,
          input.productId,
          input.tierId,
          input.seats,
          input.termLength,
          input.discountPercent ?? 0,
          JSON.stringify(breakdown),
          options.validUntil,
          quoteId,
        ],
      });
    } else {
      statements.push({
        sql: `UPDATE quotes SET
          name = ?, client_name = ?, product_id = ?, tier_id = ?, seats = ?,
          term_length = ?, discount_percent = ?, breakdown_json = ?, valid_until = ?
         WHERE id = ?`,
        args: [
          input.name,
          input.clientName,
          input.productId,
          input.tierId,
          input.seats,
          input.termLength,
          input.discountPercent ?? 0,
          JSON.stringify(breakdown),
          options.validUntil,
          quoteId,
        ],
      });
    }
    statements.push({
      sql: "DELETE FROM quote_addons WHERE quote_id = ?",
      args: [quoteId],
    });
  }

  for (const addon of input.addons) {
    statements.push({
      sql: `INSERT INTO quote_addons (quote_id, feature_id, feature_name, addon_seats, addon_percent)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        quoteId,
        addon.featureId,
        featureNames[addon.featureId] ?? addon.featureId,
        addon.addonSeats ?? null,
        addon.percentValue ?? null,
      ],
    });
  }

  await batch(statements);
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
  const quoteId = randomUUID();
  const createdAt = new Date().toISOString();
  const validUntil = addMonthsIso(new Date(), 1);

  await persistQuote(quoteId, input, breakdown, featureNames, {
    createdAt,
    validUntil,
    isNew: true,
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
    isNew: false,
  });
}

export async function getQuote(quoteId: string): Promise<QuoteRecord | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    clientName: string;
    companyId: string;
    productId: string;
    productName: string;
    tierId: string;
    tierName: string;
    seats: number;
    termLength: QuoteRecord["termLength"];
    discountPercent: number;
    breakdownJson: string;
    createdAt: string;
    validUntil: string;
  }>(
    `SELECT q.id, q.name, ${CLIENT_NAME_SQL} as clientName, q.company_id as companyId,
            q.product_id as productId, p.name as productName, q.tier_id as tierId,
            t.name as tierName, q.seats, q.term_length as termLength,
            q.discount_percent as discountPercent, q.breakdown_json as breakdownJson,
            q.created_at as createdAt, q.valid_until as validUntil
     FROM quotes q
     LEFT JOIN products p ON p.id = q.product_id
     LEFT JOIN tiers t ON t.id = q.tier_id
     WHERE q.id = ?`,
    [quoteId]
  );

  if (!row) return null;

  const tierName =
    row.tierName ??
    tierNameFromBreakdown(row.breakdownJson) ??
    "Unknown tier";

  const selectedAddons = await queryAll<QuoteRecord["selectedAddons"][number]>(
    `SELECT feature_id as featureId, feature_name as featureName,
            addon_seats as addonSeats, addon_percent as addonPercent
     FROM quote_addons WHERE quote_id = ?`,
    [quoteId]
  );

  return {
    id: row.id,
    name: row.name,
    clientName: row.clientName,
    companyId: row.companyId,
    productId: row.productId,
    productName: row.productName,
    tierId: row.tierId,
    tierName,
    seats: row.seats,
    termLength: row.termLength,
    discountPercent: row.discountPercent,
    createdAt: row.createdAt,
    validUntil: row.validUntil,
    breakdown: JSON.parse(row.breakdownJson),
    selectedAddons,
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
  const rows = await queryAll<{
    id: string;
    name: string;
    clientName: string;
    createdAt: string;
    breakdownJson: string;
  }>(
    `SELECT id, name, ${CLIENT_NAME_SQL} as clientName, created_at as createdAt,
            breakdown_json as breakdownJson
     FROM quotes q
     WHERE company_id = ?
     ORDER BY created_at DESC`,
    [companyId]
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    clientName: r.clientName,
    createdAt: r.createdAt,
    total: (JSON.parse(r.breakdownJson) as { total: number }).total,
  }));
}

export async function deleteQuote(
  quoteId: string,
  companyId: string
): Promise<boolean> {
  const changes = await execute(
    `DELETE FROM quotes WHERE id = ? AND company_id = ?`,
    [quoteId, companyId]
  );
  return changes > 0;
}
