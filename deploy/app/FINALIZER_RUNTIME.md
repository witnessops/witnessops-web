# App finalizer runtime contract

The image bundles Python 3.14.7 and the accepted Local Audit 1.2.2 source from implementation `fce41c194522e9d08d0683aa786bd4361c5ae0c2`. The immutable archive is verified before installation; its collector fingerprint remains `2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8`. The archive contains actual producer modules, not a simulated finalizer. Cryptography is 50.0.1. No private signing material is built into the image.

The lifecycle definition mounts durable host custody at `/var/lib/witnessops-finalizer` read/write and a separately provisioned key at `/run/witnessops-finalizer/key` read-only. Both must be UID 1001-owned, with no group/other access; custody must be a real directory (0700) and the key a regular private file. Bind sources must already exist. Provisioning these production paths or the key is a separate operator action, not performed by this code change.

The Python executable is `/opt/witnessops/finalizer/venv/bin/python`. The adapter runs under Next's app working directory and invokes the producer with isolated Python (`-I`), a bounded subprocess deadline and no request-selected path, key or registry. The registry is the checked-in pinned registry; its byte digest is checked by deployment readiness. Each execution gets a private subdirectory containing its preserved capture, registry, issuance marker, ZIP and detached signature. DB capture/source bytes and the execution/run linkage remain independently persisted.

Custody survives container replacement and restart. The lifecycle never removes it. Backups must retain custody and database state together. There is no automatic retention deletion. A persisted issuance marker without a complete independently verified package requires operator reconciliation; restart/retry must not sign again blindly. A complete package is reused only after correspondence and independent verification checks.

Before replacing the existing app container, the lifecycle runs the exact image with the same mounts, no network, and a non-signing readiness command. It checks producer identity, pinned registry, configured signer reference, private file ownership and durable directory write/fsync access. It does not claim private/public-key pairing; the normal execution preflight checks that pairing against the pinned registry before authorization. Missing prerequisites fail startup preparation closed. The standalone EE/auth surface can still be tested without activating a finalizer.

## Upload deadlines and recovery

Incoming capture bodies have a ten-second deadline. The service races reads against that deadline and does not await an unbounded cancellation promise during cleanup; capacity is released even for a non-cooperative stream. Rejected/incomplete bodies do not reach upload persistence.

The CLI uses native fetch with a 150-second AbortSignal covering response reads. The finalizer subprocess has a 120-second limit. A client response timeout is not proof of rejection: the retained request UUID and capture digest are reused. Once upload is recorded, retry checks execution status rather than recollecting. Issuance markers and atomic run linkage prevent duplicate issuance/run creation. Tests use disposable signing only and never inspect a real host.
