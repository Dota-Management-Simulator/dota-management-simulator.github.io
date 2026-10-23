# Patch notes and milestone gameplay

Implemented locally, October 23, 2026. Not published.

Patch & meta now opens a single scrolling update summary. It lists every hero arriving in the composite, the seven gameplay priorities with the team's uncertain comparison to the previous report, active map/talent rules and simplified hero outlooks. Recovered modern hero notes are paraphrased and linked separately from simulator effects. Staff research and the hero catalog remain expandable beneath the summary. No hidden axes, unknown hero strengths or full internal rankings are exposed.

## Delivery through the inbox

Every activated composite creates one unread Patch desk notice, with hero arrivals, milestone rules when applicable, and a link to that exact update's notes. The first Continue past TI delivers the post-TI opening update; pre-TI drops are also announced. Ordinary patch notices do not block the calendar. The two milestone trailers retain their remembered, dismissible introductions.

Optional `OfficeState.lastPatchId` tracks delivery across reloads, weekly/detailed calendars and jumps over multiple phases. Migration announces only the currently active patch; subsequent advances retain every crossed update. Read/archive flags survive reconciliation. Patch messages remain readable after later drops and link to their own historical notes rather than silently opening today's update. Existing inbox retention limits still apply. No additional time, payroll, roster changes or match outcomes are introduced by sending a notice.

## Hero releases and dates

Annual Dota 2 release batches still arrive at the post-TI shuffle, now explicitly described as the next season's opening patch. For example, `2017.1` adds Underlord and Monkey King from the 2016 batch. Road-to-TI patches add no separate batch. This preserves existing progression rather than inventing exact release/Captains Mode eligibility dates.

Both battle workers cap the draft pool at the event's pinned composite year minus one (and the campaign's available release batch). Continuing an earlier tournament after a shuffle cannot introduce newer heroes into its drafts. Already saved maps are unchanged.

The existing two-composite calendar remains: **7.00 is introduced with `2017.1` (proxy opening August 14, 2016)**; **7.33 with `2023.1` (proxy opening October 31, 2022)**. Real releases were December 12, 2016 and April 20, 2023. The notes disclose both dates. Later starts/future patches retain the milestone rules.

## Player talents

At the 7.00 composite, managed player profiles unlock a four-tier tree. The manager preselects one of two branches; bonuses activate at hero match levels 10/15/20/25 and reset each map. This is a persistent player plan shared across heroes, not an exact per-hero Valve tree or permanent attribute increase.

| Match level | First branch | Second branch |
| --- | --- | --- |
| 10 | +5% attack damage | +8% maximum HP |
| 15 | +10% earned gold/XP | +8% spell damage/healing |
| 20 | +6% movement speed | +8% building damage |
| 25 | +8% attack damage | +12% maximum HP |

Bonuses compound only where described; Spellcraft does not extend stun duration. Managed unselected tiers grant no bonus. AI clubs use deterministic role choices; a transferred player's saved plan follows their identity. Ongoing tournament commitments lock editing for every registered player, ensuring worker consistency. Attributes, training, wages and clocks remain unchanged. Optional `Campaign.talentPlans` normalizes malformed entries without invalidating a save; absent fields remain absent. New scoreboards retain activated choices, display their count, and name them on the level tooltip; older scoreboards retain missing information.

## New Frontiers map

The map's side increases from 800 to `800 × sqrt(1.4)` engine units, centered around the existing lanes. This produces **40% more area**, with unchanged central lane/base positions. The replay uses that actual boundary and marks the former boundary and twelve neutral camps. New series retain `mapLayout: frontiers`; older replays default to the original geometry.

There are six mirrored camp positions per side, including outer land. Camps are shared resources, not passive extra income. After match minute 10 and before minute 48, players take staggered farm windows. A healthy hero with no enemy nearby may travel to an available camp within 380 units, attack its 450 HP, take small retaliatory damage and collect 95 base gold, 90 base XP and three neutral last hits (modified by farming skill, the patch and active talents). Camp respawn takes a match minute. Travel and clearing replace lane actions; threats and low HP cancel the trip. Heroes clear an assignment on death. This is a simplified camp model, not full neutral-unit AI, stacking, inventory, Tormentors, gates, Roshan relocation or a full historical terrain reconstruction.

Replay frames retain camp health/respawn state. Scoreboards distinguish neutral last hits, included in total last hits and existing career farm metrics. Both sides and both workers use the same code; Ancient destruction still determines the winner.

## Introductions and trailers

A dismissible native dialog opens on the milestone composite, including a fresh start in that phase. Calendar jumps introduce milestones crossed during that session; a later campaign start does not replay every historical trailer. `Campaign.seenPatchMilestones` remembers dismissal; the notes always offer replay. The dialog waits while a match, worker or existing app dialog is active. Muted autoplay accommodates browser restrictions; player controls enable sound. Direct YouTube links remain available if embeds/network playback fail.

Sources: Valve's [7.00 gameplay](https://www.dota2.com/700/gameplay/) and [New Frontiers](https://www.dota2.com/newfrontiers). Official embeds: [Dota 2 — 7.00 Countdown](https://www.youtube.com/watch?v=GwLq25FeCc4) and [Valve — The New Frontiers Update](https://www.youtube.com/watch?v=eH6UJ4xDn4Q). The 7.00 teaser/announcement is the official countdown film, not a fan reupload. Videos remain hosted by YouTube.

## Calibration compatibility and validation

Modern patch balance signatures include the talent/camp rules version. Existing frozen calibration jobs are preserved, but their pre-milestone signatures cannot activate coefficients for 2017+ gameplay. Pre-2017 signatures remain compatible. The separate calibration batch remains distinct from validation of these features; this change makes no balance or 58% measured-ceiling claim.

Six focused tests cover arrivals and draft gates, era thresholds, trailer crossing/dismissal, selection/ownership/tournament locks, old save preservation, real level activation and combat effects, finite camps and outer-map movement, deterministic Ancient destruction and equality between managed/AI worker contracts. Local browser QA on isolated port **5307** verifies both official videos playing, the one-page notes, simplified source examples, selecting/reloading talents and dismissal, desktop/phone layouts, light/dark themes and a real browser-worker New Frontiers map with camps. Existing preview and hosted campaigns are preserved.

The full current workspace suite passes **175 tests** and the production build passes with the existing chunk-size warning. Logs: `.local/patch-milestones-tests.log` and `.local/patch-milestones-build.log`. The standalone browser QA match finished through Ancient destruction and displayed actual neutral last hits and activated talent names/counts. App and fixture browser error logs were clear.
