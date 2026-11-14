# WitnessOps Academy

A small, independent static app for the Sovereign AI programme, based on the supplied Academy v1.1 design. It contains the Academy home and two pilot lessons on Verify results: **Report or evidence?** and **Same record, wrong scope?** The other three learning paths are labelled as not written yet.

## Run locally

Use the workspace's Node 22 and pnpm 9.15.4 toolchain:

```sh
pnpm academy:dev
```

Open `http://127.0.0.1:3003`. This preview binds to loopback only. The main website's development server can run independently.

The preview loads supported public files into memory before listening. Restart it after editing files; requests do not read from the filesystem. Dotfiles, symlinks and unsupported file types are excluded.

```sh
pnpm academy:test
pnpm academy:build
pnpm --filter @witnessops/academy start
```

The development build copies `public/` into ignored `dist/`. It is not the
production release artifact. The separate [static release source](../../deploy/academy/README.md)
packages only approved Git-tracked public files. There are no Academy runtime
dependencies. `academy.witnessops.com` is the intended hostname; the deployment
source does not configure live DNS, TLS or hosting by itself.

## Pilot boundary

The lesson helps a learner classify claims, cite artifacts, state a limit, and prepare a text answer. The learner explicitly copies an answer and pastes it into an existing conversation with Docs. Feedback is pasted back by hand before another attempt. The app does not contact a model or send answers. It has no accounts, database, analytics, storage, assessment, grades, or certificates. A reload discards the current attempt.

The learner exercises are under `docs/`, outside the served directory. The supplied teacher guide and answer key stay local and are ignored by Git; they are excluded from the public source and static build. Example records and truncated hashes are synthetic teaching material, not evidence of real infrastructure or verified file digests. The backup exercise refers to the **02:00 run**, which finished at **02:07:51 UTC**, rather than claiming it finished at 02:00. The price-file exercise includes a passing checkout check on staging. That record is a different environment from the production transfer and load report.

## Verification

`pnpm academy:test` runs focused Node tests, including static-route isolation and rejected writes. `pnpm health` retains the existing repository checks and includes the Academy tests/build. Browser acceptance must also cover desktop/mobile layout, keyboard navigation, claim choices, answer copying and clipboard fallback, manual feedback/retry, no persistence or network submission, and synthetic-evidence wording.

No live teaching session with Docs has been performed by these automated checks.
