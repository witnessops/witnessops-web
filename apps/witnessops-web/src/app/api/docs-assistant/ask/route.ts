import { NextResponse } from "next/server";

import { buildDocsAssistantDisabledResponse } from "@/lib/docs-assistant/disabled-response";

export async function POST() {
  return NextResponse.json(buildDocsAssistantDisabledResponse(), {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
