# Accepted producer input for CI

This deterministic source archive contains the accepted Local Audit 1.2.2
Python package, its packaging file and one synthetic observation fixture based
on implementation commit `fce41c194522e9d08d0683aa786bd4361c5ae0c2`.
It contains no private key, production registry or operational configuration.

The controlled refresh `refresh.py` applies the single reviewed change
`missing-sshd-is-an-unknown-ssh-probe`: `sshd` is no longer a fatal command
precondition, while the existing SSH configuration probe remains and reports
unknown if it cannot execute. The tool verifies the prior archive/identity,
performs the exact source substitution, then deterministically regenerates the
archive and `identity.json` file hashes and collector fingerprint together.
It refuses other source or archive drift. The identity keeps the upstream
implementation commit and records the local refresh ID and original archive
digest separately.

`identity.json` pins archive and individual-file SHA-256 values. The refreshed
collector fingerprint is computed from exact Python source names and bytes; it
is not a commit ID. `prepare.py` verifies both before installing into a fresh
isolated test runtime.
Existing server tests create disposable signing material and prohibit collection.
This is a test input, not a production distribution or release channel.
