#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { isIP } from "node:net";
import { userInfo } from "node:os";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";

export const TOPOLOGY_KEYS = Object.freeze([
  "DEPLOY_SSH",
  "PROD_TARGET_PROFILE",
  "PROD_EXPECTED_HOSTNAME",
  "PROD_EXPECTED_INSTANCE_ID",
  "DEPLOY_NS",
  "PROD_DEPLOY",
  "PROD_SERVICE",
  "DEV_DEPLOY",
  "APP_CONTAINER_NAME",
  "BASE_ENV_SECRET",
  "ADMIN_OIDC_SECRET",
  "INTAKE_STORE_PVC",
  "INTAKE_EVENTS_PVC",
  "MAIL_OUT_PVC",
  "MESH_BIND_HOST",
  "MESH_BIND_PORT",
  "MESH_DEV_URL",
]);

const KUBERNETES_NAME_KEYS = new Set([
  "DEPLOY_NS",
  "PROD_DEPLOY",
  "PROD_SERVICE",
  "DEV_DEPLOY",
  "APP_CONTAINER_NAME",
  "BASE_ENV_SECRET",
  "ADMIN_OIDC_SECRET",
  "INTAKE_STORE_PVC",
  "INTAKE_EVENTS_PVC",
  "MAIL_OUT_PVC",
]);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_TOPOLOGY_PATH = path.join(REPO_ROOT, "deploy/topology.env");
const EXAMPLE_PATH = path.join(REPO_ROOT, "deploy/topology.env.example");
const MAX_TOPOLOGY_BYTES = 64 * 1024;
const STATUS_PATH = "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin";

export class TopologyValidationError extends Error {
  constructor(code) {
    super(code);
    this.name = "TopologyValidationError";
    this.code = code;
  }
}

function fail(code) {
  throw new TopologyValidationError(code);
}

function validDnsName(value) {
  if (value.length === 0 || value.length > 253 || value.includes("..")) {
    return false;
  }
  if (isIP(value)) {
    return true;
  }
  return value.split(".").every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label),
  );
}

function validSshTarget(value) {
  return (
    value.length > 0 &&
    value.length <= 253 &&
    /^[A-Za-z0-9._-]+(?:@[A-Za-z0-9._-]+)?$/.test(value)
  );
}

function validKubernetesName(value) {
  if (value.length === 0 || value.length > 253) {
    return false;
  }
  return value.split(".").every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/.test(label),
  );
}

function validateValueShape(key, value, values) {
  if (key === "PROD_TARGET_PROFILE") {
    return value === "prod-aws-frankfurt";
  }
  if (key === "PROD_EXPECTED_INSTANCE_ID") {
    return /^i-[0-9a-f]{8,32}$/.test(value);
  }
  if (key === "DEPLOY_SSH") {
    return validSshTarget(value);
  }
  if (key === "PROD_EXPECTED_HOSTNAME") {
    return validDnsName(value);
  }
  if (KUBERNETES_NAME_KEYS.has(key)) {
    return validKubernetesName(value);
  }
  if (key === "MESH_BIND_HOST") {
    return validDnsName(value);
  }
  if (key === "MESH_BIND_PORT") {
    const port = Number(value);
    return Number.isInteger(port) && port >= 1024 && port <= 65535 && String(port) === value;
  }
  if (key === "MESH_DEV_URL") {
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === "http:" &&
        parsed.username === "" &&
        parsed.password === "" &&
        parsed.pathname === "/" &&
        parsed.search === "" &&
        parsed.hash === "" &&
        parsed.hostname === values.MESH_BIND_HOST &&
        parsed.port === values.MESH_BIND_PORT
      );
    } catch {
      return false;
    }
  }
  return false;
}

export function publicContractKeys(exampleText) {
  const keys = [];
  for (const line of exampleText.split("\n")) {
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (!match) {
      fail("invalid-public-contract-line");
    }
    keys.push(match[1]);
  }
  return keys;
}

export function assertPublicContract(exampleText) {
  const observed = publicContractKeys(exampleText);
  if (
    observed.length !== TOPOLOGY_KEYS.length ||
    observed.some((key, index) => key !== TOPOLOGY_KEYS[index])
  ) {
    fail("public-contract-key-drift");
  }
}

export function parseTopology(topologyText) {
  if (topologyText.includes("\0") || topologyText.includes("\r")) {
    fail("invalid-control-character");
  }

  const allowed = new Set(TOPOLOGY_KEYS);
  const values = Object.create(null);
  for (const line of topologyText.split("\n")) {
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const match = /^([A-Z][A-Z0-9_]*)=([^\n]*)$/.exec(line);
    if (!match) {
      fail("invalid-topology-line");
    }
    const [, key, value] = match;
    if (!allowed.has(key)) {
      fail("unknown-topology-key");
    }
    if (Object.hasOwn(values, key)) {
      fail("duplicate-topology-key");
    }
    if (
      value.length === 0 ||
      value !== value.trim() ||
      /[\u0000-\u0020\u007f]/.test(value) ||
      /['"`$\\;|&<>(){}\[\]*?!~#]/.test(value)
    ) {
      fail("unsafe-topology-value");
    }
    values[key] = value;
  }

  for (const key of TOPOLOGY_KEYS) {
    if (!Object.hasOwn(values, key)) {
      fail("missing-topology-key");
    }
  }
  if (Object.keys(values).length !== TOPOLOGY_KEYS.length) {
    fail("topology-key-count-mismatch");
  }
  for (const key of TOPOLOGY_KEYS) {
    if (!validateValueShape(key, values[key], values)) {
      fail("invalid-topology-value-shape");
    }
  }
  return Object.freeze(Object.fromEntries(TOPOLOGY_KEYS.map((key) => [key, values[key]])));
}

export function statusEnvironment(baseEnvironment, topology) {
  const account = userInfo();
  const environment = {
    HOME: account.homedir,
    LOGNAME: account.username,
    USER: account.username,
  };
  if (
    typeof baseEnvironment.SSH_AUTH_SOCK === "string" &&
    baseEnvironment.SSH_AUTH_SOCK.length > 0
  ) {
    environment.SSH_AUTH_SOCK = baseEnvironment.SSH_AUTH_SOCK;
  }
  return {
    ...environment,
    PATH: STATUS_PATH,
    LANG: "C",
    LC_ALL: "C",
    TMPDIR: "/tmp",
    CURL_HOME: "/var/empty",
    PROD_URL: "https://witnessops.com",
    SSH_ASKPASS_REQUIRE: "never",
    ...topology,
  };
}

export function assertPrivateTopologyFile(topologyPath) {
  if (!path.isAbsolute(topologyPath)) {
    fail("private-topology-path-not-absolute");
  }
  let topologyStat;
  try {
    topologyStat = lstatSync(topologyPath, { bigint: true });
  } catch {
    fail("private-topology-unavailable");
  }
  if (topologyStat.isSymbolicLink() || !topologyStat.isFile()) {
    fail("private-topology-not-regular-file");
  }
  if ((topologyStat.mode & 0o077n) !== 0n) {
    fail("private-topology-permissions-too-broad");
  }
  if (typeof process.getuid === "function" && topologyStat.uid !== BigInt(process.getuid())) {
    fail("private-topology-owner-mismatch");
  }
  if (topologyStat.size < 1n || topologyStat.size > BigInt(MAX_TOPOLOGY_BYTES)) {
    fail("private-topology-size-invalid");
  }
  return topologyStat;
}

function sameFileState(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

export function readPrivateTopologyText(topologyPath) {
  const before = assertPrivateTopologyFile(topologyPath);
  let flags = fsConstants.O_RDONLY;
  if (typeof fsConstants.O_CLOEXEC === "number") {
    flags |= fsConstants.O_CLOEXEC;
  }
  if (typeof fsConstants.O_NOFOLLOW === "number") {
    flags |= fsConstants.O_NOFOLLOW;
  } else {
    fail("private-topology-no-follow-unavailable");
  }
  if (typeof fsConstants.O_NONBLOCK === "number") {
    flags |= fsConstants.O_NONBLOCK;
  }

  let descriptor;
  try {
    descriptor = openSync(topologyPath, flags);
  } catch {
    fail("private-topology-open-failed");
  }
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const beforeBigInt = lstatSync(topologyPath, { bigint: true });
    if (
      !opened.isFile() ||
      opened.isSymbolicLink() ||
      (opened.mode & 0o077n) !== 0n ||
      (typeof process.getuid === "function" && opened.uid !== BigInt(process.getuid())) ||
      opened.size < 1n ||
      opened.size > BigInt(MAX_TOPOLOGY_BYTES) ||
      !sameFileState(before, opened) ||
      !sameFileState(opened, beforeBigInt)
    ) {
      fail("private-topology-changed");
    }
    const chunks = [];
    const buffer = Buffer.allocUnsafe(4096);
    let total = 0;
    while (true) {
      const count = readSync(descriptor, buffer, 0, buffer.length, null);
      if (count === 0) {
        break;
      }
      total += count;
      if (total > MAX_TOPOLOGY_BYTES) {
        fail("private-topology-size-invalid");
      }
      chunks.push(Buffer.from(buffer.subarray(0, count)));
    }
    if (BigInt(total) !== opened.size) {
      fail("private-topology-changed");
    }
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, total));
    } catch {
      fail("private-topology-invalid-utf8");
    }
    const afterOpened = fstatSync(descriptor, { bigint: true });
    const afterPath = lstatSync(topologyPath, { bigint: true });
    if (!sameFileState(opened, afterOpened) || !sameFileState(opened, afterPath)) {
      fail("private-topology-changed");
    }
    return text;
  } catch (error) {
    if (error instanceof TopologyValidationError) {
      throw error;
    }
    fail("private-topology-read-failed");
  } finally {
    closeSync(descriptor);
  }
}

export function parseArguments(argv) {
  let validateOnly = false;
  let topologyPath = DEFAULT_TOPOLOGY_PATH;
  let topologyPathSeen = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--validate-only" && !validateOnly) {
      validateOnly = true;
      continue;
    }
    if (argument === "--topology-file" && !topologyPathSeen) {
      topologyPathSeen = true;
      topologyPath = argv[index + 1];
      if (typeof topologyPath !== "string" || topologyPath.length === 0) {
        fail("missing-topology-file-argument");
      }
      index += 1;
      continue;
    }
    fail("unsupported-argument");
  }
  return Object.freeze({ validateOnly, topologyPath });
}

export function loadPrivateTopology(topologyPath = DEFAULT_TOPOLOGY_PATH) {
  assertPublicContract(readFileSync(EXAMPLE_PATH, "utf8"));
  return parseTopology(readPrivateTopologyText(topologyPath));
}

function main(argv) {
  const { validateOnly, topologyPath } = parseArguments(argv);
  const topology = loadPrivateTopology(topologyPath);
  if (validateOnly) {
    process.stdout.write("private topology validation PASS\n");
    return 0;
  }

  const result = spawnSync("/bin/bash", ["deploy/scripts/k3s-status-prod-readonly.sh"], {
    cwd: REPO_ROOT,
    env: statusEnvironment(process.env, topology),
    shell: false,
    stdio: "inherit",
  });
  if (result.error || result.signal || !Number.isInteger(result.status)) {
    throw new TopologyValidationError("status-process-failed");
  }
  return result.status;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    const code = error instanceof TopologyValidationError ? error.code : "unexpected-error";
    process.stderr.write(`private topology validation failed: ${code}\n`);
    process.exitCode = 1;
  }
}
