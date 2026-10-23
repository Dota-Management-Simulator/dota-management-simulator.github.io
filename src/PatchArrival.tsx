import { useEffect, useRef, useState } from "react";
import type { Campaign } from "./game";
import { campaignPatch } from "./patches";
import { arrivingMilestones, milestoneForPatch } from "./patch-milestones";
import type { PatchMilestone } from "./patch-milestones";
import "./patches.css";

export function PatchTrailer({ milestone, autoPlay = false }: { milestone: PatchMilestone; autoPlay?: boolean }) {
  const [playing, setPlaying] = useState(autoPlay);
  return <div className="patch-trailer">
    {playing ? <iframe title={`${milestone.title} · official trailer`} src={`https://www.youtube-nocookie.com/embed/${milestone.videoId}?autoplay=1&mute=${autoPlay ? 1 : 0}&playsinline=1&rel=0`}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <button className="button secondary" onClick={() => setPlaying(true)}>▶ Watch the official {milestone.version} trailer</button>}
    <p>Official Valve / Dota 2 trailer. {autoPlay && "Starts muted; use the player controls for sound. "}If playback is blocked, <a href={`https://www.youtube.com/watch?v=${milestone.videoId}`} target="_blank" rel="noreferrer">watch on YouTube ↗</a>. <a href={milestone.source} target="_blank" rel="noreferrer">Original update ↗</a></p>
  </div>;
}

/** Exact opening on load, or any milestone crossed by a calendar jump. */
export default function PatchArrival({ campaign, busy, onDismiss, onRead }: { campaign: Campaign; busy: boolean; onDismiss: (id: string) => void; onRead: () => void }) {
  const current = campaignPatch(campaign).id;
  const previous = useRef<string | undefined>(undefined);
  const [pending, setPending] = useState<PatchMilestone[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const incoming = arrivingMilestones(current, previous.current, campaign.seenPatchMilestones);
    previous.current = current;
    setPending(old => [...old.filter(m => !campaign.seenPatchMilestones?.includes(m.id)), ...incoming.filter(m => !old.some(o => o.id === m.id))]);
  }, [current, campaign.seenPatchMilestones]);
  const active = pending[0] ?? milestoneForPatch(current);
  const show = pending.length > 0 && !busy;
  useEffect(() => {
    if (show && !dialog.current?.open) dialog.current?.showModal();
    if (!show && dialog.current?.open) dialog.current.close();
  }, [show]);
  if (!active) return null;
  const dismiss = () => { onDismiss(active.id); setPending(old => old.filter(m => m.id !== active.id)); };
  return <dialog ref={dialog} className="patch-arrival-dialog" aria-labelledby="patch-arrival-title" onCancel={e => { e.preventDefault(); dismiss(); }}>
    <div className="eyebrow">A NEW CHAPTER · PATCH {active.version}</div>
    <h2 id="patch-arrival-title">{active.title}</h2><p>{active.summary}</p>
    <p>Introduced with season composite {active.patchId}. Existing tournaments retain their opening rules.</p>
    {show && <PatchTrailer key={active.id} milestone={active} autoPlay />}
    <div className="patch-arrival-actions"><button className="button secondary" onClick={dismiss}>Skip introduction</button><button className="button" onClick={() => { dismiss(); onRead(); }}>Read the patch notes →</button></div>
  </dialog>;
}
