import { formatUsd, TERM_LABELS } from "@/lib/pricing";
import type { QuoteRecord } from "@/lib/types";

export function QuoteView({ quote }: { quote: QuoteRecord }) {
  const { breakdown } = quote;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{quote.name}</h1>
        <p className="mt-1 text-zinc-600">Client: {quote.clientName}</p>
        <p className="text-sm text-zinc-500">
          Quote date: {quote.createdAt.slice(0, 10)} · Valid until:{" "}
          {quote.validUntil}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="mb-3 font-semibold text-zinc-900">What is being purchased</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Product</dt>
            <dd className="font-medium">{quote.productName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tier</dt>
            <dd className="font-medium">{quote.tierName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Seats</dt>
            <dd className="font-medium">{quote.seats}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Term length</dt>
            <dd className="font-medium">{TERM_LABELS[quote.termLength]}</dd>
          </div>
        </dl>
        {quote.selectedAddons.length > 0 && (
          <div className="mt-4">
            <dt className="text-sm text-zinc-500">Selected add-ons</dt>
            <ul className="mt-1 list-inside list-disc text-sm">
              {quote.selectedAddons.map((a) => (
                <li key={a.featureId}>
                  {a.featureName}
                  {a.addonSeats != null ? ` (${a.addonSeats} seats)` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-zinc-900">Cost breakdown</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-100 text-left text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Line item</th>
                <th className="px-4 py-3 font-medium">How it was calculated</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 text-right font-medium">Amount (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {breakdown.lineItems.map((item, i) => (
                <tr key={i} className="bg-white">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {item.label}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{item.calculation}</td>
                  <td className="px-4 py-3 text-zinc-500">{item.notes}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatUsd(item.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td colSpan={3} className="px-4 py-3 text-zinc-900">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-900">
                  {formatUsd(breakdown.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
