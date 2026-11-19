# Work Mode — complete ChatGPT handoff

**Prepared:** 19 November 2026. **Audience:** the owner, ChatGPT, and a developer helping prepare GitHub source and Mac releases. **Status:** development snapshot, not a certified public release.

## 1. Start here

Work Mode is a personally used macOS productivity app. Its central experience is a small draggable work/rest countdown with a slowly growing tree, not a website the owner must open each time. Lovable also runs a browser preview of the same interface. The app is already implemented; do not propose starting over or replacing its framework just to publish it on GitHub.

Read this document, `GITHUB_GUIDE.md`, `CHATGPT_START_PROMPT.md`, and the sanitized source snapshot together. The source is the authority for implementation. This handoff explains intent, current behavior, verification, omissions, and decisions that ChatGPT must not invent.

### What the owner requested in this update

1. An explicit **Restart** control after Stop, in addition to Resume. Restart uses the duration set in the main screen rather than the remaining countdown.
2. Grading for yesterday when a session runs after midnight, with a “Was this from yesterday?” option. Support sessions lasting more than two calendar days and repair an already-ungraded earlier day.
3. Thorough handoff material so ChatGPT can understand the existing app and help publish it on GitHub.

These interface changes are now in source and the Lovable preview. **They are not automatically installed into any previously downloaded Mac application. No updated signed/notarized Mac executable was generated in this update.** Rebuilding the desktop renderer and packaging a new application is a separate release step.

### Snapshot boundaries

- Source was inspected, tests executed, and the new timer/grading flows driven in a browser.
- Current database policy definitions were read without reading people's profiles or records.
- No GitHub account/repository was connected or published by this work.
- No license was chosen for the owner.
- No database policy or authentication setting was changed.
- No private environment values, login tokens, signing credentials, records, or database dumps are included in the handoff.
- Existing source comments and identifier names may use the underlying database provider's terminology; the product uses **Lovable Cloud**.

## 2. Product intent and preferences

### Identity and audience

- Product name: **Work Mode**.
- Intended first platform: macOS desktop, including Apple Silicon. The owner's M3 Pro and a friend's M1 both need an **arm64** build, not the Intel x64 build.
- Desktop deliverable: a `.app` application, usually transported as a ZIP or DMG. A `.dat` file is not the executable format needed here.
- The browser preview is useful for development and viewing tree growth, but is not the intended daily launch experience.
- Font: native Mac/system fonts, not a decorative AI-like display font.
- Preserve the simple screen. The owner previously asked to remove explanatory growth/session slogans and postpone a substantial visual redesign.
- Use a tree-like application icon rather than the default Electron atom.

### Friends are not a competition

The owner first considered competition but explicitly revised that direction to a friendly shared garden. No ranks, leaderboard, winners, pressure indicators, or performance scoring should be introduced without a new request. The intended sharing boundary is name and tree progress, not personal daily grades, written notes, or the detailed time chart.

Actual authorization has important exceptions described in the security section: do not repeat an unconditional “accepted friends only” privacy claim until those policies are corrected and tested.

## 3. User experience and exact timer semantics

### Main screen

The main screen contains the title, Friends and Settings controls, a growing tree, completed trees/forests, Work minutes and Rest minutes inputs, timer actions, the last fourteen recorded days' chart, and a daily grading action. Defaults are **25 work minutes** and **5 rest minutes**. Input state is constrained to **1–240 minutes** for each phase.

### Timer actions

| Action | Countdown | Recorded work/rest | Session identity |
|---|---|---|---|
| Start with no active session | Starts Work at configured work minutes | Adds only seconds actually counted afterward | New session, captures its local starting date |
| Stop | Pauses the countdown, returns to main screen | Keeps all recorded time | Keeps current phase, countdown, and session totals |
| Resume, unchanged current-phase setting | Continues exactly where Stop left it | Does not reset or fabricate time | Same session |
| Resume, changed current-phase setting | Resets the paused phase to that phase's new configured duration | Keeps existing time | Same session |
| Restart | Resets the **current paused phase** to its configured duration, even if unchanged | Keeps existing time | Same session, original starting day retained |
| End | Resets countdown to zero and phase to Work; opens grading | Keeps daily records and tree total | Clears session after showing its summary |

Restart intentionally does not always switch to Work: restarting a paused Rest countdown uses Rest minutes. This is the chosen interpretation of restarting the timer the user stopped. Changing only Rest minutes while Work is paused does not reset Resume's Work countdown; that change applies to a later Rest phase.

Restart is offered only when a session exists and is stopped. Resume and Restart both return to the floating countdown. They are distinct controls, not a replacement of Resume with Restart.

### Automatic cycle and alarms

Work reaches zero → alarm → Rest begins. Rest reaches zero → alarm → Work begins. The cycle repeats until Stop. Timer phases do not wait for a notification acknowledgment. Notifications are best-effort and require OS/browser permission; sound uses Web Audio synthesis. End also plays the selected sound.

Sound choices: Chime, Bell, Digital beep, Soft tone. Settings includes a test control, volume 0–100%, dark mode, and application opacity 20–100%. Right-clicking the running countdown opens an inline opacity adjustment. Native opacity applies through Electron; the browser preview cannot make the browser window itself translucent.

### Timer accounting limitation

The implementation uses a `setInterval` callback once per second and counts one second per callback. It does not reconcile elapsed time against a monotonic deadline or wall-clock timestamp. Sleep, throttling, or a blocked renderer can therefore undercount elapsed time. The browser validation used `clock.run_for`, which delivers each timer tick; a fast-forward operation that skips interval callbacks is not a realistic proof of accurate sleep recovery.

Do not “fix” this silently while preparing GitHub. It is a known separate reliability task requiring an explicit policy for sleep and suspended work time.

## 4. Daily grades and midnight behavior

### Grade schema

One rating per local calendar date contains:

```ts
type Rating = {
  goal: number;
  satisfaction: number;
  focus: number;
  note: string;
};
```

Categories in the interface: Daily goal reached, Satisfaction level, Focus level. Each is 0–5 stars, integer-rounded and clamped on save. Clicking the currently selected star returns that category to zero. The note is optional. There are no per-session ratings or separate multiple grades on one date: saving replaces that date's rating.

### New date selection

The grading dialog has an explicit date input, maximum today, and a checkbox labeled **Was this from yesterday?**. Checking it selects yesterday in the user's local timezone; unchecking selects today. The date input permits an older day, which also allows a previously ungraded day to be repaired after the app has been reopened.

At End, an overnight session defaults the grading date to the session's **original local starting date**. Same-day sessions default to today. Sessions starting multiple days earlier still default to their starting date, not just yesterday. The user can override that selection.

Manual Add grade/Edit grade defaults to today, but the same date control can select yesterday or an older day. For example, to repair the ungraded 18 November entry in the owner's screenshot: open Add grade, select 18 November, enter stars/note, Save.

### Important distinction: grade date versus recorded date

Changing the grading date moves **only the rating**, not the recorded work/rest seconds. Work before midnight remains on the previous date and work after midnight remains on the new date. Tree progress remains the total of work across all dates. This update does not retroactively move an overnight session's entire work to its starting day.

Example verified in the browser:

1. Session starts 18 November shortly before midnight in New York.
2. Work is counted both before and after midnight, then Rest begins.
3. End on 19 November automatically selects 18 November.
4. Goal 4, Satisfaction 3, Focus 5, note “Overnight session grade” save to 18 November.
5. 19 November still has its own recorded seconds but no rating from that save.
6. After a page reload, selecting yesterday loads the saved note/stars, and the chart tooltip shows them on 18 November.

### Date switching and existing ratings

Switching date loads that date's saved rating if available. Unsubmitted edits are held as in-memory drafts per selected date during the open dialog. Saving saves only the selected day's draft. Skip discards unsaved changes. A future date is rejected. Calendar arithmetic uses `Date.setDate`, not “subtract exactly 24 hours,” avoiding incorrect yesterday calculation around daylight-saving changes. Grade date is captured when the dialog opens, so a later midnight does not silently redirect its save.

The session starting date, active phase, and remaining countdown are in-memory state. Relaunching the app loses the active session; it does not lose successfully persisted daily records/ratings. Selecting a historical grade remains possible after a relaunch.

## 5. Storage and growing trees

### Persisted local data

`src/app/storage.ts` defines:

```ts
type DayRecord = { work: number; rest: number; note: string; rating?: Rating };
type Prefs = { sound: SoundId; volume: number; opacity: number; dark: boolean };
type Data = {
  days: Record<string, DayRecord>;
  totalWorkSeconds: number;
  settings: { work: number; rest: number };
  prefs: Prefs;
};
```

Work/rest values are **seconds**, settings are **minutes**, Cloud tree progress is **whole minutes**. Do not conflate these units. The key `grove-timer-data-v1` is historical and must remain unchanged unless a tested migration is supplied. “Grove” filenames and identifiers are historical, not an instruction to rename the product back.

Local data is saved on state changes, including each counted timer second. The reader merges default data/preferences and handles missing/malformed JSON. It does not comprehensively validate the loaded schema. Saving does not handle quota errors. Records are not encrypted by application code and are not a Cloud backup. OS profile security and disk encryption are separate protections.

Browser localStorage and packaged Electron localStorage are separate. GitHub does not include or synchronize those records. Installing a changed application identity or moving to a new Mac may change available storage and anonymous login identity; backup/migration must be designed before claiming seamless transfer.

### Tree formula

- A full tree needs **6,000 work minutes = 100 hours**.
- Growth is linear: 1% per work hour.
- Rest does not grow the tree.
- Completed trees move to a row above the currently growing tree.
- Ten completed trees become one forest, completed-tree count resets, and a new seed begins.
- `forestState(seconds)` returns forest count, completed trees within the current forest, and current fractional growth.
- At 3.5 tree lifetimes: forests 0, grownTrees 3, growth 0.5.
- At 12 tree lifetimes: forests 1, grownTrees 2, growth 0.

The tree is a custom SVG in `Tree.tsx`. The expanded viewBox avoids clipping its full crown. Native icon inputs are `electron/icon-src.png` and `electron/icon.icns`; browser favicon is a real PNG. Growth preview is intentionally available only on the browser preview Settings, not the packaged app detected through `window.grove`.

### Chart

The chart displays the last fourteen **recorded date keys**, sorted. This is not necessarily fourteen consecutive calendar days. Stacked Work/Rest bars use minutes rounded to one decimal. Tooltip shows date, minutes, rating stars, optional note, or “Not graded.” A date containing only a rating can have a zero-height bar; its grade can still be edited using the date input. There is no separate historical grade list.

## 6. Architecture and file map

### Two entry paths, one main application

```text
Lovable/browser
  src/router.tsx → src/routes/__root.tsx → src/routes/index.tsx
                                              ↓
                                    src/app/GroveApp.tsx
                                              ↑
Mac desktop
  electron/main.cjs → dist-electron/index.html
                     ← electron/renderer/main.tsx
```

The desktop renderer directly mounts the shared React app. It is not loading the published web URL and does not need the TanStack web server to run the local countdown. Friends still needs a network connection to Lovable Cloud.

### Key files

| File | Responsibility |
|---|---|
| `src/app/GroveApp.tsx` | Timer state/UI, intervals, audio, settings, chart, grading and dialogs |
| `src/app/session.ts` | Pure paused-timer decisions and local-calendar grading defaults added in this update |
| `src/app/session.test.ts` | Seven concrete tests for Resume/Restart/overnight defaults |
| `src/app/storage.ts` | Persistent local records, rating clamping, growth and forest formula |
| `src/app/storage.test.ts` | Five tests for time, grades and tree cycle |
| `src/app/Tree.tsx` | SVG growing tree |
| `src/app/Friends.tsx` | Anonymous name setup, friend code RPC, requests, garden, aggregate sync |
| `src/styles.css` | Global semantic tokens, Mac fonts, light/dark themes, drag/no-drag styling |
| `src/components/ui/` | Shared design controls; preserve existing variants/tokens |
| `src/routes/index.tsx` | Actual `/` route and Work Mode page metadata |
| `src/routes/__root.tsx` | Root shell, error/not-found screens, head links, Outlet |
| `src/router.tsx` | Router setup with a request-specific query client |
| `src/routeTree.gen.ts` | Generated route tree; do not edit by hand |
| `src/start.ts` | Web request/CSRF and authenticated function middleware |
| `src/server.ts` | Custom web SSR error wrapper |
| `src/integrations/supabase/` | Generated Cloud clients, auth middleware/storage and types; do not edit generated files |
| `electron/main.cjs` | Native window, floating mode, opacity, move-to-Applications prompt |
| `electron/preload.cjs` | Narrow `window.grove` bridge: setMini/setOpacity |
| `electron/renderer/` | Minimal local desktop HTML and React entry |
| `electron/vite.electron.config.mjs` | Desktop renderer build and root envDir |
| `drizzle/migrations/0000_migration.sql` | Actual existing Friends schema, policies and request RPC |
| `drizzle/schema.ts` | Generated blank schema; not the authoritative schema definition |
| `AGENTS.md` | Project and Lovable-managed technical constraints |
| `roadmap.md` | Lean completed/pending task list |

### Framework constraints

The installed stack is React 19, TypeScript, TanStack Start v1/Router, Tailwind v4, Recharts, Electron and Lovable Cloud. Consult `package.json` and `bun.lock` for actual versions: do not assume the older template's Vite version; the current manifest declares Vite 8.1.5. The main package is named `tanstack_start_ts`, version 1.0.0, private true, with productName Work Mode and main `electron/main.cjs`.

Preserve file-based TanStack routing; do not introduce React Router, a second root index, or a separate App.tsx page switcher. Generated route files and generated Cloud integration files are managed. App-internal web server logic belongs in TanStack server functions; externally called handlers require authenticated/verified TanStack server routes. The published server runtime is a Worker, not general Node. Native Electron main code is a different runtime and legitimately uses Node APIs.

No new server-side feature was added by this update. The timer/date helper is browser-safe and contains no network or filesystem dependency.

## 7. Desktop implementation and release reality

The main window is frameless, 1100×760, with hidden title bar and traffic lights. Floating mode saves its bounds, hides window controls, sets a minimum size and 280×96 bounds, makes it always-on-top across workspaces, and displays the countdown/Stop control. Stop restores saved main bounds and normal focus. The current mini placement uses the primary display, not the screen under the pointer; multi-monitor behavior merits separate testing.

Electron uses `contextIsolation: true` and `nodeIntegration: false`. The preload exposes only two named functions rather than arbitrary IPC. Nonetheless, explicit navigation/new-window restrictions, IPC sender/input validation, a desktop CSP, and release sandbox verification are not implemented or not established by this audit.

The first-launch “Move to Applications” dialog can run only **after macOS allows the process to start**. It cannot bypass Gatekeeper. The history includes ad-hoc signed ZIP builds and reports that downloaded apps were blocked by macOS. Ad-hoc signing does not prove identity to Apple and does not equal Developer ID signing or notarization.

For polished public distribution, plan a real Developer ID signature, hardened runtime/appropriate entitlements, Apple notarization, stapling where appropriate, and fresh-Mac/quarantined-download verification. This generally requires the owner's Apple developer enrollment and signing credentials. Never ask the owner to paste a signing private key or notarization password into ChatGPT, commit them to Git, or put them in renderer configuration.

“No Terminal required” cannot be promised from the current source/release setup. macOS's official Privacy & Security → Open Anyway flow may allow an intentionally trusted unsigned/unnotarized app, but it is not a substitute for completing release signing. Do not advise globally disabling Gatekeeper.

There is no verified committed release automation, auto-updater, installer/DMG pipeline, signing manifest or notarization script. There is no new executable in this handoff. Packaging instructions in the guide are proposed reproducible steps for a developer to execute and test, not a statement that they have passed on a Mac.

## 8. Friends and Cloud data model

### User flow

Open Friends → choose a trimmed name → create an anonymous identity if there is no session → insert own profile → receive a friend code. Another person enters that code; requests go through `send_friend_request`. The recipient can Accept/Decline; the sender can Cancel; either party can remove a friendship. Only accepted links render as friend trees in the garden.

This is an anonymous identity stored locally, not a recoverable email/password account. There is no name-change UI, email linking, sign-out, deletion, recovery or cross-device record merge in this version. A lost session may strand the old identity; do not promise that a friend code is an account recovery credential.

### Existing schema

`profiles`: id, display_name (1–40 characters), unique friend_code, nonnegative integer tree_minutes, updated_at. Profile ID is the authenticated user's UUID; existing profile schema has an auth lifecycle foreign key.

`friendships`: UUID id, requester, addressee, pending/accepted status, created_at. Both endpoints reference profiles; no self-links; unordered pair uniqueness prevents reversed duplicates. Application-owned tables live in public.

The RPC is SECURITY DEFINER with fixed search path and checks for an authenticated user. It normalizes the code with trim/uppercase and returns `not_found`, `self`, `exists`, or `sent`. Anonymous API callers without a session cannot execute it; signed-in anonymous accounts have the authenticated database role.

Four **hexadecimal** suffix characters mean 65,536 possible codes (`TREE-` plus 0–9/A–F). The UI's example `TREE-4K7Q` is misleading because K/Q are not generated. No collision retry or application request limit is visible in this code. Codes are identifiers, not secrets or authentication tokens.

### Synchronization

Aggregate tree minutes upload when the app is ready and every three minutes, plus on opening Friends. Upload uses floor(totalWorkSeconds / 60). It overwrites the own profile's tree_minutes and timestamp, not individual session rows. Without a session it does nothing. Network errors are best-effort; some operation errors are ignored. Friend reads refresh on opening and actions; there is no continuous live subscription or polling of the open garden.

Offline local timing continues, but there is no durable upload queue, final-on-exit flush, or authoritative cross-device merge. Cloud progress is not a backup of personal time, grades or notes. Because clients can change their own minutes, the value is not a tamper-resistant productivity metric, consistent with a noncompetitive garden.

## 9. Security and privacy findings before broad public use

### Verified current policy issue: pending requests reveal profile rows

On 19 November, a read-only policy inspection confirmed that profile SELECT permits any connecting friendship row, **without requiring accepted status**. Thus a pending request can make the connected profiles readable before acceptance. The garden visually filters accepted links, but UI filtering does not restrict API access.

The returned profile fields include ID, name, friend code and exact aggregate tree minutes. Cloud also stores relationship metadata and timestamps. The intended product statement “only name and tree are shared” describes the garden, not every field exposed by the authorized API.

### Policy risk: accepting a request may permit changing its endpoints

The existing update policy requires the caller to be the addressee and resulting status accepted, but does not explicitly freeze requester. The existing migration grants table-level UPDATE. That combination needs a direct-API permission test; simply using `.update({status:'accepted'})` in the interface is not enforcement. Source-derived risk: an addressee might retarget requester to another known profile UUID, subject to database constraints.

The live policy predicates were confirmed; a live exploit, full grant reconciliation, or production-user access test was **not** attempted. No database repairs were made because this request did not authorize a broader Friends redesign.

### Recommended follow-up, not completed here

1. Agree on what profile information is visible for pending requests and acceptance. A pending name preview may need a narrow public application function rather than exposing the whole profile.
2. Enforce accepted-only friend progress access where appropriate.
3. Restrict friendship acceptance to status changes; ensure requester/addressee cannot be retargeted through direct API writes.
4. Test unrelated users, requester, recipient, accepted friend, removed friend, unauthenticated caller and anonymous signed-in caller.
5. Review code namespace, collision retry and abuse controls before untrusted users can create many identities or requests.
6. Define account deletion/recovery and an accurate privacy notice.

These are a **before broad public use** checklist, not grounds to claim the private local timer is broken. Personal grades/notes are not uploaded by the examined Friends code. Publishing source and releasing a live Cloud-connected app are separate decisions.

### Configuration and secrets

The sanitized bundle deliberately omits all real `.env` files, hosted project configuration, account/session storage, signing keys, database data, and repository metadata. Value-free environment names are described in the guide. Public client configuration is embedded at renderer build time, so no secret may have a VITE_ prefix. A publishable client key is not an administrative credential; actual access must be enforced by database authorization.

The real project currently tracks `.env`; the sanitized handoff does not include it. This fact alone does not establish a leaked private secret because the file was not opened. Before public publication, inspect the file and history privately and remove genuinely private values from tracking/history under an approved safe procedure. An ignore rule alone cannot untrack a committed file. Never rewrite a Lovable-synced history casually.

Error-reporting hooks exist in the source, so do not claim “no telemetry whatsoever.” No always-on analytics behavior or complete privacy certification was established by this audit.

## 10. Validation performed for this update

### Automated tests

Executed:

```sh
bunx vitest run src/app/session.test.ts src/app/storage.test.ts src/test/app-routing.test.tsx
```

Result: **3 files passed, 13 tests passed**. Tests cover unchanged Resume, Work Restart, Rest Restart, changed-setting Resume, overnight default, multi-day default, year-boundary yesterday, local records, rating clamp and tree/forest cycle, plus `/` route matching.

### Browser end-to-end check

Checked the actual app at localhost in Chromium, using New York local time just before midnight:

- One-minute Work/Rest inputs, Start, elapsed ticks, Stop, Resume still 00:50.
- Stop, Restart reads 01:00, total recorded work unchanged by the action.
- Automatic Work→Rest transition, Stop, Restart Rest reads 01:00 and remains Rest.
- End after midnight defaults the previous date and checks yesterday.
- Enter stars/note, Save, verify previous day's persisted rating and next day's separate recorded seconds.
- Reload, use manual Add grade/yesterday, read saved note, inspect chart tooltip.
- Mobile width 390: paused controls fit with no horizontal document overflow.
- Screenshots inspected for the date dialog, saved tooltip and mobile paused layout.
- No runtime page errors in the exercised flow; current preview compilation reported build OK.

### Not verified by those results

Packaged Mac launch, Gatekeeper, notification/audio behavior on real Mac hardware, actual native window movement/translucency, sleep/resume reliability, historical data upgrades, Cloud settings, two-person Friends flow, or security exploit resistance. No updated binary was built. Do not convert passing browser tests into a claim of Mac release certification.

## 11. What ChatGPT should do next

Help the owner publish deliberately, in this order:

1. Explain the choice between private code backup and public source/open-source release; do not assume public is required immediately.
2. Read all handoff files and the sanitized source. State known behavior versus unresolved release/security issues.
3. Help connect Lovable Git sync through the owner-controlled settings, creating a new private repository.
4. Help review public source contents, environment tracking/history, screenshots, license and documentation.
5. Keep source backup separate from a signed/notarized Mac release. If distribution is wanted, create a reproducible staging/package pipeline with explicit architecture and public-only renderer configuration.
6. Ask the owner for decisions only they can make: repository visibility/name, license, Apple developer enrollment, release audience, Cloud public-use policy and account recovery requirements.
7. Propose fixes/tests for permission findings before welcoming unknown people to the Friends service; do not casually migrate the live backend from a local script.
8. Make one small verified change at a time; keep existing records and product preferences intact.

## 12. Sources and trust hierarchy

Authoritative sources are the snapshot's code, migration SQL, dependency manifest/lockfile and `AGENTS.md`. Official Git sync documentation was consulted on 19 November:

- https://docs.lovable.dev/integrations/github
- https://docs.lovable.dev/integrations/git-sync-overview

Earlier chat descriptions are intent/history, not proof of current implementation. Any older statement that notarization is complete, accepted-only profile access is enforced, desktop release commands exist in package scripts, or the latest interface is already installed on a friend's Mac must be checked rather than repeated.