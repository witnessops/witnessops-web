# WitnessOps CLI

This package is the dependency-free command-line client used by an assisted
WitnessOps Linux pilot. It requires Node.js 22. The package is private and is
installed from an operator-supplied, versioned archive; it is not published to
the npm registry.

Install the approved root-controlled Node.js 22/npm prerequisite at
`/usr/bin/node` before enabling privileged checks. Verify the archive against
the SHA-256 value received through the trusted pilot channel, then install it
from the directory containing both files:

```sh
sha256sum --check witnessops-cli-0.0.1.tgz.sha256
sudo npm install --global --prefix /usr/local --ignore-scripts ./witnessops-cli-0.0.1.tgz
wops auth status
```

Before sign-in, the final command prints `Not signed in.` Run `wops auth login`
as the normal user. The privileged launcher is installed separately after the
CLI package:

```sh
sudo python3 -B /usr/local/lib/node_modules/@witnessops/cli/ops/install_wops_sudo_launcher.py --check
sudo python3 -B /usr/local/lib/node_modules/@witnessops/cli/ops/install_wops_sudo_launcher.py --apply
```

The check mode verifies root-controlled Node.js 22 at `/usr/bin/node` and the
root-controlled global CLI entrypoint; apply mode installs the root-owned
launcher only after both are present and safe. It only permits
`sudo wops server check`; `wops auth` remains a normal-user command using that
user's Node and credential. Do not add a user-writable Node directory to sudo's
PATH. A server check is separately authorized and also requires the accepted,
root-owned Local Audit runtime. This CLI archive does not contain or install
that collector runtime, authorize collection, or provide signing keys.

To remove this package:

```sh
sudo python3 -B /usr/local/lib/node_modules/@witnessops/cli/ops/install_wops_sudo_launcher.py --remove
sudo npm uninstall --global --prefix /usr/local @witnessops/cli
```

The SHA-256 sidecar detects an accidental or malicious byte change only when
its expected value is obtained through a trusted channel. It is not a publisher
signature or proof that the package is approved for production.
