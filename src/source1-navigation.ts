/** January's capture has Store/Community and a January 24 blog post. That
 * date is a presentation proxy, not a verified rename timestamp. Library
 * keeps the existing TI3-end proxy. */
export function source1TabLabels(day: string) {
  return { store: day >= "2013-01-24" ? "Store" : "Customize", library: day >= "2013-08-12" ? "Library" : "Learn", community: day >= "2013-01-24" ? "Community" : "Socialize" };
}

/** June's Reborn captures show Custom Games; Valve's December 6.86 page
 * calls it Arcade. This is an observed-by boundary, not a verified rename date. */
export const rebornGamesLabel = (day: string) => day < "2015-12-16" ? "Custom games" : "Arcade";
