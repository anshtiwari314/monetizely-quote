import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/catalog";
import { getCompany } from "@/lib/companies";
import { CatalogEditor } from "@/components/CatalogEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ companyId: string; id: string }>;
}) {
  const { companyId, id } = await params;
  const company = getCompany(companyId);
  if (!company) notFound();

  const product = getProductDetail(id);
  if (!product || product.companyId !== companyId) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/companies/${companyId}/catalog`}
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← {company.name} catalogue
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">Edit: {product.name}</h1>
      <CatalogEditor companyId={companyId} productId={id} initial={product} />
    </div>
  );
}
