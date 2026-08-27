---
name: evidence-capture-and-chain
description: >
  Use when notes, artifacts, manifests, screenshots, or evidence paths need
  normalization or chain-of-evidence consistency. Prefer explicit paths and
  hashes over memory or chat history.
---

# Evidence capture and chain

A finding without a path is a rumour.

## Required inputs

- engagement or case slug
- current artifact paths
- note fragments or finding context

## Workflow

1. Place artifacts under the case directory, not in a scratch folder.
2. Normalize names. No spaces-as-truth, no "final-final-2".
3. Record a SHA-256 (or the declared hash) in the manifest.
4. Link each finding sentence to a path.
5. Flag gaps where evidence was generated but not captured.

## Guardrails

- Do not leave critical evidence only in terminal history.
- Do not invent hashes.
- Do not mix customer evidence with labelled samples.
- Preserve traceability between finding text and artifact path.

## Outputs

- normalized paths
- manifest entries
- notes that cite those paths
