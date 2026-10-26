import { memo, useState } from "react";
import type { PlayerScore } from "./battle";
import { heroById } from "./heroes";
import { heroIconFor } from "./hero-icons";

export const HeroToken = memo(function HeroToken({ score }: { score: PlayerScore }) {
  const hero = heroById(score.heroId);
  const icon = heroIconFor(score.heroId);
  const [failedPath, setFailedPath] = useState<string>();
  return (
    <span
      className={`match-hero-token attr-${hero?.attribute.toLowerCase() || "agility"}`}
      aria-hidden="true"
    >
      {icon && failedPath !== icon.path ? (
        <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" decoding="async"
          onError={() => setFailedPath(icon.path)} />
      ) : score.hero
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
});
