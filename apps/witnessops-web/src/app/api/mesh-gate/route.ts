import { NextResponse } from "next/server";
import { validateMeshReceiptPublic } from "@/lib/mesh-gate";
import {
  findDuplicateJsonObjectKey,
  JsonAmbiguityScanLimitError,
} from "@/lib/json-ambiguity";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import {
  InvalidRequestBodyEncodingError,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";

export const runtime = "nodejs";

const BODY_LIMIT = 256 * 1024;

export async function GET() {
  return NextResponse.json({
    schema: "witnessops.mesh_gate_discovery.v1",
    scope: "operator-mesh-hygiene-only",
    well_known_index: null,
    post: "Submit JSON body: offseclane.mesh_receipt_public.v1",
    index_published: false,
    disclaimer:
      "The demonstration operator index is retired. POST remains for legacy structural compatibility only; not Agent Action Security Review evidence or /api/verify proof.",
  });
}

export async function POST(request: Request) {
  const rateLimited = enforcePublicIntakeRateLimit(request, "mesh-gate");
  if (rateLimited) return rateLimited;

  let raw: string;
  try {
    raw = await readBoundedRequestText(request, BODY_LIMIT);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { ok: false, verdict: "mesh_gate_invalid", errors: ["body too large"] },
        { status: 413 },
      );
    }
    if (error instanceof InvalidRequestBodyEncodingError) {
      return NextResponse.json(
        { ok: false, verdict: "mesh_gate_invalid", errors: ["body must be valid UTF-8"] },
        { status: 400 },
      );
    }
    throw error;
  }

  let dup: string | null;
  try {
    dup = findDuplicateJsonObjectKey(raw);
  } catch (error) {
    if (error instanceof JsonAmbiguityScanLimitError) {
      return NextResponse.json(
        {
          ok: false,
          verdict: "mesh_gate_invalid",
          errors: ["JSON exceeds supported parser limits"],
        },
        { status: 400 },
      );
    }
    dup = null;
  }
  if (dup) {
    return NextResponse.json(
      {
        ok: false,
        verdict: "mesh_gate_invalid",
        errors: [`duplicate JSON key: ${dup}`],
      },
      { status: 400 },
    );
  }

  let doc: unknown;
  try {
    doc = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json(
      { ok: false, verdict: "mesh_gate_invalid", errors: ["malformed JSON"] },
      { status: 400 },
    );
  }

  const result = validateMeshReceiptPublic(doc);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
