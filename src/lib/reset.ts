import { getDb } from "./db";
import { ensureAcmeCompany } from "./seed";

export interface ResetResult {
  companyId: string;
  productId: string | null;
}

export function resetAllData(): ResetResult {
  const db = getDb();
  const clear = db.transaction(() => {
    db.exec(`DELETE FROM quote_addons`);
    db.exec(`DELETE FROM quotes`);
    db.exec(`DELETE FROM addon_pricing`);
    db.exec(`DELETE FROM feature_tier_availability`);
    db.exec(`DELETE FROM features`);
    db.exec(`DELETE FROM tiers`);
    db.exec(`DELETE FROM products`);
    db.exec(`DELETE FROM companies`);
  });
  clear();
  const companyId = ensureAcmeCompany();
  const productRow = db
    .prepare(
      `SELECT id FROM products WHERE company_id = ? AND name = 'Analytics Suite' LIMIT 1`
    )
    .get(companyId) as { id: string } | undefined;
  return { companyId, productId: productRow?.id ?? null };
}
