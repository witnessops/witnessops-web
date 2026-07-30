# Verify surface map + polish (Phases 0–4)

**Date:** 2026-07-30  
**Goal:** One public job on `/verify` — check a receipt you were given — with all buyer pointers aligned, technical depth one click away.

## Product rule

> Upload or paste receipt JSON → clear result → optional technical detail.

Boundary line (buyer-visible):

> A valid result confirms the checks named in the receipt. It does not prove that every underlying action was correct.

## Surface map

| Surface | Role | Polish |
|---------|------|--------|
| `/verify`, `/pl/verify` | Public receipt console | Simplified UI; input first |
| `/api/verify` | Same checks, API | Unchanged |
| Footer EN/PL | Nav link | Keep Verify / Weryfikacja |
| Library EN/PL | Entry | “Verify a receipt” wording |
| Home, product cards | CTAs | “Verify a receipt” |
| Docs hub, quickstart, verification doc | Framing | Tool first, procedures below |
| Mesh / threat model / receipt-spec | Operator truth | Technical jargon OK |
| `/receipts` | Redirect → `/verify` | No change |
| `/verify-token`, `/verify-ui` | Other products | Out of buyer path |
| VaultMesh verify host | Other product | Out of lane |

## Phases

0. Deploy clean `main` dual-lane  
1. Align buyer/chrome pointers  
2. Docs framing (verify-first, verification)  
3. `/verify` UI polish (input first, spacing, mobile CTA)  
4. Commit, push, dual deploy, smoke  

END
