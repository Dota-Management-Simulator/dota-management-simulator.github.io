import type { CompletedDraft } from "./draft";
import { heroById } from "./heroes";
import { heroIconFor } from "./hero-icons";
import "./draft.css";
export function HeroName({id}:{id:string}){
  const icon=heroIconFor(id);
  return <span className="draft-hero-name">{icon&&<img src={`${import.meta.env.BASE_URL}${icon.path}`} alt=""/>}{heroById(id)?.name??id}</span>;
}
export function DraftRecordView({draft,teams}:{draft:CompletedDraft;teams:[string,string]}){
  return <details className="draft-record"><summary>Draft · {draft.ruleId} · {draft.actions.filter(a=>a.kind==="ban").length} bans</summary>
    <ol>{draft.actions.map((a,i)=><li key={i}><span>{teams[a.side]}</span><strong>{a.kind==="ban"?"Banned":"Picked"}</strong><HeroName id={a.heroId}/></li>)}</ol>
  </details>;
}
