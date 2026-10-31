## [Unreleased]

### Changed

- Code comments, test names and build script output are English now, and the published type declarations carry English JSDoc.
- Release notes come from the version section of this changelog, so `.github/release.yml` is removed.

## [0.1.1] - 2026-10-31

### Changed

- The release workflow authenticates through npm trusted publishing: it requests the runner's OIDC token instead of reading a stored repository secret, and the repository no longer ships a long-lived publish credential.
- Dependabot ignores major TypeScript upgrades until `typescript-eslint` widens its peer range, instead of opening a pull request that fails `npm ci` every week.

## [0.1.0] - 2026-10-30

### Added

- `QrMotion`: cascading per-column character animation that settles every cell into a scannable code, with optional centre logo, replay control and reduced-motion fallback.
- `makeMatrix`: framework-agnostic QR matrix generation for error correction levels `L`, `M`, `Q` and `H`.
- Dual ESM and CJS builds with a single flattened type declaration, plus a local demo page that is not part of the package.
