import { notFound } from "next/navigation";
import { QuoteView } from "@/components/QuoteView";
import { getQuote } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function ShareableQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  return <QuoteView quote={quote} />;
}
