import { redirect } from "next/navigation";
import type { Company } from "./companies";
import { getCompany } from "./companies";
import { ensureAcmeCompany } from "./seed";

/** After a data reset, bookmarks and cached links may use deleted company IDs. */
export async function getCompanyOrRedirectToAcmeCatalog(
  companyId: string
): Promise<Company> {
  const company = await getCompany(companyId);
  if (company) return company;
  const acmeId = await ensureAcmeCompany();
  redirect(`/companies/${acmeId}/catalog`);
}
