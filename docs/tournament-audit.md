# Tournament format audit — October 23, 2026

The audit reviewed the compiler and all 483 catalog records against their cached evidence, then exercised every event still marked ready. It found real format-import errors. It does **not** establish that every league in Dota history is complete or every historical detail is verified.

The catalog now has **96 ready, 385 needing review and two scheduled** records. Sixteen of the previous 112 ready events require more evidence or rules support. No previously restricted event was promoted by this audit. Saved registered rules, finances and results are retained; corrections apply to new registrations.

## Corrections

| Affected records | Finding and resulting behavior |
| --- | --- |
| GosuLeague Season 1 | Its BO3 tiebreak paragraph had defined the regular season. Regular meetings are fixed BO2, with the sourced BO3 two-team tiebreak retained. The same tiebreak rule is recovered for Seasons 4 and 5. |
| The Defense Season 4; DreamLeague Season 4 | Qualifier BO1 rules had leaked into the main groups. Their group meetings now use the source's BO2 rules. |
| EPICENTER 2017 | A reference to the main event stopped the parser before the group rules. Groups now use BO3. |
| DreamLeague Kick-Off Season | Six clubs meeting twice in BO1 now produce 30 meetings, rather than 15 BO2 series. The event remains restricted because archived playoff winning scores conflict with its published round description. |
| StarLadder StarSeries Season 4; ECL 2014 Spring; ESP Shock Therapy Cup | Missing upper-bracket default wins are restored. ESP's BO5 final is corroborated by the [contemporary report](https://www.gosugamers.net/dota2/news/26793-sadboys-win-esp-shock-therapy-cup/). Defaults add to the series score without generating player stats or fatigue. |
| Armaggeddon Grand Slam Asia 2013 | The source's one-map lead is detected, but reversed dependency dates keep the event restricted until its timetable is reviewed. |
| TI1 | Round-header inheritance now selects the nearest preceding header in the same round, preserving upper/lower format distinctions. The four corrected lower-round labels survive source regeneration. Its early BO1, late BO3 and BO5 final rules remain intact. |

The compiler reads the relevant regular stage, keeps BO1 double round robins separate from fixed BO2 meetings, honors explicit legs, preserves source scoring/tiebreak metadata and rejects unknown regular lengths. Qualifier, playoff and tiebreak rules cannot supply a missing group length. Existing source snapshots and attribution remain; no new Liquipedia requests were made.

## Newly restricted events

- Unverified regular-stage lengths: The Premier League Seasons 2–4, StarLadder StarSeries Season 2's online stage, Thor Open 2012, WPC 2014, joinDOTA MLG Pro League Season 1's LAN stage, Game Show Global eSports Cup Season 1, EPICENTER 2016 and Pro Gamer League 2016 Summer.
- Missing elimination-group graphs: The Summit 3, MLG World Finals and Shanghai Major 2016. These must not silently become round-robin groups.
- Unsupported fixed three-map groups and cross-group wildcard selection: DOTA Summit 8. A three-map meeting must play all three maps; ordinary BO3 stops at two wins.
- Conflicting playoff length evidence: DreamLeague Kick-Off Season.
- Reversed source dependency dates: Armaggeddon Dota 2 Grand Slam Asia 2013.

ESL One Genting 2018 remains restricted pending event-specific review even though the improved group detection recovers its elimination graph.

## Verification and limits

All **145 application tests and 13 Python parser tests pass**, and the production build passes with its existing bundle-size warning. Each of the 96 ready events resolves eight seeded alternate-result paths into a complete, unique placement field. These topology tests supply legal synthetic map results; separate real lane-engine tests cover map outcomes, BO1/BO2/BO5 formats, default wins, telemetry and exactly-once settlement. Pair coverage and leg counts, legal series lengths/advantages, payout reconciliation, dependency dates, locked entry and pinned-save behavior have explicit checks.

Browser checks on isolated port **5302** played real DreamLeague Season 4 BO2 and EPICENTER 2017 BO3 series, inspected map tabs/scoreboards and verified Summit 8's disabled entry with a visible reason. October 22's isolated **5301** run completed TI1 through BO3/BO5 rounds, watched/skipped series, reload, AI scoreboards and completed archives. Normal local and hosted saves were not used for simulations.

This is a compiler and supported-engine audit, not an independent historical reconstruction of every match. Some round lengths still derive from recorded winning scores; estimated fixture dates, unverified event-specific tiebreakers and invitation routes remain limitations. Offscreen world-event simulation and full DPC eligibility/points remain unimplemented. Ready status means the imported supported structure passes these checks; entry still requires the campaign's invitation or earned place.

Run `npm test`, `python -m unittest discover -s tests -p test_tournament_formats.py` and `npm run build` after changes to these rules. Rebuild the catalog offline with `python -X utf8 scripts/build-tournaments.py`.
