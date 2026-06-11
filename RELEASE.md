# Releasing witnessops-web

Releases are SemVer git tags. Tagging triggers CI, which builds a signed image,
publishes it to GHCR, and creates a GitHub Release. Deploying that release to a
host is a separate, operator-run step.

## Versioning

- Format: `vMAJOR.MINOR.PATCH` (e.g. `v0.1.0`).
- `apps/witnessops-web/package.json` `version` is the source of truth for the
  number and **must match the tag** (minus the leading `v`). CI fails the
  release if they disagree.
- Pre-1.0 while the surface stabilizes. Bump:
  - **patch** for fixes and content,
  - **minor** for new user-visible capability,
  - **major** at the first stable public contract (`v1.0.0`).

## Cut a release

1. Open a PR that bumps `apps/witnessops-web/package.json` to the new version
   and updates any changelog. Merge it through the normal review gate.
2. Tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. CI (`.github/workflows/release.yml`) then:
   - builds the standalone image,
   - pushes `ghcr.io/witnessops/witnessops-web:v0.1.0`, `:0.1.0`, `:stable`, and `:<sha>`,
   - generates an SBOM and cosign keyless-signs the image,
   - publishes a GitHub Release with the receipt and deploy command.

   You can also run it manually from the Actions tab (`workflow_dispatch`) for an
   existing tag.

## Deploy a release

Deploys never happen from CI. On the target host, from a checkout of this repo:

```bash
cd deploy
./scripts/deploy.sh v0.1.0
```

See `deploy/INSTALL.md` for first-time host setup and `deploy/scripts/deploy.sh`
for `rollback` / `status`.

## Relationship to build-image.yml

`build-image.yml` builds a signed `:<sha>` image on every push to `main` — that
is continuous integration, not a release. `release.yml` is what produces the
versioned, human-meaningful artifacts you deploy. Both sign with cosign, and
`deploy.sh` trusts either workflow's signing identity.
