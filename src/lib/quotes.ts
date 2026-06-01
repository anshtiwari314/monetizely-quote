import { randomUUID } from "crypto";
import { getProductDetail } from "./catalog";
import { columnExists, getDb } from "./db";
import { buildQuoteBreakdown } from "./pricing";
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
  product: NonNullable<ReturnType<typeof getProductDetail>>,
  savedTierId: string,
  savedTierName: string
): string {
  if (product.tiers.some((t) => t.id === savedTierId)) return savedTierId;
  const byName = product.tiers.find(
    (t) => t.name.toLowerCase() === savedTierName.toLowerCase()
  );
  return byName?.id ?? product.tiers[0]?.id ?? savedTierId;
}

function persistQuote(
  quoteId: string,
  input: QuoteInput,
  breakdown: ReturnType<typeof buildQuoteBreakdown>,
  featureNames: Record<string, string>,
  options: { createdAt: string; validUntil: string; isNew: boolean }
): void {
  const db = getDb();
  const hasLegacyCustomerName = columnExists(db, "quotes", "customer_name");
  const tx = db.transaction(() => {
    if (options.isNew) {
      if (hasLegacyCustomerName) {
        db.prepare(
          `INSERT INTO quotes (
            id, name, client_name, customer_name, company_id, product_id, tier_id, seats,
            term_length, discount_percent, breakdown_json, created_at, valid_until
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
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
          options.validUntil
        );
      } else {
        db.prepare(
          `INSERT INTO quotes (
            id, name, client_name, company_id, product_id, tier_id, seats, term_length,
            discount_percent, breakdown_json, created_at, valid_until
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
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
          options.validUntil
        );
      }
    } else {
      if (hasLegacyCustomerName) {
        db.prepare(
          `UPDATE quotes SET
            name = ?, client_name = ?, customer_name = ?, product_id = ?, tier_id = ?, seats = ?,
            term_length = ?, discount_percent = ?, breakdown_json = ?, valid_until = ?
           WHERE id = ?`
        ).run(
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
          quoteId
        );
      } else {
        db.prepare(
          `UPDATE quotes SET
            name = ?, client_name = ?, product_id = ?, tier_id = ?, seats = ?,
            term_length = ?, discount_percent = ?, breakdown_json = ?, valid_until = ?
           WHERE id = ?`
        ).run(
          input.name,
          input.clientName,
          input.productId,
          input.tierId,
          input.seats,
          input.termLength,
          input.discountPercent ?? 0,
          JSON.stringify(breakdown),
          options.validUntil,
          quoteId
        );
      }
      db.prepare("DELETE FROM quote_addons WHERE quote_id = ?").run(quoteId);
    }

    for (const addon of input.addons) {
      db.prepare(
        `INSERT INTO quote_addons (quote_id, feature_id, feature_name, addon_seats, addon_percent)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        quoteId,
        addon.featureId,
        featureNames[addon.featureId] ?? addon.featureId,
        addon.addonSeats ?? null,
        addon.percentValue ?? null
      );
    }
  });
  tx();
}

function computeQuotePayload(input: QuoteInput) {
  const detail = getProductDetail(input.productId);
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

export function createQuote(input: QuoteInput): string {
  const { breakdown, featureNames } = computeQuotePayload(input);
  const quoteId = randomUUID();
  const createdAt = new Date().toISOString();
  const validUntil = addMonthsIso(new Date(), 1);

  persistQuote(quoteId, input, breakdown, featureNames, {
    createdAt,
    validUntil,
    isNew: true,
  });
  return quoteId;
}

export function updateQuote(quoteId: string, input: QuoteInput): void {
  const existing = getQuote(quoteId);
  if (!existing) throw new Error("Quote not found");
  if (existing.companyId !== input.companyId) {
    throw new Error("Quote does not belong to this company");
  }

  const { breakdown, featureNames } = computeQuotePayload(input);
  persistQuote(quoteId, input, breakdown, featureNames, {
    createdAt: existing.createdAt,
    validUntil: addMonthsIso(new Date(), 1),
    isNew: false,
  });
}

export function getQuote(quoteId: string): QuoteRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT q.id, q.name, ${CLIENT_NAME_SQL} as clientName, q.company_id as companyId,
              q.product_id as productId, p.name as productName, q.tier_id as tierId,
              t.name as tierName, q.seats, q.term_length as termLength,
              q.discount_percent as discountPercent, q.breakdown_json as breakdownJson,
              q.created_at as createdAt, q.valid_until as validUntil
       FROM quotes q
       LEFT JOIN products p ON p.id = q.product_id
       LEFT JOIN tiers t ON t.id = q.tier_id
       WHERE q.id = ?`
    )
    .get(quoteId) as
    | {
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
      }
    | undefined;

  if (!row) return null;

  const tierName =
    row.tierName ??
    tierNameFromBreakdown(row.breakdownJson) ??
    "Unknown tier";

  const selectedAddons = db
    .prepare(
      `SELECT feature_id as featureId, feature_name as featureName,
              addon_seats as addonSeats, addon_percent as addonPercent
       FROM quote_addons WHERE quote_id = ?`
    )
    .all(quoteId) as QuoteRecord["selectedAddons"];

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

export function listQuotes(companyId: string): QuoteListItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, ${CLIENT_NAME_SQL} as clientName, created_at as createdAt,
              breakdown_json as breakdownJson
       FROM quotes q
       WHERE company_id = ?
       ORDER BY created_at DESC`
    )
    .all(companyId) as {
    id: string;
    name: string;
    clientName: string;
    createdAt: string;
    breakdownJson: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    clientName: r.clientName,
    createdAt: r.createdAt,
    total: (JSON.parse(r.breakdownJson) as { total: number }).total,
  }));
}

export function deleteQuote(quoteId: string, companyId: string): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM quotes WHERE id = ? AND company_id = ?`)
    .run(quoteId, companyId);
  return result.changes > 0;
}
