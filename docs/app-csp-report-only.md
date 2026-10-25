# App Content-Security-Policy report-only rollout

This note is about the product app in `apps/witnessops-app`. The public website still uses `packages/config/next/security-headers.js` unchanged.

## What this change does

The enforced `Content-Security-Policy` is the same policy as before. `script-src` still allows `'unsafe-inline'`. `img-src` is still `'self' data: blob: https:`. `form-action` is still `'self' https://api.workos.com`. Building that extension now throws if the shared policy no longer contains the exact directive `form-action 'self'`.

Responses that go through AuthKit also send `Content-Security-Policy-Report-Only`. That header does not block anything. Its `script-src` is a per-request nonce plus `'strict-dynamic'` (and `'self'` for browsers that ignore `'strict-dynamic'`). It does not include `'unsafe-inline'`. Local `next dev` also allows `'unsafe-eval'` so the dev server can run. `img-src` is `'self'` because the app does not load external, `data:`, or `blob:` images. `style-src` is still `'self' 'unsafe-inline'`. `object-src`, `base-uri`, and `frame-ancestors` are copied from the shared policy. `form-action` keeps the WorkOS extension.

Report-host responses keep the header set they already return. They do not get the report-only policy. `/.well-known/security.txt` and the AuthKit bypass list (`/s`, `/api/shared-report`, `/api/billing/webhook`, with and without a trailing slash) are unchanged.

App `next.config.js` sends one `Referrer-Policy: no-referrer`. That is the value the app already appended, and the value its API responses already set. `no-referrer` sends no referrer. The public website still gets `strict-origin-when-cross-origin` from the shared file, plus any referrer override that website config already had.

## How to see violations

There is no report collector. Open the app, then the browser console. Report-only mismatches fire `securitypolicyviolation` events with `disposition` `report`, and the document response includes `Content-Security-Policy-Report-Only`. The enforced policy is the separate `Content-Security-Policy` header.

## Later enforcement

Enforcement is not on. A later change, reviewed on its own, would:

1. Read the report-only violations on signed-out, signed-in, and report-host pages.
2. Decide the style follow-up. Inline styles still need `'unsafe-inline'` or a nonce/hash.
3. Replace the enforced `Content-Security-Policy` with the per-request nonce policy, including the WorkOS `form-action` extension, and remove `Content-Security-Policy-Report-Only`.

Rollback is reverting this change. The headers are not stored.
