import { createCampaign, DEFAULT_SETTINGS, rating, weeklyWages } from "./src/game";
const c = createCampaign(DEFAULT_SETTINGS);
const r = c.players.map(rating).sort((a,b)=>a-b);
const q = (f:number)=>r[Math.floor(f*(r.length-1))];
console.log(DEFAULT_SETTINGS, c.players.length, "min",r[0],"p25",q(.25),"med",q(.5),"p75",q(.75),"p90",q(.9),"max",r.at(-1));
console.log("cash",c.cash,"wages",weeklyWages(c),"roster",c.roster.map(id=>{const p=c.players.find(p=>p.id===id)!;return `${p.name}:${rating(p)}:${p.wage}:${p.fee}`}));
console.log("reputation", c.reputation, "sponsors", c.sponsorIds);
