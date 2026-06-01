"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FeatureAvailability, ProductDetail } from "@/lib/types";

const AVAILABILITY_OPTIONS: { value: FeatureAvailability; label: string }[] = [
  { value: "included", label: "Included" },
  { value: "addon", label: "Add-on" },
  { value: "not_available", label: "Not available" },
];

const PRICING_MODELS = [
  { value: "fixed", label: "Fixed monthly" },
  { value: "per_seat", label: "Per seat / month" },
  { value: "percent", label: "% of product cost" },
] as const;

type TierDraft = { name: string; basePricePerSeat: string; notes: string };
type FeatureDraft = { name: string };

function emptyTier(): TierDraft {
  return { name: "", basePricePerSeat: "", notes: "" };
}

function emptyFeature(): FeatureDraft {
  return { name: "" };
}

function buildMatrix(
  features: FeatureDraft[],
  tiers: TierDraft[],
  matrix: Record<string, FeatureAvailability>
): { featureIndex: number; tierIndex: number; availability: FeatureAvailability }[] {
  const cells: {
    featureIndex: number;
    tierIndex: number;
    availability: FeatureAvailability;
  }[] = [];
  features.forEach((_, fi) => {
    tiers.forEach((_, ti) => {
      cells.push({
        featureIndex: fi,
        tierIndex: ti,
        availability: matrix[`${fi}-${ti}`] ?? "not_available",
      });
    });
  });
  return cells;
}

export function CatalogEditor({
  companyId,
  productId,
  initial,
}: {
  companyId: string;
  productId?: string;
  initial?: ProductDetail;
}) {
  const router = useRouter();
  const [savedNotice, setSavedNotice] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");

  useEffect(() => {
    const key = `catalog-saved-${companyId}`;
    if (sessionStorage.getItem(key) === "1") {
      setSavedNotice(true);
      sessionStorage.removeItem(key);
    }
  }, [companyId]);
  const [tiers, setTiers] = useState<TierDraft[]>(
    initial?.tiers.map((t) => ({
      name: t.name,
      basePricePerSeat: String(t.basePricePerSeat),
      notes: t.notes ?? "",
    })) ?? [emptyTier(), emptyTier(), emptyTier()]
  );
  const [features, setFeatures] = useState<FeatureDraft[]>(
    initial?.features.map((f) => ({ name: f.name })) ?? [emptyFeature()]
  );
  const [matrix, setMatrix] = useState<Record<string, FeatureAvailability>>(() => {
    const m: Record<string, FeatureAvailability> = {};
    if (initial) {
      initial.features.forEach((f, fi) => {
        initial.tiers.forEach((t, ti) => {
          const cell = initial.matrix.find(
            (c) => c.featureId === f.id && c.tierId === t.id
          );
          m[`${fi}-${ti}`] = cell?.availability ?? "not_available";
        });
      });
    }
    return m;
  });
  const [addonPricing, setAddonPricing] = useState<
    Record<string, { pricingModel: string; value: string }>
  >(() => {
    const ap: Record<string, { pricingModel: string; value: string }> = {};
    if (initial) {
      initial.addonPricing.forEach((p) => {
        const fi = initial.features.findIndex((f) => f.id === p.featureId);
        const ti = initial.tiers.findIndex((t) => t.id === p.tierId);
        if (fi >= 0 && ti >= 0) {
          ap[`${fi}-${ti}`] = {
            pricingModel: p.pricingModel,
            value: String(p.value),
          };
        }
      });
    }
    return ap;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setAvailability(fi: number, ti: number, value: FeatureAvailability) {
    const key = `${fi}-${ti}`;
    setMatrix((m) => ({ ...m, [key]: value }));
    if (value !== "addon") {
      setAddonPricing((ap) => {
        const next = { ...ap };
        delete next[key];
        return next;
      });
    } else if (!addonPricing[key]) {
      setAddonPricing((ap) => ({
        ...ap,
        [key]: { pricingModel: "fixed", value: "" },
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name,
      tiers: tiers.map((t) => ({
        name: t.name,
        basePricePerSeat: parseFloat(t.basePricePerSeat),
        notes: t.notes || undefined,
      })),
      features: features.map((f) => ({ name: f.name })),
      matrix: buildMatrix(features, tiers, matrix),
      addonPricing: Object.entries(addonPricing)
        .filter(([, v]) => v.value !== "")
        .map(([key, v]) => {
          const [fi, ti] = key.split("-").map(Number);
          return {
            featureIndex: fi,
            tierIndex: ti,
            pricingModel: v.pricingModel as "fixed" | "per_seat" | "percent",
            value: parseFloat(v.value),
          };
        }),
    };

    const url = productId
      ? `/api/products/${productId}?companyId=${encodeURIComponent(companyId)}`
      : "/api/products";
    const method = productId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productId ? payload : { ...payload, companyId }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    const data = await res.json();
    const savedId = data.id ?? productId;
    if (!productId && savedId) {
      sessionStorage.setItem(`catalog-saved-${companyId}`, "1");
      router.push(`/companies/${companyId}/catalog/${savedId}`);
    } else {
      setSavedNotice(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-24">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Product name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Tiers</h2>
          <button
            type="button"
            onClick={() => setTiers([...tiers, emptyTier()])}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add tier
          </button>
        </div>
        <div className="space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="flex flex-wrap gap-3 rounded-lg border border-zinc-200 bg-white p-3">
              <input
                required
                placeholder="Tier name"
                value={tier.name}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...tier, name: e.target.value };
                  setTiers(next);
                }}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-black"
              />
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="USD / seat / month"
                value={tier.basePricePerSeat}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...tier, basePricePerSeat: e.target.value };
                  setTiers(next);
                }}
                className="w-36 rounded border border-zinc-300 bg-white px-2 py-1 text-black"
              />
              <input
                placeholder="Notes"
                value={tier.notes}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...tier, notes: e.target.value };
                  setTiers(next);
                }}
                className="min-w-[12rem] flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-black"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Features & matrix</h2>
          <button
            type="button"
            onClick={() => setFeatures([...features, emptyFeature()])}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add feature
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-3 py-2 text-left">Feature</th>
                {tiers.map((t, ti) => (
                  <th key={ti} className="px-3 py-2 text-left">
                    {t.name || `Tier ${ti + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, fi) => (
                <tr key={fi} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <input
                      required
                      value={feature.name}
                      onChange={(e) => {
                        const next = [...features];
                        next[fi] = { name: e.target.value };
                        setFeatures(next);
                      }}
                      className="w-full min-w-[10rem] rounded border border-zinc-300 bg-white px-2 py-1 text-black"
                    />
                  </td>
                  {tiers.map((_, ti) => {
                    const key = `${fi}-${ti}`;
                    const avail = matrix[key] ?? "not_available";
                    return (
                      <td key={ti} className="px-3 py-2 align-top">
                        <select
                          value={avail}
                          onChange={(e) =>
                            setAvailability(
                              fi,
                              ti,
                              e.target.value as FeatureAvailability
                            )
                          }
                          className="w-full rounded border border-zinc-300 bg-white px-1 py-1 text-black"
                        >
                          {AVAILABILITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {avail === "addon" && (
                          <div className="mt-2 space-y-1">
                            <select
                              value={addonPricing[key]?.pricingModel ?? "fixed"}
                              onChange={(e) =>
                                setAddonPricing((ap) => ({
                                  ...ap,
                                  [key]: {
                                    pricingModel: e.target.value,
                                    value: ap[key]?.value ?? "",
                                  },
                                }))
                              }
                              className="w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs text-black"
                            >
                              {PRICING_MODELS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                            <input
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Value"
                              value={addonPricing[key]?.value ?? ""}
                              onChange={(e) =>
                                setAddonPricing((ap) => ({
                                  ...ap,
                                  [key]: {
                                    pricingModel: ap[key]?.pricingModel ?? "fixed",
                                    value: e.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs text-black"
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div
          className={`mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 ${
            savedNotice ? "justify-between" : "justify-end"
          }`}
        >
          {savedNotice && (
            <div
              className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2"
              role="status"
            >
              <p className="text-sm font-medium text-green-800">
                Product saved successfully
              </p>
              <Link
                href={`/companies/${companyId}/quotes`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View quotes for this company →
              </Link>
              <Link
                href={`/companies/${companyId}/catalog`}
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                Back to catalogue
              </Link>
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      </footer>
    </form>
  );
}
