# Security policy

This repository contains an experimental, unofficial build of a password-manager browser extension. It has no security warranty or guaranteed response time.

## Supported version

Only the latest commit on the default branch is considered for security fixes. Older commits, local modifications, and third-party packages are unsupported.

## Report a vulnerability

Use GitHub's private vulnerability reporting for this repository. Do not open a public issue containing exploit details before a fix is available.

Never submit real:

- passwords or usernames;
- TOTP seeds, current codes, or recovery codes;
- KDBX databases, key files, or database metadata;
- private URLs, account identifiers, or unredacted screenshots;
- browser profiles, extension storage exports, or native-messaging payloads.

Use synthetic credentials and a minimal test page whenever possible. Include the affected commit, browser version, Strongbox version, reproduction steps, expected behaviour, and observed behaviour.

## Trust model

- Build from source and inspect the commit being installed.
- The extension receives credentials in memory when Strongbox returns them for display or filling.
- Browser storage contains settings, site exceptions, and custom-field mapping metadata, but not the mapped secret values.
- The official manifest identity is retained only because Strongbox's native-messaging host accepts that identity. This repository is not an official Strongbox release.
- No prebuilt package from an unknown source should be trusted merely because it uses the same extension identity.

## Scope

Reports about this repository's modified source are in scope. Problems in the Strongbox desktop app, the official store extension, Chromium, Firefox, or the KDBX format should be reported to their respective maintainers.
