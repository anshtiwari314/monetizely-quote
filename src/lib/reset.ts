import { getDb } from "./db";
import { ensureAcmeCompany, seedAcmeCatalog } from "./seed";

export interface ResetResult {
  companyId: string;
  productId: string | null;
}

export async function resetAllData(): Promise<ResetResult> {
  const db = await getDb();
  await Promise.all([
    db.collection("quotes").deleteMany({}),
    db.collection("products").deleteMany({}),
    db.collection("companies").deleteMany({}),
  ]);
  const companyId = await ensureAcmeCompany();
  const productId = await seedAcmeCatalog(companyId);
  return { companyId, productId };
}
