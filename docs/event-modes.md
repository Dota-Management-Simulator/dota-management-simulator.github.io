# Event modes: OpenAI Five and the All-Star match

Both live on the **Arcade** page (`EventModes.tsx`). Open it from the Reborn client's Arcade tab, the Source 1 client's Socialize/Community tab, the department navigation (Practice → Arcade) or, while either is available, the Play panel. Both are exhibitions: they **never move the campaign clock** and never change energy, ratings, training, research, money, results or career statistics. They only record their own result.

## OpenAI Five challenge (`src/bot-challenge.ts`)

**Access:** one year, **2019-04-18 to 2020-04-17**. It opens the day the real Arena opened. Inside that window you can challenge the bots as often as you like, BO1 or BO3, with the normal draft and live-tactics flow (`DraftSeries`). You need a full starting five with all five positions filled (`fullRosterBlocker`, checked first).

**What the bots know:** their `PatchObserver` has `omniscient: true`, so `perceivedPatch()` hands them the true patch: every hero's real target strength and the exact patch axes that your staff only see as ranges. One flag covers both the draft (`draft.ts`) and in-game decisions (`battle.ts`). In the draft they weigh hero targets by `BOT_HERO_WEIGHT`, currently **0**: they draft on the exact axes, role fit and composition, and ignore per-hero targets (see the 2026-10-30 fix below). Combat, calibration signatures and other teams are unchanged.

**How they draft:** `automaticDraftAction` uses `BOT_DRAFT_TEMPERATURE` (0.1) for omniscient sides instead of the skill-based 2.5–3.8. They take the top suggestion about three times in five. Without hero targets many heroes score within 0.1 of each other, and those near-ties keep variety between attempts.

**How they play:** mechanics equal the challenger's starting five's average per stat plus `BOT_EDGE` (1). Ratings grow over a campaign, so fixed numbers would be unbeatable or trivial. Creativity is 0, so they follow the meta exactly. Tactics are a fixed aggressive script (early ganks, mid-game pushes, high ground). They never read your preparation. Each bot carries a stand-in player identity (`fallbackPlayerIdentity`) that also sets its automatic talents. They get no team bonus.

**Your side:** your starters bring their real identities (`battlePlayerIdentity`) and saved talent plans. Your team bonus is the difficulty bonus plus your roster's chemistry (`synergyBonus`).

**Measured difficulty (unofficial, 2026-10-30):** one team (the default 2019 club, Evil Geniuses, at 2019-07-15, team bonus +0.0072 from chemistry), 80 BO1 maps per row, both sides auto-drafted with default tactics. Each figure is ±about 5 points.

| Bot draft | Bot wins |
|---|---|
| Shipped: true axes, hero weight 0, near-greedy | **91%** |
| Hero weight 0.25 | 60% |
| Hero weight 0.5 | 64% |
| Hero weight 1 (the Oct 24 design) | 69% |
| Guessed axes, near-greedy | 89% |
| Guessed axes, normal randomness (an ordinary AI drafter) | 69% |

**Why hero targets are switched off:** none of the 32 patches has a hero calibration that matches the current engine (`calibrationForPatch` returns nothing), so combat gives each hero only a fixed ±6% power from its authored target (`calibratedHeroBonus`). Across these maps the hero-strength gap and the role-fit gap both correlated with winning at about zero (−0.17 to +0.17). Drafting for targets crowded out the authored composition reads: fewer stuns (2.09 vs 2.78 per draft) and nukes (0.07 vs 0.90). The bots' real edge is therefore the exact axes plus near-greedy play on composition. Even a quarter weight costs about 30 points. Once heroes are recalibrated on this engine (`npm run calibrate:heroes`), measure again before raising `BOT_HERO_WEIGHT`. Oct 24 figures, on the older engine: 86% with full knowledge, 77% without. This is a single-team sample, not a certified balance figure.

**Real timeline (shown in-game, sources checked 2026-10-24):** TI7 1v1 vs Dendi, Aug 2017 (exact day 11th is **unchecked**, inferred from coverage dated Aug 12). Benchmark, 2018-08-05. TI8 losses to paiN and Chinese all-stars, 2018-08-22/23. Finals 2–0 vs OG, 2019-04-13. Arena, 2019-04-18 to 21, 7,215–42. The Finals hero-pool restrictions came from one secondary source, so they're unchecked and not modelled: the bots use the full era pool.

**Saves:** optional `campaign.botChallenges` (`normalizeBotChallenges`). It keeps up to 200 scores and only the latest 5 series bodies. Missing or corrupt data never rejects a save. Unfinished challenges are held in memory only.

## The International All-Star match (`src/all-star.ts`)

**When:** TIs in `allStarYears` (2012–2019, 2021, 2022), from the TI's first day until 14 days after its final. AFK Gaming reported TI 2023 as the first without one in 11 years. 2024 onward is unchecked and left out. Exact real match days are unchecked, hence the window. One match per TI.

**Who plays:** two fan-voted fives from the TI field: the registered lineups if the campaign ran the event, otherwise world rosters. At each position the two best players (rating plus a fixed per-event fan-vote nudge, so reloads never reroll) are split alternately. Teams are named after their top-voted player.

**Coach or watch:** if one of your roster is voted in, you coach that team through the normal draft/tactics flow (it is always side 0). Otherwise it's a spectacle: the BO1 is simulated in a worker and shown in the replay viewer with a neutral result. Both teams carry their players' real identities. Each team's bonus is its own chemistry (`synergyBonus` over its five), so a fan-voted mix can play below a settled club. Players not on your roster use automatic talents for their identity.

**Saves:** optional `campaign.allStars` keyed by TI event id (`normalizeAllStars`).

## Tests

`tests/event-modes.test.ts`: the window, the omniscient view, the bot draft reading the true axes with hero targets weighted at 0 and staying near-greedy, settle changing nothing but the record, result validation, replay trimming, old and corrupt saves, and All-Star selection, coaching, spectating and one-per-TI.

## Validation

**2026-10-30 (bot fix):** `BOT_HERO_WEIGHT` added in `draft.ts`; measured as in the table above. `npm test` passed 525/525 and `npm run build` passed. No browser check: the change only alters which heroes the bots pick.

**2026-10-30:** after other sessions' combat, identity, chemistry and roster-check changes, `npm test` passed 525/525 (including the 7 event-mode tests), `npm run build` passed, and the difficulty was re-measured as above. The 200 measurement maps took over 10 minutes on the current engine, against 8 seconds on Oct 24. No new browser check was done for this doc update.

**2026-10-24 (original):** `npm test` 274/274 pass and the build passed. In the `?patch-preview=2019.2&date=2019-07-15` sandbox on **5323**, a BO1 challenge drafted, simulated, showed the result and recorded "Lost 0–1" with the date still Jul 15, 2019. After five Continues (Aug 19, 2019), the All-Star match picked two fives, spectating played back, the neutral result was recorded as "watched", and a second play was blocked. The Arcade page had no horizontal overflow at 390px. The coached All-Star path is covered by the unit test only: the sandbox club had no player voted in.
