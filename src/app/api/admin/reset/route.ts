import { NextResponse } from "next/server";
import { resetAllData } from "@/lib/reset";

export async function POST() {
  const companyId = resetAllData();
  return NextResponse.json({ companyId, message: "Data reset. Default ACME company restored." });
}
