"use client";

import Link from "next/link";
import { useState } from "react";

export function QuoteActions({ quoteId }: { quoteId: string }) {
  const [copied, setCopied] = useState(false);
  const sharePath = `/q/${quoteId}`;

  async function copyShareLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${sharePath}`
        : sharePath;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-6">
      <Link
        href={`/quotes/${quoteId}/edit`}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Edit quote
      </Link>
      <button
        type="button"
        onClick={copyShareLink}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        {copied ? "Link copied" : "Copy client link"}
      </button>
      <a
        href={sharePath}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        Preview client view →
      </a>
    </div>
  );
}
