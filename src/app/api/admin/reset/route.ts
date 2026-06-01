import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { resetAllData } from "@/lib/reset";

export async function POST() {
  const { companyId, productId } = resetAllData();
  revalidatePath("/", "layout");
  revalidatePath(`/companies/${companyId}/catalog`);
  if (productId) {
    revalidatePath(`/companies/${companyId}/catalog/${productId}`);
  }
  return NextResponse.json({
    companyId,
    productId,
    message: "Data reset. Default ACME company restored.",
  });
}
