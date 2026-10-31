# Contributing to qrcode-motion

Thanks for taking the time to help. This document covers the local loop, the scripts that guard every change, and the conventions this repository keeps.

## Prerequisites

- Node.js >= 26, declared in `package.json` under `engines`.
- npm, which ships with Node.js.
- Install exactly what `package-lock.json` pins, with `npm ci`.

## Local development

`npm run dev` starts Vite on port 5183 and serves the demo page, whose entry is `demo/main.tsx`. The demo never enters the published package.

## Scripts

Every script below is an exact value from `package.json`; this table is an index, not a second source of truth.

| Script           | Command                                                                                                                                                           | Purpose                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `typecheck`      | `tsc --noEmit`                                                                                                                                                    | Whole-program type check, no output files              |
| `lint`           | `eslint .`                                                                                                                                                        | Lint `src/**` and `scripts/**` through the flat config |
| `lint:fix`       | `eslint . --fix`                                                                                                                                                  | Same lint, rewriting whatever is auto-fixable          |
| `format`         | `prettier --write .`                                                                                                                                              | Format the repository in place                         |
| `format:check`   | `prettier --check .`                                                                                                                                              | Verify formatting without writing                      |
| `test`           | `vitest run`                                                                                                                                                      | Run `src/**/*.test.ts` once                            |
| `test:watch`     | `vitest`                                                                                                                                                          | The same suite in watch mode                           |
| `build:lib`      | `vite build --config vite.lib.config.ts && tsc -p tsconfig.build.json && node scripts/build-dts.mjs && node scripts/postbuild.mjs && node scripts/check-dist.mjs` | Build the library and assert its artifacts             |
| `build:demo`     | `vite build`                                                                                                                                                      | Build the demo into `demo-dist/`                       |
| `build`          | `npm run build:lib && npm run build:demo`                                                                                                                         | Both builds                                            |
| `check:package`  | `publint && attw --pack . --profile node16`                                                                                                                       | Package structure and dual-format type resolution      |
| `dev`            | `vite --port 5183`                                                                                                                                                | Local demo server                                      |
| `check`          | `npm run typecheck && npm run format:check && npm run lint && npm run test && npm run build:lib && npm run check:package`                                         | The full gate before committing                        |
| `prepublishOnly` | `npm run typecheck && npm run build:lib`                                                                                                                          | npm lifecycle gate before publishing                   |

`build:lib` runs five stages in order: the Vite library build, the declaration build through `tsconfig.build.json`, `scripts/build-dts.mjs` to flatten declarations into `dist/react/index.d.ts`, `scripts/postbuild.mjs` to emit `dist/react/index.d.cts`, and `scripts/check-dist.mjs` to assert the artifacts. Any stage failing exits non-zero.

## Before you commit

Run `npm run check`. It is a six-step chain — typecheck, format check, lint, test, build:lib, check:package — and it stops at the first failure. A documentation-only change must still pass `npm run format:check` and `npm run lint` at minimum.

## Tests

- Put new logic tests next to the code under `src/**/*.test.ts`.
- The runner is Vitest in the node environment, configured in `vitest.config.ts`; only `src/**` is collected.
- Keep every case deterministic: no `Date.now`, no `performance.now`, no `Math.random`. A case that depends on the wall clock or on randomness cannot reproduce a failure.
- Do not write snapshot tests.
- Canvas drawing is driven through a recording fake 2D context. Do not add a DOM testing library for it.

## Code style

Lint comes from the flat config in `eslint.config.mjs`: typescript-eslint recommended for `src/**`, plus `react-hooks/rules-of-hooks` as an error and `react-hooks/exhaustive-deps` as a warning. Layout comes from Prettier. The same config carries the local `local/english-comments` rule described under Comments.

No inline suppressions. Do not write `eslint-disable` comments: if a rule has to be relaxed, change the config and explain why in the commit message.

## Comments

Comments, test names, script output and diagnostics are written in English; Chinese stays for the translated documents (`README.zh-CN.md`, `CHANGELOG.zh-CN.md`, `CONTRIBUTING.zh-CN.md`, `SECURITY.zh-CN.md`) and for demo UI copy. The `local/english-comments` rule fails any comment that contains non-Latin characters.

A comment explains why — why this computation, why this order — never what the next line does. When behavior changes, the comment changes with it.

Keep it plain and factual. Avoid the shapes that make prose read as machine-written: openers such as "Note that", "It's worth noting", "In other words", "Essentially"; an em dash used as a narrative pause; exclamation marks; emoji; adjectives such as elegant, robust, seamless or powerful; the "not X but Y" pivot; a closing summary sentence; three-part lists added for rhythm.

## Documentation

`README.md` and `README.zh-CN.md` must change together, and this file must change together with `CONTRIBUTING.zh-CN.md`. Documents use repository-relative paths only; never a local absolute path.

## Commit messages

Use Conventional Commits: `feat`, `fix`, `docs`, `style`, `chore`, `test`, `refactor`, `perf`. The subject is one line; the body explains why. One commit does one thing.

## Pull requests

All fourteen CI steps must be green before a pull request can merge. Do not commit `dist/`, `demo-dist/` or `node_modules/`.

## Releasing

1. Replace `[Unreleased]` in `CHANGELOG.md` and `CHANGELOG.zh-CN.md` with a new version entry, set the same version in `package.json`, and run `npm run check` — all in one commit.
2. Tag it locally with `git tag -a v<version> -m "qrcode-motion <version>"`.
3. Push the commit and the tag. A `v*` tag triggers `.github/workflows/release.yml`, which reruns the gate chain on the runner and then runs `npm publish --provenance --access public`.
4. Publishing authenticates through npm trusted publishing: the workflow requests an OIDC token (`id-token: write`) and npm exchanges it for short-lived credentials. The repository stores no long-lived token. Do not publish from a local machine.
5. Never overwrite a published version. Deprecate a bad release with `npm deprecate` and publish a patch version.
6. Release notes are the version section of `CHANGELOG.md`. The repository keeps no `.github/release.yml`, and GitHub's generated notes are not used.

## What we do not accept

- Overwriting an already published version.
- Credentials or machine-specific absolute paths in any commit.
