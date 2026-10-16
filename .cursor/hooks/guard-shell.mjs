#!/usr/bin/env node
/**
 * beforeShellExecution hook.
 * Schema: https://cursor.com/docs/hooks
 *
 * Blocks live deploy entrypoints, kubectl (including `k3s kubectl`), git push --force
 * (including --force-with-lease and +refspecs), and rm -rf.
 * Package-script tests that `pnpm health` runs stay allowed.
 *
 * Unquoted newlines are command separators. Command substitutions, backticks,
 * subshells, and process substitutions are inspected. Single-quoted text stays
 * literal. Input the scanner cannot segment is denied.
 * Deploy script names match only in executable position, or as the script
 * operand of an interpreter/source. `bash -n` / `node --check` do not execute.
 *
 * Appends one JSON line per attempt to var/cursor-agent-shell.log
 * (already gitignored via var/). Override with WITNESSOPS_CURSOR_SHELL_LOG.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OPERATORS = new Set([";", "|", "&", "&&", "||", "\n", "{", "}"]);

const DEPLOY_SCRIPT_PATTERNS = [
  /(?<![\w.-])k3s-deploy-dev\.sh\b/,
  /(?<![\w.-])k3s-deploy-both\.sh\b/,
  /(?<![\w.-])k3s-deploy-prod\.sh\b/,
  /(?<![\w.-])k3s-build-shared\.sh\b/,
  /(?<![\w.-])k3s-disk-hygiene\.sh\b/,
  /(?<![\w.-])k3s-dev-teardown\.sh\b/,
  /(?<![\w.-])k3s-status\.sh\b/,
  /(?<![\w.-])k3s-status-prod-readonly\.sh\b/,
  /(?<![\w.-])k3s-lib\.sh\b/,
  /(?<![\w.-])smoke-prod-dev\.sh\b/,
  /(?<![\w.-])retired-production-deploy\.mjs\b/,
  /(?<![\w.-])k3s-parity\.sh\b/,
  /(?<![\w.-])run-status-with-topology\.mjs\b/,
  /(?<![\w.-])deploy\/scripts\/deploy\.sh\b/,
  /(?<![\w.-])apply\.sh\b/,
  /(?<![\w.-])publish\.mjs\b/,
  /(?<![\w.-])install-witnessops-deploy-v1\.sh\b/,
];

const AWS_RELEASE_TARGETS = [
  /(?:^|\/)aws-release\.yml$/,
  /(?:^|\/)aws-release-reusable\.yml$/,
  /^WitnessOps AWS release control$/,
  /^WitnessOps reusable AWS release$/,
];

const PACKAGE_RUNNERS = new Set(["pnpm", "npm", "yarn", "npx", "bun"]);
const WRAPPERS = new Set(["sudo", "command", "exec", "nohup"]);
const SHELLS = new Set(["bash", "sh", "dash", "zsh", "ksh"]);

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

function matchesBlockedScript(value) {
  return DEPLOY_SCRIPT_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function isWordBoundary(character) {
  if (character === undefined) return true;
  return /[\s;&|<>(){}]/.test(character);
}

function readBalanced(input, start, open, close) {
  let depth = 1;
  let index = start + 1;
  let quote = null;
  let body = "";
  while (index < input.length) {
    const character = input[index];
    if (quote === "'") {
      body += character;
      if (character === "'") quote = null;
      index += 1;
      continue;
    }
    if (quote === '"') {
      if (character === "\\" && index + 1 < input.length) {
        body += character + input[index + 1];
        index += 2;
        continue;
      }
      body += character;
      if (character === '"') quote = null;
      index += 1;
      continue;
    }
    if (character === "\\") {
      if (index + 1 < input.length) {
        body += character + input[index + 1];
        index += 2;
        continue;
      }
    }
    if (character === "'") {
      quote = "'";
      body += character;
      index += 1;
      continue;
    }
    if (character === '"') {
      quote = '"';
      body += character;
      index += 1;
      continue;
    }
    if (character === open) {
      depth += 1;
      body += character;
      index += 1;
      continue;
    }
    if (character === close) {
      depth -= 1;
      if (depth === 0) return quote ? null : { body, end: index };
      body += character;
      index += 1;
      continue;
    }
    body += character;
    index += 1;
  }
  return null;
}

function readBacktick(input, start) {
  let index = start + 1;
  let body = "";
  while (index < input.length) {
    if (input[index] === "\\" && index + 1 < input.length) {
      body += input[index] + input[index + 1];
      index += 2;
      continue;
    }
    if (input[index] === "`") return { body, end: index };
    body += input[index];
    index += 1;
  }
  return null;
}

function pushNested(nested, body) {
  if (body.trim()) nested.push(body);
}

function takeDollarParen(command, dollarIndex, nested) {
  const open = dollarIndex + 1;
  const got = readBalanced(command, open, "(", ")");
  if (!got) return null;
  if (command[open + 1] === "(" && got.body.startsWith("(") && got.body.endsWith(")")) {
    pushNested(nested, got.body.slice(1, -1));
  } else {
    pushNested(nested, got.body);
  }
  return got;
}

export function scanShell(command, depth = 0) {
  const tokens = [];
  const nested = [];
  if (depth > 32) return { ok: false, tokens, nested };
  let current = "";
  let quote = null;

  const push = () => {
    if (current.length > 0) tokens.push(current);
    current = "";
  };
  const fail = () => ({ ok: false, tokens, nested });

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (quote === "'") {
      current += character;
      if (character === "'") quote = null;
      continue;
    }

    if (quote === '"') {
      if (character === "\\" && index + 1 < command.length) {
        const next = command[index + 1];
        if (next === "\n") {
          index += 1;
          continue;
        }
        current += character + next;
        index += 1;
        continue;
      }
      if (character === '"') {
        current += character;
        quote = null;
        continue;
      }
      if (character === "`") {
        const got = readBacktick(command, index);
        if (!got) return fail();
        pushNested(nested, got.body);
        current += "``";
        index = got.end;
        continue;
      }
      if (character === "$" && command[index + 1] === "(") {
        const got = takeDollarParen(command, index, nested);
        if (!got) return fail();
        current += "$()";
        index = got.end;
        continue;
      }
      current += character;
      continue;
    }

    if (character === "'") {
      quote = "'";
      current += character;
      continue;
    }
    if (character === '"') {
      quote = '"';
      current += character;
      continue;
    }
    if (character === "\\") {
      if (index + 1 < command.length) {
        const next = command[index + 1];
        if (next === "\n") {
          index += 1;
          continue;
        }
        current += next;
        index += 1;
      }
      continue;
    }
    if (character === "$" && (command[index + 1] === "'" || command[index + 1] === '"')) {
      return fail();
    }
    if (character === "$" && command[index + 1] === "(") {
      const got = takeDollarParen(command, index, nested);
      if (!got) return fail();
      current += "$()";
      index = got.end;
      continue;
    }
    if (character === "$" && command[index + 1] === "{") {
      const got = readBalanced(command, index + 1, "{", "}");
      if (!got) return fail();
      const inner = scanShell(got.body, depth + 1);
      if (!inner.ok) return fail();
      nested.push(...inner.nested);
      current += "${}";
      index = got.end;
      continue;
    }
    if (character === "`") {
      const got = readBacktick(command, index);
      if (!got) return fail();
      pushNested(nested, got.body);
      current += "``";
      index = got.end;
      continue;
    }
    if (character === "<" && command[index + 1] === "<") {
      if (command[index + 2] === "<") {
        index += 2;
        continue;
      }
      return fail();
    }
    if ((character === "<" || character === ">") && command[index + 1] === "(") {
      const got = readBalanced(command, index + 1, "(", ")");
      if (!got) return fail();
      pushNested(nested, got.body);
      index = got.end;
      continue;
    }
    if (character === "(") {
      const got = readBalanced(command, index, "(", ")");
      if (!got) return fail();
      if (got.body.startsWith("(") && got.body.endsWith(")")) pushNested(nested, got.body.slice(1, -1));
      else pushNested(nested, got.body);
      push();
      index = got.end;
      continue;
    }
    if (character === ")") return fail();
    if (character === "\n" || character === "\r") {
      push();
      tokens.push("\n");
      if (character === "\r" && command[index + 1] === "\n") index += 1;
      continue;
    }
    if (character === "#" && current.length === 0) {
      while (index + 1 < command.length && command[index + 1] !== "\n" && command[index + 1] !== "\r") {
        index += 1;
      }
      continue;
    }
    if ((character === "{" || character === "}") && current.length === 0 && isWordBoundary(command[index + 1])) {
      tokens.push(character);
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

  if (quote) return fail();
  push();
  return { ok: true, tokens, nested };
}

export function tokenize(command) {
  return scanShell(command).tokens;
}

function walkShellArgs(args) {
  let syntaxOnly = false;
  let commandString = null;
  let script = null;
  let index = 0;
  while (index < args.length) {
    const arg = unquote(args[index]);
    if (arg === "--") {
      if (!commandString && args[index + 1]) script = unquote(args[index + 1]);
      break;
    }
    if (arg === "--syntax-check" || /^-[A-Za-z]*n[A-Za-z]*$/.test(arg)) syntaxOnly = true;
    if (arg === "--rcfile" || arg === "--init-file" || arg === "-o" || arg === "-O") {
      index += 2;
      continue;
    }
    if (arg.startsWith("--rcfile=") || arg.startsWith("--init-file=")) {
      index += 1;
      continue;
    }
    if (arg === "-c" || /^-[A-Za-z]*c[A-Za-z]*$/.test(arg)) {
      if (commandString === null && args[index + 1] !== undefined) commandString = unquote(args[index + 1]);
      index += 2;
      continue;
    }
    if (arg.startsWith("-")) {
      index += 1;
      continue;
    }
    if (!commandString) script = arg;
    break;
  }
  return { syntaxOnly, commandString, script };
}

function nodeOperands(args) {
  let syntaxOnly = false;
  let evalMode = false;
  const scripts = [];
  const valued = new Set([
    "-p", "--print", "-r", "--require", "--import", "--loader",
    "--experimental-loader", "--input-type", "--test-reporter",
    "--test-reporter-destination", "--test-name-pattern", "--test-timeout",
    "--watch-path", "--env-file",
  ]);
  let index = 0;
  while (index < args.length) {
    const arg = unquote(args[index]);
    if (arg === "--") {
      if (!evalMode) {
        for (const item of args.slice(index + 1)) scripts.push(unquote(item));
      }
      break;
    }
    if (arg === "--check" || arg === "-c") syntaxOnly = true;
    if (arg === "-e" || arg === "--eval") {
      evalMode = true;
      index += 2;
      continue;
    }
    if (arg.startsWith("--eval=")) {
      evalMode = true;
      index += 1;
      continue;
    }
    if (valued.has(arg)) {
      index += 2;
      continue;
    }
    if (/^--(require|import|loader|test-reporter|test-name-pattern|env-file)=/.test(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      index += 1;
      continue;
    }
    if (!evalMode) scripts.push(arg);
    index += 1;
  }
  return syntaxOnly ? [] : scripts;
}

function interpreterOperands(args, codeFlags, valuedFlags) {
  const scripts = [];
  let codeMode = false;
  let index = 0;
  while (index < args.length) {
    const arg = unquote(args[index]);
    if (arg === "--") {
      if (!codeMode && args[index + 1]) scripts.push(unquote(args[index + 1]));
      break;
    }
    if (codeFlags.has(arg)) {
      codeMode = true;
      index += 2;
      continue;
    }
    if (valuedFlags.has(arg)) {
      index += 2;
      continue;
    }
    if (arg.startsWith("-")) {
      index += 1;
      continue;
    }
    if (!codeMode) scripts.push(arg);
    break;
  }
  return scripts;
}

function scriptOperands(commandName, args) {
  if (SHELLS.has(commandName)) {
    const walked = walkShellArgs(args);
    if (walked.syntaxOnly || walked.commandString || !walked.script) return [];
    return [walked.script];
  }
  if (commandName === "node") return nodeOperands(args);
  if (commandName === "python" || commandName === "python3") {
    return interpreterOperands(args, new Set(["-c", "-m"]), new Set(["-W", "-X"]));
  }
  if (commandName === "perl") {
    return interpreterOperands(args, new Set(["-e", "-E"]), new Set(["-I", "-m", "-M"]));
  }
  if (commandName === "ruby") {
    return interpreterOperands(args, new Set(["-e"]), new Set(["-I", "-r"]));
  }
  if (commandName === "php") {
    const scripts = [];
    let codeMode = false;
    let index = 0;
    while (index < args.length) {
      const arg = unquote(args[index]);
      if (arg === "-f" && args[index + 1]) {
        scripts.push(unquote(args[index + 1]));
        index += 2;
        continue;
      }
      if (arg === "-r") {
        codeMode = true;
        index += 2;
        continue;
      }
      if (arg === "-d") {
        index += 2;
        continue;
      }
      if (arg === "--") {
        if (!codeMode && args[index + 1]) scripts.push(unquote(args[index + 1]));
        break;
      }
      if (arg.startsWith("-")) {
        index += 1;
        continue;
      }
      if (!codeMode) scripts.push(arg);
      break;
    }
    return scripts;
  }
  if (commandName === "source" || commandName === ".") return interpreterOperands(args, new Set(), new Set());
  return [];
}

function deployReasons(commandName, args) {
  const reasons = [];
  const plainArgs = args.map(unquote);
  if (PACKAGE_RUNNERS.has(commandName) && plainArgs.some((value) => /(?:^|[^\w.-])deploy:k3s:(?!test-)/.test(value))) {
    reasons.push("deploy:k3s");
  }
  if (matchesBlockedScript(commandName) || scriptOperands(commandName, args).some(matchesBlockedScript)) {
    reasons.push("deploy script");
  }
  if (commandName === "aws") {
    const ssmAt = plainArgs.indexOf("ssm");
    if (ssmAt >= 0 && plainArgs.slice(ssmAt + 1).includes("send-command")) reasons.push("aws deploy");
  }
  if (commandName === "gh" && plainArgs.includes("workflow") && plainArgs.includes("run")) {
    const dispatched = plainArgs.some((value) => AWS_RELEASE_TARGETS.some((pattern) => pattern.test(value)));
    if (dispatched) reasons.push("workflow dispatch");
  }
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
  if (parsed.commandName === "k3s" && parsed.args.map(unquote).includes("kubectl")) reasons.push("kubectl");
  if (parsed.commandName === "git" && isForcePush(parsed.args)) reasons.push("git push --force");
  reasons.push(...deployReasons(parsed.commandName, parsed.args));
  return reasons;
}

function packageExec(parsed) {
  if (!PACKAGE_RUNNERS.has(parsed.commandName)) return [];
  const args = parsed.args.map(unquote);
  const execWords = parsed.commandName === "bun" ? ["exec", "x"] : ["exec", "dlx"];
  const execAt = args.findIndex((value) => execWords.includes(value));
  if (execAt < 0) return [];
  let rest = args.slice(execAt + 1);
  while (rest.length > 0 && rest[0].startsWith("-") && rest[0] !== "--") rest = rest.slice(1);
  if (rest[0] === "--") rest = rest.slice(1);
  return rest.length > 0 ? [rest.join(" ")] : [];
}

function nestedCommands(parsed) {
  const args = parsed.args.map(unquote);
  if (parsed.commandName === "eval") {
    const command = args.filter((value) => !value.startsWith("-")).join(" ");
    return command ? [command] : [];
  }
  if (SHELLS.has(parsed.commandName)) {
    const walked = walkShellArgs(parsed.args);
    if (walked.syntaxOnly || !walked.commandString) return [];
    return [walked.commandString];
  }
  if (parsed.commandName === "env") {
    const command = args.filter((value) => !value.startsWith("-") && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(value)).join(" ");
    return command ? [command] : [];
  }
  return packageExec(parsed);
}

export function evaluateCommand(command, depth = 0) {
  if (typeof command !== "string" || command.trim() === "") {
    return { permission: "allow", reasons: [] };
  }
  if (depth > 4) {
    return { permission: "deny", reasons: ["unparsed shell syntax"] };
  }

  const scanned = scanShell(command);
  if (!scanned.ok) {
    return { permission: "deny", reasons: ["unparsed shell syntax"] };
  }

  const reasons = new Set();
  const tokens = scanned.tokens;
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
  for (const nested of scanned.nested) {
    for (const reason of evaluateCommand(nested, depth + 1).reasons) reasons.add(reason);
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
    agent_message: `Blocked: ${why}. Do not retry through a wrapper, sudo, bash -c, a newline, or command substitution. pnpm health, pnpm test, pnpm deploy:aws:test, pnpm deploy:ghcr:test, and pnpm deploy:k3s:test-* stay allowed.`,
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
