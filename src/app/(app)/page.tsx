import { listCompanies } from "@/lib/companies";
import { ensureAcmeCompany } from "@/lib/seed";
import { CompanyHome } from "@/components/CompanyHome";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureAcmeCompany();
  const companies = await listCompanies();

  return <CompanyHome companies={companies} />;
}
