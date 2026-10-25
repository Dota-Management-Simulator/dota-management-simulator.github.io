import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Image as ImageIcon, Search, Sparkles } from "lucide-react";
import { rewardsForPass, selectPassRewards } from "./battle-pass-rewards";
import type { BattlePassReward } from "./battle-pass-rewards";
import "./battle-pass-rewards.css";

export type RewardView = "highlights" | "rewards" | "treasures";
const art = (file: string) => `${import.meta.env.BASE_URL}dota-menu/${file}`;

/** Original cosmetic reveals, separate from campaign tournament progression. */
export default function BattlePassRewards({ passId, view, onView }: { passId: string; view: RewardView; onView: (view: RewardView) => void }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(() => {
    const all = rewardsForPass(passId);
    return [...all].filter(reward => reward.kind === "Arcana").sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0]?.id
      ?? [...all].filter(reward => reward.spotlight && reward.kind !== "Treasure").sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0]?.id
      ?? [...all].filter(reward => reward.spotlight).sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0]?.id;
  });
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("all");
  const [kind, setKind] = useState("all");
  const rail = useRef<HTMLDivElement>(null);
  const list = selectPassRewards(passId, view, query, collection, kind);
  const available = selectPassRewards(passId, view);
  const selected = list.find(reward => reward.id === selectedId) ?? list[0];
  const index = list.findIndex(reward => reward.id === selected?.id);
  const all = rewardsForPass(passId);
  const groups = [...new Set(available.map(reward => reward.collection))];
  const kinds = [...new Set(available.map(reward => reward.kind))];
  useEffect(() => { setQuery(""); setKind("all"); setCollection("all"); }, [passId, view]);
  useEffect(() => {
    const track = rail.current;
    const card = track?.querySelector<HTMLElement>(`[data-reward-id="${selected?.id}"]`);
    if (!track || !card) return;
    const left = card.offsetLeft - track.offsetLeft;
    if (left < track.scrollLeft || left + card.offsetWidth > track.scrollLeft + track.clientWidth)
      track.scrollTo({ left: Math.max(0, left - (track.clientWidth - card.offsetWidth) / 2), behavior: "instant" });
  }, [selected?.id, view, query, collection, kind]);

  const pick = (id: string) => { setSelectedId(id); rail.current?.closest("dialog")?.scrollTo({ top: 0, behavior: "instant" }); };
  const move = (amount: number) => { const next = list[(index + amount + list.length) % list.length]; if (next) pick(next.id); };
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  return <section className="bp-rewards" aria-label={view === "highlights" ? "Battle Pass highlights" : view === "treasures" ? "Battle Pass treasures" : "Battle Pass rewards"}>
    <div className="bp-gallery-heading"><div><small>{view === "highlights" ? "THE HEADLINE REWARDS" : view === "treasures" ? "EXPLORE THE TREASURES" : "THE REWARD COLLECTION"}</small><h3>{view === "highlights" ? "Battle Pass Highlights" : view === "treasures" ? "Treasures & Immortals" : "Rewards"}</h3></div><span>{all.length} previews in this pass</span></div>
    {selected ? <RewardStage key={selected.id} reward={selected} index={index} total={list.length} onPrevious={() => move(-1)} onNext={() => move(1)} /> : <div className="bp-reward-empty"><Search size={30} /><h3>No rewards match</h3><p>Try a hero, reward name or another collection.</p><button onClick={() => { setQuery(""); setKind("all"); setCollection("all"); }}>Clear filters</button></div>}
    <div className="bp-track-heading"><div><Sparkles size={15} /><strong>{view === "highlights" ? "Featured milestones" : "Browse rewards"}</strong><small>{list.length} items</small></div><div><button onClick={() => scroll(-1)} aria-label="Scroll rewards left"><ChevronLeft size={20} /></button><button onClick={() => scroll(1)} aria-label="Scroll rewards right"><ChevronRight size={20} /></button></div></div>
    {view !== "highlights" && <div className="bp-reward-filters"><label className="bp-reward-search"><Search size={15} /><input aria-label="Search Battle Pass rewards" placeholder="Search hero or reward…" value={query} onChange={event => setQuery(event.target.value)} /></label><label><span>Collection</span><select value={collection} onChange={event => setCollection(event.target.value)}><option value="all">All collections</option>{groups.map(group => <option key={group}>{group}</option>)}</select></label><label><span>Type</span><select value={kind} onChange={event => setKind(event.target.value)}><option value="all">All types</option>{kinds.map(type => <option key={type}>{type}</option>)}</select></label></div>}
    <div ref={rail} className="bp-reward-track" tabIndex={0} aria-label="Scrollable reward track">
      {list.map(reward => <button key={reward.id} className={`bp-reward-card ${selected?.id === reward.id ? "is-selected" : ""}`} onClick={() => pick(reward.id)} aria-label={`Preview ${reward.title}`} aria-pressed={selected?.id === reward.id} data-reward-id={reward.id} data-kind={reward.kind}><span className="bp-reward-level">{reward.level ? `LEVEL ${reward.level}` : reward.collection}</span><img src={art(reward.image)} alt="" loading="lazy" /><span className="bp-reward-card-type">{reward.hero} · {reward.kind}</span><strong>{reward.title}</strong><small>{reward.level ? "Level reward" : "Collection reward"}</small></button>)}
    </div>
    {view === "highlights" ? <div className="bp-gallery-actions"><button onClick={() => onView("rewards")}>View all rewards <ChevronRight size={15} /></button><button onClick={() => onView("treasures")}>Explore treasures & Immortals <ChevronRight size={15} /></button></div>
      : <div className="bp-collection-grid" aria-label="Reward collection">{list.map(reward => <button key={reward.id} onClick={() => { pick(reward.id); rail.current?.closest("dialog")?.scrollTo({ top: 0, behavior: "instant" }); }} aria-label={`Inspect ${reward.title}`}><img src={art(reward.image)} alt="" loading="lazy" /><div><small>{reward.hero} · {reward.kind}</small><strong>{reward.title}</strong><span>{reward.level ? `Original unlock: Level ${reward.level}` : reward.collection}</span></div></button>)}</div>}
    <p className="bp-collection-note">Original cosmetic showcase · unlock levels describe the original Dota Battle Pass. Previewing does not purchase or claim items. Treasure contents include rare variants; their level is not a guaranteed item unlock.</p>
  </section>;
}

function RewardStage({ reward, index, total, onPrevious, onNext }: { reward: BattlePassReward; index: number; total: number; onPrevious: () => void; onNext: () => void }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const images = [reward.image, ...reward.variants];
  useEffect(() => {
    const pause = () => { if (document.hidden) video.current?.pause(); };
    document.addEventListener("visibilitychange", pause);
    const observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) video.current?.pause(); });
    if (video.current) observer.observe(video.current);
    return () => { document.removeEventListener("visibilitychange", pause); observer.disconnect(); };
  }, [playing]);
  return <div className={`bp-reward-stage ${playing ? "is-playing" : ""}`} data-kind={reward.kind} style={{ ["--reward-art" as string]: `url("${art(images[imageIndex])}")` }}>
    <div className="bp-reward-media">{playing && reward.video ? <video ref={video} src={reward.video} poster={art(images[imageIndex])} controls muted autoPlay loop playsInline preload="none" onError={() => { setPlaying(false); setFailed(true); }} aria-label={`${reward.title} animation preview`} /> : <img src={art(images[imageIndex])} alt={`${reward.title} · ${reward.hero} ${reward.kind}`} />}</div>
    <div className="bp-reward-detail"><small className="bp-reward-rarity">{reward.kind}</small><span className="bp-reward-hero">{reward.hero}</span>{reward.logo && <img className="bp-reward-title-art" src={art(reward.logo)} alt="" />}<h2 className={reward.logo ? "bp-title-hidden" : ""}>{reward.title}</h2><p>{reward.description}</p><div className="bp-reward-unlock"><span>{reward.level ?? <Sparkles size={20} />}</span><div><small>{reward.level ? "ORIGINAL BATTLE LEVEL" : "ORIGINAL COLLECTION"}</small><strong>{reward.level ? `Unlocks at Level ${reward.level}` : reward.unlock}</strong></div></div>
      <div className="bp-reward-media-controls">{reward.video && !failed && <button onClick={() => setPlaying(!playing)}>{playing ? <ImageIcon size={15} /> : <Play size={15} />}{playing ? "Still artwork" : "Play preview"}</button>}{images.length > 1 && <button onClick={() => { setPlaying(false); setImageIndex((imageIndex + 1) % images.length); }}><ImageIcon size={15} />{imageIndex ? "Original view" : "Alternate view"}</button>}</div>
      {failed && <small className="bp-media-note">Animation unavailable. Original artwork is shown.</small>}
    </div>
    <div className="bp-reward-pager"><button onClick={onPrevious} aria-label="Previous reward" disabled={total < 2}><ChevronLeft size={20} /></button><span>{index + 1} / {total}</span><button onClick={onNext} aria-label="Next reward" disabled={total < 2}><ChevronRight size={20} /></button></div>
  </div>;
}
