import { NextResponse } from "next/server";
import {
  loadPublishedMeshReceiptIndex,
  validateMeshReceiptPublic,
} from "@/lib/mesh-gate";
import { findDuplicateJsonObjectKey } from "@/lib/json-ambiguity";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import {
  InvalidRequestBodyEncodingError,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";

export const runtime = "nodejs";

const BODY_LIMIT = 256 * 1024;

export async function GET() {
  const index = loadPublishedMeshReceiptIndex();
  return NextResponse.json({
    schema: "witnessops.mesh_gate_discovery.v1",
    scope: "operator-mesh-hygiene-only",
    well_known_index: "/.well-known/mesh-receipt-index.json",
    post: "Submit JSON body: offseclane.mesh_receipt_public.v1",
    index_published: index !== null,
    disclaimer:
      "Does not replace /api/verify, bastion hunt verify, or local-server-audit package offline verify.",
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
  } catch {
    return NextResponse.json(
      {
        ok: false,
        verdict: "mesh_gate_invalid",
        errors: ["JSON exceeds supported parser limits"],
      },
      { status: 400 },
    );
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
