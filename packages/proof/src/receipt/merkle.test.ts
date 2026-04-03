import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMerkleTree,
  canonicalLeafBytes,
  generateInclusionProof,
  verifyInclusionProof,
  manifestToMerkle,
  type ArtifactRecord,
} from "./merkle";

const FIXTURES: ArtifactRecord[] = [
  { path: "state.json", sha256: "aaaa".repeat(16), blake3: "bbbb".repeat(16) },
  { path: "manifest.json", sha256: "cccc".repeat(16), blake3: "dddd".repeat(16) },
  { path: "runbook-summary.md", sha256: "eeee".repeat(16), blake3: "ffff".repeat(16) },
];

describe("merkle — canonical leaf format", () => {
  it("produces deterministic JSON with fields in alphabetical order", () => {
    const canonical = canonicalLeafBytes(FIXTURES[0]);
    // Fields must be: blake3, path, sha256 (alphabetical)
    assert.equal(
      canonical,
      `{"blake3":"${"bbbb".repeat(16)}","path":"state.json","sha256":"${"aaaa".repeat(16)}"}`,
    );
  });

  it("same record always produces same bytes", () => {
    const a = canonicalLeafBytes(FIXTURES[0]);
    const b = canonicalLeafBytes(FIXTURES[0]);
    assert.equal(a, b);
  });
});

describe("merkle — tree construction", () => {
  it("builds tree from 3 artifacts with correct metadata", () => {
    const tree = buildMerkleTree(FIXTURES);
    assert.equal(tree.leaf_count, 3);
    assert.equal(tree.leaf_canonicalization, "artifact-record-v1");
    assert.equal(tree.leaf_digest_algorithm, "blake3");
    assert.equal(tree.node_digest_algorithm, "blake3");
    assert.equal(tree.ordering, "path-lexicographic-c");
    assert.ok(tree.root.length === 64, "root should be 64 hex chars");
  });

  it("sorts leaves by path lexicographically", () => {
    const tree = buildMerkleTree(FIXTURES);
    const paths = tree.leaves.map((l) => l.record.path);
    assert.deepEqual(paths, ["manifest.json", "runbook-summary.md", "state.json"]);
  });

  it("root is deterministic for same inputs", () => {
    const tree1 = buildMerkleTree(FIXTURES);
    const tree2 = buildMerkleTree([...FIXTURES].reverse());
    assert.equal(tree1.root, tree2.root, "input order should not matter — sorted internally");
  });

  it("different inputs produce different roots", () => {
    const tree1 = buildMerkleTree(FIXTURES);
    const tree2 = buildMerkleTree([
      { ...FIXTURES[0], blake3: "0000".repeat(16) },
      FIXTURES[1],
      FIXTURES[2],
    ]);
    assert.notEqual(tree1.root, tree2.root);
  });

  it("handles single artifact", () => {
    const tree = buildMerkleTree([FIXTURES[0]]);
    assert.equal(tree.leaf_count, 1);
    assert.equal(tree.root, tree.leaves[0].leaf_digest);
  });

  it("handles empty artifact list", () => {
    const tree = buildMerkleTree([]);
    assert.equal(tree.leaf_count, 0);
    assert.ok(tree.root.length > 0);
  });

  it("handles even number of artifacts (4)", () => {
    const four = [
      ...FIXTURES,
      { path: "extra.json", sha256: "1111".repeat(16), blake3: "2222".repeat(16) },
    ];
    const tree = buildMerkleTree(four);
    assert.equal(tree.leaf_count, 4);
    assert.ok(tree.root.length === 64);
  });
});

describe("merkle — inclusion proofs", () => {
  it("generates valid inclusion proof for each leaf", () => {
    const tree = buildMerkleTree(FIXTURES);
    for (let i = 0; i < tree.leaf_count; i++) {
      const proof = generateInclusionProof(tree, i);
      assert.ok(proof, `proof should exist for leaf ${i}`);
      assert.equal(proof.root, tree.root);
      assert.ok(verifyInclusionProof(proof), `proof should verify for leaf ${i}`);
    }
  });

  it("proof fails if leaf digest is tampered", () => {
    const tree = buildMerkleTree(FIXTURES);
    const proof = generateInclusionProof(tree, 0)!;
    proof.leaf_digest = "0".repeat(64);
    assert.equal(verifyInclusionProof(proof), false);
  });

  it("proof fails if sibling is tampered", () => {
    const tree = buildMerkleTree(FIXTURES);
    const proof = generateInclusionProof(tree, 0)!;
    if (proof.path.length > 0) {
      proof.path[0].digest = "0".repeat(64);
      assert.equal(verifyInclusionProof(proof), false);
    }
  });

  it("returns null for out-of-range index", () => {
    const tree = buildMerkleTree(FIXTURES);
    assert.equal(generateInclusionProof(tree, -1), null);
    assert.equal(generateInclusionProof(tree, 99), null);
  });

  it("works for larger artifact sets", () => {
    const many: ArtifactRecord[] = Array.from({ length: 31 }, (_, i) => ({
      path: `artifact-${String(i).padStart(3, "0")}.json`,
      sha256: createHash(i, "sha256"),
      blake3: createHash(i, "blake3"),
    }));
    const tree = buildMerkleTree(many);
    assert.equal(tree.leaf_count, 31);

    // Verify every leaf has a valid inclusion proof
    for (let i = 0; i < tree.leaf_count; i++) {
      const proof = generateInclusionProof(tree, i)!;
      assert.ok(verifyInclusionProof(proof), `proof failed for leaf ${i}`);
    }
  });
});

describe("merkle — manifestToMerkle", () => {
  it("converts flat manifest format to merkle tree", () => {
    const artifacts = [
      { path: "state.json", sha256: "aaaa".repeat(16), blake3: "bbbb".repeat(16) },
      { path: "manifest.json", digests: [
        { algorithm: "sha256", value: "cccc".repeat(16) },
        { algorithm: "blake3", value: "dddd".repeat(16) },
      ]},
    ];
    const tree = manifestToMerkle(artifacts);
    assert.equal(tree.leaf_count, 2);
    assert.ok(tree.root.length === 64);
  });
});

function createHash(index: number, prefix: string): string {
  const hex = index.toString(16).padStart(2, "0");
  return `${prefix === "sha256" ? "a" : "b"}${hex}`.repeat(32).slice(0, 64);
}
