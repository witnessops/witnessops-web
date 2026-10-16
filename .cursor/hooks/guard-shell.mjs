#!/usr/bin/env node
/**
 * beforeShellExecution hook.
 * Schema: https://cursor.com/docs/hooks
 *
 * Blocks deploy:k3s commands and the repo's k3s deploy/status/teardown scripts,
 * kubectl, git push --force (including --force-with-lease and +refspecs),
 * and rm -rf. Allows pnpm health and the deploy:* test scripts that health runs.
 *
 * Appends one JSON line per attempt to var/cursor-agent-shell.log
 * (already gitignored via var/). Override with WITNESSOPS_CURSOR_SHELL_LOG.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OPERATORS = new Set([";", "|", "&", "&&", "||"]);

const DEPLOY_SCRIPT_PATTERNS = [
  /(?<![\w.-])k3s-deploy-dev\.sh\b/,
  /(?<![\w.-])k3s-deploy-both\.sh\b/,
  /(?<![\w.-])k3s-deploy-prod\.sh\b/,
  /(?<![\w.-])k3s-build-shared\.sh\b/,
  /(?<![\w.-])k3s-disk-hygiene\.sh\b/,
  /(?<![\w.-])k3s-dev-teardown\.sh\b/,
  /(?<![\w.-])k3s-status\.sh\b/,
  /(?<![\w.-])k3s-status-prod-readonly\.sh\b/,
  /(?<![\w.-])smoke-prod-dev\.sh\b/,
  /(?<![\w.-])retired-production-deploy\.mjs\b/,
  /(?<![\w.-])k3s-parity\.sh\b/,
  /(?<![\w.-])run-status-with-topology\.mjs\b/,
  /(?<![\w.-])deploy\/scripts\/deploy\.sh\b/,
];

export function tokenize(command) {
  const tokens = [];
  let current = "";
  let quote = null;

  const push = () => {
    if (current.length > 0) tokens.push(current);
    current = "";
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (quote) {
      current += character;
      if (character === "\\" && quote === '"' && index + 1 < command.length) {
        current += command[index + 1];
        index += 1;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === "\\") {
      if (index + 1 < command.length) {
        current += command[index + 1];
        index += 1;
      }
      continue;
    }
    if (/\s/.test(character)) {
      push();
      continue;
    }
    if (character === "&" && command[index + 1] === "&") {
      push();
      tokens.push("&&");
      index += 1;
      continue;
    }
    if (character === "|" && command[index + 1] === "|") {
      push();
      tokens.push("||");
      index += 1;
      continue;
    }
    if (character === ";" || character === "|" || character === "&") {
      push();
      tokens.push(character);
      continue;
    }
    current += character;
  }
  push();
  return tokens;
}

function unquote(token) {
  if (token.length >= 2 && (token[0] === '"' || token[0] === "'") && token.at(-1) === token[0]) {
    return token.slice(1, -1);
  }
  return token;
}

function baseName(token) {
  const value = unquote(token);
  const parts = value.split("/");
  return parts[parts.length - 1] || value;
}

const PACKAGE_RUNNERS = new Set(["pnpm", "npm", "yarn", "npx", "bun"]);
const WRAPPERS = new Set(["sudo", "command", "exec", "nohup"]);

function matchesBlockedScript(value) {
  return DEPLOY_SCRIPT_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function deployReasons(commandName, args) {
  const reasons = [];
  const values = [commandName, ...args.map(unquote)];
  if (PACKAGE_RUNNERS.has(commandName) && values.some((value) => /deploy:k3s:(?!test-)/.test(value))) {
    reasons.push("deploy:k3s");
  }
  if (values.some((value) => matchesBlockedScript(value))) reasons.push("deploy script");
  return reasons;
}

function rmForceRecursive(args) {
  let recursive = false;
  let force = false;
  for (const raw of args) {
    const arg = unquote(raw);
    if (arg === "--") break;
    if (arg === "--recursive" || arg.startsWith("--recursive=")) recursive = true;
    else if (arg === "--force" || arg.startsWith("--force=")) force = true;
    else if (arg.startsWith("-") && !arg.startsWith("--")) {
      if (/[rR]/.test(arg)) recursive = true;
      if (arg.includes("f")) force = true;
    }
  }
  return recursive && force;
}

function isForcePush(args) {
  let index = 0;
  while (index < args.length) {
    const arg = unquote(args[index]);
    if (arg === "-C" || arg === "-c" || arg === "--git-dir" || arg === "--work-tree" || arg === "--namespace") {
      index += 2;
      continue;
    }
    if (
      arg.startsWith("--git-dir=")
      || arg.startsWith("--work-tree=")
      || arg.startsWith("--namespace=")
      || (arg.startsWith("-c") && arg !== "-c" && arg.length > 2)
    ) {
      index += 1;
      continue;
    }
    if (arg.startsWith("-") && arg !== "--") {
      index += 1;
      continue;
    }
    break;
  }
  if (unquote(args[index] ?? "") !== "push") return false;
  for (const raw of args.slice(index + 1)) {
    const arg = unquote(raw);
    if (arg === "--") {
      return args.slice(index + 1).some((item) => unquote(item).startsWith("+"));
    }
    if (
      arg === "--force"
      || arg.startsWith("--force=")
      || arg === "--force-with-lease"
      || arg.startsWith("--force-with-lease=")
      || arg === "--force-if-includes"
      || arg.startsWith("--force-if-includes=")
    ) {
      return true;
    }
    if (/^-[A-Za-z]*f[A-Za-z]*$/.test(arg)) return true;
    if (arg.startsWith("+")) return true;
  }
  return false;
}

function parseSegment(tokens, start) {
  let index = start;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(unquote(tokens[index]))) {
    index += 1;
  }
  if (index >= tokens.length || OPERATORS.has(tokens[index])) {
    return { commandName: "", args: [], next: index };
  }

  let commandIndex = index;
  while (commandIndex < tokens.length && WRAPPERS.has(baseName(tokens[commandIndex]))) {
    commandIndex += 1;
    while (commandIndex < tokens.length && !OPERATORS.has(tokens[commandIndex]) && unquote(tokens[commandIndex]).startsWith("-")) {
      const flag = unquote(tokens[commandIndex]);
      commandIndex += 1;
      if (flag === "-u" || flag === "-g" || flag === "-C" || flag === "--user" || flag === "--group") {
        commandIndex += 1;
      }
    }
  }

  const commandName = baseName(tokens[commandIndex] ?? "");
  const args = [];
  let cursor = commandIndex + (commandName ? 1 : 0);
  while (cursor < tokens.length && !OPERATORS.has(tokens[cursor])) {
    args.push(tokens[cursor]);
    cursor += 1;
  }
  return { commandName, args, next: cursor };
}

function reasonsForParsed(parsed) {
  const reasons = [];
  if (!parsed.commandName) return reasons;
  if (parsed.commandName === "rm" && rmForceRecursive(parsed.args)) reasons.push("rm -rf");
  if (parsed.commandName === "kubectl") reasons.push("kubectl");
  if (parsed.commandName === "git" && isForcePush(parsed.args)) reasons.push("git push --force");
  reasons.push(...deployReasons(parsed.commandName, parsed.args));
  return reasons;
}

function nestedCommands(parsed) {
  const args = parsed.args.map(unquote);
  if (parsed.commandName === "eval") {
    const command = args.filter((value) => !value.startsWith("-")).join(" ");
    return command ? [command] : [];
  }
  if (parsed.commandName === "bash" || parsed.commandName === "sh" || parsed.commandName === "dash" || parsed.commandName === "zsh") {
    const flagIndex = args.findIndex((value) => value === "-c" || value === "-lc");
    return flagIndex >= 0 && args[flagIndex + 1] ? [args[flagIndex + 1]] : [];
  }
  if (parsed.commandName === "env") {
    const command = args.filter((value) => !value.startsWith("-") && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(value)).join(" ");
    return command ? [command] : [];
  }
  return [];
}

export function evaluateCommand(command, depth = 0) {
  const reasons = new Set();
  if (depth > 4 || typeof command !== "string" || command.trim() === "") {
    return { permission: "allow", reasons: [] };
  }

  const tokens = tokenize(command);
  let index = 0;
  while (index < tokens.length) {
    if (OPERATORS.has(tokens[index])) {
      index += 1;
      continue;
    }
    const parsed = parseSegment(tokens, index);
    for (const reason of reasonsForParsed(parsed)) reasons.add(reason);
    for (const nested of nestedCommands(parsed)) {
      for (const reason of evaluateCommand(nested, depth + 1).reasons) reasons.add(reason);
    }
    index = Math.max(parsed.next, index + 1);
  }

  return {
    permission: reasons.size > 0 ? "deny" : "allow",
    reasons: [...reasons],
  };
}

function logPath() {
  return process.env.WITNESSOPS_CURSOR_SHELL_LOG
    || path.join(process.cwd(), "var", "cursor-agent-shell.log");
}

export function logAttempt(entry) {
  const target = logPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, `${JSON.stringify(entry)}\n`, "utf8");
}

function decisionPayload(result) {
  if (result.permission === "allow") return { permission: "allow" };
  const why = result.reasons.join(", ") || "blocked command";
  return {
    permission: "deny",
    user_message: `Blocked shell command (${why}). Deploy, kubectl, force-push, and rm -rf stay with the founder.`,
    agent_message: `Blocked: ${why}. Do not retry through a wrapper, sudo, or bash -c. pnpm health, pnpm test, pnpm deploy:aws:test, pnpm deploy:ghcr:test, and pnpm deploy:k3s:test-* stay allowed.`,
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export async function handleInput(raw) {
  let command = "";
  let cwd = "";
  let sandbox = false;
  let parseError = false;
  try {
    const input = JSON.parse(raw.trim() || "{}");
    if (!input || typeof input !== "object" || Array.isArray(input)) parseError = true;
    else {
      command = typeof input.command === "string" ? input.command : "";
      cwd = typeof input.cwd === "string" ? input.cwd : "";
      sandbox = Boolean(input.sandbox);
      if (typeof input.command !== "string") parseError = true;
    }
  } catch {
    parseError = true;
  }

  const result = parseError
    ? { permission: "deny", reasons: ["unparseable hook input"] }
    : evaluateCommand(command);

  try {
    logAttempt({
      ts: new Date().toISOString(),
      command: command.slice(0, 4000),
      cwd,
      sandbox,
      permission: result.permission,
      reasons: result.reasons,
    });
  } catch {
    // A log failure must not change the permission decision.
  }

  return decisionPayload(result);
}

async function main() {
  const payload = await handleInput(await readStdin());
  process.stdout.write(JSON.stringify(payload));
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "hook failed"}\n`);
    process.exit(1);
  });
}
