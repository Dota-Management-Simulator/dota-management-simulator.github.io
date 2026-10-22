# Weekly training

Training offers all 12 profile attributes, displayed playstyles, happiness sessions, balanced practice and full rest. Player name/photo cards open their full profile. Changes resolve when the campaign advances a week, including weeks elapsed before an event.

Each player can choose Light (0.75×), Normal (1×) or Intense (1.5×) training, hours per training day, and training days per week. Uncontracted players can choose 1–12 hours/day and 1–7 days/week. Contracted players cannot exceed their agreed weekly practice hours or work on protected rest days; fewer hours and extra rest are allowed. Selecting more training days may reduce daily hours to keep the weekly limit. Open the profile to negotiate a larger allowance. Existing schedules are constrained against current contract terms on every read, including after renegotiation.

The page shows total weekly hours, days off, expected attribute/comfort/morale gains, net energy change and projected energy after the week. Projected energy below 40% is highlighted. The forecast includes staff, contract and active sponsor effects; bankruptcy replaces happiness gains with the existing −10 penalty. It is a training-only forecast, before any subsequent match energy cost.

## Development and recovery rules

These are illustrative game rules, not historical training data. Let `H` be actual weekly hours, `D` training days and `I` the intensity multiplier.

- Base attribute development is `H / 20` up to 20 hours, otherwise `H / 10 − 1`. A coach adds `min(1, H / 20)` before intensity multiplies the result. Attributes cap at 99.
- Playstyle development is `H / allowance × I`, where allowance is the contracted weekly hours or 20 without a contract. Normal intensity at the full allowance gives +1, without a coach multiplier. Playstyles cap at 10; fractional values appear in profile numbers and partially filled comfort blocks. These ratings still do not affect combat.
- Happiness sessions give `6 × H / allowance × I` before existing pay/expiry/debt adjustments. Other training retains +1 base morale.
- Base energy is +7 for Balanced/Happiness and −5 for specialized practice. Workload changes it by `−(H − 20) × 0.6 + ((7 − D) − 2) × 4 − H × (I − 1) × 0.8`. A therapist adds +8. At fixed intensity/days, extra hours cost more energy; at fixed hours/days, greater intensity costs more energy. Extra rest improves recovery.
- Full Rest disables workload controls and overrides the saved schedule: no development, +24 base energy and +4 base happiness, with therapist/pay/expiry/debt adjustments. The schedule remains saved for the next training week.

For 20 hours across five days with no staff or contract morale modifiers, focused practice gives:

| Intensity | Attribute growth | Net energy |
| --- | --- | --- |
| Light | +0.75 | −1 |
| Normal | +1 | −5 |
| Intense | +1.5 | −13 |

Gains and resulting values round to two decimal places. Energy/happiness remain within 0–100. Original bundled skill targets remain: Laning also trains skirmish, Teamfights also trains stability, Hero pool also trains creativity, and Map awareness trains vision/intuition/pushing.

Active sponsor agreements can add equipment/analytics attribute development, recovery or happiness. Attribute additions scale with practice volume and stop during Rest; playstyles do not receive equipment/analytics additions. Aggregate media hours per starter reduce attribute/playstyle growth by 5% each (maximum 50%) and consume one energy each, including during Rest. Furniture/recovery bonuses apply before media costs. The table above assumes no sponsors. The same `weeklyPractice` calculation drives forecasts and actual results. See [sponsor mechanics](sponsors.md) for caps, category effects and expiry.

## Save compatibility and verification

`Campaign.trainingSchedules` is optional, keyed by exact player ID, and stores intensity, hours/day and days/week separately from the existing training-focus strings. Missing schedules use Normal intensity and the old full weekly allowance, with the existing rest days (20h over five days for rolling agreements). Loading does not change finances, dates, rosters or contracts. Invalid workload numbers are normalized to bounded finite values. Only managed starters can be assigned schedules.

The workload change passed 51 tests and the production build. Tests cover monotonic energy/development tradeoffs, real attribute and playstyle changes, contract limits/renegotiation, full-rest overrides, fractional values/caps, saved schedules and legacy behavior. Browser verification covered the controls, exact preview-to-weekly-result agreement, real playstyle gains, reload persistence, disabled Rest controls and both themes. This expansion is local and has not been deployed.
