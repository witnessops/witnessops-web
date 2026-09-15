import type { ExternalCheckResultV1 } from "./model";

type Fact = { label: string; value: string };
type Field = readonly [label: string, path: string];

// Read-only UI projection of known source fields. Missing fields are omitted;
// recorded null/empty values remain explicit. The full source stays available.
const FIELDS: Record<ExternalCheckResultV1["check_id"], readonly Field[]> = {
  "dns.public_target.v1": [["IPv4 addresses", "a"], ["IPv6 addresses", "aaaa"]],
  "tls.certificate.v1": [["Certificate expires", "validTo"], ["Hostname matched", "hostnameMatch"], ["TLS protocol", "protocol"], ["Validation error", "authorizationError"]],
  "tls.legacy_protocols.v1": [],
  "web.https_redirect.v1": [],
  "web.hsts.v1": [["HSTS header", "hsts"], ["Response URL", "url"], ["HTTP status", "statusCode"]],
  "web.security_headers.v1": [["Content type protection", "nosniff"], ["Framing header", "frameOptions"], ["Referrer policy", "referrerPolicy"], ["Content Security Policy", "csp"]],
  "web.security_txt.v1": [["HTTP status", "statusCode"], ["Published contacts", "contacts"], ["Well-known path status", "wellKnownStatus"], ["Legacy path status", "legacy.statusCode"], ["Legacy contacts", "legacy.contacts"]],
  "mail.spf.v1": [["Published SPF", "records"], ["Final all mechanism", "terminalAll"]],
  "mail.dmarc.v1": [["Published DMARC", "records"], ["Declared policy", "p"], ["Declared percentage", "pct"]],
  "dns.caa.v1": [["CAA records", "records"], ["Effective hostname", "effectiveName"], ["Names queried", "queriedNames"]],
};

function field(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" && Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined, source);
}

function valueText(value: unknown): string {
  if (value === null) return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(valueText).join("; ") : "None recorded";
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}: ${valueText(item)}`).join(" · ");
  return String(value);
}

export function observationFacts(check: ExternalCheckResultV1): Fact[] {
  const source = check.observation;
  const reason = field(source, "reason");
  if (reason !== undefined) return [{ label: "Recorded collection result", value: valueText(reason) }];
  if (check.check_id === "tls.legacy_protocols.v1" && Array.isArray(source)) {
    return source.flatMap(item => typeof item?.protocol === "string" && typeof item?.outcome === "string"
      ? [{ label: item.protocol, value: ({ peer_rejected: "Peer rejected the protocol", negotiated: "Connection negotiated", undetermined: "Undetermined" } as Record<string, string>)[item.outcome] ?? item.outcome }]
      : []);
  }
  if (check.check_id === "web.https_redirect.v1") {
    const chain = field(source, "chain");
    const facts = Array.isArray(chain) ? chain.flatMap((step, index) => typeof step?.url === "string" && typeof step?.status === "number"
      ? [{ label: `Response ${index + 1}`, value: `${step.status} · ${step.url}` }] : []) : [];
    const fallback = field(source, "directHttpsFallback");
    if (fallback) facts.push({ label: "Separate HTTPS response", value: valueText(fallback) });
    return facts;
  }
  return FIELDS[check.check_id].flatMap(([label, path]) => {
    const value = field(source, path);
    return value === undefined ? [] : [{ label, value: valueText(value) }];
  });
}

export function observationSummary(check: ExternalCheckResultV1): string {
  const first = observationFacts(check)[0];
  if (!first) return "Open evidence for the recorded result.";
  const value = first.value.length > 150 ? `${first.value.slice(0, 150)}…` : first.value;
  return `${first.label}: ${value}`;
}

export function nextAction(check: ExternalCheckResultV1): string {
  if (check.recommendation) return check.recommendation;
  if (!check.collected || check.status === "CHECK_ERROR" || check.status === "UNDETERMINED") return "Review the collection limit below. Run again later to see whether a comparable observation can be recorded.";
  if (check.status === "NEEDS_ATTENTION") return "Review the recorded evidence with the person responsible for this hostname before deciding what to change.";
  return "Keep this observation as a baseline. Run again later, or after a relevant configuration change, to compare the recorded state.";
}
