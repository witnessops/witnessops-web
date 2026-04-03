import { NextResponse } from "next/server";
import { listReceipts } from "@/lib/receipts";

export async function GET() {
  const chain = await listReceipts();
  return NextResponse.json({ chain });
}
