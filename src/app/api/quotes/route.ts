import { NextResponse } from "next/server";
import { createQuote, listQuotes } from "@/lib/quotes";
import type { QuoteInput } from "@/lib/types";

export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  return NextResponse.json(await listQuotes(companyId));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuoteInput;
    const id = await createQuote(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create quote";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
