import { redirect } from "next/navigation";
import { ensureAcmeCompany } from "@/lib/seed";

export default function NewQuoteRedirect() {
  const companyId = ensureAcmeCompany();
  redirect(`/companies/${companyId}/quotes/new`);
}
