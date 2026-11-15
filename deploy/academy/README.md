# Academy static release source

This directory contains a bounded static artifact tool and a source-only Caddy
complete Academy virtual-host candidate for `academy.witnessops.com`. Neither is installed or invoked by a
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

The Caddy candidate serves the exact Academy hostname and combines the
authenticated lesson/auth/draft/logout allowlist with the static release fallback.
See [request-policy validation](../../apps/witnessops-academy-server/ROUTING-A4.md)
and the [unapplied custody/cutover plan](../../apps/witnessops-academy-server/CUTOVER-PLAN.md). Static files stay GET/HEAD, with a restrictive CSP and no-store
responses. `/mcp` and `/.well-known/oauth-protected-resource/mcp` are
reverse-proxied to the loopback MCP server at 127.0.0.1:18500. The origin-level
`/.well-known/oauth-protected-resource` path is not proxied: the resource
identifier is `/mcp`, so the metadata URL is the path-suffixed one. The static
root is a proposed deployment contract, not an observation of the live host.
The complete active Caddy config, service identity, permissions, capacity,
certificate storage and rollback state must be captured and checked after a
separate production GO. Add the block only to that captured config, validate
the full candidate with the host's Caddy binary, and verify the existing sites.
The static tool does not install or reload the block. DNS and TLS exposure remain
separate, explicitly authorized production actions.

The focused source check is `pnpm academy:test`; `pnpm health` also runs these
tests. With an installed Caddy binary, `caddy validate --config
deploy/academy/Caddyfile.academy --adapter caddyfile` validates the complete Academy
candidate without starting it. `ACADEMY_REQUIRE_CADDY=1 python3 -m unittest discover
-s deploy/academy -p 'test_proxy_candidate.py' -v` also checks actual requests
through a temporary loopback-only proxy with synthetic upstreams and TLS disabled.
Academy CI requires these checks with a SHA-256-pinned Caddy binary extracted only
into runner temp. Neither check validates an unseen full multi-site production
configuration or issues a public certificate.
