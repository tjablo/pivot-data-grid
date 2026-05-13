# Publishing

This guide describes the public npm and GitHub release flow for `pivot-grid-table`. Run commands from the repository root unless a step says otherwise.

## Package Shape

The package publishes these public entry points:

- `pivot-grid-table`
- `pivot-grid-table/styles.css`
- `pivot-grid-table/tailwind-preset`

The npm tarball is controlled by `package.json`:

- `files` includes `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE`.
- `exports` defines the package root, CSS entry, and Tailwind preset entry.
- `sideEffects` keeps CSS from being tree-shaken away by bundlers.
- `peerDependencies` keep React and React DOM outside the bundle.
- `prepare` runs `npm run build`, so `npm pack`, `npm publish`, and GitHub installs build `dist` even though `dist` is not committed.
- `prepublishOnly` runs `npm run release` before a real `npm publish`.

The package homepage points to the deployed playground:

```text
https://pivot-data-grid.vercel.app/
```

The package repository and issue tracker point to the public GitHub repository:

```text
https://github.com/tjablo/pivot-data-grid
```

## Release Policy

Use prereleases until the public API has survived at least one real consuming app integration. The recommended first public version is:

```text
0.1.0-alpha.0
```

Publish alpha builds with the npm `alpha` dist-tag and mark the matching GitHub Release as a pre-release. Do not publish early API-hardening builds to npm `latest`.

Move to `latest` only when:

- the README examples work from the packed tarball in a fresh app;
- core, React, packaging, and CSS exports pass the release gate;
- the current known limitations are acceptable and documented;
- the next expected changes are additive or clearly documented as pre-`1.0.0` breaking changes.

## Release Gate

Run the release gate before tagging or publishing:

```bash
npm run release
```

This runs:

1. `npm run check`
2. `npm run typecheck`
3. `npm run coverage`
4. `npm run build`
5. `npm run pack:check`

`npm run pack:check` performs an npm dry-run and prints the exact files that would be published. The tarball should contain `dist`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json`.

## Pre-Release Checklist

Before any public version:

1. Confirm `main` is clean and contains only intended changes.
2. Confirm `package.json` repository, bugs, homepage, license, peer dependencies, files, exports, and sideEffects are correct.
3. Move user-facing entries from `CHANGELOG.md` `Unreleased` into the target version section.
4. Keep a fresh empty `Unreleased` section for the next release.
5. Run `npm ci`.
6. Run `npm run release`.
7. Run `npm audit --omit=dev`.
8. Confirm the package name if this is the first publish:

```bash
npm view pivot-grid-table
```

If npm returns package metadata, the name is already taken. If it returns a 404-style error, the name is likely available.

9. Build an actual tarball for smoke testing:

```bash
npm pack
```

10. Install the generated `pivot-grid-table-<version>.tgz` in a separate app and verify imports, CSS, types, and production build.
11. Confirm CI is green on the release commit.

## First Alpha Release

Use this when `pivot-grid-table` has not yet been published and the first public version should be an alpha:

```bash
npm version 0.1.0-alpha.0
git push origin main --follow-tags
npm publish --tag alpha --access public
```

If `package.json` is already set to `0.1.0-alpha.0` during release preparation, create the release commit first, then create tag `v0.1.0-alpha.0` on that commit and push with `--follow-tags`.

Create a GitHub Release from tag `v0.1.0-alpha.0`, mark it as a pre-release, and use the matching `CHANGELOG.md` section as the release notes.

Consumers install the alpha with:

```bash
npm install pivot-grid-table@alpha
```

## Normal Release Flow

For the next alpha:

```bash
npm version prerelease --preid alpha
git push origin main --follow-tags
npm publish --tag alpha --access public
```

For the first stable npm channel release:

```bash
npm version minor
git push origin main --follow-tags
npm publish --tag latest --access public
```

For patch releases after a stable version exists:

```bash
npm version patch
git push origin main --follow-tags
npm publish --tag latest --access public
```

GitHub tags and npm versions must match. Version `0.1.0-alpha.0` in npm corresponds to Git tag `v0.1.0-alpha.0` and GitHub Release `v0.1.0-alpha.0`.

## Changelog Rules

Use `CHANGELOG.md` as the source for release notes.

Before `npm version`:

1. Add a dated section for the target version.
2. Move user-facing changes out of `Unreleased`.
3. Keep categories scoped to `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, or `Security`.
4. Update compare links at the bottom of the changelog.
5. Keep internal-only cleanup out unless it affects consumers, release safety, or maintainability.

## GitHub Release Checklist

After pushing the version tag:

1. Open the repository Releases page.
2. Draft a new release from the matching tag.
3. Use the tag as the release title, for example `v0.1.0-alpha.0`.
4. Mark versions containing `-alpha`, `-beta`, `-rc`, or any prerelease suffix as pre-releases.
5. Paste the matching `CHANGELOG.md` section into the release notes.
6. Link to npm in the release notes after the package is published.
7. Verify the release points at the same commit as the npm package version.

## Trusted Publishing

Manual `npm publish` works, but prefer npm trusted publishing once the package exists and the release workflow is ready. Trusted publishing avoids long-lived npm tokens and can generate npm provenance attestations from GitHub Actions.

Minimum GitHub Actions requirements for future automation:

- use GitHub-hosted runners;
- use Node and npm versions supported by npm trusted publishing;
- set workflow `permissions` with `id-token: write` and `contents: write`;
- configure the matching trusted publisher on npmjs.com;
- run `npm ci` and `npm run release` before `npm publish`;
- choose `--tag alpha` for prereleases and `--tag latest` for stable releases.

## Post-Publish Verification

After publishing:

```bash
npm view pivot-grid-table version dist-tags
npm view pivot-grid-table@0.1.0-alpha.0
```

Then verify from a fresh app:

```tsx
import { DataGrid, PivotTable, pivotData, type PivotFieldConfig } from 'pivot-grid-table';
import 'pivot-grid-table/styles.css';
import pivotGridPreset from 'pivot-grid-table/tailwind-preset';
```

Minimum checks:

- TypeScript resolves package types.
- The CSS import works.
- `PivotTable` renders.
- `DataGrid` renders.
- Tailwind preset import resolves if the host app uses Tailwind.
- No duplicate React runtime warnings appear.
- A production build succeeds.

## Rollback

If a release is bad, publish a new patch or prerelease version. Avoid relying on npm unpublish as a rollback strategy.

If a dist-tag points at the wrong version, move the tag explicitly:

```bash
npm dist-tag add pivot-grid-table@<good-version> alpha
npm dist-tag add pivot-grid-table@<good-stable-version> latest
```

## References

- npm package.json docs: https://docs.npmjs.com/cli/v11/configuring-npm/package-json
- npm publish docs: https://docs.npmjs.com/cli/v11/commands/npm-publish/
- npm dist-tag docs: https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/
- npm trusted publishing docs: https://docs.npmjs.com/trusted-publishers
- GitHub releases docs: https://docs.github.com/repositories/releasing-projects-on-github/about-releases
- GitHub automatic release notes docs: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes
