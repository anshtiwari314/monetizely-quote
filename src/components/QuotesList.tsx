"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/pricing";
import { RowActionsMenu } from "./RowActionsMenu";

export function QuotesList({
  companyId,
  quotes,
}: {
  companyId: string;
  quotes: {
    id: string;
    name: string;
    clientName: string;
    total: number;
  }[];
}) {
  const router = useRouter();

  async function removeQuote(quoteId: string, quoteName: string) {
    if (
      !window.confirm(
        `Delete quote "${quoteName}"? This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/quotes/${quoteId}?companyId=${encodeURIComponent(companyId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete quote");
      return;
    }
    router.refresh();
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {quotes.map((q) => (
        <li key={q.id} className="flex items-center gap-2 px-4 py-3 hover:bg-zinc-50">
          <Link href={`/quotes/${q.id}`} className="min-w-0 flex-1">
            <span className="font-medium text-zinc-900">{q.name}</span>
            <p className="text-sm text-zinc-500">{q.clientName}</p>
          </Link>
          <span className="hidden font-mono text-sm text-zinc-700 sm:block">
            {formatUsd(q.total)}
          </span>
          <RowActionsMenu
            actions={[
              {
                label: "Edit quote",
                onSelect: () => {
                  window.location.href = `/quotes/${q.id}/edit`;
                },
              },
              {
                label: "Delete quote",
                destructive: true,
                onSelect: () => removeQuote(q.id, q.name),
              },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}
