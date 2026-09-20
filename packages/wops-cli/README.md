# WitnessOps CLI

This package is the dependency-free command-line client used by an assisted
WitnessOps Linux pilot. It requires Node.js 22. The package is private and is
installed from an operator-supplied, versioned archive; it is not published to
the npm registry.

Verify the archive against the SHA-256 value received through the trusted pilot
channel, then install it from the directory containing both files:

```sh
sha256sum --check witnessops-cli-0.0.1.tgz.sha256
npm install --global ./witnessops-cli-0.0.1.tgz
wops auth status
```

Before sign-in, the final command prints `Not signed in.` Run `wops auth login`
as the normal user. A server check is separately authorized and runs with
`sudo wops server check` only after an operator has installed the accepted,
root-owned Local Audit runtime. This CLI archive does not contain or install
that collector runtime, authorize collection, or provide signing keys.

To remove this package:

```sh
npm uninstall --global @witnessops/cli
```

The SHA-256 sidecar detects an accidental or malicious byte change only when
its expected value is obtained through a trusted channel. It is not a publisher
signature or proof that the package is approved for production.
