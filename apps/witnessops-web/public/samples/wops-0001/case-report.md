# WOPS-0001: desktop child-process completion investigation

## Record and scope
Real investigation · Third-party software · Not a customer engagement.
Local publication candidate; not a production verification result.
This report was newly authored from retained investigation records on 2026-09-26.
It is not an original capture or the missing signal-trace-reproduction-report.md.
WOPS-0001 is assigned here to the recovered process run (2026-09-26 15:58:15–16:02:58),
the separate untraced observation (16:06:01), and signal run (16:10:17–16:10:34),
all Europe/Warsaw. Scope: one workstation, TUXEDO OS 24.04.4 LTS,
ChatGPT desktop package 26.924.22138. No investigation was rerun for this candidate.

## Observations — FACT_ARTIFACT
The selected signal-run child traces record exit_group(0) for Bash and Git.
A separate later snapshot records those children in state Z under the desktop parent.
These are distinct observations, not a single event (signal-excerpts.txt, child exit
and later-snapshot sections). The startup log separately records a 5016 ms shell
initialization timeout (signal-excerpts.txt, Startup timeout).
The earlier process-traced run also records successful child exits and later zombie
rows (process-observations.txt, P sections). A separate untraced observation records
zombie Bash/Git rows and TracerPid 0 in selected manifest entries (U sections).
TracerPid 0 is a captured observation, not independent verification of the whole run.
The parent signal trace records two distinct SIGCHLD handler addresses, then child-exit
signal delivery (signal-excerpts.txt, Handler changes and signal delivery).

## Candidate mechanism — INFERENCE
Replacement of the SIGCHLD handler may explain the missing subprocess completion.
The selected jump stub and target instructions support the investigator's candidate
no-op-handler interpretation (handler-excerpt.txt). The original memory map and full
binary are withheld, so the runtime-address-to-stub mapping cannot be fully checked
from these downloads. No controlled repair demonstrates causality. The registration
caller and responsible source component remain UNKNOWN.

## Environment — recorded metadata
See environment.json for the recorded OS, kernel, package version, executable build
ID and SHA-256. These identify the recorded executable; the executable is not included,
and this candidate does not independently establish package origin or binary identity.

## Status and reconstruction limits
The bounded symptom is recorded in traced and untraced observations on one workstation.
The local submission record is not vendor acknowledgement and is not included here.
Vendor acknowledgement, confirmed cause, fix status and wider impact remain UNKNOWN.
The full raw traces, process arguments, runtime memory map and unrelated application
logs are withheld. Readers can inspect selected observations and their file integrity,
but cannot reconstruct the complete investigation from this publication selection.
SHA256SUMS binds the selected content files; it does not hash itself. Hash matching
establishes byte consistency only, not source-system truth or independent verification.

## What this review does not say
- Not a customer engagement, security assessment, vulnerability finding or certification.
- Not independent verification, a production verification result or a vendor-confirmed cause.
- No claim about all Linux systems, other versions, other workstations or other customers.
- No proven source-level attribution, causal repair, available fix or vendor responsibility.
- No claim that every affected UI feature shares a proven cause.
- No complete public reconstruction: omitted private evidence remains unavailable to readers.

## Editorial changes and omissions
This source-derived report condenses two original narrative reports without treating
those narratives as fresh captures. Excerpts mark original line ranges and omitted
spans. Numeric process IDs become stable run-specific labels; runtime addresses, UID,
PATH values and disassembly symbol labels are explicitly redacted. ELF offsets and
instruction bytes remain. Separate source blocks are never presented as contiguous.
Unrelated activity, full logs, raw command arguments, settings, host/account identifiers
and the submission receipt are not part of the downloads. Private provenance retains
source digests, selections and transformations outside the website repository.
