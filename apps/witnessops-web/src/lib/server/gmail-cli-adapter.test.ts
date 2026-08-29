import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { access, chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createGmailCliRunner,
  GMAIL_CLI_INLINE_CREDENTIALS_ENV,
  GmailCliError,
  normalizeInlineGmailCliCredentials,
} from "./gmail-cli-adapter";

const ORIGINAL_ENV = {
  inline: process.env[GMAIL_CLI_INLINE_CREDENTIALS_ENV],
  token: process.env.GOOGLE_WORKSPACE_CLI_TOKEN,
  credentialsFile: process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE,
  configDir: process.env.GOOGLE_WORKSPACE_CLI_CONFIG_DIR,
};

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore(GMAIL_CLI_INLINE_CREDENTIALS_ENV, ORIGINAL_ENV.inline);
  restore("GOOGLE_WORKSPACE_CLI_TOKEN", ORIGINAL_ENV.token);
  restore(
    "GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE",
    ORIGINAL_ENV.credentialsFile,
  );
  restore("GOOGLE_WORKSPACE_CLI_CONFIG_DIR", ORIGINAL_ENV.configDir);
});

test("normalizes the bounded authorized-user credential contract", () => {
  assert.equal(
    normalizeInlineGmailCliCredentials(
      JSON.stringify({
        refresh_token: "refresh-test",
        type: "authorized_user",
        client_secret: "secret-test",
        client_id: "client-test",
      }),
    ),
    JSON.stringify({
      refresh_token: "refresh-test",
      type: "authorized_user",
      client_secret: "secret-test",
      client_id: "client-test",
    }),
  );
  assert.equal(normalizeInlineGmailCliCredentials("  "), null);
});

test("rejects malformed and service-account credential configuration", () => {
  for (const value of [
    "not-json",
    JSON.stringify({ type: "service_account", private_key: "test" }),
    JSON.stringify({ type: "authorized_user", client_id: "missing-fields" }),
  ]) {
    assert.throws(
      () => normalizeInlineGmailCliCredentials(value),
      (error: unknown) =>
        error instanceof GmailCliError &&
        error.code === "GWS_INVALID_CREDENTIALS_CONFIG",
    );
  }
});

test("materializes inline credentials for one CLI call and removes the file", async (t) => {
  const probeDirectory = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-gws-probe-"),
  );
  t.after(() => rm(probeDirectory, { recursive: true, force: true }));
  const probe = path.join(probeDirectory, "credential-probe");
  await writeFile(
    probe,
    [
      "#!/usr/bin/env node",
      'const fs = require("node:fs");',
      "const credentialFile = process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE;",
      "const stat = fs.statSync(credentialFile);",
      "process.stdout.write(JSON.stringify({",
      "  credentialFile,",
      "  configDir: process.env.GOOGLE_WORKSPACE_CLI_CONFIG_DIR,",
      "  mode: stat.mode & 0o777,",
      '  credentials: JSON.parse(fs.readFileSync(credentialFile, "utf8")),',
      "}));",
    ].join("\n"),
    { mode: 0o700 },
  );
  await chmod(probe, 0o700);

  delete process.env.GOOGLE_WORKSPACE_CLI_TOKEN;
  delete process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE;
  delete process.env.GOOGLE_WORKSPACE_CLI_CONFIG_DIR;
  process.env[GMAIL_CLI_INLINE_CREDENTIALS_ENV] = JSON.stringify({
    type: "authorized_user",
    client_id: "client-test",
    client_secret: "secret-test",
    refresh_token: "refresh-test",
  });

  const observed = JSON.parse(
    await createGmailCliRunner({ binary: probe }).run([]),
  ) as {
    credentialFile: string;
    configDir: string;
    mode: number;
    credentials: Record<string, unknown>;
  };

  assert.equal(observed.mode, 0o600);
  assert.equal(observed.credentials.type, "authorized_user");
  assert.equal(path.dirname(observed.credentialFile), observed.configDir);
  await assert.rejects(access(observed.credentialFile));
});
