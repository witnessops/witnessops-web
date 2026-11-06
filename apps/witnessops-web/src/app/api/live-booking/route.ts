import { handleLiveBooking } from "@/lib/server/live-booking/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleLiveBooking(request);
}

export function POST(request: Request): Promise<Response> {
  return handleLiveBooking(request);
}
