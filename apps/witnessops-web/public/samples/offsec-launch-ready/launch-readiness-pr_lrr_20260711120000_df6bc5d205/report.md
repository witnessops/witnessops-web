# WitnessOps Launch Readiness Review

## Owner view

Review signal: **OWNER ATTENTION REQUIRED**
Release: `release-synthetic-2026-07-12-01`
Decision owner: `synthetic-release-owner`
Target launch time: `2026-07-12T12:00:00Z`
This is a triage signal, not launch approval. The named owner retains launch authority and risk acceptance.

## What changed

- Risk-increasing changes: 10
- Risk-reducing changes: 0
- Changes requiring owner review: 6

### RISK INCREASING — `accounts.interactive_shell_count`

- Baseline: `2`
- Candidate: `5`
- Why it matters: New interactive accounts require owner review.

### RISK INCREASING — `accounts.uid0_count`

- Baseline: `1`
- Candidate: `2`
- Why it matters: An increase in UID 0 accounts raises attribution risk.

### RISK INCREASING — `clock.ntp_synchronized`

- Baseline: `True`
- Candidate: `False`
- Why it matters: Loss of time synchronization weakens event ordering.

### RISK INCREASING — `critical_files./etc/passwd`

- Baseline: `{'status': 'observed', 'mode': '0644', 'owner': 'root', 'group': 'root', 'admitted': True}`
- Candidate: `{'status': 'observed', 'mode': '0666', 'owner': 'root', 'group': 'root', 'admitted': False}`
- Why it matters: Critical-file metadata changed relative to the admitted baseline.

### RISK INCREASING — `firewall.status`

- Baseline: `active`
- Candidate: `inactive`
- Why it matters: Moving away from an active host firewall is risk-increasing.

### RISK INCREASING — `hardening.apparmor_enabled`

- Baseline: `True`
- Candidate: `False`
- Why it matters: Loss of AppArmor enforcement is risk-increasing where it was previously active.

### REQUIRES REVIEW — `hardening.selinux_enforcing`

- Baseline: `None`
- Candidate: `False`
- Why it matters: Loss of SELinux enforcement is risk-increasing where it was previously active.

### REQUIRES REVIEW — `hardening.sysctl.fs.protected_hardlinks`

- Baseline: `1`
- Candidate: `None`
- Why it matters: The admitted hardening value changed and must be reconciled with the launch baseline.

### REQUIRES REVIEW — `hardening.sysctl.fs.protected_symlinks`

- Baseline: `1`
- Candidate: `None`
- Why it matters: The admitted hardening value changed and must be reconciled with the launch baseline.

### REQUIRES REVIEW — `hardening.sysctl.kernel.dmesg_restrict`

- Baseline: `1`
- Candidate: `None`
- Why it matters: The admitted hardening value changed and must be reconciled with the launch baseline.

### REQUIRES REVIEW — `hardening.sysctl.kernel.kptr_restrict`

- Baseline: `2`
- Candidate: `None`
- Why it matters: The admitted hardening value changed and must be reconciled with the launch baseline.

### REQUIRES REVIEW — `hardening.sysctl.kernel.unprivileged_bpf_disabled`

- Baseline: `1`
- Candidate: `None`
- Why it matters: The admitted hardening value changed and must be reconciled with the launch baseline.

### RISK INCREASING — `listeners.count`

- Baseline: `1`
- Candidate: `4`
- Why it matters: Additional listeners require reachability and ownership review.

### RISK INCREASING — `services.failed_count`

- Baseline: `0`
- Candidate: `1`
- Why it matters: Additional failed services can affect launch reliability.

### RISK INCREASING — `ssh.password_authentication`

- Baseline: `no`
- Candidate: `yes`
- Why it matters: Enabling SSH password authentication is risk-increasing.

### RISK INCREASING — `ssh.permit_root_login`

- Baseline: `no`
- Candidate: `yes`
- Why it matters: Enabling direct root login is risk-increasing.

## Candidate posture findings

- Critical: 0
- High: 3
- Medium: 3
- Low: 2
- Informational: 0

### HIGH — Critical account or privilege file metadata fell outside the admitted baseline

- Finding id: `lrr_critical_file_metadata`
- State: `observed`
- Recommendation: Review ownership and permissions before changing them; preserve service-specific exceptions.
- Limit: File contents and distribution-specific policy were not assessed.

### HIGH — SSH effective configuration permits direct root login

- Finding id: `lrr_ssh_root_login`
- State: `observed`
- Recommendation: Disable direct root SSH login and use attributable privilege elevation.
- Limit: This does not prove that root login was used or externally reachable.

### HIGH — More than one UID 0 account was observed

- Finding id: `lrr_uid0_multiple`
- State: `observed`
- Recommendation: Review whether every UID 0 account is required and separately attributable.
- Limit: Account names and authentication activity were not collected.

### MEDIUM — Failed system services were observed

- Finding id: `lrr_failed_services`
- State: `observed`
- Recommendation: Review each failed unit against the host's intended service inventory.
- Limit: A failed unit is not by itself evidence of compromise or business impact.

### MEDIUM — Host firewall was observed inactive

- Finding id: `lrr_host_firewall_inactive`
- State: `observed`
- Recommendation: Confirm the intended network-control boundary and enable a host firewall where required.
- Limit: Upstream firewalls and actual reachability were not tested.

### MEDIUM — SSH password authentication is enabled

- Finding id: `lrr_ssh_password_auth`
- State: `observed`
- Recommendation: Evaluate disabling password authentication after confirming an approved key-based recovery path.
- Limit: This does not prove weak passwords, exposure, or successful authentication.

### LOW — Host clock reported not synchronized

- Finding id: `lrr_clock_unsynchronized`
- State: `observed`
- Recommendation: Restore approved time synchronization and record the source used.
- Limit: The collector did not compare the clock against an independent time authority.

### LOW — No enforcing AppArmor or SELinux state was observed

- Finding id: `lrr_mandatory_access_control`
- State: `observed`
- Recommendation: Confirm the host's intended mandatory-access-control policy and platform support.
- Limit: This is a posture observation, not proof that workload isolation is ineffective.

## Evidence boundary

- Asset id: `asset-demo-host-001`
- Hostname: `demo-host`
- Baseline observed: `2026-07-10T12:00:00Z`
- Candidate observed: `2026-07-11T12:00:00Z`
- Release artifact SHA-256: `cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc`
- Receipt construction outcome: **PASS**
- Both required v1 snapshots reached every admitted complete section status.
- `PASS` means the bounded two-snapshot evidence contract was complete. It does not mean the launch is secure, production-ready, approved, or compliant.
- Collection was operator-present, local, and read-only. No deployment or configuration changes were made.

## Independent verification

Use the delivered ZIP, detached signature, SHA-256 sidecar, and a separately obtained trust registry with `witnessops-launch-ready verify`.
The verifier checks input bounds, ZIP safety, final and baseline signer admission, receipt-to-manifest binding, artifact hashes, strict claims, two-snapshot completeness, same-target and time-window rules, release-context binding, deterministic drift reconstruction, and embedded producer reconstruction.

## Known limits

- The release digest and decision owner are declarations bound into the packet; v1 does not fetch or execute the release artifact.
- The external authority source is represented by its declared identity and digest; v1 does not independently validate that source signer's identity.
- Local observations depend on the reporting host and kernel. Host compromise or source-system dishonesty is not independently excluded.
- No network reachability, exploitability, source-code review, cloud-control-plane review, historical compromise analysis, compliance certification, or production guarantee is included.
