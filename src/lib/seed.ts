import { createCompany, listCompanies } from "./companies";
import { createProduct, listProducts } from "./catalog";
import { getDb } from "./db";

export const DEFAULT_COMPANY_NAME = "ACME";

/** Seeds Analytics Suite catalogue for the default ACME company only. */
export function seedAcmeCatalog(companyId: string): string | null {
  const existing = listProducts(companyId);
  const match = existing.find((p) => p.name === "Analytics Suite");
  if (match) return match.id;

  return createProduct(companyId, {
    name: "Analytics Suite",
    tiers: [
      { name: "Starter", basePricePerSeat: 25, notes: "Entry tier for small teams" },
      { name: "Growth", basePricePerSeat: 50, notes: "Mid-market tier with most features" },
      {
        name: "Enterprise",
        basePricePerSeat: 100,
        notes: "Full-featured tier for large customers",
      },
    ],
    features: [
      { name: "Real-time dashboards" },
      { name: "Custom reports" },
      { name: "API access" },
      { name: "Single Sign-On (SSO)" },
      { name: "Advanced anomaly detection" },
      { name: "Dedicated support" },
      { name: "White-label option" },
      { name: "Custom integrations" },
    ],
    matrix: [
      { featureIndex: 0, tierIndex: 0, availability: "included" },
      { featureIndex: 0, tierIndex: 1, availability: "included" },
      { featureIndex: 0, tierIndex: 2, availability: "included" },
      { featureIndex: 1, tierIndex: 0, availability: "not_available" },
      { featureIndex: 1, tierIndex: 1, availability: "included" },
      { featureIndex: 1, tierIndex: 2, availability: "included" },
      { featureIndex: 2, tierIndex: 0, availability: "not_available" },
      { featureIndex: 2, tierIndex: 1, availability: "addon" },
      { featureIndex: 2, tierIndex: 2, availability: "included" },
      { featureIndex: 3, tierIndex: 0, availability: "not_available" },
      { featureIndex: 3, tierIndex: 1, availability: "addon" },
      { featureIndex: 3, tierIndex: 2, availability: "included" },
      { featureIndex: 4, tierIndex: 0, availability: "not_available" },
      { featureIndex: 4, tierIndex: 1, availability: "addon" },
      { featureIndex: 4, tierIndex: 2, availability: "included" },
      { featureIndex: 5, tierIndex: 0, availability: "not_available" },
      { featureIndex: 5, tierIndex: 1, availability: "not_available" },
      { featureIndex: 5, tierIndex: 2, availability: "included" },
      { featureIndex: 6, tierIndex: 0, availability: "not_available" },
      { featureIndex: 6, tierIndex: 1, availability: "addon" },
      { featureIndex: 6, tierIndex: 2, availability: "addon" },
      { featureIndex: 7, tierIndex: 0, availability: "not_available" },
      { featureIndex: 7, tierIndex: 1, availability: "addon" },
      { featureIndex: 7, tierIndex: 2, availability: "addon" },
    ],
    addonPricing: [
      { featureIndex: 2, tierIndex: 1, pricingModel: "per_seat", value: 50 },
      { featureIndex: 3, tierIndex: 1, pricingModel: "fixed", value: 200 },
      { featureIndex: 4, tierIndex: 1, pricingModel: "percent", value: 10 },
      { featureIndex: 6, tierIndex: 1, pricingModel: "fixed", value: 500 },
      { featureIndex: 7, tierIndex: 1, pricingModel: "fixed", value: 1000 },
      { featureIndex: 6, tierIndex: 2, pricingModel: "fixed", value: 300 },
      { featureIndex: 7, tierIndex: 2, pricingModel: "percent", value: 5 },
    ],
  });
}

function findAcmeCompanyId(): string | undefined {
  const companies = listCompanies();
  return companies.find(
    (c) => c.name === DEFAULT_COMPANY_NAME || c.name === "Acme Analytics"
  )?.id;
}

/** Ensures default ACME company exists; migrates orphan rows only to ACME. */
export function ensureAcmeCompany(): string {
  let id = findAcmeCompanyId();
  if (!id) {
    id = createCompany(DEFAULT_COMPANY_NAME);
  } else {
    const db = getDb();
    db.prepare(`UPDATE companies SET name = ? WHERE id = ?`).run(
      DEFAULT_COMPANY_NAME,
      id
    );
  }

  const db = getDb();
  db.prepare(`UPDATE products SET company_id = ? WHERE company_id IS NULL`).run(id);
  db.prepare(`UPDATE quotes SET company_id = ? WHERE company_id IS NULL`).run(id);
  seedAcmeCatalog(id);
  return id;
}

/** @deprecated Use ensureAcmeCompany */
export const ensureSampleCompany = ensureAcmeCompany;

/** @deprecated Use seedAcmeCatalog — only for ACME */
export const seedSampleCatalog = seedAcmeCatalog;
