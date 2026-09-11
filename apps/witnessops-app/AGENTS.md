# Product foundation

Use root instructions. This app is a local product foundation, not production customer authentication.

Keep the public External Exposure endpoint and engine contracts unchanged. Reuse the internal runner and preserve the complete source snapshot. No OFFSEC executor or arbitrary ports. Do not represent local developer sessions as verified customer identity.

Register every API route in `src/lib/api-contract.ts`; maintain parity for function and const handler exports. Run `pnpm health` and focused app browser checks when changing this surface. Production auth, persistence and app.witnessops.com deployment require a separate implementation/release decision.
