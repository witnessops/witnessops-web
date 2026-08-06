# External Exposure Assessment

**Synthetic worked example — not customer evidence.**

**Product ID:** `OFFSEC-EXTERNAL-EXPOSURE`
**Engagement:** `synthetic-external-exposure`
**Assessment period:** 2026-08-06 synthetic loopback rehearsal

## Executive summary

The loopback fixture returned two approved HTTP responses. Three synthetic observations demonstrate finding-to-evidence linkage; they are not statements about a real system.

### What was checked

- Passive fixture preparation for fixture.example.test
- DNS, HTTP, and connect-only service observation for T-01
- HTTP observation for T-02
- Allowlisted bounded-web wrapper against T-01

### What was not checked

- Any public target or external network
- Exploitation, credentials, brute force, customer data, authentication, OAST, fuzzing, destructive or denial-of-service methods

## Scope and authority summary

Reserved example authority covered only fixture.example.test for passive preparation and two exact loopback HTTP endpoints on explicit port 18765 for approved checks.

## External asset and exposure map

| Ref | Exact identity | Attribution | Observed exposure | Evidence |
| --- | --- | --- | --- | --- |
| A-01 | `http://127.0.0.1:18765/` | synthetic first-party fixture | HTTP endpoint reachable on explicit port 18765 | E-001, E-002 |
| A-02 | `http://127.0.0.1:18765/metadata` | synthetic first-party fixture | Synthetic metadata route returned an HTTP response | E-003 |

## Prioritized findings

### F-001 — Synthetic server identifier is exposed

- **Priority:** low
- **Affected target:** `http://127.0.0.1:18765/`
- **Observed condition:** The fixture returned the deliberate Server header synthetic-fixture/1.0.
- **Evidence:** E-001
- **Impact:** A real service identifier could aid fingerprinting; this fixture value is intentionally synthetic.
- **Remediation:** Minimize unnecessary server-identifying headers where operationally practical.
- **Retest:** Repeat the same header-only observation against T-01.

### F-002 — Synthetic transport policy header is absent

- **Priority:** medium
- **Affected target:** `http://127.0.0.1:18765/`
- **Observed condition:** The approved response did not contain Strict-Transport-Security.
- **Evidence:** E-001
- **Impact:** On a real HTTPS service this could reduce browser transport enforcement; the fixture intentionally uses HTTP.
- **Remediation:** For a real HTTPS service, evaluate HSTS after confirming subdomain and preload implications.
- **Retest:** Observe the same response headers only; do not reopen discovery.

### F-003 — Synthetic public metadata marker is exposed

- **Priority:** informational
- **Affected target:** `http://127.0.0.1:18765/metadata`
- **Observed condition:** The fixture returned the deliberate X-Synthetic-Exposure header.
- **Evidence:** E-003
- **Impact:** This is a demonstration marker and has no customer impact.
- **Remediation:** Remove demonstration-only public metadata in a real deployment.
- **Retest:** Repeat the same header-only observation against T-02.

## Technical appendix and evidence references

| Ref | Artifact | Purpose | SHA-256 |
| --- | --- | --- | --- |
| E-001 | `scans/external-exposure/initial/runbook-external-exposure-assessment-20260806-084609/T-01/http-headers.txt` | Supports F-001 and F-002 | `710a68b96583139f49c28b5b865dad0e670e88652cb94bddb14560e9dcf515bc` |
| E-002 | `scans/external-exposure/initial/runbook-external-exposure-assessment-20260806-084609/T-01/service-identification.txt` | Supports A-01 reachability | `716ced089869938e79bf6e4b276ffcfd50cb9c1bae8f7454156fb1eb05f6dec5` |
| E-003 | `scans/external-exposure/initial/runbook-external-exposure-assessment-20260806-084609/T-02/http-headers.txt` | Supports F-003 | `4d3d6cc26e1ccec0fa6ccdd3a353481ed5e014bce2ff90bcfbc5197f96979781` |

## Unknowns

- No inference is made about public DNS, TLS, authentication, application logic, or non-loopback infrastructure.

## Excluded, skipped, partial, or stopped work

- candidate.fixture.example.test remained unconfirmed and received no target-facing request.
- TLS was not scheduled because the fixture is plain HTTP.
- No public or customer target was used.

## Claim limitations

This is an external vulnerability assessment, not a penetration test. It does not certify, attest, or guarantee that the target is secure, compliant, complete, accepted by a third party, or free of vulnerabilities.

Package hashes and any successfully produced receipt/offline-verifier result establish only the named structural, signature, trust-set, and artifact-consistency checks. Package integrity is not proof of system security or assessment completeness.

## Recommended next step

Use the same authority and approval packet with an explicitly owned target in a separately authorized future task; do not infer authority from this synthetic run.
