# Security Policy

## Supported versions

| Version | Supported                                     |
| ------- | --------------------------------------------- |
| 0.1.x   | Yes — the only line currently receiving fixes |

## Reporting a vulnerability

Report through GitHub's private vulnerability reporting entry: the Security tab, then "Report a vulnerability". Do not paste exploit details into a public issue.

## What you can expect

- We confirm whether the report is reproducible.
- We come back with a fix and disclosure plan.
- After the fix ships, we publish a patch release and record one Security entry in `CHANGELOG.md`.
- We ask you before naming you in the public credit.

## Scope

- Component rendering and the props surface.
- QR code generation and error correction handling.
- Canvas drawing and sizing.
- Published build artifacts and type declarations.

## Out of scope

- Vulnerabilities in third-party dependencies — please report those upstream.
- Problems specific to one local environment or toolchain.
