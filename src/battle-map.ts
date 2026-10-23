/** Keep the central lanes unchanged; add traversable outer land at 7.33. */
export const frontierSize = 800 * Math.sqrt(1.4);
export const frontierMargin = (frontierSize - 800) / 2;
export const frontierBounds = `${-frontierMargin} ${-frontierMargin} ${frontierSize} ${frontierSize}`;
export interface FarmCamp { id: number; x: number; y: number; hp: number; readyAt: number }
export function createFarmCamps(): FarmCamp[] {
  const radiant: [number, number][] = [[240, 620], [180, 440], [330, 760], [-35, 480], [510, 835], [-35, 220]];
  return [...radiant, ...radiant.map(([x,y]): [number,number] => [800-x,800-y])]
    .map(([x,y], id) => ({ id, x, y, hp: 450, readyAt: 10 }));
}
