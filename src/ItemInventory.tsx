import type { PlayerScore } from "./battle";
import { itemById, itemForPatch } from "./items";
import type { SeasonPatch } from "./patches";

export default function ItemInventory({player,patch,time=0,showNext=false}:{player:PlayerScore;patch?:SeasonPatch;time?:number;showNext?:boolean}){
  if(!player.inventory)return <small className="field-note">Inventory not recorded</small>;
  const next=player.nextItem?itemForPatch(player.nextItem,patch):undefined;
  return <div className="inventory-detail">
    <div className="item-inventory" aria-label={`${player.player} inventory`}>
      {Array.from({length:6},(_,i)=>{const id=player.inventory![i],item=id?itemForPatch(id,patch):undefined;return <span className={`item-slot ${id??"empty"}`} key={i} title={item?`${item.name} · ${item.cost} gold · ${item.description}`:"Empty inventory slot"} aria-label={item?.name??"Empty slot"}>{item?.short??"·"}</span>;})}
      {(player.bkbUntil??0)>time&&<b className="item-effect">BKB active</b>}{(player.aegisUntil??0)>time&&<b className="item-effect">Aegis</b>}
    </div>
    {showNext&&<small>{player.spendableGold??0} gold available · {player.netWorth??0} net worth{next&&<> · Next: {itemById(next.id)!.name} ({Math.min(100,Math.floor((player.spendableGold??0)/next.cost*100))}%)</>}</small>}
  </div>;
}
