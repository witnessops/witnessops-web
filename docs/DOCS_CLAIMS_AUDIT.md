# Docs claims audit — mistakes and unproven claims

> **Historical audit — superseded 2026-08-24.** This report preserves the
> evidence and conclusions observed on 2026-07-30. It is not current product or
> verifier authority. In particular, current code maps `limited-pass` to
> `indeterminate`, and the canonical Public Exposure Review receipt is
> `witnessops.receipt.v0` with `witnessops.verification_context.v1`.

**Date:** 2026-07-30  
**Corpus:** `content/witnessops/docs/**/*.mdx` (~63 files)  
**Cross-check:** AGENTS.md verify boundaries, live `/verify`, `/review`, sample package, public docs host  
**Method:** Full-corpus pattern scan + close read of claim-bearing pages + live URL checks  
**Scope:** English public docs. PL stubs are labeled non-technical (separate IA audit).

---

## Executive summary

The corpus is **mostly well-bounded**: many pages include explicit “does not prove” sections, evidence-mapping pages deny certification, and verification docs distinguish receipt-first vs bundle-complete.

Remaining issues fall into three buckets:

1. **Mistakes** — naming/link drift vs live product, draft operator manual treated as public authority, external OffSec lane mixed into public command docs.  
2. **Unproven / over-strong “proves that…” claims** — language that reads as ground-truth or issuance guarantees without restating key, host, and mode conditions.  
3. **Mode collapse** — procedures for **bundle-complete / offline** verification written as if they were the default public path (they are not; public `/verify` is receipt-first v1 and maps `limited-pass` → UI `valid`).

**Broken internal MDX `/docs/...` links:** 0 found.

---

## Product boundaries used as the standard

From `AGENTS.md` and live `/verify`:

| Boundary | Implication for docs claims |
| --- | --- |
| Public verify is **receipt-only** | Docs must not imply public UI recomputes artifact bytes or accepts full bundles |
| `limited-pass` → displayed **`valid`** | Docs must keep saying receipt-scoped when UI says valid |
| No public claim of full operational truth | “Proves what ran” must mean “signed record of claimed run,” not host truth |
| Samples are fixtures | Sample artifacts ≠ customer production proof |
| No compliance certification | Mapping pages must not read as conformity |

---

## P0 — mistakes (wrong vs live product or false absolute)

### M1. Buyer path misnames the offer page

| | |
| --- | --- |
| **Where** | `getting-started/proof-run-buyer-path.mdx` §1 |
| **Claim** | “Read [Proof-Backed Security Workflow](/review) first.” Then: “primary public lane: one bounded GitHub, Codex, AI-agent, access, offsec, or remediation workflow…” |
| **Live** | `https://witnessops.com/review` title **Proof Pack Review**; H1 **“One bounded technical action. One scoped proof pack.”** Page contains “Proof-Backed” in body but **not** the label “Proof-Backed Security Workflow” as the primary product name; **“security workflow” / “Codex”** not clearly matching buyer-path wording. |
| **Why wrong** | Readers cannot reconcile docs label with the live offer page. Risks over-specific tool-path claims (Codex) that the live page may not assert. |
| **Fix** | Align title/link text to live H1/title; list only workflow classes the offer page actually states; drop or qualify Codex unless proven on `/review`. |

### M2. Public `man witnessops(7)` is `draft: true` but live-served as authority

| | |
| --- | --- |
| **Where** | `man/witnessops.mdx` frontmatter `draft: true`; still linked from Commands/Reference; live `https://docs.witnessops.com/man/witnessops` → **200** |
| **Claim** | “Use this page for **authoritative** command semantics…” |
| **Why wrong** | Draft + public 200 + “authoritative” is a product mistake. Operators may treat incomplete/draft fleet CLI docs as frozen public contract. |
| **Fix** | Either unpublish/noindex and drop from primary reference links, or undraft only after content matches a real public/fleet contract and drop “authoritative” for “operator reference (fleet).” |

### M3. Commands page mixes public buyer lane with private OffSec mesh entry points

| | |
| --- | --- |
| **Where** | `reference/commands.mdx` “Fleet and mesh operators” |
| **Claim** | Points to `hacktheworld.zip/mesh-docs/`, `wops hunt *`, OffSec-Lane scripts as operational entry surface. |
| **Why wrong** | On **public** docs host, this reads as if buyers/operators of the public product use those tools. They are a **separate OffSec/mesh lane**, not proven as part of the public proof-package product. External URL may also be inaccessible or unstable. |
| **Fix** | Move mesh/fleet block behind clear “Operator mesh (not public buyer path)” + link policy, or relocate to private mesh docs only. |

---

## P1 — unproven or over-strong claims (need conditions)

### C1. “Receipt v2 proves that WitnessOps **issued**…”

| | |
| --- | --- |
| **Where** | `evidence/receipt-spec.mdx` § “What Receipt v2 proves” |
| **Text** | “Receipt v2 **proves that WitnessOps issued** a specific governed statement and bound that statement into a continuity structure…” |
| **Problem** | Signature verification proves the statement matches a key the verifier trusts. It does **not** by itself prove (a) only WitnessOps can mint that shape, (b) keys were not stolen, (c) issuance path was honest. The same file’s “does not prove” list covers tools/host but not key compromise / false issuer framing. |
| **Safer** | “When verified against a trusted WitnessOps key, Receipt v2 proves the signed statement is intact and claims issuance under that key identity…” |

### C2. “Receipt guarantees prove **what ran** and **what was captured**”

| | |
| --- | --- |
| **Where** | `audiences/new-operator.mdx` |
| **Problem** | “What ran” is ground-truth language. Evidence proves **what the governed recorder signed as having run**, under host/toolchain assumptions stated elsewhere. |
| **Safer** | “prove what the system **recorded** as run and captured (not that host reality matches the record).” |

### C3. “Governed execution **proves that** the action passed through a controlled runtime path”

| | |
| --- | --- |
| **Where** | `security-systems/governed-execution.mdx` §6 |
| **Problem** | Only true if the runtime that emitted the receipt was the real controlled path (host integrity, policy correctness). Caveats exist in §7 but the headline “proves that” is stronger than the assumptions allow. |
| **Safer** | “proves a signed claim that emission followed the declared gate path **as recorded by that runtime**.” |

### C4. Independent / offline verification without key material first

| | |
| --- | --- |
| **Where** | `evidence/receipts.mdx`, `how-it-works/proof-model.mdx`, `how-it-works/index.mdx`, bundle pages (“another person can check independently”) |
| **Problem** | “Independent” is true only with authentic verification keys / trust anchors. Some pages list keys later; lead sentences do not. |
| **Safer** | Lead with “independent **given trusted keys/anchors**.” |

### C5. Bundle-complete verification described as operational default procedure

| | |
| --- | --- |
| **Where** | `how-it-works/verification.mdx` §3–5 (procedure steps 3–8); `quickstart/verify-first.mdx`; `evidence/receipt-spec.mdx` bundle-complete bullets |
| **Problem** | Public product path is **receipt-first v1** (`/verify`, `/api/verify`); adapter maps **`limited-pass` → UI `valid`**. Bundle-complete recompute is **not** what the public surface does. The page *does* separate modes in a table, then walks a single ordered procedure that blends modes—easy to misread as “this is how `/verify` works.” |
| **Live** | Verify page: receipt-first, no bundle upload; docs correctly say limited-pass→valid in one paragraph, but procedure still multi-mode. |
| **Safer** | Split procedures: **Public `/verify` only** vs **Offline bundle-complete (requires offline tooling + full package)**. Label bundle-complete “when you have an offline verifier and artifact bytes,” not as the default how-to. |

### C6. Timestamp layer “existed before the declared time”

| | |
| --- | --- |
| **Where** | `how-it-works/proof-model.mdx` table; `how-it-works/standards.mdx` RFC 3161 prose |
| **Problem** | Classic RFC 3161 claim is only as strong as **full** token + TSA chain verification. Receipt-first mode checks structural/timestamp **references**, not always full chain validation (`standards.mdx` admits this in a table cell—good—but proof-model table does not). |
| **Safer** | Proof-model table: “claims existence-before-time **if** the RFC 3161 token and chain verify (bundle-complete / offline).” |

### C7. “Authoritative” framing on public reference surfaces

| | |
| --- | --- |
| **Where** | `reference/index.mdx` description; `reference/proof-artifact-classes.mdx` “authoritative”; `man/witnessops.mdx` |
| **Problem** | “Authoritative” implies frozen public product law. For fleet/draft/operator content this overclaims. Naming tables can say “current vocabulary” without “authoritative.” |
| **Safer** | “Current public vocabulary” / “operator contract (fleet)” as applicable. |

### C8. Buyer path sample table implies full sample walkthrough proves more than fixtures

| | |
| --- | --- |
| **Where** | `proof-run-buyer-path.mdx` §2 artifact table |
| **Problem** | Largely accurate that sample is not live customer data; still easy to read `VERIFY_RESULT.json` / `MANIFEST.sha256` as general product capability rather than **this pinned sample**. AGENTS: sample is proof-surface not proof authority. |
| **Safer** | Prefix table: “For **this** pinned sample only.” |

---

## P2 — weaker issues / wording hygiene

| ID | Where | Issue |
| --- | --- | --- |
| W1 | Multiple “guarantees” under “breaks guarantees” | Mostly **negative** use (OK). Prefer “assurance / contract claims” to avoid guarantee language entirely. |
| W2 | `integrations/witnessops-catalog.mdx` “production-ready capability definitions” | Used as **negative** (“not production-ready if incomplete”)—OK; avoid implying complete entries are production-certified. |
| W3 | Evidence-mapping NIST/DORA/EU AI | Generally **well caveated**. Keep “mapping aid not certification” above every control table (already present on most). |
| W4 | `mesh-federation-and-vmesh.mdx` “bastion … authoritative for hunt gates” | Acceptable **if** operator-only; ensure page stays out of buyer primary path (already hub-only). |
| W5 | Security-education pages with “compliance channels” | Incident process language, not product certification—OK in context. |
| W6 | Public docs still list **draft** man page in Commands quick links | Consistency with M2. |

---

## Claims that look strong but are **OK** (with caveats already present)

These were reviewed and **not** filed as findings when the surrounding “does not prove” text is adjacent and mode-clear:

- Evidence-mapping “what this mapping cannot assert” sections (DORA, EU AI Act, NIST).  
- FAQ scope limits (not a scanner; receipt ≠ exploitability).  
- Public `/verify` boundary paragraphs on verification + verify-first (receipt-scoped valid).  
- Catalog “does not replace runtime facts.”  
- Explicit trust-assumption lists on proof-model / governed-execution (if headline “proves that” is softened per C1–C3).

---

## Recommended fix order (copy lane)

| Priority | Action | Files |
| --- | --- | --- |
| 1 | Fix buyer-path offer naming + tool-path list vs live `/review` | `getting-started/proof-run-buyer-path.mdx` |
| 2 | Split public vs offline verification procedures; lead with receipt-first | `how-it-works/verification.mdx`, `quickstart/verify-first.mdx` |
| 3 | Soften “proves that” / “what ran” / “WitnessOps issued” | `receipt-spec.mdx`, `receipts.mdx`, `governed-execution.mdx`, audience pages |
| 4 | Unpublish or reframe man page; quarantine mesh command block | `man/witnessops.mdx`, `reference/commands.mdx`, sidebar links |
| 5 | Timestamp table caveat; “authoritative” → “current vocabulary” | `proof-model.mdx`, `reference/*` |
| 6 | Sample table “this pinned sample only” | `proof-run-buyer-path.mdx` |

---

## Method notes

- Pattern scan hits (~50 “guarantee”, ~18 verify-overclaim) are **mostly** negation or mode labels; manual review filtered to affirmative risk.  
- Internal broken `/docs/...` links in MDX: **0**.  
- Live: `docs.witnessops.com/man/witnessops` **200**; `/review` H1/title mismatch with buyer-path label; `/verify` receipt-first confirmed.

---

## Out of scope here

- Fixing the copy (this document is audit-only).  
- Private mesh doc accuracy beyond “should not be public-buyer primary.”  
- Full legal review of education pages.

---

## Second sweep (2026-07-30) — independent checks

Checks chosen by auditor (not a re-run of the first pattern pass only):

1. **Draft frontmatter vs public serving**  
2. **All external HTTPS links in MDX (HEAD/GET status)**  
3. **Live HTML vs MDX phrase presence** for buyer path, verification, receipt-spec, commands, man  
4. **`/review` keyword alignment** with buyer-path wording  
5. **Sitemap inclusion of man pages**  
6. **Catalog table misread risk** (definition vs “outside responsibility”)  
7. **Commercial language** in docs  

### Results

| Check | Result |
| --- | --- |
| Draft MDX files | **2**: `man/index.mdx`, `man/witnessops.mdx` |
| `listDocPages` filters `draft: true` | Yes — man not in dynamic slug list / **not in sitemap** (62 locs) |
| Man still public | **Yes** — dedicated route `apps/.../docs/man/witnessops/page.tsx` reads MDX **ignoring draft**, serves **200**, `robots: noindex` |
| External links in entire docs MDX | **Only 2** URLs |
| `https://hacktheworld.zip/mesh-docs/` | **HTTP 403** (dead/private for public crawlers) — cited from `reference/commands.mdx` (+ mesh guidance in `audiences/new-operator.mdx`) |
| `https://witnessops.com/support/support-policy` | **200** OK |
| Buyer path live still has “Proof-Backed Security Workflow” + “Codex” | **Yes** (mdx + live docs page) |
| Live `/review` | **No** “security workflow”, **No** “Codex”; H1 is proof-pack framing |
| Affirmative “proves that” lines (still live) | 5 files (receipt-spec, lab-mode, how-it-works index, catalog *outside* column, governed-execution) |
| Catalog “Proves that… met real-world objectives” | **Not a false claim** — it is under **“Outside catalog responsibility”** (negative). Leave as-is; optional reword to “Does not prove…” for skimmers. |
| Commercial/SLA €/$ claims in docs MDX | **None** found (buyer path points to `/pricing` only) |
| Absolute “impossible to compromise” product claims | **None**; education uses “impossible-travel” as a signal pattern (OK) |

### New / reinforced findings

| ID | Sev | Finding |
| --- | --- | --- |
| **M4** | **P0** | **Broken public external link:** `hacktheworld.zip/mesh-docs/` → **403**. Public Commands (and related mesh notes) send readers to an inaccessible URL. |
| **M5** | **P1** | **`draft: true` does not unpublish man pages.** Special App Router page bypasses draft filter; content still claims “authoritative” while draft + noindex. Inconsistent product contract. |
| **M1** | **P0** | **Reconfirmed:** buyer-path offer naming/tool list still disagrees with live `/review`. |
| **C1–C3** | **P1** | **Reconfirmed live:** “proves that WitnessOps issued / controlled path / what ran” still on public HTML. |

### Second-sweep fix order (additive)

1. Remove or replace **hacktheworld** link (or gate behind “private mesh operators only” without a dead URL).  
2. Honor `draft` on man route **or** undraft and drop “authoritative”; keep noindex if supplemental.  
3. Same copy fixes as first-pass M1 + prove-language soften (C1–C5).

### Second-sweep method note

This sweep intentionally prioritized **link liveness**, **draft/publish plumbing**, and **live product naming**, which the first pass under-weighted relative to prose overclaim patterns.

## Remediation status (P0 + P1 claims patch)

| ID | Status | Fix summary |
| --- | --- | --- |
| M1 | Fixed | Buyer path → Proof Pack Review; drop Codex / invented offer title |
| M2 | Fixed | Man draft; no “authoritative”; not primary reference |
| M3 | Fixed | Public Commands: mesh = internal only, no public hunt entry |
| M4 | Fixed | `hacktheworld.zip` removed from corpus |
| M5 | Fixed | Man route `notFound()` when `draft: true` |
| C1 | Fixed | Receipt v2: trusted-key + intact statement |
| C2 | Fixed | Audience “recorded as run” wording |
| C3 | Fixed | Governed execution: signed claim as recorded by runtime |
| C4 | Fixed | Independent = given trusted keys/anchors |
| C5 | Fixed | Verification procedures A (public) vs B (offline) |
| C6 | Fixed | Timestamp row: full RFC 3161 only |
| C7 | Fixed | Authoritative → current vocabulary / draft supplemental |
| C8 | Fixed | Sample table “pinned public sample only” |
