/** Conservative diagnostic: each side-swapped pair contributes at most one
 * independent appearance. Fractional successes allow split pair outcomes. */
export function pairedWilson(wins, appearances) {
  if (!Number.isFinite(wins) || !Number.isFinite(appearances) || appearances <= 0 || wins < 0 || wins > appearances)
    throw new Error('Invalid calibration sample counts');
  const n = appearances / 2, p = wins / appearances, z = 1.96, d = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / d;
  const radius = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  const round = value => Math.round(value * 10000) / 10000;
  return { low: round((center - radius) * 100), high: round((center + radius) * 100) };
}
export function correctPairedIntervals(record) {
  const rows = record.rows.map(row => ({ ...row, ...pairedWilson(row.wins, row.played) }));
  return { ...record, intervalMethod: '95% Wilson; effective sample size = appearances / 2 for side-swapped pairs', rows,
    statisticallyAboveCeiling: rows.filter(row => row.low > 58).map(row => row.id) };
}
