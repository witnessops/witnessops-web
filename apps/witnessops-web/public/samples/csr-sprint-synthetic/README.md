# WitnessOps Customer Security Review — Synthetic Canonical Data V1

SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE

Pack ID: `WO-CSR-SYNTH-DATA-V1-CL-001`  
Scenario ID: `SYN-CSR-2026-CL-001`  
Schema version: `witnessops.customer_security_review.synthetic_pack.v1`  
Fixed scenario clock: `2026-07-01T09:00:00Z`

This package contains synthetic canonical answer data, a synthetic evidence inventory,
nine controlled evidence documents, a closed approval-state model, validation rules,
CSV exports, and an Excel answer matrix.

It does not contain real customer data, prospect data, credentials, live-system
observations, certification claims, public evidence intake, or production-system details.

## Included data

- `canonical/questionnaire.json`: 50 questionnaire records from one canonical dataset.
- `canonical/evidence_inventory.json`: structural `evidence_id` inventory.
- `canonical/approval_record.json`: fictional customer approval with preserved exceptions.
- `canonical/validation_rules.json`: fail-closed rules for this and future rendering lanes.
- `evidence/`: nine synthetic evidence documents.
- `exports/answer_matrix.xlsx`: spreadsheet generated from the canonical records.
- `exports/*.csv`: flat exports for reconstruction and comparison.
- `manifest.json`: relative paths, roles, flags, and SHA-256 hashes.
- `validation/validation_report.json`: executed checks and results.
- `receipts/authoring_receipt.json`: bounded authoring receipt.

No PDF is included in this data-only creation step.
