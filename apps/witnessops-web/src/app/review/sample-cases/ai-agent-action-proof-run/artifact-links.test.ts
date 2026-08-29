import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buyerPublicOfferRequestHref } from "@/lib/buyer-services";
import {
  buyerWalkthroughHref,
  publicVerifierSha256,
  sampleArtifactHref,
  sampleBaseUrl,
  sampleBlobBaseUrl,
  sampleBundleSha256,
  sampleCommit,
  sampleCommitShort,
  sampleManifestBlobSha,
  sampleManifestEntries,
  sampleManifestHref,
  sampleManifestPath,
  sampleManifestSha256,
  sampleManifestText,
  sampleSignerFingerprint,
  sampleSourcePath,
  sampleSourceRepository,
  sampleSourceRepositoryUrl,
} from "./sample-artifact-contract";

const publicSpecimenRoot = resolve(process.cwd(), "public/samples/api-key-rotation/v1");
const publicRegistryPath = resolve(
  process.cwd(),
  "public/.well-known/witnessops-demo-signing-keys.json",
);

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlobSha(value: Buffer): string {
  return createHash("sha1")
    .update(`blob ${value.byteLength}\0`)
    .update(value)
    .digest("hex");
}

test("API key rotation specimen pins immutable public provenance", () => {
  assert.equal(sampleSourceRepository, "witnessops/witnessops-sample-cases");
  assert.equal(sampleSourcePath, "sample-cases/ai-agent-action-proof-run");
  assert.equal(sampleCommit, "d4ad234bd8152b1a01b9adc913f383d1838850b3");
  assert.equal(sampleCommitShort, "d4ad234bd815");
  assert.equal(sampleManifestPath, `${sampleSourcePath}/MANIFEST.sha256`);
  assert.equal(sampleManifestBlobSha, "bbc58adf2f19958bcd8fd7faefe5aea00c0f987d");
  assert.equal(
    sampleManifestSha256,
    "9d8668507f3da027886a1847a92b705671063ed89cbb354d45909c119bb414e7",
  );
  assert.equal(
    sampleSignerFingerprint,
    "sha256:72a03b6fdacaad90dfc58c0e782ec51e111dfecbc1b841b6cb7a68d0a557f6e4",
  );

  assert.equal(sampleSourceRepositoryUrl, "https://github.com/witnessops/witnessops-sample-cases");
  assert.equal(
    sampleBaseUrl,
    `${sampleSourceRepositoryUrl}/tree/${sampleCommit}/${sampleSourcePath}`,
  );
  assert.equal(
    sampleBlobBaseUrl,
    `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleSourcePath}`,
  );
  assert.equal(sampleManifestHref, `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleManifestPath}`);
  assert.equal(buyerWalkthroughHref, `${sampleBlobBaseUrl}/BUYER_WALKTHROUGH.md`);
  assert.doesNotMatch(sampleBaseUrl, /\/main\//);
});

test("same-origin specimen exactly matches the pinned SHA-256 manifest", () => {
  const manifestBytes = readFileSync(resolve(publicSpecimenRoot, "MANIFEST.sha256"));
  assert.equal(manifestBytes.toString("utf8"), sampleManifestText);
  assert.equal(sha256(manifestBytes), sampleManifestSha256);
  assert.equal(gitBlobSha(manifestBytes), sampleManifestBlobSha);

  for (const entry of sampleManifestEntries) {
    const artifactBytes = readFileSync(resolve(publicSpecimenRoot, entry.file));
    assert.equal(sha256(artifactBytes), entry.sha256, entry.file);
    assert.equal(sampleArtifactHref(entry.file), `${sampleBlobBaseUrl}/${entry.file}`);
  }
});

test("bundle, global registry, and public verifier are independently pinned", () => {
  const bundleBytes = readFileSync(resolve(publicSpecimenRoot, "BUNDLE.wops.json"));
  const localRegistryBytes = readFileSync(resolve(publicSpecimenRoot, "DEMO_KEY_REGISTRY.json"));
  const globalRegistryBytes = readFileSync(publicRegistryPath);
  const verifierBytes = readFileSync(resolve(publicSpecimenRoot, "verify.mjs"));

  assert.equal(sha256(bundleBytes), sampleBundleSha256);
  assert.deepEqual(globalRegistryBytes, localRegistryBytes);
  assert.equal(sha256(verifierBytes), publicVerifierSha256);

  const bundle = JSON.parse(bundleBytes.toString("utf8")) as {
    bundle_version: string;
    fixture: string;
    mode: string;
  };
  assert.equal(bundle.bundle_version, "witnessops.synthetic_proof_bundle.v1");
  assert.equal(bundle.fixture, "compromised_api_key_rotation_v1");
  assert.equal(bundle.mode, "synthetic");
});

test("public page makes replay, local verification, tamper challenge, and limits explicit", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf8");
  const client = readFileSync(resolve(__dirname, "api-key-rotation-demo.tsx"), "utf8");

  assert.match(page, /A synthetic key was flagged\./);
  assert.match(page, /The authorized rotation tool <em>handled it\.<\/em>/);
  assert.match(page, /verify the pinned bundle digest,/);
  assert.match(
    page,
    /manifest-bound evidence with the separately pinned public verifier/,
  );
  assert.match(page, /Published sample — not live customer evidence/);
  assert.match(page, /fixed, hash-pinned synthetic specimen/);
  assert.match(page, /No real provider, credential, compromise,\s+customer, or/);
  assert.match(page, /sampleBundleSha256/);
  assert.match(page, /publicVerifierSha256/);

  assert.match(client, /ACKNOWLEDGE SCOPE & REPLAY/);
  assert.match(client, /Don’t trust the animation\. Verify the bytes\./);
  assert.match(client, /RUN ONE-BYTE TAMPER TEST/);
  assert.match(client, /node verify\.mjs BUNDLE\.wops\.json DEMO_KEY_REGISTRY\.json/);
  assert.match(client, /proves_real_provider_action/);
  assert.match(client, /No WitnessOps API/);
  assert.match(client, /webpackIgnore: true/);
  assert.match(client, /sha256Utf8\(bundleText\)/);
  assert.match(client, /actualBundleSha256 !== bundleSha256/);
  assert.match(client, /PUBLIC_BUNDLE_DIGEST_MISMATCH/);
  assert.match(client, /PUBLIC_VERIFIER_INTEGRITY_OR_LOAD_FAILURE/);
  assert.match(client, /sha256HexToIntegrity\(verifierSha256\)/);
  assert.match(client, /script\.integrity/);
  assert.match(client, /script\.type = "module"/);
  assert.match(client, /verifierUrl\.searchParams\.set\("sha256", verifierSha256\)/);
  assert.match(client, /await importIntegrityCheckedVerifier/);
  assert.match(client, /\[bundleSha256, verifierSha256\]/);
  assert.match(client, /Replay complete: 6 of 6 signed events shown\./);
  assert.match(client, /that an AI agent caused or authorized the tool calls/);
  assert.match(client, /real-world actor or approver identity/);
  assert.match(client, /execution of the declared hard-stop conditions/);
  assert.match(client, /separately owned by this website/);
  assert.doesNotMatch(client, /Credential material is suppressed at source/);
  assert.match(client, /fetch\(bundleHref, \{ cache: "force-cache" \}\)/);
  assert.match(client, /fetch\(keyRegistryHref, \{ cache: "no-cache" \}\)/);
  assert.match(client, /mutateFirstBase64Byte\(afterState\.content\)/);
  assert.match(client, /download="DEMO_KEY_REGISTRY\.json"/);
  assert.doesNotMatch(client, /afterState\.content = `\$\{afterState\.content\} `/);
  assert.doesNotMatch(client, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
});

test("specimen review CTA preserves the Agent Risk offer selection", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf8");

  assert.match(
    page,
    /buyerPublicOfferRequestHref\(\s*"en",\s*"bounded-workflow-review",?\s*\)/,
  );
  assert.match(page, /Agent Risk &amp; Control Review — from €1,500 ex VAT\./);
  assert.match(page, /authority, permissions, approvals,/);
  assert.match(page, /proposes a receipt, verifier, and challenge path/);
  assert.match(page, /example of the proof object a review can shape/);
  assert.match(
    page,
    /<Link href=\{reviewRequestHref\}>Request a non-secret fit check →<\/Link>/,
  );
  assert.equal(
    buyerPublicOfferRequestHref("en", "bounded-workflow-review"),
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Risk+%26+Control+Review",
  );
});

test("specimen metadata uses claim-safe copy and the shared social preview", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf8");

  assert.match(
    page,
    /title: "Synthetic API key rotation — verifiable proof specimen"/,
  );
  assert.match(page, /url: "\/review\/sample-cases\/ai-agent-action-proof-run"/);
  assert.match(page, /images: DEFAULT_OPEN_GRAPH_IMAGES/);
  assert.match(page, /images: DEFAULT_TWITTER_IMAGES/);
  assert.doesNotMatch(page, /Watch the agent rotate it/);
  assert.doesNotMatch(page, /Compromised API key rotation — verifiable demo/);
});

test("versioned specimen bytes are immutable while key discovery revalidates", () => {
  const nextConfig = readFileSync(resolve(process.cwd(), "next.config.js"), "utf8");

  assert.match(nextConfig, /\/samples\/api-key-rotation\/v1\/:artifact\*/);
  assert.match(nextConfig, /public, max-age=31536000, immutable/);
  assert.match(nextConfig, /\/\.well-known\/witnessops-demo-signing-keys\.json/);
  assert.match(nextConfig, /public, max-age=300, must-revalidate/);
});
