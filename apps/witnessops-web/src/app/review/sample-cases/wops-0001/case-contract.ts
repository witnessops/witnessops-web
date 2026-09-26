export const evidenceClasses = ["FACT_ARTIFACT", "INFERENCE", "UNKNOWN"] as const;
export type EvidenceClass = (typeof evidenceClasses)[number];
export type EvidenceReference = { file: string; section: string; start: number; end: number };
export type CaseClaim = { id: string; title: string; cls: EvidenceClass; text: string; references: EvidenceReference[] };
export type CaseArtifact = { file: string; title: string; note: string; sha256: string; bytes: number };
export type CaseRecord = {
  id: string; route: string; artifactBase: string; title: string; boundary: string;
  status: string; claimBoundary: string; createdAt: string; captureDate: string; timezone: string;
  association: string; question: string; summary: string; result: string; scope: string;
  reconstructionLimit: string; integrityNote: string;
  runs: { label: string; time: string; kind: string }[];
  claims: CaseClaim[]; environment: { label: string; value: string }[];
  limits: string[]; artifacts: CaseArtifact[];
};

// Presentation contract for one selected investigation. No verifier or receipt authority.
export const wopsCase: CaseRecord = {
  "id": "WOPS-0001",
  "route": "/review/sample-cases/wops-0001",
  "artifactBase": "/samples/wops-0001",
  "title": "When child processes exit, but remain uncollected",
  "boundary": "Real investigation · Third-party software · Not a customer engagement.",
  "status": "Evidence selection approved · Publication pending.",
  "claimBoundary": "Not a production verification result.",
  "createdAt": "2026-09-26T15:51:55.042014+00:00",
  "captureDate": "2026-09-26",
  "timezone": "Europe/Warsaw",
  "association": "This case record assigns WOPS-0001 to the recovered process run, separate untraced observation and signal run captured on 26 September 2026. The case record was created later; it is not an original capture.",
  "question": "Why did local shell operations time out when their child processes had already exited?",
  "summary": "On one workstation, two traced runs recorded successful child exits and separate later zombie snapshots. A further untraced observation recorded the same child-state symptom. The handler replacement is a candidate mechanism, not a proven cause.",
  "result": "Observed in two traced runs",
  "scope": "One workstation · TUXEDO OS 24.04.4 LTS · ChatGPT desktop 26.924.22138",
  "reconstructionLimit": "Selected evidence, partial reconstruction. Full traces, command arguments, the executable, runtime memory map and unrelated logs are withheld. Readers can inspect these selected observations and their file integrity, but cannot reconstruct the complete investigation or fully check the handler-address mapping.",
  "integrityNote": "SHA-256 checks bind these candidate file bytes. They do not establish source-system truth, causality, independent verification or vendor acknowledgement.",
  "runs": [
    {
      "label": "Process-traced run",
      "time": "2026-09-26 15:58:15–16:02:58",
      "kind": "Traced"
    },
    {
      "label": "Separate untraced observation",
      "time": "2026-09-26 16:06:01",
      "kind": "Untraced observation"
    },
    {
      "label": "Signal-traced run",
      "time": "2026-09-26 16:10:17–16:10:34",
      "kind": "Traced"
    }
  ],
  "claims": [
    {
      "id": "exits",
      "title": "Successful exits",
      "cls": "FACT_ARTIFACT",
      "text": "The signal-run child traces record Bash and Git exiting with status 0. This observation alone does not establish that the parent collected them.",
      "references": [
        {
          "file": "signal-excerpts.txt",
          "section": "Bash child exit — separate child trace",
          "start": 21,
          "end": 24
        },
        {
          "file": "signal-excerpts.txt",
          "section": "Git child exit — separate child trace",
          "start": 25,
          "end": 28
        }
      ]
    },
    {
      "id": "snapshot",
      "title": "Later zombie snapshot",
      "cls": "FACT_ARTIFACT",
      "text": "A separate 16-second snapshot records those Bash and Git children in state Z under the desktop parent. It is a later observation, not the exit event.",
      "references": [
        {
          "file": "signal-excerpts.txt",
          "section": "Later 16-second snapshot — separate snapshot, not an exit event",
          "start": 29,
          "end": 38
        }
      ]
    },
    {
      "id": "timeout",
      "title": "Startup timeout",
      "cls": "FACT_ARTIFACT",
      "text": "A separate application-log entry records shell initialization timing out after 5016 ms in the signal run.",
      "references": [
        {
          "file": "signal-excerpts.txt",
          "section": "Startup timeout — separate application log",
          "start": 39,
          "end": 41
        }
      ]
    },
    {
      "id": "earlier-run",
      "title": "Earlier traced run",
      "cls": "FACT_ARTIFACT",
      "text": "The earlier process-traced run also records successful Bash and Git exits and, separately, zombie rows in a later snapshot.",
      "references": [
        {
          "file": "process-observations.txt",
          "section": "P: Bash exit — child trace",
          "start": 9,
          "end": 12
        },
        {
          "file": "process-observations.txt",
          "section": "P: Git exit — separate child trace",
          "start": 13,
          "end": 16
        },
        {
          "file": "process-observations.txt",
          "section": "P: later zombie snapshot — separate observation",
          "start": 17,
          "end": 23
        }
      ]
    },
    {
      "id": "untraced",
      "title": "Separate untraced observation",
      "cls": "FACT_ARTIFACT",
      "text": "A separate untraced snapshot records zombie Bash and Git children. Selected manifest entries record TracerPid 0 for those children. This is not independent verification of the run.",
      "references": [
        {
          "file": "process-observations.txt",
          "section": "U: separate untraced snapshot — not part of either traced run",
          "start": 24,
          "end": 30
        },
        {
          "file": "process-observations.txt",
          "section": "U: selected structured observation from the process-run manifest",
          "start": 31,
          "end": 52
        }
      ]
    },
    {
      "id": "handlers",
      "title": "Handler replacement recorded",
      "cls": "FACT_ARTIFACT",
      "text": "The parent signal trace records two distinct SIGCHLD handler addresses and subsequently records child-exit signal delivery. Addresses are redacted consistently in the excerpt.",
      "references": [
        {
          "file": "signal-excerpts.txt",
          "section": "Handler changes and signal delivery — desktop parent trace",
          "start": 8,
          "end": 20
        }
      ]
    },
    {
      "id": "mechanism",
      "title": "Candidate mechanism",
      "cls": "INFERENCE",
      "text": "The SIGCHLD-handler replacement may explain missing subprocess completion. Selected disassembly supports a candidate no-op-handler interpretation. The runtime-address mapping depends on a withheld memory map; causality and the registration caller remain unproven.",
      "references": [
        {
          "file": "handler-excerpt.txt",
          "section": "WOPS-0001 — selected disassembly",
          "start": 1,
          "end": 9
        },
        {
          "file": "handler-excerpt.txt",
          "section": "Candidate replacement stub — one selected instruction",
          "start": 10,
          "end": 13
        },
        {
          "file": "handler-excerpt.txt",
          "section": "Jump target — separate selected block",
          "start": 14,
          "end": 19
        },
        {
          "file": "case-report.md",
          "section": "Candidate mechanism — INFERENCE",
          "start": 26,
          "end": 33
        }
      ]
    },
    {
      "id": "environment",
      "title": "Recorded environment",
      "cls": "FACT_ARTIFACT",
      "text": "Recorded metadata identifies TUXEDO OS 24.04.4 LTS and ChatGPT desktop 26.924.22138, with an executable build ID and SHA-256. The executable is withheld; its identity is not independently checked here.",
      "references": [
        {
          "file": "environment.json",
          "section": "Recorded metadata (complete selected JSON)",
          "start": 1,
          "end": 18
        }
      ]
    },
    {
      "id": "upstream",
      "title": "Cause, fix and wider impact",
      "cls": "UNKNOWN",
      "text": "No vendor acknowledgement, vendor-confirmed cause, fix, security vulnerability or wider affected population is established by this selection. A local submission record is not vendor acknowledgement and is not included.",
      "references": [
        {
          "file": "case-report.md",
          "section": "Status and reconstruction limits",
          "start": 39,
          "end": 48
        }
      ]
    }
  ],
  "environment": [
    {
      "label": "Product / package",
      "value": "ChatGPT desktop / 26.924.22138"
    },
    {
      "label": "Operating system",
      "value": "TUXEDO OS 24.04.4 LTS"
    },
    {
      "label": "Kernel",
      "value": "Linux 7.0.0-111031-tuxedo"
    },
    {
      "label": "Recorded executable build ID",
      "value": "7595f84718f0064da6d192eca34747a41a8f4e7a"
    },
    {
      "label": "Recorded executable SHA-256",
      "value": "23b753552181a8ea661681256c2dbf993fea1285fbc5c824478bad9cbdd45c91"
    }
  ],
  "limits": [
    "Not a customer engagement, security assessment, vulnerability finding or certification.",
    "Not independent verification or a production verification result.",
    "No claim about other workstations, distributions, versions, customers or all Linux systems.",
    "No proven source-level attribution, causal repair, available fix or vendor responsibility.",
    "No claim that all reported UI symptoms share a proven cause.",
    "Withheld private evidence is not publicly inspectable evidence; the complete investigation cannot be reconstructed from these downloads."
  ],
  "artifacts": [
    {
      "file": "case-report.md",
      "title": "Source-derived report",
      "note": "Newly authored from the original reports; not an original capture.",
      "sha256": "8408b6576f739da9e3d0b59f75d7ca5b3b98c635ba105e2823124e43c80ef8ca",
      "bytes": 4437
    },
    {
      "file": "signal-excerpts.txt",
      "title": "Signal-run excerpts",
      "note": "Selected trace, snapshot and log blocks; omissions and redactions marked.",
      "sha256": "78293bb3d58be453d0e06288166cb5a46a3a5e2fb5d46b696cb4c5a35360a551",
      "bytes": 2303
    },
    {
      "file": "process-observations.txt",
      "title": "Process observations",
      "note": "Earlier traced run and separate untraced observation, explicitly distinguished.",
      "sha256": "de59c834541532f4909ab1eb1deacbbb13427863c3bad54938040dcbd3d95ce2",
      "bytes": 2066
    },
    {
      "file": "handler-excerpt.txt",
      "title": "Disassembly excerpt",
      "note": "Selected instructions; full runtime-address mapping is withheld.",
      "sha256": "22cae727d1af2a106d6b4736223cb2ae2418137879a2ca3ea1e9c747f3ca9184",
      "bytes": 1107
    },
    {
      "file": "environment.json",
      "title": "Recorded environment",
      "note": "Selected metadata; executable not distributed or remeasured.",
      "sha256": "93da7e6ad691ee2af3e9408d0112fb58cbb2ae5596b4184a629e52e5ef57f3d9",
      "bytes": 668
    },
    {
      "file": "SHA256SUMS",
      "title": "Checksum manifest",
      "note": "Hashes selected content files; does not hash itself or establish source truth.",
      "sha256": "4884a2f3516c7195ea445ed05172933612a888c607a2261def0c124cdb2f0808",
      "bytes": 427
    }
  ]
};
