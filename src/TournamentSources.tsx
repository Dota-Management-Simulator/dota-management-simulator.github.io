import type { HistoricalTournament } from "./tournament-types";

export default function TournamentSources({ event }: { event: HistoricalTournament }) {
  const supporting = [...new Set(event.additionalSources ?? [])].filter(url => url !== event.source);
  const label = (url: string) => {
    const source = new URL(url);
    const league = source.searchParams.get("league_id");
    return league && source.hostname.endsWith("dota2.com") ? `Valve · league ${league}` : `${source.hostname.replace(/^www\./, "")} · ${decodeURIComponent(source.pathname).split("/").filter(Boolean).at(-1)?.replaceAll("_", " ") ?? "reference"}`;
  };
  return <>
    <p><a href={event.source} target="_blank" rel="noreferrer">Historical event reference</a></p>
    {supporting.length > 0 && <details><summary>Supporting sources · {supporting.length}</summary><ul>{supporting.map(url => <li key={url}><a href={url} target="_blank" rel="noreferrer">{label(url)}</a></li>)}</ul></details>}
  </>;
}
