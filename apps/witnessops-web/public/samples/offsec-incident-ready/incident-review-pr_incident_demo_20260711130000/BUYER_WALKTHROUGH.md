# Buyer walkthrough

Proof run: `pr_incident_demo_20260711130000`

1. Keep the proof pack, detached signature, and trust registry together.
2. Run the offline verifier using independently supplied receipt and customer-authority trust registries.
3. Inspect `receipt.json` for the named claim boundary and decision outcome.
4. Inspect `findings.json` and `evidence/review-completeness.json` for observation gaps.
5. Treat a valid/pass result only as package-integrity and bounded-contract evidence. It does not determine compromise, root cause, attribution, containment effectiveness, or remediation.
