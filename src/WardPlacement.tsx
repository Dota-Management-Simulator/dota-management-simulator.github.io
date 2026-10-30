import {useMemo,useState,type ReactNode} from 'react';
import type {ReplayFrame,WardOrder} from './battle';
import {mapEraForPatch} from './map-eras';
import {wardVisionPreview,OBSERVER_VISION_RADIUS} from './map-vision';
import {visionCellPath} from './map-vision-render';

export default function WardPlacement({frame,patchId,disabled,onPlace,onPlanning,children}:{frame:ReplayFrame;patchId?:string;disabled:boolean;onPlace:(order:WardOrder)=>void;onPlanning:()=>void;children:(onPoint:((x:number,y:number)=>void)|undefined,overlay:ReactNode)=>ReactNode}){
  const [planning,setPlanning]=useState(false),[kind,setKind]=useState<'observer'|'sentry'>('observer');
  const [point,setPoint]=useState({x:400,y:400}),[playerId,setPlayerId]=useState('');
  const era=mapEraForPatch(patchId?{id:patchId}:undefined);
  const preview=useMemo(()=>planning?wardVisionPreview(era,point.x,point.y,kind==='observer'?OBSERVER_VISION_RADIUS:70):undefined,[planning,era,point,kind]);
  const stock=frame.wardStocks?.[0],available=stock?.[kind]??0;
  const overlay=planning&&preview?<g className="ward-preview" pointerEvents="none">{kind==='observer'?<path d={visionCellPath(preview.cells,preview.cellSize)} fill={preview.valid?'#f1d46c':'#e48272'} opacity=".3"/>:<circle cx={point.x} cy={point.y} r="70" fill="#74bee5" opacity=".25"/>}<circle cx={point.x} cy={point.y} r="11" fill="#f1d46c" stroke="#fff" strokeWidth="2"/><path d={`M${point.x-18},${point.y}h36M${point.x},${point.y-18}v36`} stroke="#fff" strokeWidth="2"/></g>:null;
  return <div className={`ward-planner ${planning?'is-planning':''}`}>
    {children(planning?(x,y)=>setPoint({x:Math.round(x),y:Math.round(y)}):undefined,overlay)}
    <div className="ward-controls"><button className="button secondary" disabled={disabled||!stock} aria-pressed={planning} onClick={()=>{if(!planning)onPlanning();setPlanning(p=>!p);}}>{planning?'Cancel ward placement':'Place a ward'}</button>{stock&&<small>Team stock: {stock.observer} observer · {stock.sentry} sentry</small>}
      {planning&&<><p>Tap the exact map position. The shaded area previews vision blocked by trees and terrain.</p><label>Ward<select aria-label="Ward type" value={kind} onChange={e=>setKind(e.target.value as 'observer'|'sentry')}><option value="observer">Observer · sight</option><option value="sentry">Sentry · detection</option></select></label><label>Place with<select aria-label="Ward player" value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">Nearest available support</option>{frame.players.filter(p=>p.team===0).map(p=><option key={p.id} value={p.id}>{p.player}</option>)}</select></label>
        <div className="ward-coordinates"><label>X<input aria-label="Ward X coordinate" type="number" value={point.x} onChange={e=>setPoint(p=>({...p,x:Number(e.target.value)}))}/></label><label>Y<input aria-label="Ward Y coordinate" type="number" value={point.y} onChange={e=>setPoint(p=>({...p,y:Number(e.target.value)}))}/></label></div>
        <p role="status">{!available?'No wards of this kind in stock. Wait for restock.':preview?.valid?`Position ${point.x}, ${point.y} · ${kind==='observer'?'Sight preview':'Detection radius; sentries do not grant ordinary vision'}`:preview?.reason}</p><small>{preview?.terrainLabel}</small><button className="button primary" disabled={disabled||!preview?.valid||!available} onClick={()=>{onPlace({kind,...point,...(playerId?{playerId}:{})});setPlanning(false);}}>Order ward here</button></>}
    </div>
  </div>;
}
