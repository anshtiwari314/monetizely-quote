"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Company } from "@/lib/companies";

export function CompanyHome({ companies: initial }: { companies: Company[] }) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initial);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Company[] | null) => {
        if (data) setCompanies(data);
      })
      .catch(() => {});
  }, []);
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add company");
      return;
    }
    const { id } = await res.json();
    setCompanies((prev) => [...prev, { id, name: name.trim(), createdAt: new Date().toISOString() }].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    router.refresh();
  }

  async function handleResetData() {
    if (
      !window.confirm(
        "Reset all data? This deletes every company, catalogue, and quote, then restores the default ACME company with a sample catalogue."
      )
    ) {
      return;
    }
    setResetting(true);
    setError(null);
    const res = await fetch("/api/admin/reset", { method: "POST" });
    setResetting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to reset data");
      return;
    }
    setOpenId(null);
    const data = await res.json();
    const catalogUrl = data.companyId
      ? `/companies/${data.companyId}/catalog`
      : "/";
    window.location.replace(catalogUrl);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Monetizely Quote Tool</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            Select a company to manage its catalogue or quotes. Each company only
            sees its own data.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetData}
          disabled={resetting}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset all data"}
        </button>
      </div>

      <form
        onSubmit={handleAddCompany}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="company-name" className="block text-sm font-medium text-zinc-700">
            Add company
          </label>
          <input
            id="company-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add company"}
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      {companies.length === 0 ? (
        <p className="text-zinc-600">No companies yet. Add one above to get started.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {companies.map((company) => (
            <li key={company.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenId(openId === company.id ? null : company.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{company.name}</span>
                <span className="text-sm text-zinc-500">{openId === company.id ? "▲" : "▼"}</span>
              </button>
              {openId === company.id && (
                <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/companies/${company.id}/catalog`}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
                    >
                      Catalogue
                    </Link>
                    <Link
                      href={`/companies/${company.id}/quotes`}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
                    >
                      Quotes
                    </Link>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
