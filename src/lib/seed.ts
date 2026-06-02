import { createCompany, listCompanies } from "./companies";
import { createProduct, listProducts, type CreateProductInput } from "./catalog";
import { companiesCol, productsCol, quotesCol } from "./db";

export const DEFAULT_COMPANY_NAME = "ACME";

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

export async function findAcmeCompanyId(): Promise<string | undefined> {
  const companies = await listCompanies();
  return companies.find(
    (c) => c.name === DEFAULT_COMPANY_NAME || c.name === "Acme Analytics"
  )?.id;
}

export async function seedAcmeCatalog(companyId: string): Promise<string | null> {
  const products = await listProducts(companyId);
  const match = products.find((p) => p.name === "Analytics Suite");
  if (match) return match.id;

  return createProduct(companyId, analyticsSuiteSeed);
}

/** Ensures default ACME company exists (uuid v4 id); returns that company's id. */
export async function ensureAcmeCompany(): Promise<string> {
  let id = await findAcmeCompanyId();
  if (!id) {
    id = await createCompany(DEFAULT_COMPANY_NAME);
  } else {
    const col = await companiesCol();
    await col.updateOne({ _id: id }, { $set: { name: DEFAULT_COMPANY_NAME } });
  }

  const products = await productsCol();
  await products.updateMany(
    { companyId: { $exists: false } },
    { $set: { companyId: id } }
  );

  const quotes = await quotesCol();
  await quotes.updateMany(
    { companyId: { $exists: false } },
    { $set: { companyId: id } }
  );

  await seedAcmeCatalog(id);
  return id;
}

/** @deprecated Use ensureAcmeCompany */
export const ensureSampleCompany = ensureAcmeCompany;

/** @deprecated Use seedAcmeCatalog — only for ACME */
export const seedSampleCatalog = seedAcmeCatalog;
