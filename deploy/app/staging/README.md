# Private staging proxy candidate

This source supports the separate `aasr-staging` application artifact. It does
not create resources, register identities, obtain deployment approval or change
the ordinary production image. Keep deployment-specific identities, host records
and credentials in the operator's private configuration and evidence.

The renderer accepts a private JSON file with exactly `schema: 1`, `origin` and
`accounts`. `origin` is the reviewed staging HTTPS origin with no trailing slash,
port, credentials, query or fragment, using the same staging-hostname rule as
the application build profile. `accounts` contains exactly two objects,
each with `username` and `passwordHash`. Use distinct usernames and separately
generated strong passwords, with bcrypt hashes at cost 10–16. Generate hashes
with Caddy's interactive `hash-password` command; do not put plaintext passwords
in shell arguments, files committed to Git or logs. These accounts only protect
the outer access gate: they never select native application identities or roles.

Run `node deploy/app/staging/render-caddy.mjs PRIVATE_INPUT.json NEW_OUTPUT`.
The input must be a regular, owner-private file. The renderer creates a new mode
0600 output and refuses to overwrite an existing path. It does not install,
reload or activate Caddy. Compare the rendered origin with the staging image's
immutable build bindings, then validate it with the selected Caddy version
before any separately authorized installation. The template uses the
`basic_auth` directive introduced in Caddy 2.8.

The candidate requires direct DNS routing and TLS-ALPN certificate validation
on TCP443. HTTP-01 and automatic HTTP redirects are disabled. A CDN/proxy hop
needs a separately reviewed forwarding and certificate contract. Keep Caddy's
administration endpoint private. The upstream app port and database must not
be publicly reachable.

The outer gate protects login, callback, page/API and static assets. AuthKit's
callback remains a browser GET with its original code/state query, cookies and
Fetch Metadata. Next server-action POSTs on page paths are retained. Origin,
Cookie, Set-Cookie and framework headers are not rewritten. Basic Authorization
and Proxy-Authorization are removed only after the gate validates them; fixed
Host/forwarding values are sent upstream. The application independently denies
non-fixture operations and checks native current-session/membership authority.

Access logs are intentionally absent because callback URLs include transient
authorization material. If operational logging is later introduced, separately
verify query, cookie and authorization redaction; do not enable debug credential
logging. Native logout does not clear a browser's Basic credential cache. Use
separate browser profiles for the Owner and Reviewer and test both outer-gate
removal and native revocation.

`node --test deploy/app/staging/config.test.mjs` checks input refusal and private
output handling. Actual Caddy validation, local TLS/proxy behavior and hosted
WorkOS acceptance are separate evidence. Source configuration alone establishes
none of them.
