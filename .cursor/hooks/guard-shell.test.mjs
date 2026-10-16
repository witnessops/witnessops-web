import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateCommand } from "./guard-shell.mjs";

const scriptPath = fileURLToPath(new URL("./guard-shell.mjs", import.meta.url));

const allowed = [
  "pnpm health",
  "pnpm test",
  "pnpm lint",
  "pnpm deploy:aws:test",
  "pnpm deploy:ghcr:test",
  "pnpm deploy:aws:validate",
  "pnpm deploy:k3s:test-topology",
  "pnpm deploy:k3s:test-state-aggregate",
  "pnpm deploy:k3s:test-evidence",
  "pnpm deploy:k3s:test-parity",
  "node --test deploy/scripts/retired-production-deploy.test.mjs",
  "node --test deploy/scripts/run-status-with-topology.test.mjs",
  "bash deploy/scripts/test-k3s-parity.sh",
  "git status",
  "git push -u origin cursor/cursor-project-config-d2c1",
  "git push origin HEAD",
  "git push --follow-tags",
  "rm file.txt",
  "rm -f file.txt",
  "rm -r tmp/empty",
  "echo hello",
  "echo \"kubectl get pods\"",
  "echo 'rm -rf /tmp/example'",
  "echo '$(kubectl get pods)'",
  "echo '`kubectl get pods`'",
  "echo 'ok\nkubectl get pods'",
  "echo \"ok\nkubectl get pods\"",
  "echo ok \\\nkubectl get pods",
  "echo ok # kubectl get pods",
  "cat deploy/k8s/apply.sh",
  "cat deploy/scripts/k3s-deploy-dev.sh",
  "git diff deploy/scripts/k3s-deploy-prod.sh",
  "git diff -- deploy/k8s/apply.sh",
  "echo deploy/scripts/retired-production-deploy.mjs",
  "echo deploy:k3s:prod",
  "bash -n deploy/k8s/apply.sh",
  "bash -n deploy/aws/host/install-witnessops-deploy-v1.sh",
  "bash -n deploy/aws/candidate-acceptance.sh",
  "node --check deploy/scripts/retired-production-deploy.mjs",
  "node --test deploy/ghcr/workflows.test.mjs",
  "pnpm deploy:aws:candidate",
  "gh workflow run ui-proof-homepage-hero.yml",
  "gh run list",
  "bash deploy/aws/host/test_install_witnessops_deploy_v1.sh",
  "python3 -c \"print(1)\" deploy/k8s/apply.sh",
  "node -e \"console.log(1)\" deploy/k8s/apply.sh",
  "bash -c \"echo hi\" deploy/k8s/apply.sh",
  "perl -e 'print 1' deploy/k8s/apply.sh",
];

const blocked = [
  ["pnpm deploy:k3s:prod", "deploy:k3s"],
  ["pnpm deploy:k3s:dev", "deploy:k3s"],
  ["pnpm deploy:k3s:both", "deploy:k3s"],
  ["pnpm deploy:k3s:build", "deploy:k3s"],
  ["pnpm deploy:k3s:smoke", "deploy:k3s"],
  ["pnpm deploy:k3s:status", "deploy:k3s"],
  ["pnpm deploy:k3s:dev:teardown", "deploy:k3s"],
  ["pnpm deploy:k3s:hygiene", "deploy:k3s"],
  ["npm run deploy:k3s:prod", "deploy:k3s"],
  ["bash deploy/scripts/k3s-deploy-dev.sh", "deploy script"],
  ["bash deploy/scripts/k3s-deploy-prod.sh", "deploy script"],
  ["node deploy/scripts/retired-production-deploy.mjs", "deploy script"],
  ["bash deploy/scripts/k3s-status.sh", "deploy script"],
  ["bash deploy/scripts/smoke-prod-dev.sh", "deploy script"],
  ["bash deploy/scripts/k3s-dev-teardown.sh", "deploy script"],
  ["kubectl get pods", "kubectl"],
  ["sudo kubectl delete ns prod", "kubectl"],
  ["env kubectl get pods", "kubectl"],
  ["git push --force", "git push --force"],
  ["git push --force origin main", "git push --force"],
  ["git push -f origin main", "git push --force"],
  ["git push -uf origin HEAD", "git push --force"],
  ["git push --force-with-lease", "git push --force"],
  ["git -C /tmp/repo push --force", "git push --force"],
  ["git push origin +main", "git push --force"],
  ["rm -rf /tmp/foo", "rm -rf"],
  ["rm -fr var", "rm -rf"],
  ["rm -r -f tmp", "rm -rf"],
  ["rm --recursive --force tmp", "rm -rf"],
  ["sudo rm -rf /tmp/foo", "rm -rf"],
  ["echo ok && kubectl get ns", "kubectl"],
  ["pnpm health && pnpm deploy:k3s:prod", "deploy:k3s"],
  ["bash -c \"kubectl get pods\"", "kubectl"],
  ["bash -c 'rm -rf /tmp/foo'", "rm -rf"],
  ["bash -c 'pnpm deploy:k3s:prod'", "deploy:k3s"],
  ["echo ok\nkubectl get pods", "kubectl"],
  ["echo ok\r\nkubectl get pods", "kubectl"],
  ["echo \"$(kubectl get pods)\"", "kubectl"],
  ["(kubectl get pods)", "kubectl"],
  ["`kubectl get pods`", "kubectl"],
  ["echo \"`kubectl get pods`\"", "kubectl"],
  ["$(kubectl get pods)", "kubectl"],
  ["echo ok && (kubectl get pods)", "kubectl"],
  ["{ kubectl get pods; }", "kubectl"],
  ["<(kubectl get pods)", "kubectl"],
  ["echo ${var:-$(kubectl get pods)}", "kubectl"],
  ["k3s kubectl get pods", "kubectl"],
  ["bash deploy/k8s/apply.sh", "deploy script"],
  ["sh deploy/k8s/apply.sh", "deploy script"],
  ["./deploy/k8s/apply.sh", "deploy script"],
  ["source deploy/k8s/apply.sh", "deploy script"],
  [". deploy/k8s/apply.sh", "deploy script"],
  ["source deploy/scripts/k3s-lib.sh", "deploy script"],
  ["node deploy/ghcr/publish.mjs stage", "deploy script"],
  ["node deploy/ghcr/publish.mjs promote", "deploy script"],
  ["python3 deploy/k8s/apply.sh", "deploy script"],
  ["perl deploy/scripts/k3s-deploy-dev.sh", "deploy script"],
  ["php -f deploy/k8s/apply.sh", "deploy script"],
  ["bash deploy/aws/host/install-witnessops-deploy-v1.sh --apply", "deploy script"],
  ["bash deploy/aws/host/install-witnessops-deploy-v1.sh --check", "deploy script"],
  ["aws ssm send-command --instance-ids i-example --document-name deploy", "aws deploy"],
  ["gh workflow run aws-release.yml", "workflow dispatch"],
  ["gh workflow run .github/workflows/aws-release-reusable.yml", "workflow dispatch"],
  ["gh workflow run \"WitnessOps AWS release control\"", "workflow dispatch"],
  ["pnpm exec bash deploy/k8s/apply.sh", "deploy script"],
  ["$(kubectl", "unparsed shell syntax"],
  ["echo \"$(kubectl\"", "unparsed shell syntax"],
  ["`kubectl", "unparsed shell syntax"],
  ["echo 'unterminated", "unparsed shell syntax"],
  ["cat <<EOF\nkubectl get pods\nEOF", "unparsed shell syntax"],
  ["echo $'kubectl'", "unparsed shell syntax"],
];

test("allows health, tests, ordinary git push, and non-recursive rm", () => {
  for (const command of allowed) {
    const result = evaluateCommand(command);
    assert.equal(result.permission, "allow", command);
    assert.deepEqual(result.reasons, [], command);
  }
});

test("blocks deploy, kubectl, force-push, and rm -rf", () => {
  for (const [command, reason] of blocked) {
    const result = evaluateCommand(command);
    assert.equal(result.permission, "deny", command);
    assert.ok(result.reasons.includes(reason), `${command} => ${result.reasons.join(",")}`);
  }
});

test("cli prints schema-shaped JSON and appends a gitignored log line", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-hook-"));
  const logFile = path.join(directory, "agent-shell.log");
  const cases = [
    { input: { command: "pnpm health", cwd: "/workspace", sandbox: false }, permission: "allow" },
    { input: { command: "kubectl get pods", cwd: "/workspace", sandbox: false }, permission: "deny" },
    { input: { command: "git push --force", cwd: "/workspace", sandbox: true }, permission: "deny" },
    { input: { command: "rm -rf tmp", cwd: "/workspace", sandbox: false }, permission: "deny" },
    { input: { command: "pnpm deploy:k3s:dev", cwd: "/workspace", sandbox: false }, permission: "deny" },
  ];

  for (const item of cases) {
    const child = spawnSync(process.execPath, [scriptPath], {
      input: JSON.stringify(item.input),
      encoding: "utf8",
      env: { ...process.env, WITNESSOPS_CURSOR_SHELL_LOG: logFile },
    });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    assert.equal(output.permission, item.permission);
    if (item.permission === "deny") {
      assert.equal(typeof output.user_message, "string");
      assert.equal(typeof output.agent_message, "string");
      assert.equal(Object.hasOwn(output, "continue"), false);
    } else {
      assert.deepEqual(Object.keys(output), ["permission"]);
    }
  }

  const lines = fs.readFileSync(logFile, "utf8").trim().split("\n");
  assert.equal(lines.length, cases.length);
  const parsed = lines.map((line) => JSON.parse(line));
  assert.equal(parsed[0].permission, "allow");
  assert.equal(parsed[1].reasons.includes("kubectl"), true);
  assert.equal(parsed[3].command, "rm -rf tmp");
});

test("cursor quick-check propagates proof:test and the skill marks k3s deploy retired", () => {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const cursorScript = fs.readFileSync(path.join(root, ".cursor/skills/optimize-witnessops-web/scripts/quick-check.sh"), "utf8");
  const grokScript = fs.readFileSync(path.join(root, ".grok/skills/optimize-witnessops-web/scripts/quick-check.sh"), "utf8");
  const cursorSkill = fs.readFileSync(path.join(root, ".cursor/skills/optimize-witnessops-web/SKILL.md"), "utf8");
  const grokSkill = fs.readFileSync(path.join(root, ".grok/skills/optimize-witnessops-web/SKILL.md"), "utf8");

  assert.match(cursorScript, /"\$\{PNPM\[@\]\}" proof:test/);
  assert.doesNotMatch(cursorScript, /merkle\.test\.ts/);
  assert.match(grokScript, /merkle\.test\.ts/);
  assert.match(cursorSkill, /docs\/DEPLOYMENT_AUTHORITY\.md/);
  assert.match(cursorSkill, /retired-production-deploy\.mjs/);
  assert.doesNotMatch(cursorSkill, /Dual-lane build and deploy \(private k3s\) — current/);
  assert.match(grokSkill, /Dual-lane build and deploy \(private k3s\) — current/);
});

test("unparseable stdin is denied", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-hook-"));
  const logFile = path.join(directory, "agent-shell.log");
  const child = spawnSync(process.execPath, [scriptPath], {
    input: "{",
    encoding: "utf8",
    env: { ...process.env, WITNESSOPS_CURSOR_SHELL_LOG: logFile },
  });
  assert.equal(child.status, 0, child.stderr);
  const output = JSON.parse(child.stdout);
  assert.equal(output.permission, "deny");
  assert.match(output.agent_message, /unparseable hook input/);
});
