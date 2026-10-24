# Event modes: OpenAI Five and the All-Star match

Both live on the **Arcade** page (`EventModes.tsx`). Open it from the Reborn client's Arcade tab, the Source 1 client's Socialize/Community tab, the department navigation (Practice → Arcade) or, while either is available, the Play panel. Both are exhibitions: they **never move the campaign clock** and never change energy, ratings, training, research, money, results or career statistics. They only record their own result.

## OpenAI Five challenge (`src/bot-challenge.ts`)

**Access:** one year, **2019-04-18 to 2020-04-17**. It opens the day the real Arena opened. Inside that window you can challenge the bots as often as you like, BO1 or BO3, with the normal draft and live-tactics flow (`DraftSeries`).

**What the bots know:** their `PatchObserver` has `omniscient: true`, so `perceivedPatch()` hands them the true patch: every hero's real target strength and the exact patch axes that your staff only see as ranges. One flag covers both the draft (`draft.ts`) and in-game decisions (`battle.ts`). Combat, calibration signatures and other teams are unchanged.

**How they draft:** `automaticDraftAction` uses `BOT_DRAFT_TEMPERATURE` (0.1) for omniscient sides instead of the skill-based 2.5–3.8. They take the top suggestion about four times in five. The rest are near-ties, which keeps some variety between attempts.

**How they play:** mechanics equal the challenger's starting five's average per stat plus `BOT_EDGE` (1). Ratings grow over a campaign, so fixed numbers would be unbeatable or trivial. Creativity is 0, so they follow the meta exactly. Tactics are a fixed aggressive script (early ganks, mid-game pushes, high ground). They never read your preparation.

**Measured difficulty (unofficial):** one team (the default 2019 club, Evil Geniuses, at 2019-07-15), 100 BO1 maps, both sides auto-drafted with default tactics. The bots won **86%** (avg 42.7 min). The same bots with an ordinary uncertain observer won **77%**, so perfect knowledge is worth about 9 points there. This is a single-team sample, not a certified balance figure. Beating them needs bans on their best heroes, an early game that survives, and a plan for a long game.

**Real timeline (shown in-game, sources checked 2026-10-24):** TI7 1v1 vs Dendi, Aug 2017 (exact day 11th is **unchecked**, inferred from coverage dated Aug 12). Benchmark, 2018-08-05. TI8 losses to paiN and Chinese all-stars, 2018-08-22/23. Finals 2–0 vs OG, 2019-04-13. Arena, 2019-04-18 to 21, 7,215–42. The Finals hero-pool restrictions came from one secondary source, so they're unchecked and not modelled: the bots use the full era pool.

**Saves:** optional `campaign.botChallenges` (`normalizeBotChallenges`). It keeps up to 200 scores and only the latest 5 series bodies. Missing or corrupt data never rejects a save. Unfinished challenges are held in memory only.

## The International All-Star match (`src/all-star.ts`)

**When:** TIs in `allStarYears` (2012–2019, 2021, 2022), from the TI's first day until 14 days after its final. AFK Gaming reported TI 2023 as the first without one in 11 years. 2024 onward is unchecked and left out. Exact real match days are unchecked, hence the window. One match per TI.

**Who plays:** two fan-voted fives from the TI field: the registered lineups if the campaign ran the event, otherwise world rosters. At each position the two best players (rating plus a fixed per-event fan-vote nudge, so reloads never reroll) are split alternately. Teams are named after their top-voted player.

**Coach or watch:** if one of your roster is voted in, you coach that team through the normal draft/tactics flow (it is always side 0). Otherwise it's a spectacle: the BO1 is simulated in a worker and shown in the replay viewer with a neutral result.

**Saves:** optional `campaign.allStars` keyed by TI event id (`normalizeAllStars`).

## Tests

`tests/event-modes.test.ts`: the window, the omniscient view, the bot draft beating a blind drafter on true strength and staying near-greedy, settle changing nothing but the record, result validation, replay trimming, old and corrupt saves, and All-Star selection, coaching, spectating and one-per-TI.

## Validation (2026-10-24)

`npm test`: 274/274 pass. `npm run build` passes, with the existing chunk-size warning. In the `?patch-preview=2019.2&date=2019-07-15` sandbox on **5323**, a BO1 challenge drafted, simulated, showed the result and recorded "Lost 0–1" with the date still Jul 15, 2019. After five Continues (Aug 19, 2019), the All-Star match picked two fives, spectating played back, the neutral result was recorded as "watched", and a second play was blocked. The Arcade page has no horizontal overflow at 390px. The coached All-Star path is covered by the unit test only: the sandbox club had no player voted in.
