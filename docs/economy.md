# Club economy by era

Source: `src/economy-scale.ts`. Uses: `player-market.ts` (wages, fees), `game.ts` (starting cash, staff), `sponsors.ts`, `bootcamp.ts`, `historical-game.ts` (travel, results bonuses). Tests: `tests/economy-scale.test.ts`.

These are game rules. They are not claims about real salaries, sponsorship deals or travel budgets.

## Why

A one-season 2016 playtest found:
- Three sponsors covered the whole payroll.
- TI paid $9.1M against a $100k budget and $6.9k/week of payroll.

Prizes are the real historical amounts. Median event pools grow about 70× from 2011 to 2019, but every cost stayed at its 2011 level.

## Era scale

Every club cost is multiplied by the era scale.

- **How it's derived:** take the median prize pool across `tournaments.json` for the year and its two neighbours. Divide by the 2011–2012 median. Take the square root and cap it at 6.
- **Only mixed-tier years count.** 2024–2026 list tier-1 events only (13, 19 and 14 events, median $1M), which pushed them to the cap. They now hold the last mixed-tier level. A year with no mixed-tier data in its window keeps the previous year's value.
- **Result:** 2011 is 1.0, 2016 is 3.2, 2018–2019 is 4.9, 2021 is 2.9, and 2022 onward is 4.1.
- **Not modelled:** any post-2023 contraction of org budgets. The prize data can't show it, so it isn't in the scale.
- **What it scales:** market wages and fees, asks, AI club payrolls, starting cash, staff wages, bootcamp fees and travel.
- **What it doesn't scale:** prizes stay real.

## Sponsors

- A brand's opening weekly support is 40% of its catalog value (50% until October 30), multiplied by the era scale. Its signing bonus is scaled the same way.
- The rest of the value arrives as results bonuses. Each active deal pays a number of weeks of its weekly support, by placement:

| Placement | Weeks of weekly support |
|---|---|
| 1st | 4 |
| 2nd | 2.5 |
| 3rd–4th | 1.5 |
| 5th–8th | 0.5 |

Legacy circuit events pay the 1st-place bonus for a win and nothing for a loss.

## Costs

- **Travel:** entering a LAN (`online: false`) costs $750 × scale (was $600) for each of the five players. It is paid on entry. Online events are free.
- **Bootcamp:** $900 × scale per player per week, up from a flat $500. The fee paid is stored with the booking, so refunds return what was paid. Camps booked before this change refund $500.

## Measured starts

These are default-club starts in the dated calendar, with the three best sponsors open at 10 reputation, at full opening terms.

| Year | Cash | Payroll/wk | 3 sponsors/wk | Cover | Runway without prizes | TI 1st in years of payroll |
|---|---|---|---|---|---|---|
| 2011 | $100k | $8,840 | $2,720 | 31% | 16 wk | 2.2 |
| 2013 | $140k | $14,880 | $3,860 | 26% | 13 wk | 1.9 |
| 2016 | $320k | $24,850 | $9,340 | 38% | 21 wk | 7.1 |
| 2019 | $490k | $20,990 | $15,880 | 76% | 96 wk | 14.3 |
| 2022 | $410k | $35,350 | $13,280 | 38% | 19 wk | 4.6 |
| 2025 | $410k | $24,510 | $13,280 | 54% | 37 wk | 1.0 |

Measured October 30, after sponsors dropped to 40% weekly and travel rose to $750.

## Limits

- **TI is still a windfall from 2014 to 2021,** because the real pools were that large. Nothing here shrinks prizes. Prize-share contracts and form-driven raises are the only sinks that grow with winnings.
- **Cheap rosters get more cover.** The 2019 default roster's starters rank low, so sponsors cover 76% of its payroll.
- **Old saves:** stored wages, sponsor deals and camp bookings keep their terms. New signings and renewals, new sponsor deals, staff wages, camps and travel use the current era.
- **No calibration:** none of this has been through a full-season balance run with tournaments played.

## Pay mix: wages against prize shares

Source: `src/pay-structure.ts`. Tests: `tests/pay-structure.test.ts`.

Each contract mixes guaranteed weekly pay with a prize share.

- **Shares:** up to 20% per player, so five players can take 100% of gross prize money. Pay can be $0.
- **What the club keeps:** whatever is left over, shown in the contract panel.
- **What the club still pays:** travel, staff and camps, whatever the mix.

Each player has two seeded traits.

- **Risk appetite (0.05–0.95).**
  - Comes from a stable hash, ego and Confidence.
  - Labels: "Wants security" below 0.35, "Bets on results" above 0.65.
  - **Guarantee floor:** the lowest wage the player accepts is `max(0, 0.75 − appetite)` of their ask. That is 70% for the most security-minded and nothing at 0.75 or more (8 of 100 players in a 2011 start).
  - **Share value:** a share is worth `expected weekly club prize × share × (0.4 + 1.2 × appetite)` to the player.
  - **Expected weekly club prize:** the club's prize money over the last two calendar years ÷ 104, never below $2,500 × era scale.
- **Pressure response (−1 to +1).**
  - Comes from a stable hash and Stability.
  - Labels: "Thrives under pressure", "Steady", "Tightens under pressure".

### Effects

- **Weekly happiness.** Fairness is the total value (wage + share value) against market, from −3 to +2. Insecurity subtracts up to 4 more: `(1 − appetite) × (1 − wage/market) × 4`. Security-minded players on thin guarantees lose happiness even when the upside is large. Gamblers don't mind.
- **Competitive matches.** A contracted starter gets `pressure × (1 − wage/market) × 6` decision-skill points, at most ±6. Synergy's cap is ±5. Players who thrive gain, players who tighten lose, and full guarantees have no effect. This applies in legacy events and dated tournaments only. Scrims, All-Star and the bot challenge don't use it.
- **Stable through a run.** The guarantee is measured against the market wage recorded at signing, so form during a tournament cannot move it. Profiles are seeded, but Stability, Confidence and ego can shift them between runs.

### Limits

- **Stars rarely take shares early.** At the baseline expected prize, a 20% share is worth only a few hundred to about two thousand dollars a week. No-wage deals become attractive after real winnings or in eras with big pools.
- **Old contracts** keep their shares of 0–10%.
- **Rival clubs** have no contracts, so pressure affects only your players.
- **Not calibrated:** none of this has been balance-calibrated.
