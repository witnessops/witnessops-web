# WitnessOps canonical host change

This change is prepared but must not be applied without explicit production and Caddy authorization. The source-controlled replacement block is `deploy/Caddyfile.witnessops-canonical-host`.

## Pre-change and backup

On the host identified by the private `DEPLOY_SSH` custody record, record the
active checksum and create a timestamped backup before editing:

```sh
date -u +%Y-%m-%dT%H:%M:%SZ
sha256sum /etc/caddy/Caddyfile
sudo cp -p /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.pre-witnessops-apex-$(date -u +%Y%m%dT%H%M%SZ).bak"
sudo ls -lt /etc/caddy/Caddyfile.pre-witnessops-apex-*.bak | head -n 1
```

Replace only the active WitnessOps host block. Preserve every unrelated Caddy site and directive. Then validate the complete active configuration before reload:

```sh
sudo caddy fmt --diff /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Do not reload if validation fails or the diff touches another site.

## Reload and acceptance

```sh
sudo systemctl reload caddy
systemctl is-active caddy
sudo journalctl -u caddy --since "5 minutes ago" --no-pager
```

Acceptance requires direct `308` redirects from HTTP apex, HTTP `www`, and HTTPS `www` to the HTTPS apex, preserving paths and query strings. The HTTPS apex must remain `200` for current public pages. Test `/`, a nested current path, a missing path, and a path with multiple query parameters.

## Immediate rollback

Use the exact backup path recorded before the change:

```sh
sudo cp -p /etc/caddy/Caddyfile.pre-witnessops-apex-YYYYMMDDTHHMMSSZ.bak /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
systemctl is-active caddy
```

After rollback, repeat the path/query matrix and confirm the active file checksum matches the pre-change checksum.
