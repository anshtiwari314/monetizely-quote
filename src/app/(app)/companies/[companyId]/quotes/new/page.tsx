import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail, listProducts } from "@/lib/catalog";
import { getCompany } from "@/lib/companies";
import { QuoteBuilder } from "@/components/QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = getCompany(companyId);
  if (!company) notFound();

  const products = listProducts(companyId);
  const productDetails = products
    .map((p) => getProductDetail(p.id))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Companies
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">New quote — {company.name}</h1>
        <p className="text-zinc-600">
          Set up a product in the catalogue before creating a quote.
        </p>
        <Link
          href={`/companies/${companyId}/catalog/new`}
          className="text-blue-600 hover:underline"
        >
          Create a product →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/companies/${companyId}/quotes`}
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← {company.name} quotes
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">New quote</h1>
      <QuoteBuilder companyId={companyId} productDetails={productDetails} />
    </div>
  );
}
