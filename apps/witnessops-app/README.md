# WitnessOps product foundation

UX reference: `witnessops/witnessops-demo-ui` at `4887c0fc5f2ac6742de0f4c9e11cb11e8603ade4`. The app uses WorkOS AuthKit for identity/session and WitnessOps-owned PostgreSQL data for workspace access. This is a local development integration, not a deployed product.

## Local setup

Use Node 22 and pnpm 9.15.4 from the monorepo root:

1. Install with `pnpm install --frozen-lockfile`.
2. Copy the safe variable template in `.env.example` to **this app's** `.env.local`. Supply a WorkOS staging API key/client ID, a cryptographically random cookie password (at least 32 characters), and the database connections. Keep both local configuration files ignored and mode 0600. Do not paste values into logs, tests, screenshots, or commits.
3. Use the existing local PostgreSQL 17 service. Provide separate development and test databases and separate runtime, migration, and test credentials. The runtime role needs CONNECT, schema USAGE, table SELECT/INSERT/UPDATE/DELETE and sequence USAGE/SELECT. It must not own schema objects or have superuser/CREATEDB/CREATEROLE/BYPASSRLS. The migration role owns the application tables; arrange default runtime grants before migration. Neither development role should connect to the test database, nor the test role to development.
4. Run `pnpm --filter @witnessops/app db:migrate`. This explicitly loads `.env.local` and uses **only DATABASE_MIGRATION_URL**. No migrations run on application startup. Ordered SQL files and their SHA-256 checksums are applied transactionally under a migration lock. Changed already-applied migrations fail. These additive migrations have no automatic destructive down command.
5. Run `pnpm dev` for the public app and, separately, `pnpm app:dev` for the product. The default origins are `http://127.0.0.1:3001` and `http://127.0.0.1:3020`.
6. Register the WorkOS staging callback `http://127.0.0.1:3020/callback`, initiate login `http://127.0.0.1:3020/login`, homepage and sign-out return `http://127.0.0.1:3020/`. Enable Google and Magic Auth (email one-time code) in the intended development identity environment. The two app entry links lead to the hosted method chooser; the app does not collect credentials or implement passwords. Do not change another application's shared provider settings inadvertently.
7. Sign in, create a workspace, then add a hostname. Adding it does not collect anything. Confirm ownership/authorization and choose Observe. Rerun after one minute. Logout/login and application restart preserve assets and runs.

`WORKOS_COOKIE_DOMAIN` must remain unset. AuthKit owns sealed HttpOnly, SameSite=Lax cookies, PKCE/state checking, signature/subject validation and refresh. HTTPS callbacks use Secure; HTTP is admitted only for the local loopback origin. Callback and sign-out return origins come from server configuration, not request headers or user input. Sign-out is a Next server action with explicit same-origin admission. The app CSP permits that form's WorkOS logout destination; public web CSP is unchanged. The public site does not use the app session. Browser cookies have no port boundary, so local apps on the same loopback hostname receive the host cookie; use only trusted local services. Production requires the separate app hostname and a host-only cookie, without a parent-domain cookie.

## Data and access

WorkOS provider/issuer/subject maps to an internal UUID; email is only a verified snapshot and never an identity key. WorkOS Organizations are not workspace authority. WitnessOps owns users, identity mappings, workspaces, memberships, assets and runs. The workspace creation transaction creates its Owner; a per-user creation key makes retries deterministic. A workspace name or slug is not proof of company identity.

Every resource operation resolves a provider-authenticated internal user, then rechecks active user/workspace/membership in the database. `WorkspaceStore` centralizes mandatory workspace predicates and membership locks. Owner can add assets and run observations. Viewer can read. There is no membership-edit or owner-removal path in this slice. Membership revocation during collection prevents returning or preserving the source. Known resource identifiers do not establish access.

**RLS is deferred.** Current isolation is application authorization plus scoped SQL and relational constraints, not a database RLS claim. Tenant tests exercise this actual query/API layer using a separate test database, not the production runtime role. Production multi-worker execution quotas, operational retention and abandoned-run recovery remain later hardening; this slice retains the existing process-local two-run concurrency, ten starts/minute and one start/hostname/minute limits. Workspace capacity is bounded to twenty assets and thirty-two retained/active runs. Capacity errors never delete old runs.

## Execution and immutable source

The path remains authenticated Owner → authorized workspace/asset → internal `runSnapshot()` → existing `validateExternalSnapshot()` → PostgreSQL. No app-to-app HTTP, public endpoint broadening, duplicate runner, OFFSEC executor, or arbitrary ports. The engine retains public-address safety, redirect/TLS bounds, deadlines and network budgets. Product mutations require a same-origin JSON body of at most 1 KiB and fixed keys; callers cannot inject transports or check options.

A run starts as running and transitions to completed only with the complete validated `ExternalSnapshotV1`, completion time and SHA-256 digest. Failed execution records failed without a manufactured source. Both the query layer and a PostgreSQL trigger prevent updating/deleting completed sources. Reruns append new IDs. Observations and reports project the preserved snapshot; no separate observation table duplicates it.

Digest contract: recursively sort JSON object keys by UTF-16 code units; preserve array order; use JSON string/finite-number encoding without whitespace; hash the resulting **UTF-8 bytes using SHA-256**, lowercase hex. JSONB may reorder keys internally; reads canonicalize again and check correspondence. JSON downloads use those same canonical bytes. Every source field is retained. This is not signing, source-system authentication or tamper-proof storage.

“Clear” applies only to an individual expected observation, never overall security. CHECK_ERROR remains Undetermined, with its raw status in provenance. DMARC and HSTS retain the production contracts. Environment changes compare collected observations under unchanged methods; new/removed checks and method/profile changes are Coverage. Collection uncertainty is not a security finding. Old runs stay unchanged.

## Validation

```sh
pnpm app:test
pnpm --filter @witnessops/app test:db
pnpm test:app-browser
pnpm app:build
pnpm --filter @witnessops/app lint
pnpm --filter @witnessops/app typecheck
pnpm health
```

`test:db` requires only **TEST_DATABASE_URL** in `.env.test.local`. It refuses a non-loopback target or a database name not ending `_test`, creates a unique disposable schema, applies real migrations, and drops only that schema afterward. It never falls back to DATABASE_URL. It covers identity, atomic workspace creation, persisted sources, known A/B resource IDs, Viewer denial and revocation through the runtime authorization path. A new pool lifecycle confirms durable reads. These are deterministic replay tests; no public network collection occurs.

`pnpm health` remains the repository's build/lint/type/unit gate and includes the ordinary app tests. Database integration and Chromium/WebKit browser tests are **separate explicit acceptance commands** because they require local PostgreSQL/browser prerequisites. Browser UI tests use deterministic route fixtures; real HTTP negative tests reject absent/forged sessions and malformed callbacks. They do not substitute for a real hosted AuthKit login/logout test. No formatter is configured; use ESLint and `git diff --check`.

## Deferred and production prerequisites

No invitations, billing, schedules, Public Services/IP/ports, OFFSEC, SSO/SCIM, advanced RBAC, notifications, PDF generation or public report sharing. Members are read-only. Edit checks explains the fixed ten-check method.

Before `app.witnessops.com`: separately authorize DNS/TLS/app routing, runtime/image publication and deployment; configure the production WorkOS client and exact HTTPS callbacks/sign-out URLs; custody runtime secrets separately; provision PostgreSQL backups/recovery/retention and migration grants; establish production session/operational limits and multi-worker execution admission. RLS is a later hardening layer. Public release commands still target witnessops-web; this slice does not deploy either application.
