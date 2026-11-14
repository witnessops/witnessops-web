# Academy static release source

This directory contains a bounded static artifact tool and a source-only Caddy
site block for `academy.witnessops.com`. Neither is installed or invoked by a
GitHub production workflow. Merging this source does not publish the Academy,
change DNS, issue a certificate, edit the active Caddy configuration or switch
the host's active Academy release.

`static_release.py package` reads only the Git-tracked
`apps/witnessops-academy/public/` tree at an exact commit in the locally fetched
main history. It creates a deterministic tar archive and per-file manifest.
It rejects links, hidden or traversing paths, executable entries, unsupported
extensions and oversized files. The preview `dist/` directory and all teacher
material are outside the release source.

`verify` checks an archive and manifest against independently supplied SHA-256
digests and source commit. The host-only `stage` operation checks those same
identities before copying files to a new release directory. `activate` requires
an exact expected prior Academy reference and rechecks the staged files before
switching only that reference. It retains prior releases for rollback. The host
operations do not touch the website image, app workload, DNS, certificates or
Caddy service. These checks protect against malformed artifacts and ordinary
release drift; the manifest is not a signature or proof of GitHub CI approval.

The Caddy block serves the exact Academy hostname from the Academy active
reference. Static files stay GET/HEAD, with a restrictive CSP and no-store
responses. `/mcp` and `/.well-known/oauth-protected-resource/mcp` are
reverse-proxied to the loopback MCP server at 127.0.0.1:18500. The static
root is a proposed deployment contract, not an observation of the live host.
The complete active Caddy config, service identity, permissions, capacity,
certificate storage and rollback state must be captured and checked after a
separate production GO. Add the block only to that captured config, validate
the full candidate with the host's Caddy binary, and verify the existing sites.
The static tool does not install or reload the block. DNS and TLS exposure remain
separate, explicitly authorized production actions.

The focused source check is `pnpm academy:test`; `pnpm health` also runs these
tests. Local Caddy syntax can be checked by adapting the block with an installed
Caddy binary. That check does not validate the unobserved production config or
issue a public certificate.
