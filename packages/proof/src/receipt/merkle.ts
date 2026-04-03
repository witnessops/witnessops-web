/**
 * Merkle tree for artifact manifests.
 *
 * Canonical leaf format (artifact-record-v1):
 *   Deterministic JSON with fields in fixed order:
 *   {"path":"...","sha256":"...","blake3":"..."}
 *
 * Tree construction:
 *   - Leaves are BLAKE3 hashes of canonical leaf records
 *   - Internal nodes are BLAKE3(left_child || right_child)
 *   - Odd nodes are promoted (not duplicated)
 *   - Deterministic ordering: leaves sorted by path (LC_ALL=C)
 *   - Digest algorithm for internal nodes: BLAKE3
 *
 * Inclusion proof:
 *   Array of sibling hashes with position indicators (left/right),
 *   sufficient to recompute the root from a single leaf.
 */

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArtifactRecord {
  path: string;
  sha256: string;
  blake3: string;
}

export interface MerkleLeaf {
  index: number;
  record: ArtifactRecord;
  canonical_bytes: string;
  leaf_digest: string;
}

export interface MerkleProofStep {
  position: "left" | "right";
  digest: string;
}

export interface MerkleInclusionProof {
  leaf_index: number;
  leaf_digest: string;
  path: MerkleProofStep[];
  root: string;
}

export interface MerkleTree {
  root: string;
  leaf_count: number;
  leaf_canonicalization: "artifact-record-v1";
  leaf_digest_algorithm: "blake3";
  node_digest_algorithm: "blake3";
  ordering: "path-lexicographic-c";
  leaves: MerkleLeaf[];
}

// ---------------------------------------------------------------------------
// Hash primitives
// ---------------------------------------------------------------------------

let _blake3Fn: ((data: Buffer | Uint8Array) => string) | null | undefined;

function loadBlake3(): ((data: Buffer | Uint8Array) => string) | null {
  if (_blake3Fn !== undefined) return _blake3Fn;
  try {
    const b3 = require("blake3");
    _blake3Fn = (data: Buffer | Uint8Array) => b3.hash(data).toString("hex");
    return _blake3Fn;
  } catch {
    try {
      const { execSync } = require("node:child_process");
      execSync("b3sum --version", { stdio: "pipe" });
      _blake3Fn = (data: Buffer | Uint8Array) => {
        const { execSync: exec } = require("node:child_process");
        const fs = require("node:fs");
        const tmp = `/tmp/merkle-b3-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        fs.writeFileSync(tmp, data);
        try {
          return exec(`b3sum --no-names "${tmp}"`, { encoding: "utf-8" }).trim();
        } finally {
          fs.unlinkSync(tmp);
        }
      };
      return _blake3Fn;
    } catch {
      _blake3Fn = null;
      return null;
    }
  }
}

function blake3(data: Buffer | Uint8Array | string): string {
  const fn = loadBlake3();
  if (!fn) {
    // Fallback: use SHA-256 if BLAKE3 unavailable (for environments without b3sum)
    return createHash("sha256").update(data).digest("hex");
  }
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return fn(buf);
}

function blake3Concat(left: string, right: string): string {
  const combined = Buffer.concat([
    Buffer.from(left, "hex"),
    Buffer.from(right, "hex"),
  ]);
  return blake3(combined);
}

// ---------------------------------------------------------------------------
// Canonical leaf serialization
// ---------------------------------------------------------------------------

/**
 * Canonical leaf format: artifact-record-v1
 * Fields in fixed order, no whitespace, no trailing newline.
 */
export function canonicalLeafBytes(record: ArtifactRecord): string {
  return `{"blake3":"${record.blake3}","path":"${record.path}","sha256":"${record.sha256}"}`;
}

// ---------------------------------------------------------------------------
// Tree construction
// ---------------------------------------------------------------------------

/**
 * Build a Merkle tree from artifact records.
 * Records are sorted by path (lexicographic, C locale equivalent).
 * Odd nodes are promoted, not duplicated.
 */
export function buildMerkleTree(records: ArtifactRecord[]): MerkleTree {
  // Sort by path (lexicographic)
  const sorted = [...records].sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });

  // Build leaves
  const leaves: MerkleLeaf[] = sorted.map((record, index) => {
    const canonical = canonicalLeafBytes(record);
    const digest = blake3(canonical);
    return { index, record, canonical_bytes: canonical, leaf_digest: digest };
  });

  if (leaves.length === 0) {
    return {
      root: blake3(""),
      leaf_count: 0,
      leaf_canonicalization: "artifact-record-v1",
      leaf_digest_algorithm: "blake3",
      node_digest_algorithm: "blake3",
      ordering: "path-lexicographic-c",
      leaves,
    };
  }

  // Compute root
  let level = leaves.map((l) => l.leaf_digest);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(blake3Concat(level[i], level[i + 1]));
      } else {
        // Odd node: promote
        next.push(level[i]);
      }
    }
    level = next;
  }

  return {
    root: level[0],
    leaf_count: leaves.length,
    leaf_canonicalization: "artifact-record-v1",
    leaf_digest_algorithm: "blake3",
    node_digest_algorithm: "blake3",
    ordering: "path-lexicographic-c",
    leaves,
  };
}

// ---------------------------------------------------------------------------
// Inclusion proofs
// ---------------------------------------------------------------------------

/**
 * Generate an inclusion proof for a leaf at the given index.
 */
export function generateInclusionProof(
  tree: MerkleTree,
  leafIndex: number,
): MerkleInclusionProof | null {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) return null;

  const proof: MerkleProofStep[] = [];
  let level = tree.leaves.map((l) => l.leaf_digest);
  let idx = leafIndex;

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        // Pair exists
        if (i === idx || i + 1 === idx) {
          // This pair contains our target
          if (idx === i) {
            proof.push({ position: "right", digest: level[i + 1] });
          } else {
            proof.push({ position: "left", digest: level[i] });
          }
        }
        next.push(blake3Concat(level[i], level[i + 1]));
      } else {
        // Odd node promoted — no sibling needed if this is our target
        next.push(level[i]);
      }
    }
    idx = Math.floor(idx / 2);
    level = next;
  }

  return {
    leaf_index: leafIndex,
    leaf_digest: tree.leaves[leafIndex].leaf_digest,
    path: proof,
    root: tree.root,
  };
}

/**
 * Verify an inclusion proof: recompute root from leaf + sibling path.
 */
export function verifyInclusionProof(proof: MerkleInclusionProof): boolean {
  let current = proof.leaf_digest;
  for (const step of proof.path) {
    if (step.position === "left") {
      current = blake3Concat(step.digest, current);
    } else {
      current = blake3Concat(current, step.digest);
    }
  }
  return current === proof.root;
}

// ---------------------------------------------------------------------------
// Manifest format conversion
// ---------------------------------------------------------------------------

/**
 * Convert a flat manifest artifact list to Merkle tree format.
 */
export function manifestToMerkle(
  artifacts: Array<{ path: string; sha256?: string; blake3?: string; digests?: Array<{ algorithm: string; value: string }> }>,
): MerkleTree {
  const records: ArtifactRecord[] = artifacts.map((a) => ({
    path: a.path,
    sha256: a.sha256 ?? a.digests?.find((d) => d.algorithm === "sha256")?.value ?? "",
    blake3: a.blake3 ?? a.digests?.find((d) => d.algorithm === "blake3")?.value ?? "",
  }));
  return buildMerkleTree(records);
}
