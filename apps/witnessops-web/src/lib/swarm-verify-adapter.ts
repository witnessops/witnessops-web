import type {
  VerifyCheckView,
  VerifySuccessResponse,
  VerifyVerdict,
} from "@/lib/verify-contract";

export const SWARM_MESH_EXPORT_SCHEMA = "offsec.swarm.mesh_export.v1";
export const SWARM_ADAPTER_ID = "witnessops.verify.offsec_swarm_mesh_export.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSwarmMeshExport(
  receipt: Record<string, unknown>,
): boolean {
  return receipt.schema === SWARM_MESH_EXPORT_SCHEMA;
}

function check(
  name: string,
  pass: boolean,
  detail: string,
): VerifyCheckView {
  return {
    name,
    status: pass ? "verified" : "unverified",
    detail,
  };
}

/**
 * Structural checks for DEV mesh export envelopes from `swarm export-state`.
 * Does not replay crypto or monotonic semantics (use `swarm verify-state` offline).
 */
export function verifySwarmMeshExport(
  receipt: Record<string, unknown>,
): VerifySuccessResponse {
  const checks: VerifyCheckView[] = [];
  let verdict: VerifyVerdict = "indeterminate";

  const governed = receipt.governed;
  if (!isRecord(governed)) {
    checks.push(
      check("governed_present", false, "Export must include governed object."),
    );
    verdict = "invalid";
  } else {
    checks.push(check("governed_present", true, "Governed block present."));
    const roots = governed.roots;
    const events = governed.events;
    const rootsOk = isRecord(roots) && Object.keys(roots).length >= 1;
    checks.push(
      check(
        "roots_anchor",
        rootsOk,
        rootsOk
          ? `At least one root anchor (${Object.keys(roots as object).length}).`
          : "Missing or empty roots map.",
      ),
    );
    const eventsArr = Array.isArray(events) ? events : [];
    const trustEvents = eventsArr.filter(
      (e) => isRecord(e) && e.kind === "trust",
    );
    const revokeEvents = eventsArr.filter(
      (e) => isRecord(e) && e.kind === "revoke",
    );
    const sigOk = trustEvents.every(
      (e) => isRecord(e) && typeof e.sig === "string" && e.sig.length >= 64,
    );
    checks.push(
      check(
        "trust_event_signatures_present",
        trustEvents.length > 0 && sigOk,
        trustEvents.length > 0
          ? `${trustEvents.length} trust event(s); signature-shaped values are present but are not cryptographically verified here.`
          : "Need at least one trust event with a signature-shaped value.",
      ),
    );
    if (revokeEvents.length > 0) {
      checks.push(
        check(
          "revoke_events",
          true,
          `${revokeEvents.length} revoke event(s) present (monotonic demo).`,
        ),
      );
    }
    if (!rootsOk || trustEvents.length === 0 || !sigOk) {
      verdict = "invalid";
    }
  }

  const ledger = receipt.ledger;
  if (ledger !== undefined) {
    checks.push(
      check(
        "ledger_optional",
        true,
        "Ledger block included (structural only; not replayed here).",
      ),
    );
  }

  const summary =
    verdict === "indeterminate"
      ? "Swarm mesh export passed structural checks (offline: swarm verify-state)."
      : "Swarm mesh export failed structural checks on /api/verify.";

  return {
    ok: true,
    inputKind: "offsec-swarm-mesh-export",
    verdict,
    adapter: SWARM_ADAPTER_ID,
    proofStageClaimed: "unknown",
    proofStageVerified: "unknown",
    scope: "receipt-only",
    artifactRevalidation: "not_possible",
    summary,
    checks,
    breaches: [],
  };
}
