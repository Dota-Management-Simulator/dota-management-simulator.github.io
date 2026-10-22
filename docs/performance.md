# Player performance

Implemented locally on October 22, 2026; not deployed. Open any player profile and select **Performance**. Profile attributes, negotiations and playstyles remain under **Profile & contract**.

The section shows career or filtered season/event/hero statistics, recent map results, hero records sorted by games/rating/win rate/GPM, event assessments and expandable per-game scoreboards. It works for managed players and other players whose games have been recorded. Small samples are visible beside the ratings.

## Recorded data and compatibility

`src/performance.ts` reads `Result.series` from weekly saves and the series in dated tournament runs, including completed matches in ongoing tournaments. It matches exact player IDs on either side, independent of today's team, role, alias or roster. Event keys include the season for repeated weekly events. A dated tournament's placement result does not duplicate its match archive; duplicate event/fixture/game keys are ignored. Default map advantages never create game appearances. No historical real-world statistics are imported.

New `PlayerScore.heroDamage`, `buildingDamage`, `healing` and `laneOutcome` fields are optional. Existing scoreboards retain their recorded gold, XP, K/D/A, last hits and results. Missing metrics display **—**, with measured sample counts; they are never backfilled as zero. Missing detailed results and previously discarded AI scoreboards remain unknown. The campaign key/version do not change, and no parallel career ledger or saved replay is introduced.

For future AI tournament fixtures, `TournamentMatchResult.performance` stores only the actual series' team names and each played map's winner, duration, team kills and player scoreboards. It preserves the original series side order. Managed fixtures keep their existing full `series`; AI fixtures do not duplicate resource timelines, replay frames or pre-match configs. This is recorded by the same `recordTournamentSeries` path used in the tournament worker and survives normal run settlement/autosave. It does not simulate extra games.

Within each year, migrated weekly results precede the dated archive. Actual tournament dates sort newest first; games with the same date use their recorded order. Calendar dates are campaign dates and can include the tournament engine's documented schedule estimates.

## Metric definitions

| Metric | Calculation |
| --- | --- |
| GPM | Sum of earned gold (each game's final gold minus the engine's 600 starting gold, minimum zero), divided by total match minutes. |
| XPM | Total earned XP divided by total match minutes. |
| Average K / D / A | Each total divided by recorded map appearances. |
| KDA ratio | Total kills + assists divided by `max(1, total deaths)`. |
| Kill participation | Per-map `(kills + assists) / team kills`, bounded 0–100%, averaged over maps; zero when the team has no kills. |
| Hero damage | Effective damage to enemy heroes from attacks/abilities, bounded by the target's remaining HP to exclude overkill. |
| Building damage | Effective hero damage to towers and Ancients. Automatic overtime attrition has no player credit. |
| Healing | HP restored by the hero's healing abilities, including self-heals. Excludes overhealing, passive regeneration and base recovery. |
| Damage/min | Measured damage divided by the total duration of only maps with that metric. Average damage/healing uses the same measured subset. |
| Last hits | Actual engine last hits; average per map and total divided by total match minutes. The lane engine's existing nearby farmer credit remains abstract. |
| Laning win % | At 10:00 match time, compare the combined earned gold + XP of heroes assigned to the same physical lane on each side. Above a 5% lead wins; within 5% draws. Both lane partners share the outcome. Wins divided by all measured lane results, including draws; games ending before 10:00 have no measurement. |
| Win rate | Games won divided by actual played games, regardless of series result. A BO2 draw still has map wins/losses. |

Ward placement and dewarding are **not simulated**. Their cards explicitly show that limit, rather than creating counts from player Vision ratings. A real vision/ward system remains future work.

## Performance rating

This is an illustrative campaign assessment, independent of player attributes and combat inputs. It compares the player to the opponent in the same **saved match position**, rather than comparing a support's raw economy with a carry's. It is not a sourced Dota analyst metric, and the current role assignments themselves remain adapted gameplay data.

Let `delta(a,b) = (a-b) / max(1,a+b)`:

```text
rating = clamp(6
  + 2 × delta(player KDA, opposing-position KDA)
  + economyWeight × delta(earned gold + XP, opposing earned gold + XP)
  + 0.7 × delta(kill participation, opposing kill participation)
  + 0.6 × delta(hero damage + 2 × healing, opposing damage + 2 × healing)
  + (map won ? 0.4 : -0.4), 1, 10)
```

Economy weight is 0.9 for positions 1–3, and 0.4 for positions 4–5. The impact term is omitted if either player lacks damage telemetry. KDA uses at least one death in its denominator. The fallback for a scoreboard without an opposing position is 6. Ratings round to two decimal places internally, display one decimal, and average equally over actual maps. Legacy ratings can therefore use fewer inputs; the coverage notes remain visible. Building damage, lane results and nonexistent ward statistics are not silently imputed into the formula.

Telemetry neither consumes randomness nor changes targeting, damage, healing, resources, RNG order or rewards. The lane measurement is observational. Watching/skipping/reloading and duplicate settlements preserve the existing outcome/settlement rules.

## Validation

Ten performance tests cover exact IDs on both sides and after transfers, duration-weighted rates/starting gold, zero-death KDA, partial/zero/unknown telemetry, season/event/hero grouping and deduplication, active dated events/BO2/default wins, role-relative assessment, actual AI archive generation and JSON persistence, effective damage/overkill, healing and the one-time lane snapshot, and real played-series persistence without replay frames or duplicate career growth.

Browser checks use the isolated **5194** origin. Ignored `.local/performance-qa.*` fixtures seed actual lane-engine games with mixed old/new telemetry; they do not touch the user's normal save or the tournament/calendar test origins. QA covers filters, sorting, per-game event expansion, missing/no-game states, reload, keyboard wrapping/Escape focus return, mobile overflow and both themes.

The full workspace has **94 passing tests**, and the production build passes with the existing large-bundle warning. Browser QA also entered TI1 through the actual calendar, ran the AI tournament worker and skipped/settled a managed series. Dendi's played map and LaNm's three AI maps appeared in their profiles; the AI record retained its statistics after reload, with no browser errors.
