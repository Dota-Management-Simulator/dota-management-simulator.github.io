# Dota client menu presentation

October 23, 2026. Local, not published. This supersedes the illustrated headquarters/map presentation.

The user requested a menu that feels like being in Dota. The design follows the composition of [Valve’s Reborn dashboard](https://www.dota2.com/reborn/part1/): top navigation, a prominent hero showcase, a party-style starting-five panel and a persistent lower-right primary action. It retains Aegis’s management actions rather than presenting unavailable matchmaking, chat, cosmetics or online-player counts.

## Menu evolution

The user then supplied classic-client and 7.00 screenshots and requested that the menu evolve with campaign updates. `src/menu-eras.ts` derives its presentation from `campaignPatch`, not the host date, the campaign’s year alone, an opened historical note or a saved theme setting. Reload derives the same result without adding save fields. Era styling also applies to the shell while browsing management screens, without keying/remounting the tournament worker.

| First in-game composite | Presentation | Original release / reference |
| --- | --- | --- |
| 2011.1 | Beta stone frame (see 2011–2015 client menus) | Copied from a December 2011 beta capture; replaced the earlier representative bulletin layout on October 24, 2026 |
| 2012.2 | Source 1 client, with dated events and TI screens | Copied from 2012–2015 captures; first real date of this layout unchecked |
| 2016.1 (from September 9, 2015 on the campaign clock) | Reborn client: top bar, card grid, party / chat / PLAY DOTA bar (see Reborn client menus) | [Reborn](https://www.dota2.com/reborn/part1/), September 9, 2015 |
| 2017.1, 2018.1, 2023.1 | Same Reborn client; the era names (New Journey, later showcase, New Frontiers) now only pick labels | Replaced the representative banners and hero showcase on October 24, 2026 |
| 2027.1 onward | Explicit alternate-future identity | Fictional campaign progression; no invented Valve release/source |

The composite clock intentionally compresses releases: Reborn’s in-game `2016.1` starts August 9, 2015, and New Journey’s `2017.1` starts August 14, 2016. Those are not the real release dates. Era headings retain the original release date separately. Each phase refreshes the active patch title, description and release-pool arrivals even when its larger menu era stays the same. A 7.00-style banner can therefore remain during `2017.2`, with its actual 7.06 composite stated below it. Newly available heroes use the same `patchHeroArrivals` helper as the existing patch introduction; unknown/private hero strength never enters the menu.

These are distinct, functional adaptations of the major eras requested, not pixel-perfect reimplementations of every client revision, TI promotion or Battle Pass. The supplied reference screenshots are not bundled, and their personal names, chat or account statistics are not copied.

## Event screens

*Superseded on October 24, 2026 by [Reborn client menus](#reborn-client-menus-2015-onward): events now follow the campaign date, and `EventDashboard.tsx` was removed. Kept for history.*

October 24, 2026. The user asked for the Desk tab to be the Dota symbol, a closer match to the client and more event screens like Crownfall and Nemestice. The Desk tab is now the Dota symbol (`public/dota-menu/dota-symbol.png`, labelled "Manager’s Desk"); it returns home from every screen.

`src/menu-events.ts` picks an event screen from `campaignPatch`, replacing the era lobby for that composite. Each event has its own layout in `src/EventDashboard.tsx` and `src/event-menus.css`:

| Composite | Event | Original release |
| --- | --- | --- |
| 2020.2 | Aghanim’s Labyrinth | July 14, 2020 |
| 2021.2 | Nemestice (violet landscape and logo) | June 23, 2021 |
| 2022.2 | Diretide | November 3, 2022 |
| 2024.2, 2025.1 | Crownfall: four chapter cards opening Squad, opponent scouting, Training and the season calendar | April 18, 2024 |

Other composites keep their era lobby. After an event’s first composite, the **Event screens** picker on the Desk can show any earlier event again; that choice is presentation only. Events add no event gameplay, rewards or save fields. Menu effects have a pause control and respect reduced motion.

## 2011–2015 client menus

October 24, 2026. The user asked for each event and each TI to change the main menu and to match the real client "not just theme like it". The research is in [the reference catalog](dota-menu-references.md). Through 2015 the Desk now copies the real layouts instead of the earlier representative classic lobby (`ClientDashboard.tsx`, `client-menus.css`):

- **Beta stone frame, `2011.1`–`2012.1`.** Stone tabs Today / Updates / Play / Watch / Learn / Socialize, settings and power corners, a centre panel between two embossed Dota emblems, and Profile / Chat / Friends along the bottom.
- **Source 1 client, `2012.2`–`2015.2`.** Red-glow tab strip, the DOTA 2 wordmark, a left panel (Today with Blog / News / Updates sub-tabs, or Play with the mode list and Find a Match panel) and a right column with profile, chat and friends. Tab labels switch from Customize / Learn / Socialize to Store / Library / Community on August 12, 2013; the exact real date is unchecked.

Client tabs either switch the Desk's own view (Today, Updates, Play) or open the matching page: Store/Customize → Finances, Watch → TI race, Library/Learn → Heroes, Community/Socialize → Teams. The Dota symbol returns to the Desk as before. The client's own content maps to campaign data: profile → club, readiness bar in place of Battle Points, event wins; chat → inbox; friends → squad (ready / resting).

### Events (campaign date, inclusive)

| Window | Event | What changes | Date evidence |
| --- | --- | --- | --- |
| 2012-10-30 – 2012-11-14 | Diretide | Teal/ember woods backdrop, Diretide lead article, mode highlighted | Liquipedia / RPP (end ±1 day) |
| 2012-12-19 – 2013-01-08 | The Greeviling | Snowy pine backdrop, Valve's Greeviling sign in Find a Match | Start: Valve product update Dec 19, 2012. End unchecked. **No client capture: card layout inferred** |
| 2013-11-14 – 2013-12-11 | Diretide | Snowy backdrop, parchment Diretide card, PLAY DIRETIDE, hall-of-fame strip (your five) | Valve's Three Spirits page: Diretide treasure Nov 14–28. Runs on to Wraith-Night because the capture shows both |
| 2013-12-12 – 2014-01-03 | Wraith-Night | Snowy backdrop, Wraith King card with progress chevrons, two counters, PLAY NOW! and difficulty | Valve blog "coming December 12th"; end = Frostivus 2013 offer date on Valve's page |
| 2015-02-12 – 2015-03-02 | New Bloom Festival | Purple dusk and lanterns, Valve's sign, green button, countdown, points block, red buttons | Liquipedia / Gamepedia |

Counters and buttons hold campaign values: season progress to the next TI, event wins, readiness, next opponent and days to the next series. They add no event gameplay, rewards or save fields.

### The International

From the first day of the TI preparation month (the date a new campaign starts) through the event's last day, the Desk becomes that year's TI screen, filled from the campaign's TI record: pool, prizes, venue, dates and field (the registered run's teams when one exists, with your club highlighted).

| TI | Screen |
| --- | --- |
| 2012, 2013 | Today opens on the **International** tab, using Valve's TI2 panel art. Location / About / Main event; TI2 shows Valve's Seattle poster. TI3 has no capture, so it reuses the TI2 layout with a plain poster (inferred). |
| 2014 | The Compendium opens as a full-screen book: prize pool and distribution, then the teams and your road. The ‹ ≡ ↩ › bar and close button work. |
| 2015 | Red backdrop, a Compendium icon beside the profile, and a Compendium panel over Today using Valve's TI5 art and logo. The panel opens the same book. |

TI1 (2011) predates the client screens. TI6 onward: see Reborn client menus below.

### Art

Seven Valve images were added from its own event pages: Wraith-Night (`frostivus2013/03/bg_01.jpg`), the Greeviling sign, the New Bloom 2015 sign, the TI2 panel and Seattle poster, the TI5 image and Compendium logo. Sources and SHA-256 hashes are in [the asset manifest](dota-menu-assets.json). Backdrops (snow, lanterns, TI2 lightning, TI5 smoke) are CSS, not copied screenshots. Diretide 2013's parchment card is CSS because the original card art wasn't found. Community screenshots stay in the gitignored `.local/menu-references/` and are not shipped.

## Reborn client menus (2015 onward)

October 24, 2026. The user asked for the Reborn years next. From September 9, 2015 on the campaign clock the Desk copies the Reborn client (`RebornClient.tsx`, `reborn-client.css`). The 2016.1 composite starts a month earlier, straight after TI5, and keeps the Source 1 client until that date. This replaces the representative Reborn/7.00 banners and the later hero showcase; the showcase lobby now only serves the fictional 2027+ era.

- **Chrome, all years.** Top bar: settings, back/forward, the glowing Dota logo tab (home), Heroes / Store / Watch / Learn / Arcade, then mail, the armory shield and power. Heroes → Heroes, Store → Finances, Watch → TI race (with a Live badge while a run plays), Learn → patch notes, Arcade → Teams. Bottom bar: party slots (your five, opening their profiles), the chat line (opens the inbox) and the big PLAY DOTA button, which opens the Play panel.
- **2015–2020 home:** three columns of cards copied from the June 2017 capture. My Profile, Battle Pass (Season outside TI) and Friends; New in Dota 2 (the latest major update's Valve art), Your last match, a Friends ladder, a next-series tile and the chat panel; a tall feature card and the feed.
- **Late 2020 onward home:** a left profile/friends column, a full-bleed feature (event art, or the latest update art) and a right promo column, copied from the Diretide 2020 and autumn 2025 captures. PLAY DOTA turns green.
- **Play panel:** Battle Cup / View lobbies / Create lobby, the event mode with its SPECIAL EVENT tag, then Ranked / Normal / Practice with bots. Ranked and Find match open the match centre; the others open the calendar, scrims, scouting or training.

Switches with no dated source use the earliest capture that shows them, so the real change may be earlier: the Dota Plus icon from 2019-12-18; the left-column home, green button and club-funds counter (in place of Shards) from 2020-10-29; Store renamed Armory from 2023-09-12.

### Events (campaign date, inclusive)

| Window | Event | Pattern | Date evidence |
| --- | --- | --- | --- |
| 2017-01-26 – 2017-02-06 | Dark Moon | Play column: story, three steps, points; PLAY DARK MOON | Liquipedia events list; GosuGamers launch report. The capture's "Event ends February 6th, 2017" agrees |
| 2017-06-08 – 2017-09-18 | Siltbreaker | Play column, plus the tall "Multiplayer campaign" home card | Liquipedia events list |
| 2019-12-18 – 2020-01-02 | Frostivus | The whole home is the event: title, dates, four cheer tiles, two progress bars, reward track (upcoming events) | Liquipedia; the capture shows "Dec 18 – Jan 2" |
| 2020-07-14 – 2020-10-09 | Aghanim’s Labyrinth | Play column (inferred: no capture) | Liquipedia and Fandom events lists |
| 2020-10-29 – 2020-12-22 | Diretide | Full-bleed Roshan art and logo, green logo tab, points row | cybersport.ru (October 29), GamingOnLinux (until December 22) |
| 2021-06-24 – 2021-08-17 | Nemestice | Battle Pass page: logo, breadcrumb, week tabs, star progress, quest cards | Liquipedia; PCGamesN launch post |
| 2022-11-03 – 2023-01-12 | Diretide | As Diretide 2020 with the 2022 art (inferred: no capture) | Dexerto, Sportskeeda, WIN.gg |
| 2024-04-18 – 2025-02-06 | Crownfall | Full-bleed art with the four act shortcuts | Valve page (start); Valve's January 15 "Crownfall's Final Bow" as reported by esports.net (end) |
| 2025-08-05 – 2025-11-05 | Quartero’s Curios | Centre panel: title, number badge, three featured players with tier pips, results and upcoming track, end date | Liquipedia; esports.net launch article |

Quests, points and tracks hold campaign values (readiness, event wins, messages, upcoming events). They add no event gameplay, rewards or save fields. The Fall 2016 Battle Pass is left out because its start date wasn't confirmed. Frostivus 2017 and 2018, the Underhollow, Frostivus 2023 and later events have no capture yet.

When a TI window overlaps an event (Siltbreaker and TI7, Crownfall and TI13, Curios and TI 2025), the TI screen opens first. The event stays in the Play panel and in the Event screens picker.

### The client is the Desk's whole interface

Later on October 24 the user called the app's own header (AEGIS, Squad / Practice / Compete / World / Club) and the Continue footer redundant on the Desk. For every client era (2011–2026) the Desk now hides them, along with the Club briefings, and the copied client carries everything (`ClientShell.tsx`, context supplied by `App.tsx`):

- **Every page is under a client tab.** One-page tabs open directly; others open a dropdown. Reborn: Heroes (Heroes, Patch & meta), Store/Armory (Finances, Player scouting, Staff), Watch (TI race, Season calendar, Season history), Learn (Training, Scrims, Scout your next series), Arcade (Teams); the party icon opens Squad and the mail icon the inbox. Source 1: Store/Customize, Watch, Library/Learn (Heroes, Patch, Training, Scout next series), Community/Socialize (Teams, Squad, Scrims). Beta: Watch, Learn (Heroes, Patch, Training, Scrims, Scout next series), Socialize (Teams, Squad, Player scouting, Staff, Finances). Menus are fixed to the viewport so the scrolling tab strips can't clip them.
- **Continue** is the big PLAY DOTA button on Reborn (it carries the real action label and the next-step text above it) and a green button beside the date and funds on Source 1 and beta. The date, club funds and net per week sit under the Reborn top bar (or in the club-funds counter from late 2020).
- **The cog** holds the handbook, light/dark mode for the other pages, organization settings, menu effects and the save status.
- The briefings' data already lives in the client panels and on the Inbox, Squad, TI race and History pages. The 2027+ showcase Desk keeps the app header, footer and briefings.
- Other pages keep the app header and footer, with Back to Desk.

### The International

| TI | Screen | Source |
| --- | --- | --- |
| 2016 (TI6) | Battle Pass purchase screen over the home: The Event (venue, dates, your entry, field) and Prize pool (total and places), with Season calendar / TI race buttons | May 2016 capture |
| 2017–2019, 2022 | The same purchase screen with that year's Valve art | Inferred: no capture |
| 2021 (TI10) | Full-screen dark stone Compendium: gold plaque and sections, Aegis art, prize pool, team badges, dates and venue | October 2021 capture |
| 2023 (TI12) | Blue sidebar Compendium: sections, level badge, friends, Supporters Clubs grid of the field | 2023 capture |
| 2024 (TI13) | Green Compendium with theatre curtains, opening on the prize rewards | August 2024 capture |
| 2025, 2026 | Sidebar Compendium in navy / red | Inferred: no capture |

Editions skip 2020, so 2021 is TI10. The TI 2025 and 2026 records have no field yet, so their team grids say so.

### Art

Valve's past-updates page (`dota_react/pastupdates/*_social`) supplied ten update images (Reborn, 7.00, Dueling Fates, 7.20, Outlanders, Mistwoods, Primal Beast, New Frontiers, Facets & Innates, Wandering Waters) and the TI6–TI10 and TI 2023 images. The Diretide 2020 header and logo come from `dota2.com/diretide`, the Siltbreaker image from the TI7 Battle Pass page, and the Battle Pass and TI logos from the TI7 Battle Pass page and the site script. All are listed in [the asset manifest](dota-menu-assets.json). Dark Moon, Frostivus 2019, Quartero's Curios and TI13 are drawn in CSS because no Valve art for them was found.

## Interface

- Desk, Squad, Practice, Compete, World and Club are now angular top tabs. Their animated dropdown panels retain all fourteen management destinations. Back to Desk continues to return from screens and App-level dialogs; the Aegis button also returns home.
- Later-era showcases use Valve’s actual Axe, Anti-Mage, Crystal Maiden and Monkey King renders and idle WebM animations. Monkey King is unavailable before his `2017.1` composite; the 7.00 banner uses his still render. The clearly labelled hero showcase is decorative: selecting a hero changes only the menu presentation, not a draft, player preference, hero pool, patch knowledge or combat input.
- One muted, inline video plays at a time. Pause replaces the video with its still render, and reduced-motion preferences begin with the still. A later switch to reduced motion also stops animation. Leaving the Desk unmounts its video. A playback error falls back to the still.
- The team name/badge, region, year, actual five and energy, next registered opponent/event, current patch and unread messages come from the campaign. The next-challenge card and persistent primary action use the existing competition/Continue functions.
- Date, finances and the primary action sit in a fixed bottom strip. Navigation/advancement/replacement-campaign locks remain active during preparation, simulation and result review. The primary control retains its true action label, with bronze styling in the classic era and green in later eras; browsing never advances time.
- Detailed decisions, standings, squad readiness, activity and history remain available in the expandable **Club briefings** below the main lobby. Management pages retain their existing light/dark and club appearance; the client chrome and lobby use their own charcoal/steel palette, red highlights and restrained gold.
- Small screens retain the top tabs and a full-width primary action. The briefing column stacks, the party strip scrolls internally, and oversized hero artwork is clipped inside the stage rather than widening the document.

## Assets and sources

Twenty-two local files live under `public/dota-menu/`, including the Dota symbol and the Labyrinth, Nemestice, Diretide and Crownfall event art from Valve’s event pages. Two unused downloads were moved to `.local/art-history/`. The exact source URLs, sizes and SHA-256 hashes are in [the asset manifest](dota-menu-assets.json). Sources are Valve’s [Dota site](https://www.dota2.com/home), its [Axe hero page](https://www.dota2.com/hero/axe), and the official site JavaScript’s `VIDEO_URL + heroes/renders/{hero}.png` / `.webm` paths. The site’s styles reference `backgrounds/greyfade.jpg`. Its page configuration points to `https://cdn.steamstatic.com/apps/dota2/`. The Reborn and 7.00 pages’ own CSS supplies their banner and stone-texture paths. The Monkey King banner combines Valve’s 7.00 landscape with the separate official Monkey King render using CSS; no generated substitute is used.

Hero artwork and animation are © Valve Corporation; this records provenance, not a new reuse licence. The lobby bundles its source copies and uses the Vite base path without runtime requests to Valve. The **Heroes** gallery additionally streams selected hero models and lazy portraits from Valve's CDN, with bundled-icon fallbacks; see [gallery behavior and sources](heroes-preseason.md). These are modern renders without invented historical artwork dates. Existing player portraits, club logos and minimap icons retain their own source/rights records. No generated replacement hero art is used.

The earlier AI village is no longer loaded or shipped from `public/`. Its local copy is preserved at `.local/art-history/headquarters-v1.png`; the [original generation record](headquarters-art.md) remains for provenance.

## Validation

- All 245 application tests pass, including five checks for composite boundaries, separate historical dates, all 32 phases, release gating, save reload/immutability and fictional future identity. TypeScript and production build pass with the existing bundle-size warning.
- Isolated browser QA at `http://127.0.0.1:5323/` reaches all fourteen screens through the tabs and returns with Back to Desk. Pause shows the static render; all three showcases are available, with real video decoding/playback checked.
- The current test campaign retains August 17, 2011, $76,000, its Natus Vincere roster and next TI fixture while browsing. The earlier real worker-map settlement remains documented in [game-hub history](game-hub.md).
- Separate era QA uses `http://127.0.0.1:5324/`. Real Continue advances a pre-boundary save from Classic to Reborn and then a second pre-boundary save from Reborn to Journey; ordinary patch introductions still appear and the new layouts survive reload. Patch-note/banner actions and player profiles return correctly. Later modern, Frontiers and future fixtures resolve their expected identities.
- Responsive checks cover 320px, 390px, 950px and desktop, including classic/Journey layouts, tab/popup containment, the fixed action strip, player profiles, briefing expansion and light/dark settings.
- Event screens (October 24): **252 tests** and build pass (existing chunk warning). In the `?patch-preview=` sandbox on 5323, 2020.2/2021.2/2022.2/2024.2 show Labyrinth/Nemestice/Diretide/Crownfall and 2025.2 returns to the lobby; no broken images or console errors. All four Crownfall chapters open their page and the Dota symbol returns to the Desk. The picker lists all four past events. 390px has no horizontal overflow; Codex also checked 320px light/dark and effects pause.
- 2011–2015 client menus (October 24): **256 tests** and build pass (existing chunk warning). Sandbox QA on 5323 opened all nine dated moments (five events, TI2–TI5) plus the beta and plain Source 1 clients; the TI4 book's pages and close work; Store/Watch/Library/Community open Finances/TI race/Heroes/Teams and the Dota symbol returns each time. No horizontal overflow at 390px or 320px; no console errors, failed requests or broken images on a clean load.
- Client as the Desk interface (October 24): **256 tests** and build pass. Sandbox QA: no app header, footer or briefings on the beta, Source 1, Reborn and TI10 Desks; tab dropdowns open fully visible and reach their page at 1136, 900 and 390px; Back to Desk returns; Continue advanced the sandbox from May 15 to May 22, 2017; the cog lists its four controls; no horizontal overflow at 390px.
- Reborn client menus (October 24): **256 tests** and build pass (existing chunk warning). Sandbox QA on 5323 opened TI6, TI7, TI10, TI12, TI13, TI 2025, Dark Moon, Siltbreaker, Frostivus 2019, Diretide 2020, Nemestice, Crownfall, Quartero's Curios (from the picker) and plain 2016 and 2022 homes. All 17 dated screens fit 390px without horizontal overflow and with no broken images; a clean load has no failed requests.
- No simulation rules or save schema changes. Independent calibration jobs remain untouched. No push, deployment or Discord message.
