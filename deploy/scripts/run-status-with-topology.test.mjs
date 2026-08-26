import assert from "node:assert/strict";
import { chmodSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  TOPOLOGY_KEYS,
  TopologyValidationError,
  assertPrivateTopologyFile,
  assertPublicContract,
  loadPrivateTopology,
  parseArguments,
  parseTopology,
  statusEnvironment,
} from "./run-status-with-topology.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const example = readFileSync(path.join(repoRoot, "deploy/topology.env.example"), "utf8");
const wrapperSource = readFileSync(path.join(repoRoot, "deploy/scripts/run-status-with-topology.mjs"), "utf8");
const statusSource = readFileSync(path.join(repoRoot, "deploy/scripts/k3s-status.sh"), "utf8");
const librarySource = readFileSync(path.join(repoRoot, "deploy/scripts/k3s-lib.sh"), "utf8");
const deployReadme = readFileSync(path.join(repoRoot, "deploy/README.md"), "utf8");

function expectCode(fn, code) {
  assert.throws(fn, (error) => error instanceof TopologyValidationError && error.code === code);
}

test("the tracked example is the exact parser contract", () => {
  assert.doesNotThrow(() => assertPublicContract(example));
  assert.deepEqual(Object.keys(parseTopology(example)), TOPOLOGY_KEYS);
});

test("blank lines and full-line comments are data-free", () => {
  const parsed = parseTopology(`# local custody\n\n${example}\n# end\n`);
  assert.deepEqual(Object.keys(parsed), TOPOLOGY_KEYS);
});

test("missing, duplicate, and unknown keys fail closed", () => {
  expectCode(() => parseTopology(example.replace(/^DEPLOY_SSH=.*\n/m, "")), "missing-topology-key");
  expectCode(() => parseTopology(`${example}DEPLOY_SSH=duplicate.example\n`), "duplicate-topology-key");
  expectCode(() => parseTopology(`${example}EXTRA_TOPOLOGY=value\n`), "unknown-topology-key");
});

test("shell syntax, inline comments, whitespace, and control bytes are rejected", () => {
  for (const value of [
    "$(id)",
    "`id`",
    "value;id",
    "value # comment",
    " quoted",
    "quoted ",
    "quo\\ted",
    "quo\tted",
    "quo\0ted",
  ]) {
    expectCode(
      () => parseTopology(example.replace("DEPLOY_SSH=deploy-host.private.example", `DEPLOY_SSH=${value}`)),
      value.includes("\0") ? "invalid-control-character" : "unsafe-topology-value",
    );
  }
});

test("Frankfurt profile and instance identity are exact", () => {
  expectCode(
    () => parseTopology(example.replace("prod-aws-frankfurt", "legacy-vps-production")),
    "invalid-topology-value-shape",
  );
  expectCode(
    () => parseTopology(example.replace("i-0123456789abcdef0", "not-an-instance")),
    "invalid-topology-value-shape",
  );
});

test("mesh URL is a credential-free exact host and port binding", () => {
  for (const [url, code] of [
    ["https://192.0.2.10:3001", "invalid-topology-value-shape"],
    ["http://user:pass@192.0.2.10:3001", "invalid-topology-value-shape"],
    ["http://192.0.2.11:3001", "invalid-topology-value-shape"],
    ["http://192.0.2.10:3002", "invalid-topology-value-shape"],
    ["http://192.0.2.10:3001/path", "invalid-topology-value-shape"],
    ["http://192.0.2.10:3001/?query=1", "unsafe-topology-value"],
  ]) {
    expectCode(
      () => parseTopology(example.replace("http://192.0.2.10:3001", url)),
      code,
    );
  }
});

test("status environment overrides topology and removes shell startup injection", () => {
  const topology = parseTopology(example);
  const environment = statusEnvironment(
    {
      PATH: "/bin",
      HOME: "/tmp/attacker-home",
      USER: "attacker",
      DEPLOY_SSH: "wrong.example",
      BASH_ENV: "/tmp/inject",
      BASHOPTS: "extdebug",
      "BASH_FUNC_ssh%%": "() { echo fabricated; }",
      ENV: "/tmp/inject",
      CDPATH: "/tmp",
      GLOBIGNORE: "*",
      SHELLOPTS: "xtrace",
      HTTPS_PROXY: "http://proxy.invalid",
      NODE_OPTIONS: "--require=/tmp/inject",
      SSH_AUTH_SOCK: "/private/agent.sock",
    },
    topology,
  );
  assert.equal(environment.PATH, "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin");
  assert.equal(environment.PROD_URL, "https://witnessops.com");
  assert.equal(environment.CURL_HOME, "/var/empty");
  assert.notEqual(environment.HOME, "/tmp/attacker-home");
  assert.notEqual(environment.USER, "attacker");
  assert.equal(environment.SSH_AUTH_SOCK, "/private/agent.sock");
  assert.equal(environment.DEPLOY_SSH, topology.DEPLOY_SSH);
  for (const key of [
    "BASH_ENV",
    "BASHOPTS",
    "BASH_FUNC_ssh%%",
    "ENV",
    "CDPATH",
    "GLOBIGNORE",
    "SHELLOPTS",
    "HTTPS_PROXY",
    "NODE_OPTIONS",
  ]) {
    assert.equal(Object.hasOwn(environment, key), false);
  }
});

test("public contract key drift is rejected", () => {
  expectCode(() => assertPublicContract(example.replace(/^PROD_SERVICE=.*\n/m, "")), "public-contract-key-drift");
});

test("arguments cannot select a command and external topology paths must be absolute", () => {
  assert.deepEqual(parseArguments([]).validateOnly, false);
  assert.deepEqual(parseArguments(["--validate-only"]).validateOnly, true);
  assert.equal(
    parseArguments(["--topology-file", "/private/path/topology.env", "--validate-only"]).topologyPath,
    "/private/path/topology.env",
  );
  expectCode(() => parseArguments(["--command", "deploy"]), "unsupported-argument");
  expectCode(() => parseArguments(["--topology-file"]), "missing-topology-file-argument");
  expectCode(
    () => assertPrivateTopologyFile("deploy/topology.env"),
    "private-topology-path-not-absolute",
  );
});

test("private topology custody rejects broad permissions and symlinks", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wops-topology-test-"));
  try {
    const topologyPath = path.join(directory, "topology.env");
    writeFileSync(topologyPath, example, { mode: 0o600 });
    assert.deepEqual(Object.keys(loadPrivateTopology(topologyPath)), TOPOLOGY_KEYS);

    chmodSync(topologyPath, 0o640);
    expectCode(
      () => assertPrivateTopologyFile(topologyPath),
      "private-topology-permissions-too-broad",
    );
    chmodSync(topologyPath, 0o600);

    writeFileSync(topologyPath, "");
    expectCode(
      () => assertPrivateTopologyFile(topologyPath),
      "private-topology-size-invalid",
    );
    writeFileSync(topologyPath, "x".repeat(70 * 1024));
    expectCode(
      () => assertPrivateTopologyFile(topologyPath),
      "private-topology-size-invalid",
    );
    writeFileSync(topologyPath, example);

    const symlinkPath = path.join(directory, "topology-link.env");
    symlinkSync(topologyPath, symlinkPath);
    expectCode(
      () => assertPrivateTopologyFile(symlinkPath),
      "private-topology-not-regular-file",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the fixed status path disables ambient execution and output leaks", () => {
  assert.match(wrapperSource, /spawnSync\("\/bin\/bash", \["deploy\/scripts\/k3s-status\.sh"\]/);
  assert.doesNotMatch(statusSource, /log .*\$\{(?:DEPLOY_SSH|MESH_DEV_URL|PROD_URL)\}/);
  assert.doesNotMatch(librarySource, /\/tmp\/wo-(?:prod|dev)\.html/);
  assert.match(librarySource, /mktemp -d \/tmp\/witnessops-smoke\.XXXXXX/);
  assert.ok((librarySource.match(/curl -q --noproxy '\*'/g) ?? []).length >= 5);
  assert.ok((librarySource.match(/sudo -n k3s kubectl/g) ?? []).length >= 7);
  assert.ok((librarySource.match(/sudo -n k3s ctr/g) ?? []).length >= 2);
  assert.match(deployReadme, /complete status transcript is therefore restricted evidence/);
  assert.match(deployReadme, /capture stdout and stderr together in an owner-only file/);
  assert.match(deployReadme, /never run this\s+command in public CI or public logs/);
});
