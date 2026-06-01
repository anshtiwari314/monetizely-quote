import { redirect } from "next/navigation";
import { ensureAcmeCompany } from "@/lib/seed";

export default async function NewQuoteRedirect() {
  const companyId = await ensureAcmeCompany();
  redirect(`/companies/${companyId}/quotes/new`);
}
