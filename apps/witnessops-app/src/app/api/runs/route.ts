import { foundation } from "../../../lib/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function POST(request: Request) { return foundation.handle(request, "runs"); }
