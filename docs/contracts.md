# Player contracts and negotiations

Implemented locally on October 21, 2026. All terms and player preferences are gameplay models, not historical salary or personality evidence.

Open a player profile from the roster, headquarters, scouting or world teams. Current starters have **Negotiate terms**; recruits open the offer form directly. **Make offer** signs immediately if accepted. A counteroffer changes no campaign state. Use its terms or edit the package and submit again. The UI shows the immediate charge before submission.

## Negotiable terms

- Weekly wage: $50–$100,000 in whole dollars. Accepted wages feed directly into payroll and weekly pay satisfaction.
- Signing bonus: $0–$1,000,000 paid immediately by the club, including renewals.
- Fixed term: 6, 18 or 36 game weeks. A prototype season has 18 weeks. Renewing by mutual agreement replaces the prior fixed term.
- Prize share: 0–10% per player of gross team prize earnings, including consolation earnings. Each player's amount is rounded down separately and deducted in the ledger after the gross prize arrives. Results retain gross prizes. Only the event-time managed five receive shares. Settlement guards prevent repeat payouts.
- Weekly practice limit: 20, 30 or 40 hours. At full hours and Normal intensity, these give +1, +2 or +3 to each focus attribute per training week, plus +1 with a coach, capped at 99. Every 10 hours above 20 costs another 6 energy. The expanded Training schedule may use fewer hours or a different intensity; these figures describe the default full allowance. Existing edited schedules are constrained by new terms rather than overwritten.
- Protected rest: at least 1, 2 or 3 days each week. Compared with two days, one costs another 4 energy and three restores another 4. Training schedules cannot exceed the agreed working days; fewer working days allow additional rest. The 40-hour maximum fits into four days with three protected rest days.

Balanced training adds 7 base energy; focused training costs 5. Practice/rest-day modifiers apply to both, including the expanded attribute/playstyle options. Happiness sessions use balanced recovery and base +6 morale, scaled by actual workload/intensity, with contract modifiers. Playstyles have baseline +1 weekly growth at the full allowance and Normal intensity, scaled by workload/intensity without a coach multiplier. A manager can select a full Rest week, overriding practice: no skill growth and +24 energy, independent of the contracted rest-day adjustment. A therapist adds 8 recovery. Energy stays within 0–100.

## Negotiation model

The player assesses the whole package deterministically, without hidden random rolls or a cost for rejected offers. Stamina at least 80 produces a 40-hour preference, otherwise 30. Stamina below 70 favors three rest days, otherwise two. Confidence below 80 favors 36 weeks of security, otherwise 18. These preferences may evolve with trained stats.

The market wage is the player's wage before the first negotiated deal; renewals retain this reference. Required equivalent weekly value is rounded up from market wage times:

`1 + (offered hours − preferred hours) × 0.008 + (preferred rest days − offered rest days) × 0.09 + (0.06 if term is shorter than preferred, otherwise 0)`.

Package value is weekly wage plus signing bonus divided by term, plus market wage times offered prize-share percentage times 0.015. Prize share is a speculative bargaining value, not guaranteed income. If short, the player counters with enough extra weekly pay, rounded up to $10, keeping the other proposed terms. More rest, lighter practice or security can substitute for money. There are no promised playing-role, bootcamp, strategy or performance-bonus clauses yet.

Weekly pay satisfaction adds `round((wage / market wage − 1) × 5)` happiness, clamped to −3 through +2, on top of the existing +1 training/+4 Rest/+6 Happiness session. Bankruptcy retains the existing −10 weekly happiness rule instead.

## Duration, replacement and compatibility

A fixed deal covers exactly its offered number of weekly payrolls across season boundaries. After expiry, the five remain intact and wage, practice, rest and prize share continue week to week. A log reminder appears on expiry, and weekly happiness loses another 2 until renewal. Release compensation becomes zero. There is no automatic player departure or free roster vacancy.

Replacing a player before expiry costs 25% of their remaining fixed wages, rounded up, in addition to the recruit's existing fee and new bonus. Recruitment checks affordability and regional replacement availability atomically. The outgoing managed contract is removed and their wage returns to the market reference. Their destination, if any, retains normal historical-world ownership behavior. Opposition contracts are not simulated.

`Campaign.contracts` is optional and keyed by exact player ID. It stores accepted terms, a market wage reference and absolute game-week signature/expiry markers. Existing saves retain rolling wages and the original +1 training behavior until a deal is signed; no migration changes money or lineup. Contracts survive annual historical imports, reloads and season changes. Identical terms cannot be signed twice in the same week. Signing a different package is a new mutually accepted deal with its own bonus.
