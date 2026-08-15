# Strongbox AutoFill Enhanced

An experimental, unofficial enhanced build of the Strongbox Browser AutoFill extension, focused on a smaller interface, custom-field filling, and more reliable behaviour on modern sign-in pages.

> [!IMPORTANT]
> This project is not affiliated with, endorsed by, or supported by Strongbox or Phoebe Code Limited. It is a source-only unofficial build for people who are comfortable reviewing and building a password-manager extension themselves.

The official extension and support resources remain the right default for most users:

- [Strongbox Browser AutoFill upstream source](https://github.com/strongbox-password-safe/browser-autofill)
- [Strongbox support](https://strongboxsafe.com/support/)
- [Official Chrome extension](https://chrome.google.com/webstore/detail/strongbox-autofill/mnilpkfepdibngheginihjpknnopchbn)
- [Official Firefox extension](https://addons.mozilla.org/firefox/addon/strongbox-autofill/)

## Status

- Enhanced release: `1.2.3-enhanced.1`
- Upstream base: Strongbox Browser AutoFill `1.2.3` (`02efbde`)
- Stability: experimental; used as a personal daily-driver build, without a compatibility or support guarantee
- Distribution: source only; no Web Store package and no automatic updates
- Primary target: unpacked Chrome/Chromium on macOS with the Strongbox desktop app

## What is different

- Compact, Apple-inspired toolbar and inline-field interfaces.
- A small key button beside recognised login and verification-code fields.
- Scroll-safe credential details and stable popup dimensions.
- Custom-field AutoFill with remembered website-to-field mappings.
- Mapping metadata is stored locally; custom-field values remain in Strongbox.
- Passwordless entries can still appear when a matching URL and remembered field mapping exist.
- Improved email, username, and phone-number login detection.
- Improved TOTP handling, including one-time-code fields split into multiple boxes.
- Frame-aware AutoFill for embedded login forms such as Apple's sign-in widget.
- Dynamic-form detection for sign-in flows that add fields after page load.
- Safer cleanup when an unpacked extension is reloaded and an old page retains an invalid extension context.
- Complete translation-key coverage across all 16 bundled locales.

## Install from source on Chrome

Requirements:

- Node.js 20.9 or newer
- Strongbox installed and running on macOS
- Browser AutoFill enabled in Strongbox
- Git and a Chromium-based browser with extension developer mode

Build the extension:

```sh
git clone https://github.com/qionq/strongbox-autofill-enhanced.git
cd strongbox-autofill-enhanced
npm ci --ignore-scripts
npm run verify:all
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Disable the official Strongbox extension. Chrome cannot keep two extensions with the same ID active.
4. Choose **Load unpacked** and select `dist/chrome`.
5. Reload any web pages that were already open.

The public manifest key is intentionally retained so the unpacked extension keeps the extension ID accepted by Strongbox's native-messaging host. This is a compatibility measure, not a claim that this build is official.

### Update

```sh
git pull --ff-only
npm ci --ignore-scripts
npm run verify:all
```

After rebuilding, use the reload button for the extension on `chrome://extensions`, then reload open web pages.

### Roll back

Disable this unpacked build, re-enable the official store extension, and reload open web pages. Your KDBX databases are not modified by switching browser extensions.

## Firefox

`npm run verify:all` also creates `dist/firefox`. The Firefox build retains the upstream extension ID for native-messaging compatibility, but persistent installation may require signing or a Firefox edition that permits temporary/developer extensions. Chrome is the routinely tested target of this enhanced build.

## Security and privacy notes

A password-manager extension is high-trust software. Read the source and build it locally.

- Credentials requested from Strongbox necessarily exist in extension memory while they are displayed or filled.
- Custom-field secret values are not persisted in browser storage.
- Browser storage contains settings, site exceptions, and field-mapping metadata.
- Inline UI communication uses a short-lived, authenticated private channel.
- Automatic fill messages are returned to the frame that announced the input fields, and credential matching uses that frame's document URL.
- The extension requires access to ordinary HTTP and HTTPS pages so it can identify and fill login fields.
- This repository does not recommend downloading extension ZIP files from third parties.

See [SECURITY.md](SECURITY.md) before reporting a vulnerability. Never include passwords, TOTP seeds, database files, recovery codes, or unredacted page data in a public issue.

## Languages

English is the source language and guaranteed fallback. The browser language is selected automatically unless the user chooses another language.

Bundled locales:

`de`, `en`, `en-GB`, `es`, `fr`, `hu`, `it`, `ja`, `nl`, `pl`, `pt-BR`, `ru`, `sv`, `tr`, `uk`, and `zh-Hans`.

Every locale contains the same key set and interpolation placeholders. Upstream translations were retained where usable, and obvious untranslated leftovers were completed. Fork-maintained translations should still be reviewed by native speakers.

## Development

Useful checks:

```sh
npm test
npm run lint
npm run typecheck
npm run build:chrome
npm run build:firefox
npm run verify:all
```

The test suite includes login-field detection, passwordless matching, automatic-fill policy, frame-targeted messaging, extension-context lifecycle handling, and localization integrity.

## Relationship with upstream

This repository is a modified version of [Strongbox Browser AutoFill](https://github.com/strongbox-password-safe/browser-autofill). The upstream project describes itself as open source but not open contribution and currently does not accept pull requests.

This repository primarily exists as an enhanced build for users who want these features. If any ideas or implementation details are useful upstream, it would be welcome to see them incorporated into the official extension.

## License and attribution

The project remains licensed under the [GNU Affero General Public License v3.0 or later](LICENSE.md). Original copyright and attribution notices are retained. See [NOTICE.md](NOTICE.md) for the modification notice and upstream attribution.

KeePass is created by Dominik Reichl and contributors. KeePassXC and the wider KeePass ecosystem have also informed several compatibility improvements in this build.

## Support

There is no support or maintenance guarantee. Reproducible bug reports and focused fixes are welcome, but public reports must contain only sanitised data.
