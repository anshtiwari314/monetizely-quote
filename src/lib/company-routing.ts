import { redirect } from "next/navigation";
import type { Company } from "./companies";
import { getCompany } from "./companies";
import { ACME_COMPANY_ID, ensureAcmeCompany } from "./seed";

/** After a data reset, bookmarks and cached links may use deleted company IDs. */
export async function getCompanyOrRedirectToAcmeCatalog(
  companyId: string
): Promise<Company> {
  const company = await getCompany(companyId);
  if (company) return company;
  await ensureAcmeCompany();
  redirect(`/companies/${ACME_COMPANY_ID}/catalog`);
}
