import { NextResponse } from "next/server";
import { createCompany, listCompanies } from "@/lib/companies";
import { ensureAcmeCompany } from "@/lib/seed";

export async function GET() {
  await ensureAcmeCompany();
  return NextResponse.json(await listCompanies());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }
  try {
    const id = await createCompany(body.name);
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Company name already exists" }, { status: 400 });
  }
}
