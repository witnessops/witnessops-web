# App finalizer runtime contract

The image bundles Python 3.14.8 and the accepted Local Audit 1.2.2 source based on implementation `fce41c194522e9d08d0683aa786bd4361c5ae0c2`, with the controlled `missing-sshd-is-an-unknown-ssh-probe` refresh recorded in `tests/server-check/producer/identity.json`. The immutable archive is verified before installation; its collector fingerprint is `ac93a93dc1d89fc4c2a467b83a5131482d21a84342f1ac176823adf8bb0d372a`. The archive contains actual producer modules, not a simulated finalizer. Cryptography is 50.0.1. No private signing material is built into the image.

When `WITNESSOPS_FINALIZER_ENABLED` is the exact value `1`, the lifecycle definition mounts durable host custody at `/var/lib/witnessops-finalizer` read/write and a separately provisioned key at `/run/witnessops-finalizer/key` read-only. Both must be UID 1001-owned, with no group/other access; custody must be a real directory (0700) and the key a regular private file. Bind sources must already exist. Provisioning these paths or the key is a separate operator action, not performed by this code change. The container user is uid 1001, the same user as the app, so that read-only mount is readable by the app process. This finalizer is not off-host and it is not a separate signer.

The Python executable is `/opt/witnessops/finalizer/venv/bin/python`. The adapter runs under Next's app working directory and invokes the producer with isolated Python (`-I`), a bounded subprocess deadline and no request-selected path, key or registry. The registry is the checked-in pinned registry; its byte digest is checked by deployment readiness. Each execution gets a private subdirectory containing its preserved capture, registry, issuance marker, ZIP and detached signature. DB capture/source bytes and the execution/run linkage remain independently persisted.

Custody survives container replacement and restart. The lifecycle never removes it. Backups must retain custody and database state together. There is no automatic retention deletion. A persisted issuance marker without a complete independently verified package requires operator reconciliation; restart/retry must not sign again blindly. A complete package is reused only after correspondence and independent verification checks.

## Operator gate

`WITNESSOPS_FINALIZER_ENABLED` must be the exact value `1` before finalization or the `server_check:create` scope runs. Unset, empty, and every other value leave the gate off. This source change does not set the variable.

While the gate is off, issuance of `server_check:create` is refused and finalization returns the existing `503` `finalizer_unavailable` response. The CLI authorization page does not offer that scope. The lifecycle helper reads the same variable from the runtime environment file it already uses. Off skips the key and custody bind mounts and skips the readiness command that reads the key, so a host without those paths can start. On keeps the previous mounts, finalizer environment, and readiness command.

A package produced while the gate is on can still contain a signature. That signature is made in the app container by the app uid. CLI output for `wops server check` calls that package unsigned because the key is not separate custody. App screens that describe an operator-imported Local Audit package are a different path and are unchanged.

To keep the previous finalizer behaviour, set `WITNESSOPS_FINALIZER_ENABLED=1` and restart the app process. Rollback is that value removed, or this change reverted. Neither step deploys or rotates a key.

Before replacing the existing app container, and only when the gate is on, the lifecycle runs the exact image with the same mounts, no network, and a non-signing readiness command. It checks producer identity, pinned registry, configured signer reference, private file ownership and durable directory write/fsync access. It does not claim private/public-key pairing; the normal execution preflight checks that pairing against the pinned registry before authorization. Missing prerequisites fail startup preparation closed when the gate is on. The standalone EE/auth surface can still be tested without activating a finalizer.

## Upload deadlines and recovery

Incoming capture bodies have a ten-second deadline. The service races reads against that deadline and does not await an unbounded cancellation promise during cleanup; capacity is released even for a non-cooperative stream. Rejected/incomplete bodies do not reach upload persistence.

The CLI uses native fetch with a 150-second AbortSignal covering response reads. The finalizer subprocess has a 120-second limit. A client response timeout is not proof of rejection: the retained request UUID and capture digest are reused. Once upload is recorded, retry checks execution status rather than recollecting. Issuance markers and atomic run linkage prevent duplicate issuance/run creation. Tests use disposable signing only and never inspect a real host.
