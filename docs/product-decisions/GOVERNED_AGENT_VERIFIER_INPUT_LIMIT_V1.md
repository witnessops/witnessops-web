# Governed agent verifier input limit v1

- **ID:** 2026-08-28-governed-agent-verifier-16-kib
- **Status:** DECIDED
- **Date and owner:** 2026-08-28 · WitnessOps founder
- **Scope:** Public `governed-agent-verifier` skill contract and Check a Skill browser runtime

## Decision

Standardise the maximum accepted UTF-8 input at 16 KiB (16,384 bytes), publish
the corrected public contract as v1.0.1, preserve the exact v1.0.0 bytes and
their 128 KiB declaration, and fail the build when the public contract and
runtime boundary disagree.

## Context

The exact published v1.0.0 skill declared a 128 KiB input limit while the
repository runtime source used as this decision's baseline enforced 16 KiB.
The public declaration and implementation source therefore described different
acceptance boundaries.

## Evidence and uncertainties

- **FACT:** v1.0.0 SHA-256 is
  `2a0b2309a1785081ecc20c7e325b3d23454b2bfd65d9641ea82164bf9298aad5`
  and its workflow says `Bound input to 128 KiB`.
- **FACT:** repository source commit
  `f87bc43abd4f434d4090db44e423a772f923f1cd` enforces
  `16 * 1024` UTF-8 bytes in `run-scan.ts`.
- **FACT:** `docs/PR321_RECONCILIATION_2026-08-27.md` records the 16 KiB cap as
  the accepted response to synchronous main-thread scan risk.
- **INFERENCE:** retaining the already-enforced 16 KiB boundary is lower-risk
  than expanding accepted input to match stale copy.
- **UNKNOWN:** a byte cap alone does not establish worst-case scan duration for
  every accepted content pattern or device.

## Options considered

1. Retain 16 KiB and version the public contract.
2. Raise the runtime limit to 128 KiB.
3. Silently edit v1.0.0 in place.
4. Leave the mismatch unresolved.

## Rationale and trade-off

Option 1 preserves the existing runtime boundary and makes the correction
reconstructable. The trade-off is that skills above 16 KiB remain unsupported
and v1.0.1 must expose the prior mismatch rather than presenting an unbroken
history.

## Reversibility

The byte boundary can be changed in a future version after measured browser and
device evidence. Reversal requires a new version and receipt; v1.0.0 and v1.0.1
bytes must remain immutable.

## Next action and completion evidence

Codex implements v1.0.1 and the conformance gate. Completion requires passing
contract tests, an independently runnable specimen verifier, merged-main image
publication, protected production deployment, and a live boundary observation.

## Revisit trigger

Revisit when representative customer skills exceed 16 KiB or browser/device
measurements justify a different boundary.

- **Supersedes:** none
- **Superseded by:** none
