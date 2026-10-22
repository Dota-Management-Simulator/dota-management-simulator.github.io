"""Cache Valve's public esports calendar/league graphs for offline research.

The public esports client uses these endpoints without authentication. A
configured event's leagues are requested together, cached, and never refetched
unless --refresh is supplied. Denials stop the run; no proxy/retry workaround.
Steam team names are mutable: this file is source evidence, not era identity
verification. Do not import current names into historical rosters blindly.
"""
import argparse
import gzip
import json
from pathlib import Path
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts/data/valve-tournament-facts.json.gz"
PAGE = "https://www.dota2.com/esports/ti10/watch"
AGENT = "AegisManagerResearch/0.1 (https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io)"


def write(data):
    CACHE.write_bytes(gzip.compress(json.dumps(data, ensure_ascii=False).encode("utf8"), mtime=0))


def get(url):
    request = Request(url, headers={"User-Agent": AGENT, "Accept-Encoding": "gzip"})
    with urlopen(request, timeout=60) as response:
        body = response.read()
        if response.headers.get("Content-Encoding") == "gzip":
            body = gzip.decompress(body)
        return body.decode("utf8")


def clean_group(group):
    keys = ["name", "node_group_id", "parent_node_group_id", "incoming_node_group_ids", "advancing_node_group_id", "advancing_team_count", "team_count", "node_group_type", "default_node_type", "round", "max_rounds", "win_loss_limit", "is_tiebreaker", "is_final_group", "is_completed", "phase", "region", "start_time", "end_time", "secondary_advancing_node_group_id", "secondary_advancing_team_count", "tertiary_advancing_node_group_id", "tertiary_advancing_team_count", "elimination_dpc_points"]
    result = {key: group[key] for key in keys if key in group}
    result["team_standings"] = [{key: team[key] for key in ["standing", "team_id", "team_name", "team_tag", "wins", "losses", "score"] if key in team} for team in group.get("team_standings", [])]
    result["nodes"] = [{key: value for key, value in node.items() if key not in ["vods", "stream_ids"]} for node in group.get("nodes", [])]
    result["node_groups"] = [clean_group(child) for child in group.get("node_groups", [])]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--league", type=int, action="append", default=[], help="An additional independently identified league ID to cache.")
    args = parser.parse_args()
    if CACHE.exists():
        with gzip.open(CACHE, "rt", encoding="utf8") as file:
            data = json.load(file)
    else:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(get(PAGE), "html.parser")
        config = json.loads(soup.find(id="application_config")["data-dota_react"])
        data = {"source": PAGE, "reviewedOn": "2026-10-22", "attribution": "Public tournament facts from Valve's Dota 2 esports calendar. Team names in the API are mutable and require era review.", "events": json.loads(config["DPC_DATA"])["events"], "leagues": {}}
        write(data)
    events = list(data["events"])
    if args.league:
        data["additionalLeagues"] = sorted(set(data.get("additionalLeagues", []) + args.league))
    if data.get("additionalLeagues"):
        events.append({"event": "additional historical leagues", "leagues": [{"league_id": key} for key in data["additionalLeagues"]]})
    for event in events:
        ids = sorted(set(league["league_id"] for league in event["leagues"]))
        missing = [league for league in ids if args.refresh or str(league) not in data["leagues"]]
        if not missing:
            continue
        url = "https://www.dota2.com/webapi/IDOTA2League/GetLeaguesData/v001?" + urlencode({"league_ids": ",".join(map(str, missing)) + ",", "delay_seconds": 0})
        try:
            response = json.loads(get(url))
        except HTTPError:
            write(data)
            raise
        if not isinstance(response.get("leagues"), list):
            write(data)
            raise RuntimeError("Valve returned no league array; preserved cached research.")
        for league in response["leagues"]:
            key = str(league["info"]["league_id"])
            data["leagues"][key] = {"source": f"https://www.dota2.com/webapi/IDOTA2League/GetLeagueData/v001?league_id={key}", "info": league["info"], "prize_pool": league.get("prize_pool", {}), "node_groups": [clean_group(group) for group in league.get("node_groups", [])]}
        write(data)
        print(json.dumps({"event": event["event"], "cachedLeagues": len(data["leagues"])}), flush=True)
        time.sleep(2.2)
    print(json.dumps({"events": len(data["events"]), "leagues": len(data["leagues"]), "bytes": CACHE.stat().st_size}))


if __name__ == "__main__":
    main()
