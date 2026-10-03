import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { resolve } from "node:path";
import { evidenceClasses, type CaseRecord } from "./case-contract";

export function validateCase(record: CaseRecord, root: string): void {
  const requireValue = (ok: unknown, message: string) => {
    if (!ok) throw new Error(`WOPS-0001: ${message}`);
  };
  requireValue(record.result.trim() && record.scope.trim(), "result requires scope");
  requireValue(record.limits.length > 0 && record.limits.every((v) => v.trim()), "limits required");
  requireValue(record.boundary === "Real investigation · Third-party software · Not a customer engagement.", "non-customer boundary required");
  requireValue(record.claims.length > 0, "claims required");
  const names = record.artifacts.map((a) => a.file);
  requireValue(new Set(names).size === names.length, "duplicate artifacts");
  requireValue(JSON.stringify(readdirSync(root).sort()) === JSON.stringify([...names].sort()), "download directory must contain only selected files");
  const texts = new Map<string, string>();
  for (const artifact of record.artifacts) {
    requireValue(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(artifact.file), "invalid artifact filename");
    const path = resolve(root, artifact.file);
    requireValue(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), "artifact must be a regular file");
    const bytes = readFileSync(path);
    requireValue(/^[a-f0-9]{64}$/.test(artifact.sha256), "invalid SHA-256");
    requireValue(createHash("sha256").update(bytes).digest("hex") === artifact.sha256, `digest mismatch: ${artifact.file}`);
    requireValue(bytes.length === artifact.bytes, `size mismatch: ${artifact.file}`);
    texts.set(artifact.file, bytes.toString("utf8"));
  }
  const manifest = record.artifacts.filter((a) => a.file !== "SHA256SUMS")
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((a) => `${a.sha256}  ${a.file}\n`).join("");
  requireValue(texts.get("SHA256SUMS") === manifest, "manifest must bind every selected content file exactly once");
  // Compare the displayed fields only after the metadata bytes pass their pinned hash.
  const environment = JSON.parse(texts.get("environment.json")!) as {
    product: string; recorded_package_version: string;
    os: { NAME: string; VERSION: string }; kernel: string;
    executable_build_id: string; executable_sha256: string;
  };
  const expectedEnvironment = new Map([
    ["Product / package", `${environment.product} / ${environment.recorded_package_version}`],
    ["Operating system", `${environment.os.NAME} ${environment.os.VERSION}`],
    ["Kernel", environment.kernel],
    ["Recorded executable build ID", environment.executable_build_id],
    ["Recorded executable SHA-256", environment.executable_sha256],
  ]);
  requireValue(
    record.environment.length === expectedEnvironment.size &&
    new Set(record.environment.map((field) => field.label)).size === expectedEnvironment.size &&
    record.environment.every((field) => expectedEnvironment.has(field.label) && expectedEnvironment.get(field.label) === field.value),
    "displayed environment must match environment.json",
  );
  for (const claim of record.claims) {
    requireValue(evidenceClasses.includes(claim.cls), `evidence label required: ${claim.id}`);
    requireValue(claim.references.length > 0, `evidence references required: ${claim.id}`);
    for (const reference of claim.references) {
      const text = texts.get(reference.file);
      requireValue(text !== undefined, `missing referenced artifact: ${reference.file}`);
      const lines = text!.trimEnd().split("\n");
      requireValue(Number.isInteger(reference.start) && Number.isInteger(reference.end) && reference.start > 0 && reference.end >= reference.start && reference.end <= lines.length, `invalid line reference: ${claim.id}`);
      requireValue(reference.file.endsWith(".json") ? reference.start === 1 && reference.end === lines.length : lines[reference.start - 1].replace(/^## /, "") === reference.section, `section does not match selected lines: ${claim.id}`);
    }
  }
}

export function candidateRoot(): string {
  // Both next build (app cwd) and workspace tests use the same reviewed public bytes.
  return resolve(process.cwd(), process.cwd().endsWith("apps/witnessops-web") ? "public/samples/wops-0001" : "apps/witnessops-web/public/samples/wops-0001");
}
