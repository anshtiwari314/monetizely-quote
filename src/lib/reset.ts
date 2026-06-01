import { getDb } from "./db";
import { ensureAcmeCompany } from "./seed";

export function resetAllData(): string {
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
  return ensureAcmeCompany();
}
