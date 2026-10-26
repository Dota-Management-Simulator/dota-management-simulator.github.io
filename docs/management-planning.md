# Bootcamps and cash-flow planning — October 26, 2026

Local implementation; not published. These are two adapted sports-management ideas, not historical claims about real Dota players or finances.

## Research and plan

[Football Manager's official training guidance](https://www.footballmanager.com/the-dugout/first-10-things-do-fm26) describes managing heavy preparation, lighter schedules in busy periods and visible development/load tradeoffs. Aegis already has individual schedules, so this addition is a finite paid bootcamp layered onto the manager's existing focus, rather than another permanent intensity setting.

[OOTP's official financial manual](https://manuals.ootpdevelopments.com/index.php?man=ootp24&page=finances) describes projected expenses and remaining budget room. Aegis adapts that into a frozen-roster weekly cash forecast, making sponsor expiry and preparation affordability visible without assuming future tournament winnings.

Plan followed: research existing managers and roadmap; implement the two management loops in separate modules; integrate with Training/Finances and both existing clocks; review five shortcomings; improve them; verify economy, saves and browser interactions. Existing source edits and background jobs remain in place. No deployment or normal campaign-save access.

## Bootcamp rules

- Training offers one to three weeks, prepaid at **$500 per registered player per week**. Booking changes cash and the ledger, not the date. It does not change individual focus or schedules.
- Each paid management week, eligible registered players receive **35% more attribute and playstyle growth** from their selected focus, rounded through the existing practice rules, for **six extra energy**. Attribute/playstyle caps still apply. These illustrative numbers are game design values, not researched athletic effects.
- Eligibility requires membership in the current managed roster, a real development focus, at least ten scheduled hours, at least 50 starting energy and at least 40 energy after the week's normal practice plus camp fatigue. Rest and Happiness do not receive camp development. Contract limits are read through the existing schedule normalizer. Camps add no practice hours or days.
- Skipped places refund $500 at that week's settlement; the finite camp week still elapses. Players who depart retain no benefit; replacements do not inherit their booking. Cancelling returns only unelapsed prepaid places. Repeated cancellation cannot refund twice.
- Partial dated weeks do not consume camp weeks. The shared weekly-management function handles both clocks, including jumps and tournament-driven time. A blocked clock does not apply management. No extra combat modifiers, independent RNG, result rewrites or worker commands were added.
- Optional `bootcamp` and `lastCampReport` fields retain old-save compatibility. Malformed blocks are recovered independently. The latest report remains after completion or cancellation and records participant outcomes, incremental capped gains and skipped-place refunds. Energy is the training-settlement projection, before later match deductions.

## Forecast rules and limits

Finances offers 4/8/12/18-week horizons, a proposed immediate expense and an additional weekly expense. Scenarios are local component state and spend no funds. The comparison shows baseline/scenario cash, weekly sponsor income/payroll, lowest cash including the immediate spend, and the first negative balance. Zero cash is not classified as debt.

Income uses the actual sponsor-income function at each elapsed interval's start, matching management settlement, including dated calendars stopped between payroll ticks. Fixed deals expire; legacy sponsors remain rolling. Payroll holds current roster and staff constant, including continuing player terms after contract expiry. Already-prepaid camps are reflected in current cash and are not charged again. Potential camp refunds are excluded conservatively.

This is budget arithmetic, not a world simulation. It excludes prizes, future sponsorship/signing decisions, resignations, kicks, imports, compensation and market changes. Actual roster decisions can change future payroll. No future historical information or hidden combat ratings are exposed. Forecast input is finite and bounded; it never advances time or calls world development.

## Five-point review and improvements

1. **Opaque percentage gains:** replaced a bare 35% promise with each player's incremental attribute/playstyle gains after caps and projected post-camp energy. Existing training and workload previews also include the active camp.
2. **No durable completion feedback:** added the latest weekly camp report, including individual skipped reasons, capped extra gains and refunds; retained after completion and through save loading. Removed stale booking status on a new week.
3. **Cash-only booking check hid payroll pressure:** added cash after booking and the next payroll, with an explicit debt/happiness warning. Refund values are shown before cancellation; Finances links to camp planning.
4. **Forecast hid the reason for falling cash:** added sponsor-expiry warnings, baseline/scenario comparison, earliest debt and a reset action; documented constant payroll and excluded income. Settlement comparisons verify the expiry boundary and partial dated weeks.
5. **Wide finance rows and cramped controls on phones:** added stacked labelled forecast rows, wrapping controls/attendance, native labelled inputs, scoped panel padding and live status messages. Reviewed 390px and 320px browser frames as well as the actual full client.

## Validation

- **410 shared tests pass**, including 12 new management-planning cases: immutable/exclusive booking, bounded inputs, actual development/energy settlement, Rest/fatigue/hours skips and refunds, cancellation idempotence, departed-player isolation, optional save round trips/recovery, dated partial/jumped weeks, weekly/datetime sponsor-expiry forecasts, scenario bounds and capped gains/opponent isolation.
- TypeScript and an isolated Vite production build pass; the pre-existing large-bundle warning remains. Build/logs and disposable QA files are under `.local/management-planning-*`.
- Browser: full Training booking updates existing practice previews; Continue produces the expected energy and completion report; a two-week booking/cancellation restores cash exactly. Full Finances scenarios leave campaign cash unchanged, show debt at the expected week, reset correctly and navigate to Training. Both 390px and 320px previews render stacked data; 320px booking/completion works.

Files: `bootcamp.ts`, `finance-forecast.ts`, `BootcampPlanner.tsx`, `FinanceForecast.tsx`, `management-planning.css`; narrow integration points in `contracts.ts`, `game.ts` and `App.tsx`. No publication and no balance-certification claim.
