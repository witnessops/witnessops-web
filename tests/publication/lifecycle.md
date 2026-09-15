# path-to-regexp 6.3.0 consumer lifecycle

Disposition: **NOT EXECUTED FOR PUBLISHED PACKAGE**.

Path: app -> @workos-inc/authkit-nextjs 4.3.1 -> path-to-regexp 6.3.0.
The unchanged lockfile pins registry integrity
`sha512-Yhpw4T9C6hPpgPeA28us07OJeqZ5EzQTkbfwuhsUg0c237RomFoETJgmp2sa3F/41gfLE6G5cqcYwznmeEeOlQ==`.
The published tarball contains compiled dist output, no binding.gyp, and no
preinstall/install/postinstall scripts. It needs no consumer build.

Its source prepare command is `ts-scripts install && npm run build`.
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
