import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { sendVerificationEmail } from "./send-verification-email";

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
      toRecipients: Array<{ emailAddress: { address: string } }>;
    };
    saveToSentItems: boolean;
  };

  assert.equal(sendBody.message.subject, "Verify your WitnessOps access");
  assert.equal(sendBody.message.body.contentType, "Text");
  assert.equal(sendBody.message.body.content, "Token: abc123");
  assert.deepEqual(sendBody.message.toRecipients, [
    { emailAddress: { address: "operator@example.com" } },
  ]);
  assert.equal(sendBody.saveToSentItems, true);
});

test("sendVerificationEmail sends via Microsoft 365 Graph with certificate auth", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-m365-cert-"));
  const keyPath = path.join(tempDir, "sender.key.pem");
  const certPath = path.join(tempDir, "sender.cert.pem");

  await writeFile(
    keyPath,
    `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDwsyAWydLOnJih
rMasz9XEUKZ/hYixaVlogTzWs0NRqCdmPd0RltDGjOvBTGuGSFP4E8P2iw8FNF62
DibsTFNOvnn3cX50xy06L1zMqhBseEXz33Y4hc3XvAkK+/gLekOyhfxGqrKHRs//
TD6xPKIAQlXq2hbesvgRxRU1hTRx8i2D7kTuOdm+NA4FZRTXe4fau/DQgYLoP2ut
+tkIsaOdIFlBVy8SDWorxTYZ4HSWmtDblI4LzqCsAxQ2qAavWIFXVcEvaU4YaVPc
w9LKWRhZnfdOFAXcKDhEYxhOXS1z6KW/TeNl8NJoCauUykwQp7YPNwJwD97vEGQZ
2kAZQ8/1AgMBAAECggEAN9LbZN2fAiModQqss0Sqh9LKorW2G6tavJWIpiTCPqx4
ospDPMKVHg9t2BFguK6KpvTylHnw3FymgKOsnE4hXhhoEh7k3LGbCC0W4TKqB3Yn
hyVy9i32LQwjrsP8ZbEQBVX0yfDp4dzm/YdR3Oo6ikPYSFUXS8QHK5vhTN3daXV1
ue7nsK876DgBDXtrwaUU/YAAtXfEv5L+Ez39nO6bMZw5O4Pm3qZbUdVrIV8F0qBO
3mgpNfUtl3+kOmBxBQOJl0l9UuH1Fpqstrlb2gSJaMhjgllmng3RlgBhLxscLi/t
h959T2rh7WWp2TYxD8jxKxFnXymg/W1b9x09FNSrawKBgQD6rG8uvPTZM2Li+z3v
Fn6xTeH0D/B8C6/6jIQqsRH1luhKjlXcb/DUceO+qVU2lp4mGEN02H+bRcvT5/D9
xambgSCEbyZVdyAPNwTHkAIQVLOxVOUnTZM1538ailRxRnM1fFfX3QdLFIkN/F1k
etZjUedFzSldEmAD8kO5DyQ1jwKBgQD10G/ozMvCOadeVY7V1ZbE8JgHJy5Id2QN
fne4Izj4m723CZ/scq3Ng6KLAYO3+vuFlmwUEeC8CcEN1Gi+U2uihywj8aXhVekv
ELZ4PFRLreAr1oW8ZptqXoqwOO8e+LshOO5T/lYDyenG68VIKVNblOvre6pZ5Lvf
XiEn+FEIOwKBgQC/hHThuZ48QAViM+Aqxf3/yuhCRtdOfsNx4l+sGmMFRsmtBLhW
1fOi7Gy7I7amIUctBcasBCjiYd4LxZ6a1KTz2SEV7bHVBFGrLjbpnX3mKkCr0JfP
gnZhbb/vcBZ6AQBOsfSPSSCkXUklNVXJSgx4D4BqFQhwQnS3LyZMwmPAwwKBgGt8
XkLssjhWn4HXZaLJR6kMD14pWsqjMiPYZh8lf7bt2vIbikuJBci0w7GG0wLzA2Kx
mMbZ3mw606jpdXer4IfsFXgOJVu4BkPnSfKfZrjE6h4hKs9sCo9jkb9m1eC0IJdx
Xn1p3FDBzLCHzfc04tdL8jFBHQc7xo7wiQ0CPuSbAoGBALctr46vxMx2injEgrlm
GZ8E6Dka5GPMPzJWwgpFBT6JbHe35MiuCcqgM7ArDcGmhMVhRYcEWr+0LF4+lg9Q
ohHm1VDSo9/vyVXjehLjnBoRu8waS3PQJgkSwOm+5Ti8epfmlFHFMlQGBt9ArlfZ
s5qiqfNmOLkBpkpneG/f0pwY
-----END PRIVATE KEY-----
`,
    "utf8",
  );
  await writeFile(
    certPath,
    `-----BEGIN CERTIFICATE-----
MIIDGzCCAgOgAwIBAgIUfv1vc036xK1tsHbJIOzu8t3t6V8wDQYJKoZIhvcNAQEL
BQAwHTEbMBkGA1UEAwwSV2l0bmVzc09wc01haWxUZXN0MB4XDTI2MDMyODIyNDYw
NFoXDTI2MDMyOTIyNDYwNFowHTEbMBkGA1UEAwwSV2l0bmVzc09wc01haWxUZXN0
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8LMgFsnSzpyYoazGrM/V
xFCmf4WIsWlZaIE81rNDUagnZj3dEZbQxozrwUxrhkhT+BPD9osPBTRetg4m7ExT
Tr5593F+dMctOi9czKoQbHhF8992OIXN17wJCvv4C3pDsoX8Rqqyh0bP/0w+sTyi
AEJV6toW3rL4EcUVNYU0cfItg+5E7jnZvjQOBWUU13uH2rvw0IGC6D9rrfrZCLGj
nSBZQVcvEg1qK8U2GeB0lprQ25SOC86grAMUNqgGr1iBV1XBL2lOGGlT3MPSylkY
WZ33ThQF3Cg4RGMYTl0tc+ilv03jZfDSaAmrlMpMEKe2DzcCcA/e7xBkGdpAGUPP
9QIDAQABo1MwUTAdBgNVHQ4EFgQUFNvqDe627n6Rdrj+bKWnyXD9IpcwHwYDVR0j
BBgwFoAUFNvqDe627n6Rdrj+bKWnyXD9IpcwDwYDVR0TAQH/BAUwAwEB/zANBgkq
hkiG9w0BAQsFAAOCAQEAnKtvg82eqqPJIZh7pQxYMqg60/h3ti5fY99ONHk5s9CR
cOnursIW90FOtusXEwUvy6sQGEXuLRuhrzlcn9/X4O1BpYb0bUq28kV+dltuWU0w
NAyAU0t84Z+jY1CAYpJ0k3pdgkIHS7V+Od+VMDqdIp1w5EeKAuSQBv8VQLOuZnO6
SCUlszQFZ+CVjgs/7tz+a8uKm/rPSt+vO048VtQQTMni1jGrG0RuJFlpJt7DgE7g
Z2cPQ7ehSys8twu9x5g8DJYr6kwZh6tmjEQj3WuTuEuF66vugsHXVV7IGyWo8K+w
86KIhHF4/OM6SQRFQB6TdnuZWYiudODALMirJsHAHw==
-----END CERTIFICATE-----
`,
    "utf8",
  );

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
