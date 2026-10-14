# Publishing

Version 0.1.0 is a prepared first release. Building this repository does not publish it to npm.

1. Use an npm account with publishing rights and two-factor authentication.
2. Check the name: `npm view techtalks-skills`. A registry 404 indicates no package at that name, but does not guarantee npm will accept the name. Authentication or network errors are not availability evidence.
3. If unavailable, choose an owned scoped package name and update package metadata and installation examples consistently.
4. Run `npm ci --ignore-scripts`, `npm run check`, `npm test`, and `npm pack --dry-run`. Inspect the file allowlist and ensure no private files are packaged.
5. Build `npm pack` and install that tarball into a clean temporary project. Run the executable with `--dry-run`, then install, doctor, and remove.
6. Complete the agent evaluation matrix in EVALUATION.md. Record actual tool versions and observed behavior; do not infer success from file installation.
7. Authenticate with `npm login`, then run `npm publish --access public`. The prepublish hook repeats validation and tests. Complete npm's authentication requirements.
8. Check the published package and run `npx techtalks-skills@0.1.0 --version` from a clean directory. Tag the source commit only after publication succeeds.

For subsequent releases, update CHANGELOG.md, use `npm version patch` (or the appropriate semantic version), validate and repeat. Avoid automating publication with long-lived credentials. When adding CI publishing later, use npm's trusted publishing support and explicit release authorization.

Official guidance: https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/
