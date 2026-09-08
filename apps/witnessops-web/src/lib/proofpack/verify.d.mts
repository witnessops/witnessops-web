export interface ProofpackInputFile { name: string; bytes: Uint8Array }
export interface ProofpackInput { proofpack?: ProofpackInputFile; signature?: ProofpackInputFile; trust_registry?: ProofpackInputFile }
export interface Finding { finding_id: string; title: string; severity: string; state: string; evidence_refs: string[]; observed_value: unknown; recommendation: string; claim_limit: string }
export interface BuyerReport {
 posture: { target: { hostname: string; asset_id: string }; observed_at_utc: string; synthetic: boolean; data_classification: string; sections: Record<string,Record<string,unknown>>; declared_exclusions: string[]; declared_side_effects: string[] };
 findings: { findings: Finding[]; counts: Record<string,number> };
 completeness: { complete: boolean; section_results: {section:string;complete:boolean;observed_status:string|null}[] };
 scope: Record<string,unknown>;
 authority: { operator_id: string; authorization_window: {starts_at_utc:string;ends_at_utc:string}; authority_source: {authority_identity:string; kind:string}; target: {allowed_hostnames:string[]} };
 manifest: {artifacts:{artifact_id:string;path:string;sha256:string}[]};
 originalReport: string;
 signerId: string;
}
export interface ProofpackResult { verifier_version:string;status:'valid'|'invalid';proof_run_id:string;workflow_class:string;outcome:string;failure_states:string[];proof_boundary:string;checks:Record<string,{status:'passed'|'failed'|'skipped';detail:string}>; verification_inputs:Record<string,{name:string;sha256:string;size_bytes:number}>; report?:BuyerReport }
export function verifyProofpack(input:ProofpackInput):Promise<ProofpackResult>;

/** Internal reconstruction boundary; reads bytes from the admitted, unique archive entries. */
export function verifySemantics(bytes: (path: string) => Uint8Array, manifest: unknown, receipt: unknown): Promise<Pick<BuyerReport, 'posture' | 'findings' | 'authority' | 'completeness' | 'scope'>>;
