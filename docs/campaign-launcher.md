# Steam-style launcher and campaign library

October 26, 2026 — local, not published.

Normal startup opens a Steam-style Dota 2 library page, using Valve's library
artwork, Steam wordmark, blue-gray shell and green Play button. Play shows a
brief Dota launch screen and then the campaign picker. Reduced motion skips the
transition. Library, Campaigns, sidebar campaigns, recent campaign and New
campaign are working navigation controls. This is a fan-made browser launcher;
it does not connect to Steam, authenticate an account or start the installed game.

The picker supports search by club or year and displays the selected campaign's
club badge, campaign date, starting year, region, money and difficulty. Load
campaign enters the existing era client without advancing the clock. New
campaign opens the existing organization/era/difficulty setup. Cancelling setup
returns to the picker. Organization settings and the campaign footer return to
the library; worker busy/simulation locks still apply. DEV patch previews bypass
the launcher and never save.

## Storage and compatibility

`campaign-library.ts` stores each career in a distinct
`aegis-manager-slot-v1:<UUID>` localStorage record with its saved timestamp and
original version-1 campaign JSON. `decodeSave` shares the original save
validation, historical reconciliation and optional-field recovery. Browsing
does not save, sync the office, or advance a campaign. Loading retains the
existing office reconciliation and autosave behavior.

The original `aegis-manager-campaign-v1` is immediately available as a legacy
campaign when there are no valid slots. Before starting the first new career,
the old JSON is copied verbatim into the `legacy` slot. Unreadable original JSON
is also preserved there for manual recovery. A loaded legacy career subsequently
autosaves into that slot. Other careers have independent IDs and never overwrite
it. The original key remains a best-effort compatibility mirror of the last
active career; slots are authoritative and a failed mirror write does not discard
a successful slot save.

Autosaves update only the active slot while inside the campaign. There are no
writes during library browsing or unconfirmed setup. Invalid slot records stay
in storage and produce a recoverable message while other saves remain available.
An authoritative-slot write failure produces a visible save warning. Returning
to the library flushes the active campaign and stays in the campaign if saving
fails. A new career can still be played if storage is unavailable, with the save
warning visible; it cannot persist until storage works.

Saves are browser/origin-specific, subject to browser storage quotas. The library
does not add Steam Cloud, account sync, import/export, deletion, renaming or replay
persistence. The compatibility mirror uses additional storage. Existing normal
and hosted origins were not opened during QA.

## Artwork and validation

Three unmodified Valve files are bundled locally, with URLs, sizes and SHA-256
hashes in [the asset ledger](launcher-assets.json). The Dota symbol uses the
original transparent artwork as a CSS mask. The layout is an adaptation of the
Steam library, with campaign-specific controls and no invented playtime, friend
activity, achievements, downloads or cloud status. Ownership remains Valve's;
the ledger is provenance, not an independent reuse license.

All **417 tests** pass, including seven new storage tests for read-only legacy
loading, independent careers, exact legacy preservation, repeat autosaves,
malformed records, quota failures, unavailable storage and a failed compatibility
mirror. TypeScript and the isolated production build pass with the existing
large-chunk warning. Browser QA on disposable localhost **5361** covers the Play
transition, empty picker, two real new careers, search, loading the first career
after creating the second, preserved club/date/cash, fresh-launch persistence,
settings return and 390px/320px library/picker containment. Temporary viewport
overrides were reset. Preview: `.local/steam-launcher-preview.png`.

Background jobs, combat/calibration inputs, existing source work and normal saves
are preserved. No commit, push, deployment or external message was initiated.

## Power button and save / exit follow-up

The Reborn Desk's top-right power icon and the shared management-page power icon
now open **Leave the game?**. The dialog offers Save and return to Steam (the
launcher library), Save and return to main menu (the campaign picker), Save
campaign (stay in play, with success feedback) and Keep playing. Close/Escape
cancel and preserve the current page. The system settings menu exposes the same
Save / exit game action in older clients. Preview-only clients disable quitting;
worker busy/simulation locks disable the power action. The mobile page header
keeps the power button visible.

Both exits synchronously save the current active slot before unmounting the
client. A failed write leaves the game and dialog open with an explicit error;
restoring storage and retrying completes the exit. This closes the in-browser
game view and returns to the requested launcher screen, without closing the
browser or controlling an installed Steam application.

Sixteen focused storage/menu/preview tests and TypeScript/isolated production
build pass (existing chunk warning). Disposable 5361 browser checks verify the
Desk and Squad power controls, explicit save feedback, both exit destinations,
failed-save retention/retry using an ignored local fault fixture, Keep playing,
Escape, unchanged campaign date/balance, and 390px/320px dialog containment.
No normal/hosted campaigns or existing jobs were changed; no publication.

### All-era power correction

The first follow-up missed the decorative beta and Source 1 Desk icons. Both
now use the same `ClientPowerButton` as Reborn, with their era's corner styling.
Their management-page headers also provide the power control next to the inbox.
Phone rules preserve the power button instead of hiding the last corner icon;
the narrowest later clients hide the compact funds shortcut and reserve space
for the exit control so it cannot be pushed outside the viewport.

The disposable `.local/era-power-qa.html` fixture checks all 32 historical
composites, two future samples, 19 dated transitions and 21 event variants:
**74 cases**, each on Desk and management-page headers at **1440px, 390px and
320px**. All **444 header checks** pass, including an actual exit callback,
disabled busy state and disabled preview-without-exit state. The first 320px
run exposed seven later/event headers overflowing; the final sweep passes all
three widths. The fixture uses disposable campaigns and no storage. Actual App
campaign checks separately confirm beta Save and return to main menu and Source 1
Save campaign / Save and return to Steam, with real local-slot writes on the
disposable 5361 origin. Screenshot: `.local/era-power-fixed.png`.

Sixteen relevant automated tests, TypeScript, isolated production build and the
CRLF-aware diff check pass. Existing campaign-save rules, worker locks and preview
isolation remain. Normal/hosted saves and background jobs are preserved; local
only, no publication.
