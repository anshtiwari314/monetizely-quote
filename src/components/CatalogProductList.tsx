"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RowActionsMenu } from "./RowActionsMenu";

export function CatalogProductList({
  companyId,
  products,
}: {
  companyId: string;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();

  async function removeProduct(productId: string, productName: string) {
    if (
      !window.confirm(
        `Remove "${productName}" from this company's catalogue? This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/products/${productId}?companyId=${encodeURIComponent(companyId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to remove product");
      return;
    }
    router.refresh();
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {products.map((p) => (
        <li key={p.id} className="flex items-center gap-2 px-4 py-3 hover:bg-zinc-50">
          <Link
            href={`/companies/${companyId}/catalog/${p.id}`}
            prefetch={false}
            className="min-w-0 flex-1 font-medium text-zinc-900"
          >
            {p.name}
          </Link>
          <RowActionsMenu
            actions={[
              {
                label: "Remove from catalogue",
                destructive: true,
                onSelect: () => removeProduct(p.id, p.name),
              },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}
