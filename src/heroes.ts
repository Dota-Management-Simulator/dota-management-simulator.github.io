import era from "./data/heroes-2011.json";
export type Hero = (typeof era.heroes)[number];
export const heroEra = era;
export const getHeroPool = (_year: number): Hero[] => era.heroes;
export const heroById = (id: string) => era.heroes.find((h) => h.id === id);
export const heroRoles = [
  "Carry",
  "Mid",
  "Offlane",
  "Soft support",
  "Hard support",
];
