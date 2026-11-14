# A4 reverse-proxy proposal — NOT APPLIED

Review against a freshly captured complete active configuration before a
separately authorized deployment. The existing static release remains GET/HEAD
only. Insert these handles before its fallback, on the Academy host only.
These are source-contract loopback ports, not a statement of live topology.

```caddyfile
# Exact public aliases all enter the authenticated lesson UI.
@lesson path /lessons/report-or-evidence /lessons/report-or-evidence/ /lessons/report-or-evidence/index.html
handle @lesson {
    @read method GET HEAD
    handle @read {
        redir /academy/learn/report-or-evidence 302
    }
    header Allow "GET, HEAD"
    respond "Method not allowed" 405
}

@academyRead {
    method GET HEAD
    path /academy/learn/report-or-evidence /academy/static/lesson.js
}
handle @academyRead {
    reverse_proxy 127.0.0.1:18300 {
        header_up X-Forwarded-For {remote_host}
    }
}
@academyLogin {
    method GET
    path /academy/auth/login /academy/auth/callback
}
handle @academyLogin {
    reverse_proxy 127.0.0.1:18300 {
        header_up X-Forwarded-For {remote_host}
    }
}
@academyDraft {
    method GET PUT
    path /academy/api/lessons/report-or-evidence/draft
}
handle @academyDraft {
    reverse_proxy 127.0.0.1:18300 {
        header_up X-Forwarded-For {remote_host}
    }
}
@academyLogout {
    method POST
    path /academy/auth/logout
}
handle @academyLogout {
    reverse_proxy 127.0.0.1:18300 {
        header_up X-Forwarded-For {remote_host}
    }
}
# Deny every unlisted Academy runtime path/method. Do not strip /academy.
@academyOther path /academy /academy/*
handle @academyOther {
    respond "Not found" 404
}
```

Leave the existing MCP and metadata handles unchanged for their separate review.
The existing static fallback serves `/academy.css`, `/chron.css`, `/academy.mjs`,
`/lesson.mjs`, `/lesson-state.mjs`, `/lesson-progress.mjs`, `/assets/*`, `/fonts/*`
and the other public pages. Build both parts from the same source revision.
Do not apply the static fallback's `connect-src 'none'` header to proxied lesson
responses: the lesson server supplies a strict self-only script/style policy
and same-origin connections. No inline script/style execution is required.

Configure the server's public origin to the exact HTTPS Academy origin and trust
only the actual loopback proxy socket address. Exact Keycloak callback URI:
`https://academy.witnessops.com/academy/auth/callback`; use S256 PKCE and the
existing audience mapper. No wildcard redirects. Keep the app listener private.
The health route is intentionally absent from public proxy routing.

Next readiness check: review/adapt this proposal with the complete candidate
Caddy configuration, then run `caddy validate` on that complete candidate without
applying or reloading it. Check A3, Keycloak client settings and database grants
before requesting deployment authorization. A syntax check alone is not routing
or production acceptance.

Rollback before deployment: discard the A4 branch. For a later authorized
release, restore the previous complete code/static pair and proxy configuration.
A4 changes no schema and does not delete drafts; saved browser JSON remains text
in the existing draft column. An older UI may not display feedback/history, so
retain draft rows and avoid overwriting them during rollback.
