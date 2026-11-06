# brace-expansion 5.0.12 consumer lifecycle

Disposition: **NOT EXECUTED FOR PUBLISHED PACKAGE**.

Path: root devDependency eslint-config-next 15.5.21 ->
@typescript-eslint/parser 8.57.0 ->
@typescript-eslint/typescript-estree 8.57.0 -> minimatch 10.2.4 ->
brace-expansion 5. The root pnpm override `brace-expansion@5` is currently
`5.0.7`. This review does not pin that dependency and does not change
the lockfile.
The reviewed registry integrity is
`sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==`.
The downloaded registry tarball has SHA-256
`ef8448ec78f20b692f04fa6d01f39b5ab34c66404bea3429f5a39c6c9e0be8b4`
and contains 13 files: LICENSE, README.md, package.json, and compiled
`dist/commonjs` and `dist/esm` JavaScript, declarations, source maps,
and package.json markers. It has no `src/`, no binding.gyp, and no
preinstall, install, or postinstall scripts. It needs no consumer build.

Its source prepare command is `tshy`.
The same prepare text is on the registry metadata for brace-expansion
5.0.7. The ledger is version-keyed, so this row admits only
brace-expansion 5.0.12. The package declares `tshy` ^3.0.2 and a tshy
export whose source entry is `./src/index.ts`. Source execution is a
build of that source tree. That behavior is **not** approved for source
or Git installs.

The published manifest also declares publisher scripts that are not
install hooks and are outside this admit, including `prepublishOnly`
(`git push origin --follow-tags`) and `postversion` (`npm publish`).

pnpm 9.15.4's registry dependency build path calls runPostinstallHooks, which
runs preinstall/install/postinstall only; workspace/root and Git preparation
are separate paths. Therefore this source prepare command has no subprocess,
network or filesystem effects in the registry consumer frozen install.
Git-hosted and git fetches use preparePackage, which runs the package
manager install when `prepare` is non-empty. That path can execute `tshy`
and is not approved. The exact ledger entry admits only this reviewed tuple.
Non-registry sources remain blocked, lockfile integrity changes remain
checked, and unknown lifecycle packages must still fail closed. No script
policy or global setting is relaxed.
