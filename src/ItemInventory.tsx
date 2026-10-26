import { useState } from "react";
import type { PlayerScore } from "./battle";
import { historicalItemKey, itemForPatch } from "./items";
import type { SeasonPatch } from "./patches";

export function ItemArt({id,label}:{id:string;label:string}) {
  const [failed,setFailed]=useState(false);
  return failed?<>{label}</>:<img src={`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${historicalItemKey(id).slice(5)}.png`} alt="" onError={()=>setFailed(true)}/>;
}

export default function ItemInventory({player,patch,time=0,showNext=false,compact=false}:{player:PlayerScore;patch?:SeasonPatch;time?:number;showNext?:boolean;compact?:boolean}){
  const [inspected,setInspected]=useState<string>();
  if(!player.inventory)return <small className="field-note">Inventory not recorded</small>;
  const next=player.nextItem?itemForPatch(player.nextItem,patch):undefined;
  const selected=inspected&&(player.inventory.includes(inspected)||inspected==='tpscroll'&&player.teleport)?itemForPatch(inspected,patch):undefined;
  const tp=player.teleport;
  const tpStatus=tp?.endsAt&&tp.endsAt>time?`Channeling to ${tp.destination} (${Math.ceil(tp.endsAt-time)}s)`:
    showNext&&tp?(tp.readyAt>time?`${Math.ceil(tp.readyAt-time)}s`:tp.charges?'Ready':'No scroll'):'';
  return <div className={`inventory-detail${compact?" compact-inventory":""}`}>
    <div className="item-inventory" aria-label={`${player.player} inventory`}>
      {Array.from({length:6},(_,i)=>{const id=player.inventory![i],item=id?itemForPatch(id,patch):undefined;return <button type="button" className={`item-slot ${id??"empty"}`} key={i} disabled={!item} onClick={()=>setInspected(inspected===id?undefined:id)} aria-pressed={!!id&&inspected===id} title={item?`${item.name} · ${item.cost} gold · ${item.description}`:"Empty inventory slot"} aria-label={item?`${item.name}: ${item.description}`:"Empty slot"}>{compact&&item?<ItemArt key={id} id={id} label={item.short}/>:item?.short??"·"}</button>;})}
      {tp&&<button type="button" className="item-effect item-tp" onClick={()=>setInspected(inspected==='tpscroll'?undefined:'tpscroll')} aria-pressed={inspected==='tpscroll'} title={itemForPatch('tpscroll',patch).description}><ItemArt id="tpscroll" label="TP"/> TP ×{tp.charges}{tpStatus&&` · ${tpStatus}`}</button>}
      {(player.bkbUntil??0)>time&&<b className="item-effect">BKB active</b>}{(player.aegisUntil??0)>time&&<b className="item-effect">Aegis</b>}
    </div>
    {selected&&<p className="item-description"><strong>{selected.name}</strong> · {selected.description}</p>}
    {showNext&&<small title={`${player.spendableGold??0} gold available · ${player.netWorth??0} net worth`}>{!compact&&<>{player.spendableGold??0} gold available · {player.netWorth??0} net worth{next&&' · '}</>}{next?<>Next: {next.name} ({Math.min(100,Math.floor((player.spendableGold??0)/next.cost*100))}%)</>:compact?'Build complete':null}</small>}
  </div>;
}
