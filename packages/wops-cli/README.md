# WitnessOps CLI

This package is the dependency-free command-line client used by an assisted
WitnessOps Linux pilot. The private CLI archive is installed from a reviewed,
operator-supplied artifact; it is not published to the npm registry.

## Pinned Node.js runtime

The privileged server-check path uses the WitnessOps-owned Node.js runtime at
`/opt/witnessops/node-22/bin/node`. It does not rely on distro package state,
`/usr/bin/node`, a user-local interpreter, or sudo `PATH` changes.

The installer pins Node.js `22.23.3` x64 from the official release URL:

`https://nodejs.org/download/release/v22.23.3/node-v22.23.3-linux-x64.tar.xz`

The archive SHA-256 is
`df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de`, matching
the `node-v22.23.3-linux-x64.tar.xz` line in the official
[Node.js release checksums](https://nodejs.org/download/release/v22.23.3/SHASUMS256.txt).
The extracted `bin/node` SHA-256 is
`fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48`.
The installer checks both values, accepts only the fixed archive layout and
three expected npm/corepack links, extracts into a root-only sibling directory,
and publishes without replacing an existing installation. It provides
`--fetch`, `--check`, `--apply`, and `--remove`; it has no auto-update mode.

Run `--fetch` and `--check` as the normal user, then use the explicit root
`--apply` only after the printed digest matches:

```sh
python3 -B packages/wops-cli/ops/install_witnessops_node_22.py \
  --fetch --output /tmp/node-v22.23.3-linux-x64.tar.xz
python3 -B packages/wops-cli/ops/install_witnessops_node_22.py \
  --check --archive /tmp/node-v22.23.3-linux-x64.tar.xz
sudo python3 -B packages/wops-cli/ops/install_witnessops_node_22.py \
  --apply --archive /tmp/node-v22.23.3-linux-x64.tar.xz
sudo python3 -B packages/wops-cli/ops/install_witnessops_node_22.py --check
```

## CLI and launcher installation

Verify the supplied CLI artifact using the digest from its trusted distribution
channel, then install it offline using npm from the root-controlled Node
runtime:

```sh
sha256sum --check witnessops-cli-0.0.1.tgz.sha256
sudo /opt/witnessops/node-22/bin/node \
  /opt/witnessops/node-22/lib/node_modules/npm/bin/npm-cli.js \
  install --global --prefix /usr/local --offline --ignore-scripts \
  ./witnessops-cli-0.0.1.tgz
wops auth status
```

The Local Audit runtime is a separate accepted producer. First install uses
`install_local_audit_1_2_2.py --apply`. The one approved workstation transition
from the original collector fingerprint uses its explicit `--upgrade` mode:

```sh
sudo python3 -B /usr/local/lib/node_modules/@witnessops/cli/ops/install_local_audit_1_2_2.py --upgrade
```

That operation validates the existing root-owned runtime and layout, accepts
only the recorded previous fingerprint, atomically exchanges only `runtime/`,
and verifies `staging/` is byte-identical before and after. The previous runtime
is retained in a root-only sibling rollback directory and its exact reference
is printed. Unknown fingerprints, unexpected entries, or changed evidence
refuse the upgrade.

Install the root-owned launcher separately after the new CLI package and Node
runtime are in place:

```sh
sudo python3 -B /usr/local/lib/node_modules/@witnessops/cli/ops/install_wops_sudo_launcher.py --check
sudo python3 -B /usr/local/lib/node_modules/@witnessops/cli/ops/install_wops_sudo_launcher.py --apply
sudo wops server check --help
```

The launcher verifies the fixed Node binary digest, version and custody, then
permits only `sudo wops server check`. Authentication commands remain normal
user commands using the user's own Node and credential. The `--help` check does
not authenticate, create an execution, invoke a collector, or upload evidence.
An actual server check still requires active CLI authorization and a separate
operator confirmation.

To remove the launcher, run its `--remove` mode. To remove the Node runtime,
run its `--remove` mode; removal refuses a tree that does not match the pinned
identity. CLI removal remains a separate explicit npm operation. None of these
commands retires a saved execution or deletes retained execution evidence.

The CLI artifact sidecar detects byte changes only when its expected value is
obtained through a trusted channel. It is not a publisher signature or proof
that the package is approved for production.
