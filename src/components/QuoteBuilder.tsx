"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AddonPricingModel, ProductDetail, TermLength } from "@/lib/types";

export interface QuoteBuilderInitial {
  name: string;
  clientName: string;
  productId: string;
  tierId: string;
  seats: number;
  termLength: TermLength;
  discountPercent: number;
  addons: {
    featureId: string;
    addonSeats: number | null;
    addonPercent: number | null;
  }[];
}

type AddonFieldState = {
  checked: boolean;
  addonSeats: string;
  percentValue: string;
};

function buildSelectedAddonsState(
  initial: QuoteBuilderInitial | undefined,
  productDetails: ProductDetail[]
): Record<string, AddonFieldState> {
  const state: Record<string, AddonFieldState> = {};
  if (!initial) return state;

  const product = productDetails.find((p) => p.id === initial.productId);
  for (const addon of initial.addons) {
    const pricing = product?.addonPricing.find(
      (p) => p.featureId === addon.featureId && p.tierId === initial.tierId
    );
    const defaultPercent = String(addon.addonPercent ?? pricing?.value ?? 10);
    state[addon.featureId] = {
      checked: true,
      addonSeats: addon.addonSeats != null ? String(addon.addonSeats) : "1",
      percentValue: defaultPercent,
    };
  }
  return state;
}

export function QuoteBuilder({
  companyId,
  productDetails,
  quoteId,
  initial,
}: {
  companyId: string;
  productDetails: ProductDetail[];
  quoteId?: string;
  initial?: QuoteBuilderInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(quoteId);

  const [name, setName] = useState(initial?.name ?? "");
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [productId, setProductId] = useState(
    initial?.productId ?? productDetails[0]?.id ?? ""
  );
  const detail = useMemo(
    () => productDetails.find((p) => p.id === productId) ?? null,
    [productDetails, productId]
  );
  const [tierId, setTierId] = useState(
    initial?.tierId ??
      productDetails[0]?.tiers[1]?.id ??
      productDetails[0]?.tiers[0]?.id ??
      ""
  );
  const [seats, setSeats] = useState(String(initial?.seats ?? 25));
  const [termLength, setTermLength] = useState<TermLength>(
    initial?.termLength ?? "annual"
  );
  const [discountPercent, setDiscountPercent] = useState(
    String(initial?.discountPercent ?? 0)
  );
  const [selectedAddons, setSelectedAddons] = useState<Record<string, AddonFieldState>>(
    () => buildSelectedAddonsState(initial, productDetails)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tier = detail?.tiers.find((t) => t.id === tierId);

  function handleProductChange(id: string) {
    const next = productDetails.find((p) => p.id === id);
    setProductId(id);
    setTierId(next?.tiers[0]?.id ?? "");
    setSelectedAddons({});
  }

  function toggleAddon(
    featureId: string,
    checked: boolean,
    pricing: { pricingModel: AddonPricingModel; value: number }
  ) {
    setSelectedAddons((s) => ({
      ...s,
      [featureId]: {
        checked,
        addonSeats: s[featureId]?.addonSeats ?? "1",
        percentValue: s[featureId]?.percentValue ?? String(pricing.value),
      },
    }));
  }

  const addonOptions =
    detail && tierId
      ? detail.matrix
          .filter((c) => c.tierId === tierId && c.availability === "addon")
          .map((c) => {
            const feature = detail.features.find((f) => f.id === c.featureId)!;
            const pricing = detail.addonPricing.find(
              (p) => p.featureId === c.featureId && p.tierId === tierId
            )!;
            return { feature, pricing };
          })
      : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const addons = addonOptions
      .filter((o) => selectedAddons[o.feature.id]?.checked)
      .map((o) => {
        const sel = selectedAddons[o.feature.id];
        return {
          featureId: o.feature.id,
          addonSeats:
            o.pricing.pricingModel === "per_seat"
              ? parseInt(sel.addonSeats, 10)
              : undefined,
          percentValue:
            o.pricing.pricingModel === "percent"
              ? parseFloat(sel.percentValue) || o.pricing.value
              : undefined,
        };
      });

    const payload = {
      name,
      clientName,
      companyId,
      productId,
      tierId,
      seats: parseInt(seats, 10),
      termLength,
      discountPercent: parseFloat(discountPercent) || 0,
      addons,
    };

    const url = isEdit ? `/api/quotes/${quoteId}` : "/api/quotes";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Failed to ${isEdit ? "update" : "create"} quote`);
      return;
    }
    const data = await res.json();
    router.push(`/quotes/${data.id ?? quoteId}`);
    router.refresh();
  }

  function modelLabel(m: AddonPricingModel): string {
    if (m === "fixed") return "fixed monthly";
    if (m === "per_seat") return "per seat / month";
    return "% of product cost";
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div>
        <label htmlFor="quote-name" className="block text-sm font-medium text-zinc-700">
          Quote name
        </label>
        <input
          id="quote-name"
          required
          placeholder="Acme Corp - Q3 2026 proposal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        />
      </div>
      <div>
        <label htmlFor="client-name" className="block text-sm font-medium text-zinc-700">
          Client name
        </label>
        <input
          id="client-name"
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        />
      </div>
      <div>
        <label htmlFor="quote-product" className="block text-sm font-medium text-zinc-700">
          Product
        </label>
        <select
          id="quote-product"
          value={productId}
          onChange={(e) => handleProductChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        >
          {productDetails.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="quote-tier" className="block text-sm font-medium text-zinc-700">
          Tier
        </label>
        <select
          id="quote-tier"
          required
          value={tierId}
          onChange={(e) => {
            setTierId(e.target.value);
            setSelectedAddons({});
          }}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        >
          {detail?.tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — ${t.basePricePerSeat}/seat/mo
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="quote-seats" className="block text-sm font-medium text-zinc-700">
          Seats
        </label>
        <input
          id="quote-seats"
          required
          type="number"
          min={1}
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        />
      </div>
      <div>
        <label htmlFor="quote-term" className="block text-sm font-medium text-zinc-700">
          Term length
        </label>
        <select
          id="quote-term"
          value={termLength}
          onChange={(e) => setTermLength(e.target.value as TermLength)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        >
          <option value="monthly">Monthly (no discount)</option>
          <option value="annual">Annual — 15% off per-seat price</option>
          <option value="two_year">Two-year — 25% off per-seat price</option>
        </select>
      </div>

      {addonOptions.length > 0 && (
        <fieldset className="rounded-lg border border-zinc-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            Available add-ons ({tier?.name})
          </legend>
          <ul className="mt-3 space-y-3">
            {addonOptions.map(({ feature, pricing }) => (
              <li key={feature.id} className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedAddons[feature.id]?.checked ?? false}
                    onChange={(e) => toggleAddon(feature.id, e.target.checked, pricing)}
                  />
                  <span className="text-sm">
                    {feature.name}{" "}
                    <span className="text-zinc-500">
                      ({modelLabel(pricing.pricingModel)}
                      {pricing.pricingModel !== "percent" && (
                        <>
                          , {pricing.value} USD
                        </>
                      )}
                      )
                    </span>
                  </span>
                </label>
                {selectedAddons[feature.id]?.checked &&
                  pricing.pricingModel === "per_seat" && (
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="Add-on seats"
                      value={selectedAddons[feature.id]?.addonSeats ?? ""}
                      onChange={(e) =>
                        setSelectedAddons((s) => ({
                          ...s,
                          [feature.id]: {
                            ...s[feature.id],
                            checked: true,
                            addonSeats: e.target.value,
                            percentValue: s[feature.id]?.percentValue ?? String(pricing.value),
                          },
                        }))
                      }
                      className="ml-6 w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-black"
                    />
                  )}
                {selectedAddons[feature.id]?.checked &&
                  pricing.pricingModel === "percent" && (
                    <label className="ml-6 flex items-center gap-2 text-sm text-zinc-700">
                      <span>Percentage of product cost</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        required
                        value={
                          selectedAddons[feature.id]?.percentValue ?? String(pricing.value)
                        }
                        onChange={(e) =>
                          setSelectedAddons((s) => ({
                            ...s,
                            [feature.id]: {
                              ...s[feature.id],
                              checked: true,
                              addonSeats: s[feature.id]?.addonSeats ?? "1",
                              percentValue: e.target.value,
                            },
                          }))
                        }
                        className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-black"
                      />
                      <span>%</span>
                    </label>
                  )}
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <div>
        <label htmlFor="quote-discount" className="block text-sm font-medium text-zinc-700">
          Quote discount (%)
        </label>
        <input
          id="quote-discount"
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : isEdit ? "Update quote" : "Save quote"}
      </button>
    </form>
  );
}
