# Complete Academy proxy candidate — NOT APPLIED

[`deploy/academy/Caddyfile.academy`](../../deploy/academy/Caddyfile.academy)
is the single complete Academy virtual-host candidate. It includes the static
fallback, exact public lesson aliases, lesson/auth/draft/logout allowlist, reserved
runtime-path denial, MCP and exact protected-resource metadata. Do not combine a
second independently maintained A4 snippet with it.

The candidate uses explicit `route` ordering. Alias redirects use
`redir * /academy/learn/report-or-evidence 302`: without the explicit matcher,
a leading-slash destination can be interpreted as a matcher instead of a target.
The regression checks the actual Location response, not just valid syntax.
Caddy's [route semantics](https://caddyserver.com/docs/caddyfile/directives/route)
and [validation command](https://caddyserver.com/docs/command-line#caddy-validate)
explain the source checks.

## Checked request contract

- GET/HEAD public lesson aliases redirect to the single authenticated lesson.
  Other methods on those aliases receive 405.
- GET/HEAD serves the authenticated lesson and its controller. Only GET reaches
  login/callback. Only GET/PUT reaches the exact lesson draft. Only POST reaches
  logout. Other `/academy` runtime paths/methods are denied before static fallback.
- The app receives the original path, query, body, Origin and CSRF header. The
  proxy overwrites X-Forwarded-For from the socket peer and removes Forwarded.
  Session-derived ownership, CSRF and version checks remain the app's responsibility.
- Static files stay GET/HEAD only with their static CSP. That CSP is not attached
  to proxied responses; the lesson server supplies its own same-origin policy.
- Existing MCP routing and exact path-suffixed metadata remain bounded to their
  source contract. The bare metadata path and app health path are not exposed.

## Validation without apply

```sh
caddy validate --config deploy/academy/Caddyfile.academy --adapter caddyfile
ACADEMY_REQUIRE_CADDY=1 python3 -m unittest discover -s deploy/academy -p 'test_proxy_candidate.py' -v
```

The first command loads/provisions the configuration for validation without
starting it. The request regression runs a short-lived Caddy on random loopback
ports with synthetic upstreams, admin/TLS/automatic HTTPS disabled, and temporary
static bytes. Only listener/upstream/root settings change in that fixture;
the compiled request routes and headers are the candidate's routes. It creates
no certificates or operational keys and stops all of its test processes.
CI uses the official Caddy 2.11.9 archive pinned by SHA-256 in its temporary directory.

This proves the complete **Academy** candidate, not integration with an unseen
full multi-site production configuration. The deployed Caddy version/modules,
complete active configuration and its other virtual hosts remain UNVERIFIED.
Do not overwrite the active host configuration with this Academy-only file.
Keep the public callback exactly
`https://academy.witnessops.com/academy/auth/callback`, S256 and the audience mapper;
verify those settings separately rather than changing them here.

The complete unapplied [custody/cutover plan](CUTOVER-PLAN.md) defines the next
operator evidence and authority boundaries. No reload, deployment, key provisioning,
production inspection or production authenticated acceptance is performed by
these source checks.
