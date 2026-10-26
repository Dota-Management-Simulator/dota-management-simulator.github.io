# Dota client menu presentation

October 23, 2026. Local, not published. This supersedes the illustrated headquarters/map presentation.

The user requested a menu that feels like being in Dota. The design follows the composition of [Valve’s Reborn dashboard](https://www.dota2.com/reborn/part1/): top navigation, a prominent hero showcase, a party-style starting-five panel and a persistent lower-right primary action. It retains Aegis’s management actions rather than presenting unavailable matchmaking, chat, cosmetics or online-player counts.

## Reborn home emblem refinement — October 25, 2026

Local, not published. The user's reference shows the textured orange Dota emblem
on a raised stone home tab. `DotaHomeMark.tsx` now uses Valve's original
`home_logo_hover` plate in both the Reborn Desk and its management-page home
button. The unchanged local WebP, pinned extracted-client source and SHA-256 are
recorded in [the asset ledger](dota-menu-assets.json). Earlier beta and Source 1
logos retain their own presentation.

The selected home tab has moving heat within the emblem and eight drifting
embers; hover and keyboard focus brighten it. The inactive tab settles to a
dimmer still image. These small CSS effects adapt the client's `home_button`
particle scene, rather than reproducing the Source 2 simulation. They animate
transforms and opacity without management renders on each frame. The Desk's
existing Pause menu effects control stops them, hidden documents pause them,
and reduced motion retains the still artwork. The existing green event variant,
accessible button names, focus treatment and navigation are retained.

Validation: all 13 focused menu/preview tests, TypeScript and the production
build pass (existing bundle warning). Localhost 5173 checks cover the actual
Reborn Desk, Heroes navigation/home return, effects pause/resume and a clean
console; independent 390px/320px fixtures retain the compact tab. The supplied
reference and animation are a visual target, not a claim of exact particle parity.

## Menu evolution

The user then supplied classic-client and 7.00 screenshots and requested that the menu evolve with campaign updates. `src/menu-eras.ts` derives its presentation from `campaignPatch`, not the host date, the campaign’s year alone, an opened historical note or a saved theme setting. Reload derives the same result without adding save fields. Era styling also applies to the shell while browsing management screens, without keying/remounting the tournament worker.

| First in-game composite | Presentation | Original release / reference |
| --- | --- | --- |
| 2011.1 | Beta stone frame (see 2011–2015 client menus) | Copied from a December 2011 beta capture; replaced the earlier representative bulletin layout on October 24, 2026 |
| 2012.2 | Source 1 client, with dated events and TI screens | May 24, 2012 dashboard replacement verified by Valve; refined against period captures |
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
- **Source 1 client, `2012.2`–`2015.2`.** Red-glow tab strip, the DOTA 2 wordmark, a left panel (Today with Blog / News / Updates sub-tabs, or Play with the mode list and Find a Match panel) and a right column with profile, chat and friends. Store / Community use the January 2013 reference (January 24 blog-date proxy); Library keeps the August 12, 2013 proxy. Exact rename timestamps are unverified. The shared label helper also supplies page headers.

Client tabs either switch the Desk's own view (Today, Updates, Play) or open the matching page: Store/Customize → Finances, Watch → TI race, Library/Learn → Heroes, Community/Socialize → Teams. The Dota symbol returns to the Desk as before. The client's own content maps to campaign data: profile → club, readiness bar in place of Battle Points, event wins; chat → inbox; friends → squad (ready / resting).

### Events (campaign date, inclusive)

| Window | Event | What changes | Date evidence |
| --- | --- | --- | --- |
| 2012-10-30 – 2012-11-14 | Diretide | Teal/ember woods backdrop, Diretide lead article, mode highlighted | Liquipedia / RPP (end ±1 day) |
| 2012-12-19 – 2013-01-08 | The Greeviling | Snowy pine backdrop, Valve's Greeviling sign in Find a Match | Start: Valve product update Dec 19, 2012. End unchecked. **No client capture: card layout inferred** |
| 2013-11-14 – 2013-12-11 | Diretide | Dark Three Spirits palette, sepia parchment card, working match-centre/calendar action and starting-five strip | Valve's Three Spirits page: Diretide treasure Nov 14–28. Runs on to Wraith-Night because the capture shows both |
| 2013-12-12 – 2014-01-03 | Wraith-Night | Snowy backdrop, Wraith King card with progress chevrons, two counters, PLAY NOW! and difficulty | Valve blog "coming December 12th"; end = Frostivus 2013 offer date on Valve's page |
| 2014-01-29 – 2014-02-19 | New Bloom Festival 2014 | Bronze-framed festival card, horse relief at opening, Year Beast art from February 5; readiness/roster/scouting controls | Valve festival site and contemporary client captures; website-art adaptation |
| 2015-02-12 – 2015-03-02 | New Bloom Festival | Purple dusk and lanterns, Valve's sign, green button, countdown, points block, red buttons | Liquipedia / Gamepedia |

Counters and buttons hold campaign values: season progress to the next TI, event wins, readiness, next opponent and days to the next series. They add no event gameplay, rewards or save fields.

### The International

From the TI client window through the event's last day, the Desk becomes that year's TI screen, filled from the campaign's TI record: pool, prizes, venue, dates and field (the registered run's teams when one exists, with your club highlighted). TI2 now begins on August 20, 2012, the first dated takeover capture used by this project; July retains the ordinary red dashboard. TI3/TI4/TI5 now start on May 8, 2013 / May 9, 2014 / May 1, 2015, matching their Compendium release dates. Reborn TI years retain their existing preparation-month proxies. This presentation timing does not alter campaign start dates or tournament rules.

| TI | Screen |
| --- | --- |
| 2012 | Today opens on **International**, with the blue surround, stone panel and Seattle poster. Location / About / Media / Prelims / Main event all work; Location also has The event / Attendance / F.A.Q. Campaign information and calendar/history/scouting actions replace the old site's online services. |
| 2013 | Green Compendium with cover, working contents, teams and prize pages, after original guide captures. Opens from the profile or Today feature. |
| 2014 | Cream/purple book: prize pool and distribution, teams, your road and a working Contents spread. Native modal focus and Escape; mobile page stacking. |
| 2015 | Red backdrop, original book icon and two-column brown Compendium panel using Valve's closed/golden book artwork. Opens the book or standings; columns stack on phones. |

TI1 (2011) predates the client screens. TI6 onward: see Reborn client menus below.

### Art

Original Valve website art and its hashes are recorded in [the asset manifest](dota-menu-assets.json). The follow-up adds 2013 Compendium, 2014 festival, 2015 book and late-2015 update art. Trees, detailed lanterns and the sepia parchment sketch are original vector approximations; community screenshots remain ignored references. See the [complete 2012–2015 audit](client-refinement-2012-2015.md) for sources, proxy dates and adaptations.

## Reborn client menus (2015 onward)

October 24, 2026. The user asked for the Reborn years next. From September 9, 2015 on the campaign clock the Desk copies the Reborn client (`RebornClient.tsx`, `reborn-client.css`). The 2016.1 composite starts a month earlier, straight after TI5, and keeps the Source 1 client until that date. This replaces the representative Reborn/7.00 banners and the later hero showcase; the showcase lobby now only serves the fictional 2027+ era.

- **Chrome, all years.** Top bar: settings, back/forward, the glowing Dota logo tab (home), Heroes / Store / Watch / Learn / Arcade, then mail, the armory shield and power. Heroes → Heroes, Store → Finances, Watch → TI race (with a Live badge while a run plays), Learn → patch notes, Arcade → Teams. Bottom bar: party slots (your five, opening their profiles), the chat line (opens the inbox) and the big PLAY DOTA button, which opens the Play panel.
- **2015–2020 home:** three columns of cards copied from the June 2017 capture. My Profile, Battle Pass (Season outside TI) and Friends; New in Dota 2 (the latest major update's Valve art), Your last match, a Friends ladder, a next-series tile and the chat panel; a tall feature card and the feed.
- **2015 refinement:** the later 2015 client capture corroborates the profile-left grid, while Valve’s June beta presentation shows an earlier feature-left arrangement. The retained grid gains dated October 2 / December 16 promotion art, complete news-card framing and the early Custom games label. It no longer borrows unreleased TI6 artwork. The Store destination remains a management-navigation adaptation.
- **Late 2020 onward home:** a left profile/friends column, a full-bleed feature (event art, or the latest update art) and a right promo column, copied from the Diretide 2020 and autumn 2025 captures. PLAY DOTA turns green.
- **Play panel:** Battle Cup / View lobbies / Create lobby, the event mode with its SPECIAL EVENT tag, then Ranked / Normal / Practice with bots. Ranked and Find match open the match centre; the others open the calendar, scrims, scouting or training.

Switches with no dated source use the earliest capture that shows them, so the real change may be earlier: the Dota Plus icon from 2019-12-18; the left-column home, green button and club-funds counter (in place of Shards) from 2020-10-29. Store renamed Armory from 2023-08-30, now dated: Valve's Summer Client Update page calls the new Armory "your one-stop shop for every cosmetic item".

### Events (campaign date, inclusive)

| Window | Event | Pattern | Date evidence |
| --- | --- | --- | --- |
| 2017-01-26 – 2017-02-06 | Dark Moon | Play column: story, three steps, points; PLAY DARK MOON | Valve announcement (dota2.com/newsentry/3819571008275060282: "January 26 - February 6, 2017"), whose art fills the column and home card; the capture's "Event ends February 6th, 2017" agrees |
| 2017-06-08 – 2017-09-18 | Siltbreaker | Play column, plus the tall "Multiplayer campaign" home card | Liquipedia events list |
| 2018-06-14 – 2018-07-14 | The Underhollow | Play column with Valve's announcement art, in cave green and cheese gold | Valve announcement (dota2.com/newsentry/2842216343260937830) gives the start only. With no end date, it is held inside 2018.2 until the TI 2018 screen takes over on July 15 (user decision, October 24) |
| 2018-12-19 – 2019-01-07 | Frosthaven | Play column with Valve's Frosthaven logo and update art, in ice blue | Valve's Frosthaven page ("December 19th - January 7th"); the launch post said "through January 3rd", so the page's later date is used. **No client capture: layout inferred** |
| 2019-02-01 – 2019-02-11 | New Bloom | Home over Valve's 2019 New Bloom art, with the rewards line counted in wins | Valve's "New Bloom Rewards" post ("from February 1 - 11"). **No client capture: layout inferred** |
| 2019-12-18 – 2020-01-02 | Frostivus | The whole home is the event: title, dates, four cheer tiles, two progress bars, reward track (upcoming events) | Liquipedia; the capture shows "Dec 18 – Jan 2" |
| 2020-07-14 – 2020-10-09 | Aghanim’s Labyrinth | Play column (inferred: no capture) | Liquipedia and Fandom events lists |
| 2020-10-29 – 2020-12-22 | Diretide | Full-bleed Roshan art and logo, green logo tab, points row | cybersport.ru (October 29), GamingOnLinux (until December 22) |
| 2021-06-24 – 2021-08-17 | Nemestice | Battle Pass page: logo, breadcrumb, week tabs, the active-week note, star progress, quest cards; Valve's key art as a dimmed sky behind the page and, cropped to the crystal, as the angled hero panel on the left | Liquipedia; PCGamesN launch post; capture |
| 2022-11-03 – 2023-01-12 | Diretide | As Diretide 2020 with the 2022 art (inferred: no capture) | Dexerto, Sportskeeda, WIN.gg; dates confirmed by `dota2.com/battlepass2022` ("Nov 3rd – Jan 12th") |
| 2023-08-17 – 2023-09-18 | 10-Year Anniversary | Featured home over Valve's announcement art: thirteen treasure slots ('11 to '23) that fill with wins, and the end date | Valve's "10-Year Anniversary Celebration" (until Sep 7) and "10th Anniversary Event Extended" (to Sep 18). **No client capture: layout inferred** |
| 2023-12-14 – 2024-01-11 | Frostivus 2023 | Full-bleed: Valve's snowman clearing (header and foreground composited), the Frostivus 2023 logo and a Frostivus Spirit Meter that fills with wins (3 per chest) | Valve's Frostivus 2023 page ("DEC 14, 2023 - JAN 11, 2024") and "The Frostivus 2023 Update is Here!". **No client capture: layout inferred** |
| 2024-04-18 – 2025-02-06 | Crownfall | Full-bleed art with the four act shortcuts. Each act opens on its real date (Apr 18, May 23, Jul 9, Nov 7, 2024): the live act is marked NOW, later ones show their date. From Jan 15, 2025 a "final bow" line gives the end date. Frostivus 2024 (Dec 19 – Jan 15) shows as Valve's Frostivus art in the first promo | Valve's Steam announcements: Welcome to Crownfall, Update 7.36 and Act II, Act III, Introducing Kez and Act IV, Frostivus is Upon Us, Crownfall's Final Bow (end Feb 6) |
| 2025-08-05 – 2025-11-05 | Quartero’s Curios | Centre panel: title, number badge, three featured players with tier pips, results and upcoming track, end date | Liquipedia; esports.net launch article |
| 2026-06-25 – 2026-08-23 | Dark Carnival | Full-bleed: Valve's night convoy art, the carnival logo and a VIEW EVENT button. From July 13 the TI 2026 screen takes over | Valve's announcement June 25; Liquipedia says June 26. The real event ran past the campaign's last day (Aug 23). **No client capture: layout inferred** from the full-bleed pattern and a Sportskeeda guide's "VIEW EVENT" main-menu button |

Quests, points and tracks on the older event home adaptations hold campaign values (readiness, event wins, messages, upcoming events). They add no event gameplay, earned cosmetic rewards or save fields. The Fall 2016 Battle Pass (Valve announcement, October 5, 2016) remains a dated promotion rather than a separate gameplay event. Opening any of the eleven advertised passes now starts on its original cosmetic **Highlights**, with **Rewards**, **Treasures** and **Tournament** sections: 237 previews, original milestone information, scrolling tracks/galleries, alternate views and animation previews. Tournament companions retain actual campaign data and exact Calendar links, including Boston for Fall 2016. See [coverage, sources and limits](tournament-battle-passes.md). This supersedes the purchase-screen-only and tournament-only interactions described in the earlier snapshots below. Frostivus 2017 and 2018, Frostivus 2023 and later events have no capture yet.

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
| 2017–2019, 2022 | The same purchase screen with that year's Valve art. 2022: the lava Aegis behind Valve's "The 2022 Battle Pass" logo, with Part I (Sep 1 – Nov 2) and Part II: Diretide (Nov 3 – Jan 12) | Inferred: no capture; 2022 art and dates from `dota2.com/battlepass2022` |
| 2021 (TI10) | Full-screen dark stone Compendium: gold plaque and sections, Aegis art, prize pool, team badges, dates and venue | October 2021 capture |
| 2023 (TI12) | Blue sidebar Compendium: Valve's stained-glass crest and wordmark, sections (with Pubstomps), the crest level badge with Points log, Gift a Compendium, friends, Supporters Clubs grid of the field | 2023 capture; art from `dota2.com/international2023` |
| 2024 (TI13) | Green Compendium with theatre curtains, opening on the rewards page as in the capture: Valve's 2024 Aegis centre stage with the prize pool, six of Valve's reward images on lit pedestals (each carrying a prize place, with a gold View button), Buy levels / Apply boost below; sidebar with the Aegis medallion and Valve's Compendium logo, Participate (Fantasy, Oracle's challenge, Bingo) and Follow (Studio, Supporters clubs, Watch), a shield level badge and a Journal button | August 2024 capture; art from `dota2.com/international2024` |
| 2025 | No Compendium. The same sidebar becomes **Fantasy & Predictions, free for every player**: Fantasy, Predictions, Tyrian Regalia (rewards page), Team & talent bundles (the field), Talent, Watch, and a leaderboard box in place of the level | Valve's "The International: Bundles and Predictions" post (Aug 19, 2025). Layout inferred: no capture |
| 2026 | Sidebar Compendium in red | Inferred: no capture. Sources disagree on whether a Compendium existed |

Editions skip 2020, so 2021 is TI10. The TI 2025 and 2026 records have no field yet, so their team grids say so.

### Art

**2016–2017 pass (October 24, Claude).** Update art follows Valve's Steam announcements (Pacific dates): the Winter Battle Pass (2016-01-27), the TI6 Battle Pass (2016-05-16), The Dark Rift Update (2016-08-23), the Fall 2016 Battle Pass (2016-10-05), 7.00 The New Journey (2016-12-12; it was shown from September 2016) and the TI7 Battle Pass (2017-05-04). Valve's patch-notes feed starts at 7.08, so it could not confirm these. The home's TI card shows each Battle Pass's art only after that pass came out; it showed the TI6 and TI7 art months early. Dark Moon now uses Valve's announcement art, matching the January 2017 capture. The TI6 and TI7 Battle Pass headers now keep "The International" in view, as in the May 2016 capture. Left out: The Shanghai Major (an esports page) and The Bladeform Legacy (an arcana). Preview dates added: Winter Battle Pass, Fall 2016 Battle Pass, 7.00.

**2018–2019 pass (October 24, Claude).** Update art follows Valve's dates: Dueling Fates (2017-11-01), Dota Plus (2018-03-12), the TI8 Battle Pass (2018-05-08), Grimstroke (2018-08-25), 7.20 (2018-11-19, from Valve's patch-notes feed), Frosthaven (2018-12-19), Mars (2019-03-06) and the TI9 Battle Pass (2019-05-07). Before this, Dueling Fates stayed up until August 2018 and 7.20 showed from September 2018. Dota Plus, Frosthaven and the Battle Passes are filed under the next composite so weekly saves keep each composite's headline art. New events: Frosthaven and New Bloom 2019. The Underhollow was added later: no end date was found, so it runs June 14 – July 14, 2018, ending where the TI 2018 screen begins. No client capture of 2018 or 2019 menus was found, so the TI8 and TI9 screens stay as before.

**2020–2023 passes (October 24, Claude).** Update art now follows Valve's release dates from 2019 on: The Outlanders (2019-11-26), The International 10 Battle Pass (2020-05-25), Aghanim's Labyrinth (2020-07-14), Diretide (2020-10-29), The Mistwoods Update (2020-12-17; it was shown from September 2020), The Dawnbreaker Update (2021-04-09), Nemestice (2021-06-24), Marci (2021-10-28), The Continuum Conundrum (2021-12-15), Primal Beast (2022-02-23; it was shown from autumn 2021), The 2022 Battle Pass (2022-09-01), Dead Reckoning (2023-03-06) and New Frontiers (2023-04-20; it was shown from October 2022). New: the 10-Year Anniversary event, the TI 2022 Battle Pass header, the TI 2023 crest, badge and links from the capture, and the Nemestice page rebuilt from its capture (see the tables). Dates come from Valve's Steam announcements. Cosmetic-only entries on Valve's past-updates page (arcanas, personas, Collector's Caches) are left out.

**2024 pass (October 24, Claude).** Update art for late 2023 follows Valve's dates: The Summer Client Update (2023-08-30), The International 2023 Celebration Update (2023-09-27), Frostivus 2023 (2023-12-14), then Facets & Innates (2024-05-22). Previously New Frontiers stayed up until May 2024. Frostivus 2023 is a new dated event, and the TI 2024 Compendium was rebuilt from its capture (see the tables).

**2025 pass (October 24, Claude).** Ringmaster (2024-08-23) and Kez (2024-11-07) update art added, and Wandering Waters now starts on its real date (2025-02-19). Outside events the featured home's centre is now **your last match** (result, your five heroes with K/D/A, duration, kills, prize, links to recent games and patch notes) over a blurred copy of the update art, and the update art moves to the first promo. Valve's Quartero's Curios post (Aug 5, 2025) says that, outside events, "the dashboard's mostly just shown the results of your last match". Before the club's first match the centre still shows the update art. Dates come from Valve's Steam announcements (`ISteamNews` for app 570).

**2026 pass (October 24, Claude).** Dated campaigns now pick the update art by real release date where one is recorded: Spring Forward (7.39) from 2025-05-22, Largo (7.40) from 2025-12-15. Weekly saves still use the composite. No Valve past-updates image exists for 7.41 (Mar 24, 2026), so Largo stays up through 2026. Valve's update images have their title painted in, so the featured home shows them whole (contain) over a blurred copy, with a slim caption bar. The old overlay repeated the title and cropped it. The right-hand promo no longer repeats the same art. Dark Carnival art comes from `dota2.com/darkcarnival`.

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
