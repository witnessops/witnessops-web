/** Discovery copy only; these choices do not grant access or execute checks. */
export const CHECK_DISCOVERY = {
  hostname: {
    name: 'External Exposure Check',
    description: 'Check one public hostname from the outside.',
    next: 'WitnessOps makes ten bounded public observations after you authorize a run.',
    when: 'Customer security reviews, public configuration changes, or a first baseline.',
    input: 'One public hostname or domain you are authorized to check.',
    output: 'Observations, attention flags, unknowns, evidence and a report. Run again to compare.',
    boundary: 'One hostname, not your complete external attack surface.',
  },
  linux_server: {
    name: 'One Server Security Check',
    description: 'Check one Linux server locally, then compare with a previous check.',
    next: 'An authorized operator collects locally; you import the signed Proofpack ZIP and signature.',
    when: 'Server baselines, handoff, customer evidence, or before/after maintenance.',
    input: 'Authorized local operator access; Proofpack ZIP and matching signature.',
    output: 'Package verification, findings, collection gaps, evidence and a report. Import a later check to compare.',
    boundary: 'A bounded read-only check, not a full security audit or certification.',
  },
} as const;
