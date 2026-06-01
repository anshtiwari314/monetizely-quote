import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/companies";
import { CatalogEditor } from "@/components/CatalogEditor";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = getCompany(companyId);
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/companies/${companyId}/catalog`}
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← {company.name} catalogue
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">New product</h1>
      <CatalogEditor companyId={companyId} />
    </div>
  );
}
