import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Hero } from "./heroes";
import { heroMedia } from "./hero-media";

/** One selected render at a time; these are Valve idle films, not a 3D viewer. */
export default function HeroModel({ hero, motion, onMotion }: { hero: Hero; motion: boolean; onMotion: (motion: boolean) => void }) {
  const media = heroMedia(hero.id, import.meta.env.BASE_URL);
  const video = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (stage.current) observer.observe(stage.current);
    const changed = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", changed);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", changed); };
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (motion && inView && visible) {
      void element.play().catch(error => { if (error.name !== "AbortError") onMotion(false); });
    } else element.pause();
  }, [motion, inView, visible, videoFailed, onMotion]);

  const animated = motion && !videoFailed && !!media;
  return <div className="hero-model-stage" ref={stage}>
    <div className="hero-model-rune" aria-hidden="true" />
    <span className="hero-model-eyebrow">HERO SHOWCASE</span>
    {animated ? <video ref={video} className="hero-model-render" aria-label={`${hero.name} animated model`} muted loop playsInline preload="none" poster={imageFailed ? undefined : media.poster} onError={() => setVideoFailed(true)} src={media.video} />
      : media && !imageFailed ? <img className="hero-model-render" src={media.poster} alt={`${hero.name} model`} onError={() => setImageFailed(true)} />
      : <div className="hero-model-unavailable">{media && <img src={media.icon} alt="" />}<span>Model unavailable</span></div>}
    <div className="hero-model-floor" aria-hidden="true" />
    <div className="hero-model-footer"><span>{hero.ranged ? "RANGED" : "MELEE"} · {hero.attribute.toUpperCase()}</span><button aria-label={animated ? "Pause hero animation" : "Play hero animation"} disabled={videoFailed || !media} onClick={() => onMotion(!motion)}>{animated ? <Pause size={14} /> : <Play size={14} />}{animated ? "Pause" : "Animate"}</button></div>
    {videoFailed && <small className="hero-model-fallback">Animation unavailable · showing artwork</small>}
  </div>;
}
