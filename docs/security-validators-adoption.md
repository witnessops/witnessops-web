# Security Validators Adoption Boundary

```yaml
repo: witnessops-web
repo_role: presentation
package_path: tools/witnessops-security-validators
adoption_status: structure_only_guardrail
live_testing_allowed: false
security_posture_claim_allowed: false
public_surface_changed: false
release_or_deploy_authorized: false
```

## Purpose

`tools/witnessops-security-validators/` is a promoted copy of the WitnessOps security validators package. In this repo it is a review-only guardrail for committed fixtures, schemas, and source-refresh records.

It is structure-only; no live testing; no security posture claim.

## Repo Boundary

This adoption does not change `/verify`, `/api/verify`, public proof-surface copy, receipt semantics, sample artifact contracts, release authority, deployment behavior, or customer-facing claims.

The package's schemas and fixtures are validator-local materials. They are not canonical web contracts, verifier-of-record output, runtime evidence, public proof bundles, customer evidence, or release gates by themselves.

## CI Boundary

`.github/workflows/security-validators.yml` runs the five validator scripts from the package path:

```bash
python3 scripts/validate-dfir-fixtures.py
python3 scripts/validate-api-authz-fixtures.py
python3 scripts/validate-sbom-supply-chain-fixtures.py
python3 scripts/validate-purple-detection-fixtures.py
python3 scripts/validate-source-refresh-records.py
```

Successful CI means only that the committed validator examples satisfied their structure-only checks. It does not prove production security posture, live endpoint behavior, dependency health, detection coverage, incident-response readiness, source verification, or publication approval.

## Forbidden In This Adoption

- No live API, cloud, identity, email, network, endpoint, or telemetry testing.
- No adversary emulation, dependency scanning, vulnerability scanning, or runtime proof generation.
- No production secrets, customer evidence, private evidence bundles, signing keys, or credentials.
- No claim that `witnessops-web` is secure, verified, production-ready, customer-ready, or covered by security proof because these validators run.
- No release, deploy, public proof-surface, or buyer-facing copy change without a separate lane.

## Future Gate

Any future move from structure-only examples into repo-native proof, verification, or public presentation must name the authority repo, evidence path, verifier, schema or fixture source, CI gate, and closure language before execution.
