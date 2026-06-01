import Link from "next/link";
import { notFound } from "next/navigation";
import { listProducts } from "@/lib/catalog";
import { getCompany } from "@/lib/companies";
import { CatalogProductList } from "@/components/CatalogProductList";

export const dynamic = "force-dynamic";

export default async function CompanyCatalogPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = getCompany(companyId);
  if (!company) notFound();

  const products = listProducts(companyId);

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Companies
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{company.name}</h1>
          <p className="text-sm text-zinc-500">Catalogue</p>
        </div>
        <Link
          href={`/companies/${companyId}/catalog/new`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New product
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="text-zinc-600">No products yet. Create your first product.</p>
      ) : (
        <CatalogProductList companyId={companyId} products={products} />
      )}
    </div>
  );
}
