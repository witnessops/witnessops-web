# content-type 2.1.0 consumer lifecycle

Disposition: **NOT EXECUTED FOR PUBLISHED PACKAGE**.

Path: express 5.2.1 -> body-parser 2.4.0 -> content-type 2.1.0
on the separate body-parser candidate. This review does not pin that
dependency and does not change the lockfile.
The reviewed registry integrity is
`sha512-mj7UPXE0jaqaOsukNZRUEfEi2AcL7C/vwmwcHV0O97eO1E1pxBZuyjlZrx5seTaNBg1U6+o35wpa35Qfcc+7ag==`.
The downloaded registry tarball has SHA-256
`47a08ee5ddf87a96dd263aa942c5e04b2c5d26251e04affa8ace6804b450d758`
and contains six files: LICENSE, README.md, package.json, and compiled
`dist/index.js`, `dist/index.d.ts`, and `dist/index.js.map`. It has no
binding.gyp and no preinstall, install, or postinstall scripts. It needs
no consumer build.

Its source prepare command is `ts-scripts install && npm run build`.
That text is the same prepare script family already reviewed for
content-type 2.0.0 and path-to-regexp 6.3.0. The ledger is version-keyed,
so this row admits only content-type 2.1.0.
The declared @borderless/ts-scripts tool delegates build to TypeScript and its
install function invokes Husky outside CI. Source execution may modify Git hook
configuration and launch subprocesses. That behavior is **not** approved here.

pnpm 9.15.4's registry dependency build path calls runPostinstallHooks, which
runs preinstall/install/postinstall only; workspace/root and Git preparation
are separate paths. Therefore this source prepare command has no subprocess,
network or filesystem effects in the registry consumer frozen install.
The exact ledger entry admits only this reviewed tuple. Non-registry sources
remain blocked, lockfile integrity changes remain checked, and unknown lifecycle
packages must still fail closed. No script policy or global setting is relaxed.
