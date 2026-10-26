/** Acceptance gates are authored benchmark policy, not historical Dota rates. */
export function balanceProblems(record, { requireImprovement = true, minimumAppearances = 128 } = {}) {
  const problems = [];
  if (!record?.rows?.length || record.rows.some(r => !Number.isFinite(r.power) || r.power <= -100 || !Number.isFinite(r.winRate) || r.played < minimumAppearances)) problems.push('insufficient-hero-samples');
  if (record?.rows?.some(r => r.low > 58)) problems.push('heroes-above-58');
  if (record?.rows?.some(r => r.high < 42)) problems.push('heroes-below-42');
  if (!Number.isFinite(record?.meanAbsoluteError) || record.meanAbsoluteError > 6) problems.push('target-error-above-6pp');
  if (requireImprovement && !(record?.meanAbsoluteError < record?.baselineMeanAbsoluteError)) problems.push('no-measured-improvement');
  const m=record?.matchMetrics;
  if (!m || m.failedMaps || record.simulationFailures || m.completedMaps !== record.validationMaps) problems.push('unfinished-matches');
  if (!m?.sideInterval || m.sideInterval.low > 55 || m.sideInterval.high < 45) problems.push('side-bias');
  if (!m || m.duration.p50 < 900 || m.duration.p50 > 5400 || m.duration.p90 > 7200 || m.shortGameFraction > .1) problems.push('match-duration');
  return problems;
}
