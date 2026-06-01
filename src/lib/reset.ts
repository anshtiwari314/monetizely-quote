import { batch } from "./db";
import { ANALYTICS_SUITE_PRODUCT_ID, ensureAcmeCompany } from "./seed";

export interface ResetResult {
  companyId: string;
  productId: string | null;
}

export async function resetAllData(): Promise<ResetResult> {
  await batch([
    { sql: `DELETE FROM quote_addons` },
    { sql: `DELETE FROM quotes` },
    { sql: `DELETE FROM addon_pricing` },
    { sql: `DELETE FROM feature_tier_availability` },
    { sql: `DELETE FROM features` },
    { sql: `DELETE FROM tiers` },
    { sql: `DELETE FROM products` },
    { sql: `DELETE FROM companies` },
  ]);
  const companyId = await ensureAcmeCompany();
  return { companyId, productId: ANALYTICS_SUITE_PRODUCT_ID };
}
