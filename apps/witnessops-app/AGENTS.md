# Product foundation

Use root instructions. WorkOS AuthKit owns customer identity/session; WitnessOps PostgreSQL owns workspace membership and product data. Production deployment remains separately authorized.

Keep the public External Exposure endpoint and engine contracts unchanged. Reuse the internal runner and preserve the complete immutable source snapshot. No OFFSEC executor or arbitrary ports. Do not equate provider identity, workspace name or asset creation with verified company/hostname ownership.

Register API routes and auth handlers in `src/lib/api-contract.ts`; maintain route parity. Use centralized current workspace membership and scoped queries for resource access. RLS is explicitly deferred.

Run `pnpm health`, focused app browsers and `pnpm --filter @witnessops/app test:db` for auth/persistence changes. The latter uses only the isolated local TEST_DATABASE_URL. Never print or commit local configuration or credentials. Use the explicit migration command; do not migrate at app startup.
