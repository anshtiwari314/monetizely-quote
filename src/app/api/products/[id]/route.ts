import { NextResponse } from "next/server";
import { deleteProduct, getProductDetail, updateProduct } from "@/lib/catalog";
import type { CreateProductInput } from "@/lib/catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = getProductDetail(id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as CreateProductInput;
  const existing = getProductDetail(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.companyId) {
    const companyId = new URL(request.url).searchParams.get("companyId");
    if (companyId && existing.companyId !== companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  updateProduct(id, body);
  return NextResponse.json({ id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const companyId = new URL(request.url).searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  const ok = deleteProduct(id, companyId);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
