import { LaneBattle } from "./battle";
import type { BattleConfig, ReplayFrame, SimulatedSeries } from "./battle";
import { patchById } from "./patches";
import { frontiersEnabled } from "./patch-milestones";
import type { TacticalOrder, TacticalSnapshot } from "./tactics";

export type LiveRequest = {type:"start-live";config:BattleConfig} | {type:"advance";seconds:number} |
  {type:"order";order:TacticalOrder;at:number} | {type:"cancel-order"} |
  {type:"glyph";at:number} | {type:"auto-glyph";enabled:boolean} | {type:"buyback";playerId:string;at:number} |
  {type:"cancel-item";playerId:string} | {type:"purchase-item";playerId:string;itemId:string} | {type:"inspect";playerId:string} | {type:"finish-live"};
export interface LiveUpdate { type:"live"; frame:ReplayFrame; tactics:TacticalSnapshot; message?:string; simulation?:SimulatedSeries }

/** One authoritative, resumable in-memory map. Both stepping and skipping call
 * LaneBattle.step; neither recreates a seed or throws away accepted orders. */
export class LiveBattleSession {
  readonly battle:LaneBattle;
  targetPlayerId?:string;
  constructor(readonly config:BattleConfig){
    this.battle=new LaneBattle({...config,seriesFormat:{bestOf:1}});
    this.targetPlayerId=config.players[0][0]?.id;
  }
  advance(seconds:number){
    if(!Number.isFinite(seconds)||seconds<0||seconds>300)throw Error("Invalid live clock advance");
    // Integral ticks keep speed/chunk size independent of the outcome.
    const ticks=Math.round(seconds/1.2);
    for(let i=0;i<ticks&&this.battle.winner===null;i++)this.battle.step();
    return this.update();
  }
  command(request:Exclude<LiveRequest,{type:"start-live"}>):LiveUpdate {
    if(request.type==="advance")return this.advance(request.seconds);
    if(request.type==="finish-live"){
      if(this.battle.winner===null)try { this.battle.run(); }
      catch(error) {
        if(error instanceof Error && error.message==="The lane simulation did not finish. No campaign changes were applied.")
          return this.update("Automatic simulation reached its three-hour limit. This map is still live: resume or step forward to finish it. Your accepted calls and purchases are retained.");
        throw error;
      }
      return this.update();
    }
    let message:string|undefined;
    if(request.type==='glyph' || request.type==='buyback') {
      if(request.at!==this.battle.clock) message='The match advanced. Review the current situation and call again.';
      else if(request.type==='glyph') message=this.battle.useGlyph(0)??'Glyph of Fortification activated.';
      else message=this.battle.buyback(0,request.playerId)??'Player bought back with match gold.';
    } else if(request.type==='auto-glyph') {
      if(typeof request.enabled!=='boolean') message='Invalid Auto Glyph setting.';
      else {this.battle.setAutoGlyph(0,request.enabled);message=`Auto Glyph ${request.enabled?'enabled':'disabled'}.`;}
    } else if(request.type==="order") {
      if(request.at!==this.battle.clock)message="The match advanced. Review the current situation and call again.";
      else {const result=this.battle.issueOrder(0,request.order);message=result.accepted?"Order accepted.":result.reason??undefined;}
    } else if(request.type==="cancel-order")this.battle.cancelOrder(0);
    else if(request.type==="cancel-item")this.battle.cancelItemPriority(0,request.playerId);
    else if(request.type==="purchase-item")message=this.battle.prioritizeItem(0,request.playerId,request.itemId)??(request.playerId==='all'?'Item priorities saved for eligible players; each spends their own match gold.':'Item priority saved; the player must earn the gold.');
    else if(request.type==="inspect")this.targetPlayerId=request.playerId;
    return this.update(message);
  }
  update(message?:string):LiveUpdate {
    return {type:"live",frame:this.battle.snapshot(),tactics:this.battle.tacticalSnapshot(0,this.targetPlayerId),...(message?{message}:{}),
      ...(this.battle.winner!==null?{simulation:this.result()}:{})};
  }
  result():SimulatedSeries {
    const game=this.battle.summary(),patch=patchById(this.config.patchId);
    return {summary:{engine:"lane-siege-v1",seed:this.config.seed,teams:this.config.teams,bestOf:1,winner:game.winner,
      score:game.winner===0?[1,0]:[0,1],games:[game],...(patch?{patch:{id:patch.id,name:patch.name,versions:patch.versions}}:{}),
      ...(frontiersEnabled(patch)?{mapLayout:"frontiers" as const}:{})},frames:[this.battle.frames]};
  }
}
