import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail, listProducts } from "@/lib/catalog";
import { getQuote, resolveQuoteTierId } from "@/lib/quotes";
import { QuoteBuilder } from "@/components/QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  if (!quote.companyId) notFound();

  const products = await listProducts(quote.companyId);
  const productDetails = (
    await Promise.all(products.map((p) => getProductDetail(p.id)))
  ).filter((p): p is NonNullable<typeof p> => p !== null);

  const product = productDetails.find((p) => p.id === quote.productId);
  const resolvedTierId = product
    ? resolveQuoteTierId(product, quote.tierId, quote.tierName)
    : quote.tierId;

  return (
    <div className="space-y-6">
      <Link
        href={`/quotes/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to quote
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">Edit quote</h1>
      {resolvedTierId !== quote.tierId && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The catalogue was updated since this quote was saved. Tier selection was
          reset to &ldquo;{quote.tierName}&rdquo; using the current catalog.
        </p>
      )}
      <QuoteBuilder
        companyId={quote.companyId}
        quoteId={id}
        productDetails={productDetails}
        initial={{
          name: quote.name,
          clientName: quote.clientName,
          productId: quote.productId,
          tierId: resolvedTierId,
          seats: quote.seats,
          termLength: quote.termLength,
          discountPercent: quote.discountPercent,
          addons: quote.selectedAddons.map((a) => ({
            featureId: a.featureId,
            addonSeats: a.addonSeats,
            addonPercent: a.addonPercent,
          })),
        }}
      />
    </div>
  );
}
