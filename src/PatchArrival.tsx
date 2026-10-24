import { useEffect, useRef, useState } from "react";
import type { Campaign } from "./game";
import { patchById } from "./patches";
import type { SeasonPatch } from "./patches";
import { milestoneForPatch, patchHeroArrivals } from "./patch-milestones";
import { patchTrailers } from "./patch-trailers";
import type { PatchVideo } from "./patch-trailers";
import { heroIconFor } from "./hero-icons";
import "./patches.css";

export function PatchTrailer({ milestone, autoPlay = false }: { milestone: Pick<PatchVideo, "title" | "videoId" | "videoUrl" | "source" | "version">; autoPlay?: boolean }) {
  const [playing, setPlaying] = useState(autoPlay);
  return <div className="patch-trailer">
    {playing ? milestone.videoUrl ? <video aria-label={`${milestone.title} · official trailer`} src={milestone.videoUrl} controls autoPlay muted={autoPlay} playsInline preload="metadata" />
      : <iframe title={`${milestone.title} · official trailer`} src={`https://www.youtube-nocookie.com/embed/${milestone.videoId}?autoplay=1&mute=${autoPlay ? 1 : 0}&playsinline=1&rel=0`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <button className="button secondary" onClick={() => setPlaying(true)}>▶ Watch {milestone.version ?? milestone.title}</button>}
    <p>Official Valve / Dota 2 trailer. {autoPlay && "Starts muted; use the player controls for sound. "}If playback is blocked, <a href={milestone.videoUrl ?? `https://www.youtube.com/watch?v=${milestone.videoId}`} target="_blank" rel="noreferrer">{milestone.videoUrl ? "open the official video" : "watch on YouTube"} ↗</a>. <a href={milestone.source} target="_blank" rel="noreferrer">Original update ↗</a></p>
  </div>;
}

export function PatchMedia({ patch, autoPlay = false }: { patch: SeasonPatch; autoPlay?: boolean }) {
  const videos = patchTrailers(patch);
  const [selected, setSelected] = useState<string>();
  const active = videos.find(video => video.id === selected) ?? videos[0];
  if (!active) return null;
  return <section className="patch-media" aria-label="Related official trailers"><h3>Related official trailers</h3>
    {videos.length > 1 && <div className="patch-video-picker" role="group" aria-label="Choose a trailer">{videos.map(video => <button key={video.id} className="button secondary" aria-pressed={video.id === active.id} onClick={() => setSelected(video.id)}>{video.title}</button>)}</div>}
    <PatchTrailer key={active.id} milestone={active} autoPlay={autoPlay} />
  </section>;
}

/** All drops share one saved queue, including reloads while a worker or another dialog is busy. */
export default function PatchArrival({ campaign, busy, onDismiss, onRead }: { campaign: Campaign; busy: boolean; onDismiss: (id: string) => void; onRead: (id: string) => void }) {
  const patch = patchById(campaign.patchIntroductions?.pending[0]);
  const dialog = useRef<HTMLDialogElement>(null);
  const [otherDialog, setOtherDialog] = useState(false);
  useEffect(() => {
    const check = () => setOtherDialog([...document.querySelectorAll("dialog[open]")].some(element => element !== dialog.current));
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
    check();
    return () => observer.disconnect();
  }, []);
  const show = !!patch && !busy && !otherDialog;
  useEffect(() => {
    if (show && !dialog.current?.open) dialog.current?.showModal();
    if (!show && dialog.current?.open) dialog.current.close();
  }, [show]);
  if (!patch) return null;
  const milestone = milestoneForPatch(patch.id);
  const arrivals = patchHeroArrivals(patch);
  const dismiss = () => onDismiss(patch.id);
  return <dialog ref={dialog} className="patch-arrival-dialog" aria-labelledby="patch-arrival-title" onCancel={e => { e.preventDefault(); dismiss(); }}>
    <div className="eyebrow">A NEW CHAPTER · PATCH {milestone?.version ?? patch.id}</div>
    <h2 id="patch-arrival-title">{milestone?.title ?? patch.name}</h2>
    <p>{milestone?.summary ?? patch.description}</p>
    {milestone && <p>{patch.description}</p>}
    <p>Season composite {patch.id} · {patch.generated ? "Fictional future balance" : `Includes ${patch.versions}`}. Existing tournaments retain their opening rules.</p>
    <section className="patch-popup-heroes"><h3>{arrivals.length ? `New heroes · ${arrivals.length}` : "Hero pool"}</h3>
      {arrivals.length ? <><p>These heroes join auto-drafting with this opening patch.</p><div className="patch-arrivals">{arrivals.map(hero => { const icon = heroIconFor(hero.id); return <span key={hero.id}>{icon && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" />}<strong>{hero.name}</strong></span>; })}</div></> : <p>No new heroes in this drop. The current pool carries forward.</p>}
    </section>
    {show && <PatchMedia key={patch.id} patch={patch} autoPlay />}
    {(campaign.patchIntroductions?.pending.length ?? 0) > 1 && <p className="field-note">{campaign.patchIntroductions!.pending.length} patch introductions waiting, shown in order.</p>}
    <div className="patch-arrival-actions"><button className="button secondary" onClick={dismiss}>Skip introduction</button><button className="button primary" onClick={() => { dismiss(); onRead(patch.id); }}>Read the patch notes →</button></div>
  </dialog>;
}
