import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteActions } from "@/components/QuoteActions";
import { QuoteView } from "@/components/QuoteView";
import { getQuote } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/companies/${quote.companyId}/quotes`}
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to quotes
      </Link>
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <QuoteActions quoteId={id} />
        <QuoteView quote={quote} />
      </div>
    </div>
  );
}
