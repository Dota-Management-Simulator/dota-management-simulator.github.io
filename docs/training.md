# Weekly training

Training offers all 12 profile attributes, displayed playstyles, happiness sessions, balanced practice and full rest. Player name/photo cards open their full profile. Changes resolve when the campaign advances a week, including weeks elapsed before an event.

Each player can choose Light (0.75×), Normal (1×) or Intense (1.5×) training, hours per training day, and training days per week. Uncontracted players can choose 1–12 hours/day and 1–7 days/week. Contracted players cannot exceed their agreed weekly practice hours or work on protected rest days; fewer hours and extra rest are allowed. Selecting more training days may reduce daily hours to keep the weekly limit. Open the profile to negotiate a larger allowance. Existing schedules are constrained against current contract terms on every read, including after renegotiation.

The page shows total weekly hours, days off, expected attribute/comfort/morale gains, net energy change and projected energy after the week. Projected energy below 40% is highlighted. The forecast includes staff, contract and active sponsor effects; bankruptcy replaces happiness gains with the existing −10 penalty. It is a training-only forecast, before any subsequent match energy cost.

## Development and recovery rules

These are illustrative game rules, not historical training data. Let `H` be actual weekly hours, `D` training days and `I` the intensity multiplier.

- Base attribute development is `H / 20` up to 20 hours, otherwise `H / 10 − 1`. A coach adds `min(1, H / 20)` before intensity multiplies the result. Attributes cap at 99.
- Balanced spreads development across all 12 attributes at one sixth of the focused rate per attribute (+0.17 each at 20 Normal hours). Focused plans retain their paired targets.
- All attributes also lose up to 0.20 per week to rust, offset by practice. Net upkeep is `−0.20 × (1 − min(1, effectiveHours / 10))`, where effective hours are `H × I × mediaFactor`. Ten effective hours maintain skills; extra practice improves the chosen focus. Full Rest has zero effective hours and loses 0.20 per attribute while recovering energy. Attributes can decay below 15, with a floor of zero.
- Below 40 starting energy, attribute and playstyle development is multiplied by `max(0.25, energy / 40)` (capped at 1). Exhausting a player does not allow full-speed growth indefinitely. Upkeep, energy and morale are calculated separately.
- Playstyle development is `H / allowance × I`, where allowance is the contracted weekly hours or 20 without a contract. Normal intensity at the full allowance gives +1, without a coach multiplier. Playstyles cap at 10; fractional values appear in profile numbers and partially filled comfort blocks. These ratings still do not affect combat.
- Happiness sessions give `6 × H / allowance × I` before existing pay/expiry/debt adjustments. Other training retains +1 base morale.
- Base energy is +7 for Balanced/Happiness and −5 for specialized practice. Workload changes it by `−(H − 20) × 0.6 + ((7 − D) − 2) × 4 − H × (I − 1) × 0.8`. A therapist adds +8. At fixed intensity/days, extra hours cost more energy; at fixed hours/days, greater intensity costs more energy. Extra rest improves recovery.
- Full Rest disables workload controls and overrides the saved schedule: no positive development, −0.20 to all attributes, +24 base energy and +4 base happiness, with therapist/pay/expiry/debt adjustments. The schedule remains saved for the next training week.

For 20 hours across five days with no staff or contract morale modifiers, focused practice gives:

| Intensity | Attribute growth | Net energy |
| --- | --- | --- |
| Light | +0.75 | −1 |
| Normal | +1 | −5 |
| Intense | +1.5 | −13 |

Gains and resulting values round to two decimal places. The table assumes at least 40 starting energy and enough practice for upkeep. Forecasts include net decay on focused and other attributes. Energy/happiness remain within 0–100. Focused bundled skill targets remain: Laning also trains skirmish, Teamfights also trains stability, Hero pool also trains creativity, and Map awareness trains vision/intuition/pushing. Playstyles remain on their separate 1–10 scale and do not decay in this version.

## Starting ratings and world development — October 22, 2026

New campaign players and later historical arrivals have deterministic, identity-specific starting attributes from **15–40**, regardless of role or start year. This is a gameplay baseline with room to grow, not researched historical skill rankings. The starting upper bound is not a lifetime cap. Existing players retain saved attributes on load and at shuffles; no retrospective rescaling or missed development is invented.

Every paid seven-day tick trains the shared world once, in both legacy weekly and dated campaigns. Active opposition starters and reserves practice 20, 25 or 30 Normal hours across five days, determined by identity. Three out of four scheduled focus weeks use Balanced; the fourth targets a weakest attribute. Players below 60 energy take full Rest, including decay. Free agents and players outside active clubs do ten Normal hours of Balanced self-practice and rest when tired. AI uses the same development/upkeep/fatigue/recovery formulas without the manager's contracts, staff, sponsors, debt or training selections. AI finances, contracts, staffing and sponsor training benefits are not separately simulated.

Imports reconcile at weekly boundaries as well as the final date, so multi-week jumps and individual weekly advances develop the same players. Partial weeks and reloads never trigger training. Active tournament roster locks remain enforced. Updated attributes feed match configuration, recruitment and profiles directly; saved past scoreboards remain unchanged.

Active sponsor agreements can add equipment/analytics attribute development, recovery or happiness. Attribute additions scale with practice volume and stop during Rest; playstyles do not receive equipment/analytics additions. Aggregate media hours per starter reduce attribute/playstyle growth by 5% each (maximum 50%) and consume one energy each, including during Rest. Furniture/recovery bonuses apply before media costs. The table above assumes no sponsors. The same `weeklyPractice` calculation drives forecasts and actual results. See [sponsor mechanics](sponsors.md) for caps, category effects and expiry.

## Save compatibility and verification

`Campaign.trainingSchedules` is optional, keyed by exact player ID, and stores intensity, hours/day and days/week separately from the existing training-focus strings. Missing schedules use Normal intensity and the old full weekly allowance, with the existing rest days (20h over five days for rolling agreements). Loading does not change finances, dates, rosters or contracts. Invalid workload numbers are normalized to bounded finite values. Only managed starters can be assigned schedules.

World development adds seven tests for starting ranges/imports, upkeep/decay, fatigue/net forecasts, AI independence, a year of growth/recovery, date-jump consistency and saved-rating preservation. Existing training tests cover broad Balanced growth and decay during Rest. The workspace has 112 passing tests; the production build passes with the existing bundle warning. Published October 22 as source `35542de` and Pages `a047b93`; Pages reports built and public assets match the build. The hosted training page exposes the new guidance/forecasts while preserving the legacy campaign's saved state. See [hosting notes](github-pages.md).
