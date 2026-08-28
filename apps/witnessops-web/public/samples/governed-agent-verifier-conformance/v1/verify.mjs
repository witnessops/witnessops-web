import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, observed ${actual}`);
  }
}

const receipt = JSON.parse(await readFile(join(root, "RECEIPT.json"), "utf8"));
const contractBytes = await readFile(join(root, "CONTRACT.json"));
const version100Bytes = await readFile(
  join(root, "governed-agent-verifier-v1.0.0-SKILL.md"),
);
const version101Bytes = await readFile(
  join(root, "governed-agent-verifier-v1.0.1-SKILL.md"),
);
const contract = JSON.parse(contractBytes.toString("utf8"));

requireEqual(
  sha256(contractBytes),
  receipt.artifacts.contractSha256,
  "contract SHA-256",
);
requireEqual(
  sha256(version100Bytes),
  receipt.artifacts.skillV100Sha256,
  "v1.0.0 SKILL.md SHA-256",
);
requireEqual(
  sha256(version101Bytes),
  receipt.artifacts.skillV101Sha256,
  "v1.0.1 SKILL.md SHA-256",
);
requireEqual(contract.skill.version, "1.0.1", "contract skill version");
requireEqual(contract.input.maxBytes, 16384, "contract input maxBytes");
requireEqual(
  receipt.historicalMismatch.declaredMaxBytes,
  131072,
  "historical declared maxBytes",
);
requireEqual(
  receipt.historicalMismatch.enforcedMaxBytes,
  16384,
  "historical enforced maxBytes",
);
requireEqual(
  receipt.resolution.enforcedMaxBytes,
  contract.input.maxBytes,
  "resolved maxBytes",
);
requireEqual(
  contract.input.encoding,
  "utf-8-strict",
  "contract input encoding",
);

if (!version100Bytes.includes(Buffer.from("Bound input to 128 KiB."))) {
  throw new Error("v1.0.0 snapshot does not retain the 128 KiB declaration");
}
if (!version101Bytes.includes(Buffer.from("Bound input to 16 KiB."))) {
  throw new Error("v1.0.1 snapshot does not contain the 16 KiB declaration");
}

console.log(
  JSON.stringify(
    {
      verdict: "ARTIFACT_SET_CONSISTENT",
      scope:
        "Exact hashes and version, input-boundary, and encoding declarations in this public artifact set agree.",
      doesNotEstablish: [
        "runtime constants, catalogue metadata, or repository test conformance",
        "skill or verifier safety",
        "completeness or certification",
        "production deployment of this source revision",
      ],
      artifacts: receipt.artifacts,
    },
    null,
    2,
  ),
);
