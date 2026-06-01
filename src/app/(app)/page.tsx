import { listCompanies } from "@/lib/companies";
import { ensureAcmeCompany } from "@/lib/seed";
import { CompanyHome } from "@/components/CompanyHome";

export const dynamic = "force-dynamic";

export default function Home() {
  ensureAcmeCompany();
  const companies = listCompanies();

  return <CompanyHome companies={companies} />;
}
