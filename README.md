# work-mode-app

This app will enhance your productivity.
I believe 9 to 5 is a structural stigma. 4-5 hours of focus will get 90% of your work one.

## About Work Mode

A personal macOS work/rest timer with a floating countdown, growing trees,
daily reflections, and a friendly shared garden. Built with Lovable using
Electron, React, TypeScript, TanStack Start, and Tailwind CSS.

## Status

This repository is prepared from the sanitized source export dated
**19 November 2026**. It contains application source and documentation, not a
downloadable Mac application or a signed/notarized release.

Uploading this snapshot to GitHub does not establish two-way Lovable Git sync.
To keep future Lovable edits synchronized automatically, connect the project
through Lovable's Git settings; see [the GitHub guide](docs/GITHUB_GUIDE.md).

## Features

- Alternating work/rest countdowns; default durations are 25 and 5 minutes.
- A draggable floating Mac timer with always-on-top mode and adjustable opacity.
- Stop, Resume, and Restart. Restart resets the paused phase's countdown while
  preserving recorded time.
- Daily goal, satisfaction, and focus ratings, plus optional notes.
- A date selector for previous-day grades. Overnight sessions default to their
  original starting date; work/rest seconds stay on the dates they occurred.
- One completed tree per 100 work hours, and one forest per ten trees.
- A Friends garden based on shared aggregate tree progress, without rankings.
- Local charts for the last fourteen recorded dates, sound choices, and dark mode.

## Architecture and data

The browser and desktop renderer share `src/app/GroveApp.tsx`. The Mac app loads
the locally built `dist-electron/index.html` through `electron/main.cjs` rather
than opening a hosted website. Friends uses Lovable Cloud.

Daily records, grades, notes, and preferences are stored in localStorage under
`grove-timer-data-v1`. This source snapshot contains no exported user records.
Browser and installed-app storage are separate. A GitHub source backup does not
back up or synchronize personal records.

| Location | Purpose |
| --- | --- |
| `src/app/` | Timer, grading, storage, tree visualization, and Friends |
| `src/routes/`, `src/router.tsx` | TanStack browser routes |
| `electron/` | Native window, preload bridge, desktop entry, and icons |
| `src/integrations/supabase/` | Generated Lovable Cloud integration |
| `drizzle/migrations/` | Exported database definitions |
| `docs/` | Product handoff, preparation notes, and GitHub/release guidance |

## Development

Use Node.js and Bun versions compatible with the dependencies in `package.json`
and `bun.lock`. This snapshot does not yet pin or verify a local toolchain.
Preserve the included Bun lockfile rather than introducing a second lockfile.

```sh
bun install --frozen-lockfile
bun run test
bun run dev
```

For Cloud features, create a local `.env` from `.env.example` and supply only
the appropriate public renderer configuration through your owner-controlled
Lovable setup. Example values are intentionally blank. Do not connect a fork
to someone else's live backend or put administrative credentials in `VITE_*`
variables. Missing Cloud configuration is not yet handled by a polished
Friends-disabled mode.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Browser development server |
| `bun run test` | Existing Vitest suite |
| `bun run lint` | ESLint |
| `bun run build` | Browser/server build; does not rebuild the desktop renderer |
| `bunx vite build --config electron/vite.electron.config.mjs` | Build the desktop renderer |
| `bunx electron .` | Start Electron after the renderer build |

The desktop commands follow the existing configuration but have not been run
during this repository preparation. No installer, signing, notarization, or
release automation has been added. Native launch can offer to move the app to
Applications; that dialog does not bypass macOS Gatekeeper.

## Known limitations

- Timing counts interval callbacks and can undercount during sleep or renderer
  suspension. Active sessions are not restored after relaunch.
- Friends uses locally stored anonymous identities with no recovery UI.
- The exported profile-read policy permits pending connections, and friendship
  updates need endpoint-immutability checks. The handoff records these findings;
  this preparation has not audited or changed the live backend.
- Local records are not encrypted by application code and are not backed up by
  the Friends service.
- A distributable Mac build, signing/notarization, and upgrade/data-preservation
  checks remain separate release work.

## Verification and project guidance

The supplied handoff reports 13 passing tests and browser checks. Those are
historical results from the export's author, not a new test run here. See
[PREPARATION.md](docs/PREPARATION.md) for the checks actually performed while
preparing this copy.

- [Complete product and technical handoff](docs/CHATGPT_HANDOFF.md)
- [GitHub and Mac release guide](docs/GITHUB_GUIDE.md)
- [Instructions for future development assistance](docs/CHATGPT_START_PROMPT.md)
- [Project constraints](AGENTS.md)

`SOURCE_REFERENCE.txt` is a frozen text copy of the original export for reference;
the individual source files are authoritative. Managed generated files and
database definitions should be changed through the project's Lovable workflow.

No project license has been selected. Keep the repository private while the
owner decides its intended audience and any licensing for public distribution.
