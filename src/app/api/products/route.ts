import { NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/catalog";
import type { CreateProductInput } from "@/lib/catalog";

export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  return NextResponse.json(await listProducts(companyId));
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateProductInput & { companyId?: string };
  if (!body.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  const { companyId, ...input } = body;
  const id = await createProduct(companyId, input);
  return NextResponse.json({ id }, { status: 201 });
}
