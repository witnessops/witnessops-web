# Local Audit 1.2.2 browser proofpack

`/proofpack` opens three local files: the original ZIP, its detached signature,
and a separately obtained public trust registry. Verification runs in a worker.
No account, upload endpoint, storage, AI explanation or admin integration is used.
The existing `/verify`, `/api/verify` and receipt package remain separate.

## Report contract

The derived report uses the same authority, completeness, posture and findings
objects returned by semantic reconstruction. Its displayed scope is projected
from that checked authority. Original manifest-bound artifacts remain unchanged.
The user-selected registry admits a signer; its supplier is not authenticated by
the browser. Package checks do not establish host security or owner approval.

PDF export uses the browser print dialog. The print view includes findings,
collection gaps, scope, source digest, registry digest, reference verifier
version, template version and generation time. It is explicitly a derived
report outside the original package signature.

## Supported browser input

- Local Audit reference verifier `witnessops.local_server_audit.verifier.v1.2.2`.
- Safe integer JSON numeric tokens. Fractions, exponents, unsafe integers,
  duplicate keys, a leading BOM, lone surrogates and excessive nesting are rejected.
- ASCII archive member paths, with implicit directory collision checks.
  Text fields may contain valid Unicode.
- UTC timestamps with seconds and up to six fractional digits; comparisons
  retain microseconds. Invalid calendar dates and year zero are rejected.
- Stored/deflated ZIPs: 200 files, 25 MiB per expanded file, 100 MiB ZIP/total
  expanded bytes. Signature limit 1 MiB; registry limit 5 MiB; worker timeout 45s.
- Browser support for Ed25519 WebCrypto, workers and deflate-raw decompression.

This is a deliberately narrower input subset than every representation Python
can parse. Unsupported inputs fail without a successful buyer report; use the
matching CLI for those inputs. Browser and CLI diagnostics may use different
wording. Fixture parity is not universal compatibility certification.

## Checks (Node 22)

```sh
node --import tsx --test apps/witnessops-web/src/lib/proofpack/parity.test.ts
pnpm health
pnpm exec playwright test --config tests/proofpack/playwright.config.ts
PROOFPACK_BROWSER=webkit pnpm exec playwright test --config tests/proofpack/playwright.config.ts
```

Browser checks compare rendered coverage, findings, scope and gaps in Summary,
Evidence and print views, plus downloaded verification results and local-file
privacy. They use a built app on a temporary localhost server at port 3012.

`fixtures/provenance.json` pins the reference Python source hashes. All fixtures
are synthetic; only public test keys are retained. Regenerate with
`python scripts/proofpack/generate-fixtures.py PATH_TO_LOCAL_AUDIT_1_2_2`
in a Python environment containing the reference dependencies. No live host
collection is performed. The generator deletes its temporary signing key.

### Buyer report presentation

`proofpack-report/1.3` presents the same checked data in five chapters: result,
scope and coverage, all findings, proof boundary, and verification/provenance.
The Report tab previews the document; the browser print stylesheet produces A4
output. Long content flows onto additional pages. Chapter numbers are section
identifiers, not physical page counts. There is no AI summary or generated
remediation claim. Scope JSON is retained in full in the report appendix.

The opening summary selects up to three findings by recorded severity without
mutating the detailed findings. Its next action is explicitly suggested, never
an owner decision or remediation claim. The print footer repeats the host, a
16-character source digest prefix and a derived-report label. The full digest
remains in provenance. Page/total counters use CSS page margin boxes, validated
in Chromium; use Chrome for numbered PDFs. WebKit retains the readable report and its chapter labels. Repeating margin
footers and page counters are not promised there. Dynamic identity text is
CSS-escaped before being placed in the named print-page rule.

Print layout uses an explicit named A4 page: 14 mm top/side margins, 18 mm
bottom margin for the page identity and count, and 6 mm inner chapter padding
repeated across fragments. The cover uses the resulting 265 mm content height.
Chapter headers reuse the canonical WitnessOpsMark vector component in reversed
white or black; report generation does not fetch external logo assets.
