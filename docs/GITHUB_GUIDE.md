# Work Mode — GitHub preparation and Mac release guide

Prepared 19 November 2026. Read alongside `CHATGPT_HANDOFF.md`. Commands below are for an owner/developer working on a local copy, not proof they were run here. Do not paste secrets into ChatGPT.

## 1. Decide what “post on GitHub” means

| Goal | What to publish | What it does not do |
|---|---|---|
| Personal backup/collaboration | Private source repository through Lovable Git sync | Does not back up personal grades or local time records |
| Public source | Reviewed source and docs, plus a chosen license | Does not create a downloadable application automatically |
| Downloadable Mac app | Tested signed/notarized `.app` in ZIP/DMG as a GitHub Release asset | Does not require binaries to be committed into source history |
| Independently runnable fork | Source plus documented public config and separately provisioned backend | Does not clone hosted users, database data or auth settings |

Start private. A GitHub repository can later be made public after the checklist is complete. `package.json`'s `private: true` prevents package-registry publication; it does not control GitHub visibility.

## 2. Connect the existing Lovable project

1. In Lovable open **Project settings → Git → GitHub**. The chat + menu → Project → GitHub also leads to Git settings.
2. A workspace owner/admin authorizes a GitHub connection and grants access to the intended account/organization.
3. A project/workspace owner/admin connects this project to that account/organization.
4. Lovable creates a **new private repository** and starts two-way sync. It cannot connect this project directly to an already-existing GitHub repository through Git sync.
5. Confirm the repository and synced branch in the Git settings card. This assistant did not read or confirm that card for this project.

Connectors used for calling GitHub APIs are different from Git sync. A GitHub API connector is not needed merely to export this app's code.

Lovable syncs one selected branch. Changes on a different branch do not automatically appear in Lovable until merged into the selected branch or the selection changes. Work in a feature branch and merge a reviewed pull request when possible. Avoid force-push, resetting published history, rebasing/squashing already-synced commits or deleting the selected branch.

For a previously disconnected project, reconnecting creates another new repository rather than restoring the old link. Git operations on the provider and the Lovable settings card remain owner-controlled; ChatGPT should not claim to have connected them without confirmation.

## 3. What belongs in the repository

Keep application source, Electron source, actual dependency manifest/lockfile, tests, configs, database migration SQL and metadata, tree/icon assets, developer instructions and documentation. Keep the managed generated files needed for runtime, but do not edit them manually. A default README is not an adequate release guide; link to these docs or replace it deliberately later.

Review `.lovable` metadata and screenshot contents before making an existing synced repository public. The sanitized snapshot excludes `.lovable`, original screenshot captures, `.env`, and hosted project configuration intentionally. It includes a value-free `.env.example` in the exported source only. Do not copy an entire working directory into a public repository without inspecting it.

Exclude:

- node_modules and all generated build directories;
- native release ZIPs/apps/DMGs from source commits (use Release assets);
- real environment files and signing/notarization credentials;
- auth cookies, browser storage and application user-data directories;
- personal grades, notes, friend identities, database exports and logs;
- repository metadata when sharing archives with ChatGPT.

### Important `.env` warning

The existing repository tracks a real `.env`; its contents were not inspected in this update. The exported snapshot leaves it out. Before publishing the original synced repository publicly, review that file and its history privately. Public configuration is not the same as a leaked secret, but no secret-clean history claim has been established.

Adding `.env` to `.gitignore` does not remove a tracked file. A reviewed local operation such as `git rm --cached .env` stops future tracking without deleting the local file, but earlier commits still contain it. If genuinely private credentials ever entered history, revoke/rotate them first and agree on a coordinated cleanup; do not force-rewrite Lovable history as an automatic fix. Never modify the Lovable-managed environment file through a generic refactor.

Recommended ignore additions in an independently reviewed public copy:

```gitignore
.env
.env.*
!.env.example
*.p12
*.pfx
*.pem
*.key
*.mobileprovision
*.dmg
*.app/
*.zip
```

Adapt to intentionally tracked sample fixtures/assets rather than blanket-removing all files with these suffixes. Also run a trusted secret scanner against the full intended Git history; a clean sanitized ZIP does not certify the original repository's history.

## 4. Local development

Use `package.json` and `bun.lock` as authoritative dependency inputs. Pin and document Node/Bun versions when making the release reproducible; the repository has no confirmed runtime version manager configuration. Modern Vite/Electron may require a recent Node version. Do not assume a default Mac Node installation meets package engine constraints.

Suggested local first steps:

```sh
git clone <YOUR_NEW_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
bun install --frozen-lockfile
bun run test
bun run dev
```

Placeholders are repository choices, not credentials. If frozen install fails, inspect package/lockfile consistency and platform requirements rather than silently replacing the lockfile. npm may be used, but Bun is the included lockfile's package manager; avoid mixing new lockfiles without a decision.

### Existing scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Vite web development |
| `bun run build` | Web build, **not Electron renderer build** |
| `bun run build:dev` | Web development-mode build |
| `bun run preview` | Web build preview |
| `bun run test` | All Vitest tests |
| `bun run test:watch` | Watch-mode tests |
| `bun run lint` | ESLint |
| `bun run format` | Rewrites formatting; review resulting diff |

No Electron build/package/sign/notarize/release scripts currently exist in package.json. Do not invent a `bun run electron:build` command until it has actually been added.

## 5. Public configuration without secrets

The desktop Vite config reads `.env` from the project root and embeds renderer variables at build time. A public-only example is provided in the sanitized source:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

These are literal existing environment **names**, not a request for administrative credentials. Obtain legitimate public client configuration through the project's owner-controlled Lovable setup. Never paste a live backend URL, project identifier or private key into a public issue/ChatGPT transcript unnecessarily. Do not use the owner's live backend for arbitrary fork testing.

The client is lazily created, but the app calls Cloud session lookup on readiness; without required public config, Cloud integration can fail at runtime even though the local timer code is independent of it. A source export is not a ready-to-run offline release with Friends gracefully disabled unless that fallback is implemented and tested.

Only public values may use `VITE_`. Administrative database access, migration credentials, connector credentials and signing secrets must remain server/local secure configuration. Lovable Cloud does not give the owner a service-role key or database password to fetch from a provider dashboard. Do not fabricate either as a setup step.

Git sync transfers source/migration files, not hosted user records or auth/provider settings. It does not apply migrations automatically. Existing blank `drizzle/schema.ts` does not reconstruct the migration's schema; do not run schema generation against it and assume safety. Request managed database changes through Lovable.

## 6. Desktop developer build

The source implies these manual commands:

```sh
bunx vite build --config electron/vite.electron.config.mjs
bunx electron .
```

They are **derived developer commands, not scripts verified in this update**. The first generates dist-electron; the second uses the package's Electron main entry to load that local HTML. The desktop entry directly renders GroveApp and bypasses the TanStack web server. Keep the relative asset base and root envDir.

Verify on a Mac: main window, all actions, right-click opacity, dragging, Stop restoring bounds, notification permission/sounds, app re-opening, local data persistence, full tree crown, dark mode, and Friends with two controlled accounts. Check the current generated desktop assets rather than assuming a web build updates them.

## 7. Package without leaking development files

Prefer an explicit clean staging directory to packaging the repository root with broad exclusion guesses. Example workflow for a developer:

1. Run the verified desktop renderer build in the working source.
2. Create an empty temporary staging directory.
3. Copy only Electron main/preload, dist-electron, application icon and a minimal desktop package manifest.
4. Ensure all renderer assets are present; the manifest's main points to `electron/main.cjs`.
5. Inspect every staged entry, including hidden files. Verify no .env, repository metadata, credentials or user data.
6. Run packager against staging with an explicit output folder and architecture.

A minimal staging manifest can contain name, version, productName and main; the renderer is bundled, and the current main needs only Electron built-ins/Node path. A developer must confirm this remains true before omitting production dependencies.

Example **proposed** packager invocation, to adapt and verify:

```sh
bunx @electron/packager <CLEAN_STAGE_DIR> "Work Mode" \
  --platform=darwin --arch=arm64 \
  --icon=<ABSOLUTE_PATH_TO_ICON_ICNS> \
  --out=<RELEASE_OUTPUT_DIR>
```

Use `--arch=x64` for Intel. M1/M2/M3/M4-class Macs need arm64. A universal binary is a separate deliberate workflow; do not call two separate archives a universal build. Confirm compatible Electron release/download, app identifier/version, output and dependency completeness. Build/package output stays outside source commits.

No packaging command, signature, or notarization run in this update should be inferred from the example. A developer should automate it only after validating the staged result.

## 8. Signing and Apple checks

For a credible public download:

- Developer ID signing identity and secure certificate access;
- appropriate hardened runtime and entitlements for Electron;
- notarization with Apple's tools/service;
- verification/stapling as appropriate to the distributed format;
- archive preserving executable bits, symlinks and bundle contents;
- clean-machine/quarantined download checks for each supported architecture;
- release checksum and clear versioned filenames.

Typical verification commands for a developer on macOS include:

```sh
codesign --verify --deep --strict --verbose=2 "Work Mode.app"
spctl --assess --type execute --verbose=4 "Work Mode.app"
xcrun stapler validate "Work Mode.app"
```

Their success and actual signature identity must be inspected; a signature check passing alone does not establish notarization. Use documented current Apple/Electron procedures for signing/notarytool, keep secrets in a keychain or CI secrets, and verify a genuinely downloaded archive rather than only the build folder. The Move to Applications prompt cannot precede Gatekeeper authorization.

GitHub-hosted macOS CI and Apple enrollment may incur costs. Do not configure paid services or enroll the owner automatically. No auto-update endpoint/code is currently present.

## 9. Public-release checklist

### Source

- [ ] Owner confirms repository name/visibility.
- [ ] License chosen deliberately; copyright/attribution and icon provenance reviewed.
- [ ] README describes Work Mode and links to real setup/release guidance.
- [ ] Dependencies and exact lockfile checked; vulnerability/license review performed.
- [ ] Full intended Git history secret-scanned privately.
- [ ] No local records, logs, personal screenshots or credential files.
- [ ] Test/lint/build commands run in the intended environment with recorded results.
- [ ] Generated files and managed schema rules preserved.

### Cloud and privacy

- [ ] Pending profile visibility decision made and enforced.
- [ ] Friendship endpoints immutable through direct API acceptance attempts.
- [ ] Role/policy/grant tests cover stranger, pending, accepted, removed and unauthenticated users.
- [ ] Code discovery/collision/abuse controls reviewed for expected audience.
- [ ] Anonymous identity limitations and account lifecycle disclosed.
- [ ] Privacy notice accurately explains aggregate minutes, relationships and local grades.
- [ ] Forks/test builds do not unintentionally hit production accounts.

### Mac release

- [ ] Updated renderer includes Restart/date grading.
- [ ] Controlled upgrade preserves existing local records and identity.
- [ ] arm64/x64 support and minimum macOS version documented from actual testing.
- [ ] Official signing/notarization complete and checked.
- [ ] Real download opens on a clean Mac without unsupported security workarounds.
- [ ] Move to Applications prompt, notifications, mini mode and opacity checked.
- [ ] Offline behavior and sleep policy documented/tested.
- [ ] No env/secrets/user data inside application/archive.
- [ ] Release assets/checksums/version notes uploaded only after review.

## 10. Suggested first GitHub Release notes

Use this as a draft, not an assertion of a built release:

> Work Mode adds an explicit Restart for stopped Work/Rest countdowns, while Resume still continues unchanged timers. Restart preserves recorded time. Daily grading now supports yesterday and earlier dates, and sessions spanning midnight default to the starting day. Time records remain split by the actual day worked. This release's architecture/signing and tested macOS versions: [fill only after verification].

Until a new binary exists, label the change as a **source update**. Upload ZIP/DMG files as Release assets rather than embedding them in Git commits. GitHub rejects individual tracked files above its limits; deleting a large file only from the current tree does not remove it from existing history.

## 11. Useful questions for ChatGPT

“Review these documents and source, explain the risks before I make GitHub public, and give me the next safe step.”

“Help me choose a license; explain the implications without choosing for me.”

“Design a repeatable arm64 Mac release pipeline that stages only runtime files and handles Developer ID/notarization securely.”

“Propose isolated permission tests and a Lovable-managed repair for pending profile access and friendship endpoint updates.”

“Explain which checks require a real Mac and which can be done from source.”

## 12. Official references

- Lovable GitHub: https://docs.lovable.dev/integrations/github
- Lovable Git sync: https://docs.lovable.dev/integrations/git-sync-overview
- Electron: https://www.electronjs.org/docs/latest/tutorial/code-signing
- Apple notarization: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- GitHub releases: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

Lovable setup/sync guidance was looked up for this handoff. Apple/Electron/GitHub links are follow-up references; the exact current signing commands and CI configuration must still be checked before implementation.