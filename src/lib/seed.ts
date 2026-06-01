import { createCompany, getCompany, listCompanies } from "./companies";
import {
  createProduct,
  getProductDetail,
  listProducts,
  type CreateProductInput,
} from "./catalog";
import { getDb } from "./db";

export const DEFAULT_COMPANY_NAME = "ACME";

/** Stable IDs so every Vercel serverless instance seeds the same rows in /tmp. */
export const ACME_COMPANY_ID = "a0000000-0000-4000-8000-000000000001";
export const ANALYTICS_SUITE_PRODUCT_ID = "a0000000-0000-4000-8000-000000000002";

/** Seeds Analytics Suite catalogue for the default ACME company only. */
const analyticsSuiteSeed: CreateProductInput = {
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
};

export function seedAcmeCatalog(companyId: string): string | null {
  const stable = getProductDetail(ANALYTICS_SUITE_PRODUCT_ID);
  if (stable?.companyId === companyId) return ANALYTICS_SUITE_PRODUCT_ID;

  const match = listProducts(companyId).find((p) => p.name === "Analytics Suite");
  if (match) return match.id;

  return createProduct(companyId, analyticsSuiteSeed, ANALYTICS_SUITE_PRODUCT_ID);
}

function findAcmeCompanyId(): string | undefined {
  const companies = listCompanies();
  return companies.find(
    (c) => c.name === DEFAULT_COMPANY_NAME || c.name === "Acme Analytics"
  )?.id;
}

/** Ensures default ACME company exists; migrates orphan rows only to ACME. */
export function ensureAcmeCompany(): string {
  const db = getDb();
  if (!getCompany(ACME_COMPANY_ID)) {
    const legacyId = findAcmeCompanyId();
    if (!legacyId) {
      createCompany(DEFAULT_COMPANY_NAME, ACME_COMPANY_ID);
    }
  } else {
    db.prepare(`UPDATE companies SET name = ? WHERE id = ?`).run(
      DEFAULT_COMPANY_NAME,
      ACME_COMPANY_ID
    );
  }

  const id = getCompany(ACME_COMPANY_ID) ? ACME_COMPANY_ID : findAcmeCompanyId()!;
  db.prepare(`UPDATE products SET company_id = ? WHERE company_id IS NULL`).run(id);
  db.prepare(`UPDATE quotes SET company_id = ? WHERE company_id IS NULL`).run(id);
  seedAcmeCatalog(id);
  return id;
}

/** @deprecated Use ensureAcmeCompany */
export const ensureSampleCompany = ensureAcmeCompany;

/** @deprecated Use seedAcmeCatalog — only for ACME */
export const seedSampleCatalog = seedAcmeCatalog;
