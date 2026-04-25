import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { getTextSignature } from "./email-signatures";
import { sendVerificationEmail } from "./send-verification-email";

function generateThrowawayCertAndKeyPem(): { certPem: string; keyPem: string } {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const certBody = randomBytes(512).toString("base64").match(/.{1,64}/g)!.join("\n");
  const certPem = `-----BEGIN CERTIFICATE-----\n${certBody}\n-----END CERTIFICATE-----\n`;
  return { certPem, keyPem: privateKey as string };
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.WITNESSOPS_MAIL_PROVIDER;
  delete process.env.WITNESSOPS_TOKEN_FROM_EMAIL;
  delete process.env.WITNESSOPS_M365_TENANT_ID;
  delete process.env.WITNESSOPS_M365_CLIENT_ID;
  delete process.env.WITNESSOPS_M365_CLIENT_SECRET;
  delete process.env.WITNESSOPS_M365_CERT_PATH;
  delete process.env.WITNESSOPS_M365_KEY_PATH;
  delete process.env.WITNESSOPS_M365_SENDER_USER_ID;
});

test("sendVerificationEmail sends via Microsoft 365 Graph with app-only auth", async () => {
  process.env.WITNESSOPS_MAIL_PROVIDER = "m365";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@newdomain.example";
  process.env.WITNESSOPS_M365_TENANT_ID = "tenant-123";
  process.env.WITNESSOPS_M365_CLIENT_ID = "client-123";
  process.env.WITNESSOPS_M365_CLIENT_SECRET = "secret-123";
  process.env.WITNESSOPS_M365_SENDER_USER_ID = "engage@newdomain.example";

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });

    if (calls.length === 1) {
      return new Response(JSON.stringify({ access_token: "graph-access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (calls.length === 2) {
      return new Response(null, {
        status: 202,
        headers: { "request-id": "req-123" },
      });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;

  const result = await sendVerificationEmail({
    to: "operator@example.com",
    subject: "Verify your WitnessOps access",
    text: "Token: abc123",
    messageClass: "transactional",
  });

  assert.equal(result.provider, "m365");
  assert.equal(result.providerMessageId, "req-123");
  assert.equal(calls.length, 2);

  const [tokenCall, sendCall] = calls;
  assert.match(
    tokenCall.url,
    /https:\/\/login\.microsoftonline\.com\/tenant-123\/oauth2\/v2\.0\/token$/,
  );
  assert.equal(tokenCall.init?.method, "POST");
  assert.match(String(tokenCall.init?.body), /client_credentials/);
  assert.match(String(tokenCall.init?.body), /scope=https%3A%2F%2Fgraph\.microsoft\.com%2F\.default/);

  assert.equal(
    sendCall.url,
    "https://graph.microsoft.com/v1.0/users/engage%40newdomain.example/sendMail",
  );
  assert.equal(sendCall.init?.method, "POST");

  const sendHeaders = new Headers(sendCall.init?.headers);
  assert.equal(sendHeaders.get("authorization"), "Bearer graph-access-token");
  assert.equal(sendHeaders.get("content-type"), "application/json");

  const sendBody = JSON.parse(String(sendCall.init?.body)) as {
    message: {
      subject: string;
      body: { contentType: string; content: string };
      internetMessageHeaders: Array<{ name: string; value: string }>;
      toRecipients: Array<{ emailAddress: { address: string } }>;
    };
    saveToSentItems: boolean;
  };

  assert.equal(sendBody.message.subject, "Verify your WitnessOps access");
  assert.equal(sendBody.message.body.contentType, "Text");
  assert.equal(
    sendBody.message.body.content,
    `Token: abc123\n\n${getTextSignature("ops_minimal")}`,
  );
  assert.deepEqual(sendBody.message.internetMessageHeaders, [
    {
      name: "X-WitnessOps-Message-Class",
      value: "transactional",
    },
    {
      name: "X-WitnessOps-Signature-Profile",
      value: "ops_minimal",
    },
  ]);
  assert.deepEqual(sendBody.message.toRecipients, [
    { emailAddress: { address: "operator@example.com" } },
  ]);
  assert.equal(sendBody.saveToSentItems, true);
});

test("sendVerificationEmail sends via Microsoft 365 Graph with certificate auth", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-m365-cert-"));
  const keyPath = path.join(tempDir, "sender.key.pem");
  const certPath = path.join(tempDir, "sender.cert.pem");

  const { certPem, keyPem } = generateThrowawayCertAndKeyPem();
  await writeFile(keyPath, keyPem, "utf8");
  await writeFile(certPath, certPem, "utf8");

  process.env.WITNESSOPS_MAIL_PROVIDER = "m365";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@newdomain.example";
  process.env.WITNESSOPS_M365_TENANT_ID = "tenant-123";
  process.env.WITNESSOPS_M365_CLIENT_ID = "client-123";
  process.env.WITNESSOPS_M365_CERT_PATH = certPath;
  process.env.WITNESSOPS_M365_KEY_PATH = keyPath;
  process.env.WITNESSOPS_M365_SENDER_USER_ID = "engage@newdomain.example";

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });

    if (calls.length === 1) {
      return new Response(JSON.stringify({ access_token: "graph-cert-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (calls.length === 2) {
      return new Response(null, {
        status: 202,
        headers: { "request-id": "req-cert-123" },
      });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;

  const result = await sendVerificationEmail({
    to: "operator@example.com",
    subject: "Verify your WitnessOps access",
    text: "Token: xyz789",
  });

  assert.equal(result.provider, "m365");
  assert.equal(result.providerMessageId, "req-cert-123");
  assert.equal(calls.length, 2);

  const [tokenCall, sendCall] = calls;
  assert.equal(tokenCall.init?.method, "POST");
  const tokenForm = new URLSearchParams(String(tokenCall.init?.body));
  assert.equal(tokenForm.get("client_id"), "client-123");
  assert.equal(tokenForm.get("grant_type"), "client_credentials");
  assert.equal(
    tokenForm.get("client_assertion_type"),
    "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
  );
  assert.equal(tokenForm.get("client_secret"), null);

  const assertion = tokenForm.get("client_assertion");
  assert.ok(assertion);
  const [headerSegment, payloadSegment] = assertion!.split(".");
  const header = JSON.parse(Buffer.from(headerSegment, "base64url").toString("utf8")) as {
    alg: string;
    typ: string;
    x5t: string;
  };
  const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8")) as {
    aud: string;
    iss: string;
    sub: string;
  };
  assert.equal(header.alg, "RS256");
  assert.equal(header.typ, "JWT");
  assert.ok(header.x5t);
  assert.equal(
    payload.aud,
    "https://login.microsoftonline.com/tenant-123/oauth2/v2.0/token",
  );
  assert.equal(payload.iss, "client-123");
  assert.equal(payload.sub, "client-123");

  assert.equal(
    sendCall.url,
    "https://graph.microsoft.com/v1.0/users/engage%40newdomain.example/sendMail",
  );
});
