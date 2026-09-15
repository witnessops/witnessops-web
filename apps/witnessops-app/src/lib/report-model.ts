import { externalExposureReportModel } from "../../../witnessops-web/src/lib/external-exposure/report-model";
import { createReportModel, type ReportModelInput } from "../../../witnessops-web/src/lib/proofpack/report-model";
import { compareRuns, type Run } from "./model";

/** Project an authorized saved run, already validated and digest-checked by
 * WorkspaceStore. No collection, persistence, signing or new verification occurs. */
export function savedRunReport(run: Run, previous?: Run) {
  const prior = previous?.assetId === run.assetId && previous.snapshot.target === run.snapshot.target
    && Date.parse(previous.createdAt) < Date.parse(run.createdAt) ? previous : undefined;
  const base = externalExposureReportModel(run.snapshot, {
    digest: run.sourceDigest, serialization: "witnessops-canonical-json-v1",
  });
  const change = compareRuns(run, prior);
  // structuredClone detaches the frozen presentation model; the factory freezes
  // the resulting app projection again, without touching the saved run.
  const input = structuredClone(base) as ReportModelInput;
  return createReportModel({
    ...input,
    identity: { ...base.identity, reportId: `saved-run-${run.id}` },
    provenance: [
      ...input.provenance,
      { id: "saved-run", label: "Saved run", value: run.id, mechanism: "WitnessOps workspace persistence", relationship: "This is a saved authenticated run, not a transient public-page result. Exporting it does not collect again or change the saved source." },
      { id: "saved-asset", label: "Asset record", value: run.assetId, mechanism: "Run-to-asset relationship", relationship: "A workspace asset identifier does not verify hostname ownership." },
      { id: "saved-method", label: "Recommended-check method", value: `${run.profile.id} · ${run.profile.version}`, mechanism: "Recorded run profile", relationship: "Earlier runs keep their original method and source." },
      { id: "comparison", label: "Comparison baseline", value: prior ? `${prior.id} · sha256:${prior.sourceDigest}` : "First observation; no earlier comparable run selected", mechanism: "Saved runs of the same asset and hostname", relationship: prior ? `Compared with the run observed at ${prior.snapshot.finished_at}.` : "Run again later to establish a comparison. No change is established yet." },
      ...(prior ? [
        { id: "environment", label: "Environment changes", value: change.environment.join(" ") || "No change in comparable target observations.", mechanism: "Existing observation comparison", relationship: "Describes recorded target state only, not ongoing monitoring." },
        { id: "coverage", label: "Coverage changes", value: change.coverage.join(" ") || "The check set and method are unchanged.", mechanism: "Existing method/checkset comparison", relationship: "A new or changed method is not an environmental change and does not rewrite earlier evidence." },
        { id: "uncertainty", label: "Comparison limits", value: change.uncertainty.join(" ") || "No collection-comparability limits were recorded between these runs.", mechanism: "Recorded collection states", relationship: "An undetermined or failed collection is not a new security finding." },
      ] : []),
    ],
  });
}
