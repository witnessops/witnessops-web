# External Attack Surface Review

**Status:** Secondary catalogue offer under the stable `OFFSEC-EXTERNAL-EXPOSURE` SKU. Acceptance remains subject to scope, authority, and operator capacity.

**Public name as of 2026-09-02:** External Attack Surface Review.

**Former public name:** Public Exposure Review. The former name remains in dated history, immutable sample artifacts, and the existing `public_exposure_review` receipt profile where changing it would alter technical or verification semantics.

**Required descriptor:** A fixed-scope review of the attacker-visible surface of one authorised internet-facing system.

## Buyer one-page

### What can the internet see that you didn't mean to expose?

Find it before your customer, pentester, or incident does.

For one authorised internet-facing system, WitnessOps inspects the public-facing attack surface from the outside and shows you exposed hosts, services, endpoints, and attacker-visible configuration worth reviewing.

**This is not a penetration test.**

Buy it when an enterprise security request, launch, infrastructure change, investor or board review, customer review, or upcoming penetration test creates a real decision deadline. If the receiving party requires exploitation, authenticated testing, an accredited penetration test, certification, or formal attestation, this is not the right service.

### Fixed scope

- One authorised internet-facing system, seeded by a domain, hostname, application, API, public IP address, public cloud endpoint, or a coherent combination of those identifiers.
- Up to 1 registrable root domain.
- Up to 10 confirmed first-party hostnames.
- Up to 3 customer-attributed public IP addresses.
- Up to 20 public service endpoints. An endpoint is one confirmed hostname or IP plus protocol and port.
- It uses passive discovery where applicable, followed by explicitly approved, low-impact checks against the signed target schedule.
- Approved low-impact classes remain DNS, TLS, HTTP(S), service-identification, and allowlisted exposure checks.
- Unauthenticated, outside-in review only.
- Manual validation, deduplication, prioritisation, and remediation guidance.

The signed target schedule controls the actual scope. The caps are maximums, not permission to test every discovered asset. Related assets outside the accepted boundary may be recorded but are not tested without explicit written authority. Public cloud-hosted services may be included only when they are internet-reachable and belong to the agreed system; cloud accounts, IAM, private networks, and provider infrastructure remain outside scope.

### What the buyer receives

- authority, scope, approved-check, exclusion, and stop-condition record;
- external attack-surface map for the confirmed scope;
- internet-facing hosts, services, and endpoints you did not expect to be public;
- evidence-backed findings covering attacker-visible configuration and externally observable misconfiguration;
- practical remediation priorities and explicit unknowns;
- buyer-readable executive report and technical appendix;
- evidence manifest and artifact hashes;
- signed receipt and offline verifier where the supported path is produced;
- one 45-minute handover and one focused retest of reported findings within 30 days.

Package-integrity checks support only the files and claims they name. They do not prove the system is secure.

### Explicitly not included

No exploitation, authenticated application testing, password testing, brute force, credential or secret collection, social engineering, denial of service, destructive activity, persistence, malware, customer-data collection, data exfiltration, source-code review, mobile testing, smart-contract review, cloud-account or IAM review, private-network testing, provider-infrastructure review, open-ended estate discovery, compliance certification, attestation, or security guarantee.

This is not a penetration test and does not guarantee security, completeness, compliance, third-party acceptance, or absence of vulnerabilities.

### Commercial line

- **Fixed fee:** €1,900 · excluding VAT for the named package boundary.
- **Ordering:** no sales call is required. The request begins asynchronous scope acceptance; it does not authorise testing.
- **Payment:** payment of €1,900 in full is due before the delivery clock starts. Payment alone does not authorise testing.
- **Availability:** subject to written scope acceptance and confirmed operator capacity.
- **Delivery:** within three working days after payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are all confirmed.
- **Retest:** one focused retest within 30 days is included; an additional or late retest is €550 · excluding VAT.

Customer-caused approval, attribution, scheduling, outage, or scope-change delays pause the delivery clock.

### Start without sending secrets

Send a non-secret request describing the decision, deadline, intended receiving party, high-level system boundary, and authority status. Do not send credentials, logs, screenshots, source exports, customer records, private inventories, or production evidence before handling and scope are agreed.

Use: <https://witnessops.com/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE>

## Continuity

The route `/catalog/offsec-external-exposure`, Polish equivalent, stable SKU, request handling, scope, caps, approved checks, authority rules, payment rules, delivery gates, retest terms, exclusions, evidence claims, capacity gate, and no-guarantee language are unchanged.

The synthetic sample route remains `/review/sample-cases/external-exposure-assessment`. Its current introduction uses External Attack Surface Review; preserved sample files retain the former Public Exposure Review title because they are immutable historical artifacts with a manifest.

---

## Operator validation boundary — do not include in buyer copy

- **Known:** the public contract fixes the current public name, stable SKU, €1,900 excluding VAT price, full-payment gate, boundary, caps, exclusions, start conditions, handover, and included retest.
- **Owner-authorised commitment:** delivery within three working days when all start conditions are complete, operator capacity is confirmed, and the caps hold. A written fee waiver may substitute for payment only for an invitation-only design-partner engagement. This is a forward-looking service commitment, not past-performance evidence.
- **Unknown:** actual delivery hours, buyer willingness to pay, close rate, margin, and which trigger produces the strongest qualified demand.
- **Required evidence:** aggregate enquiry, scope-fit, conversion, delivery-time, and objection data. Do not convert assumptions into public claims.
