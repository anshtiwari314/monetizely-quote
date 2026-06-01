import Link from "next/link";
import { redirect } from "next/navigation";
import { getProductDetail, listProducts } from "@/lib/catalog";
import { getCompanyOrRedirectToAcmeCatalog } from "@/lib/company-routing";
import { CatalogEditor } from "@/components/CatalogEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ companyId: string; id: string }>;
}) {
  const { companyId, id } = await params;
  const company = await getCompanyOrRedirectToAcmeCatalog(companyId);

  const product = await getProductDetail(id);
  if (!product || product.companyId !== companyId) {
    const products = await listProducts(companyId);
    const byName = products.find((p) => p.name === product?.name);
    if (byName) {
      redirect(`/companies/${companyId}/catalog/${byName.id}`);
    }
    redirect(`/companies/${companyId}/catalog`);
  }

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
