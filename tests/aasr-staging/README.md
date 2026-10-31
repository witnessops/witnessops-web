# Local immutable-image boundaries

Run `image-boundaries.mjs` only after separately building the ordinary production
image and the dedicated staging image. Supply their full local immutable image
IDs; tags, registry references, builds and pulls are not supported:

```sh
node tests/aasr-staging/image-boundaries.mjs \
  --engine /usr/bin/podman --standard STANDARD_IMAGE_ID --staging STAGING_IMAGE_ID
```

The staging image must have the synthetic build bindings used by this acceptance
test: origin `https://staging.example.test`, client `client_aasr_staging_test` and
the canonical database target digest for host `db-staging`, port `5432`, database
`aasr_staging` and runtime user `app_runtime_staging`. These are fictional test
bindings, not deployment instructions or real identity assignments.

The runner forces a local Podman or Docker engine, uses `--pull=never` and
`--network=none`, verifies no published ports and sends HTTP requests through
`exec node` to the container's loopback listener. Dummy credentials exist only
in a newly created private temporary directory. Task-owned containers and files
are removed in `finally`, including after a failing check. Responses, cookies,
redirect state and credential values are not logged. No assignment manifest or
authenticated session is supplied, and the unreachable test database is never
populated.

Checks cover ordinary image refusal with runtime flag/profile/NODE_ENV spoofing;
staging signed-out entry, unauthenticated API and blocked product routes;
origin/forwarding refusal; a native PKCE login redirect that is not followed;
invalid callback state without a matching cookie; and startup refusal for
mismatched or forbidden staging configuration. A missing assignment may expose
native sign-in, never fixture data. This is actual local image refusal evidence,
not hosted WorkOS sign-in, assigned-user access, proxy/TLS or deployment proof.
