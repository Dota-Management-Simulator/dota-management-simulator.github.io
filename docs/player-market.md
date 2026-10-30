# Player market, egos and team chemistry

Source: `src/player-market.ts`. UI: transfer market rows (`App.tsx`), the contract panel's scouting read (`ContractNegotiation.tsx`) and the Squad page's team rating panel (`TeamChemistry.tsx`). Tests: `tests/player-market.test.ts`, `tests/contracts.test.ts`.

These are game rules built from simulated attributes and actual campaign maps. They are not claims about real players' salaries, personalities or relationships.

## Why

A one-season playtest found that every historical player copied the fee and wage of the template player for their role (`makePlayer` in `history.ts`). Every carry cost $10,000 + $1,500/week, whatever their skill. Buying the best player per role cost no more than buying the worst, and three sponsors covered the whole payroll.

## Market value

- **Skill rank.** The player's effective-attribute average is ranked against every player in the campaign. Attributes grow every year, so price follows rank, not raw numbers. Wage = `600 × 6^percentile`: about $600/week at the bottom, $1,470 at the median and $3,600 at the top.
- **Innate** (2024.2+ only, when the identity is active): +8% if it helps teammates (lane partner, nearby, mentor, morale), +5% for a flat attribute bonus, +3% for a self-only conditional.
- **Hero pool.** The Hero pool attribute against the player's own average, ±6%, plus up to +5% for more than six distinct heroes played in competitive campaign maps.
- **Form.** With at least six competitive maps out of the last 20, ±15% (70% wins gives +12%).
- **Fee.** Six weeks of market wage. Players registered at another active club cost 1.5× (the buyout).

New campaigns put the five starters on rolling pay at market value. Old saves keep their current payroll. Renewals reprice at the current market value, so a player who improves or wins costs more at renewal.

## Ego and asking price

Each player has a stable **ego** (1–10, +2 for welfare's "demanding" personalities, +1 for high Confidence) and **self-awareness** (0.25–0.95, from Intuition against their own average plus a stable offset).

- **Belief**: `(ego − 5) × 5%`. Unaware players act on it. A big ego asks above market, and a modest player with low awareness asks below it.
- **Leverage**: what the player has earned, an elite rank (above the 75th percentile) or a winning run (60%+ over six or more maps). Aware players claim all of it ("Knows their worth").
- **Fit**: a player whose arrival adds four or more synergy asks 5% less.

Ask = `market × (1 + belief × (1 − awareness)) × (1 + awareness × leverage) × fit`. In a 2011 start, about 75% of players are Realistic, 15% overrate themselves, 6% sell themselves short and 4% know their worth.

## Prize-share demands

No demand until the club is winning: starters' average form at 55% or more, or reputation 60+. Then players in the top 30% or with ego 7+ ask for 1–10%, scaled by ego, rank, form at 65%+ and awareness. An offer below the demand gets one counter with that share and enough pay to cover the other terms.

## Team chemistry

Synergy is 0–100 across the parts that apply:

| Part | Max | Measures |
|---|---|---|
| Playstyle cohesion | 25 | How closely each player's Fight / Tempo / Late playstyle mix matches the team's |
| Lane partnerships | 20 | Carry + hard support and offlane + soft support Laning against the team average, +4 per lane-coaching innate |
| Hero pool depth | 15 | Average Hero pool against team OVR; flags thin pools |
| Innate support | 15 | Teammate-helping innates, +3 for mentors who train a team weakness (2024.2+ only) |
| Personalities | 15 | −5 per pair of ego 8+, −3 per welfare compatibility clash, −3 per friction of 45+ |
| Time together | 10 | Competitive maps the current five have played together in finished events, peaking at 20 |

The market's **FIT** column is the synergy change if the player replaces your starter in that role.

## Match effect

Synergy becomes a combat bonus: `(synergy − 50) / 50 × 0.04`, so ±0.04 at 100 or 0. It uses the same additive term as difficulty (+0.14 Club, −0.12 Legend) and tournament form (capped ±0.08). New preparations use this bonus as a bounded AI decision-quality input, without changing hero power or the output of an identical action. Frozen older preparations retain `0.4 + skill × 0.008 + bonus`. **Team rating** remains a scouting estimate: average OVR plus the bonus converted to OVR points.

It applies to both sides wherever both lineups are known players:

| Match | Where |
|---|---|
| Legacy circuit events | `buildBattleConfig` in `game.ts` |
| Dated tournaments, including AI-vs-AI fixtures in the worker | `tournamentTeamTemplate` in `historical-game.ts` |
| Scrims | `prepareScrim` in `scrims.ts` (fixed when the scrim is prepared) |
| All-Star match | `prepareAllStar` in `all-star.ts` |
| OpenAI bot challenge | your side only; the bots have no synergy |

Lineups with a missing or unscouted player get no bonus.

Time together counts only finished events (settled tournament runs and legacy results). A team's synergy can't move between fixtures of a running tournament, so worker batches, reloads and watched matches see the same bonus.

## Limits

- The match effect is small by design and has not been through a balance calibration run.
- Wages and fees scale by era with every other club cost ([economy](economy.md)). Prize tables are unchanged.
- AI clubs pay market-value wages from their own budgets (`src/ai-club-economy.ts`). A rival's cash-backed bid (market × 1.08) raises the minimum a player accepts in negotiation, but the market row and the contract panel's "asks" figure still show the player's own ask.
