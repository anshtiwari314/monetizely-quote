import { redirect } from "next/navigation";
import type { Company } from "./companies";
import { getCompany } from "./companies";
import { ensureAcmeCompany } from "./seed";

/** After a data reset, bookmarks and cached links may use deleted company IDs. */
export function getCompanyOrRedirectToAcmeCatalog(
  companyId: string
): Company {
  const company = getCompany(companyId);
  if (company) return company;
  const acmeId = ensureAcmeCompany();
  redirect(`/companies/${acmeId}/catalog`);
}
