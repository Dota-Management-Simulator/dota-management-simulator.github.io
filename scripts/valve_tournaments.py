"""Normalize cached first-party league graphs; no network access during builds.

Unreviewed Steam identities and entry systems explicitly block participation.
The cache still makes documented dates, prize pools and stage inventories useful
in the calendar while historical identity/advancement research continues.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGIONS = {1: "North America", 2: "South America", 3: "Europe", 4: "Eastern Europe", 5: "China", 6: "Southeast Asia"}
BEST_OF = {1: 1, 2: 3, 3: 5, 4: 2}
TI_LEAGUES = {9870: 2018, 10749: 2019, 13256: 2021, 14268: 2022, 15728: 2023, 16935: 2024, 18324: 2025, 19719: 2026}


def day(stamp):
    return datetime.fromtimestamp(stamp, timezone.utc).date().isoformat()


def leaves(groups, phase=0, region=0, tiebreak=False):
    for group in groups:
        current = {**group, "phase": group.get("phase") or phase, "region": group.get("region") or region,
                   "is_tiebreaker": group.get("is_tiebreaker", False) or tiebreak}
        if group.get("nodes"):
            yield current
        yield from leaves(group.get("node_groups", []), current["phase"], current["region"], current["is_tiebreaker"])


def rounded_prize(pool, split):
    return int((Decimal(pool) * Decimal(split) / 10000).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def normalize_league(league, event_type, region, division, review=None, selected=None, kind="event", parent=None):
    info, prize = league["info"], league["prize_pool"]
    league_id = info["league_id"]
    review = review or {}
    groups = selected if selected is not None else list(leaves(league["node_groups"]))
    groups = [group for group in groups if group["node_group_type"] != 7 and not group["is_tiebreaker"]]
    nodes = [node for group in groups for node in group["nodes"] if node.get("is_completed") and node.get("team_id_1") and node.get("team_id_2")]
    stamps = [node.get("actual_time") or node.get("scheduled_time") for node in nodes]
    stamps = [stamp for stamp in stamps if stamp]
    if not stamps:
        return None
    start, end = day(min(stamps)), day(max(stamps))
    is_ti = league_id in TI_LEAGUES and kind != "qualifier"
    if is_ti:
        # The API event header can have a midnight timestamp a day before the
        # last played final. Actual fixture timestamps determine the window.
        kind = "ti"
    source = league["source"]
    url = review.get("canonicalSource", f"https://liquipedia.net/dota2/The_International/{TI_LEAGUES[league_id]}" if is_ti else source)
    if kind == "qualifier" and selected is not None:
        url = source + f"&node_group_id={groups[0]['node_group_id']}"
    raw_names = {str(team["team_id"]): team["team_name"] for group in groups for team in group["team_standings"]}
    names = review.get("names", {})
    team_ids = set(node[key] for node in nodes for key in ["team_id_1", "team_id_2"])
    # Do not present today's organization name as a verified event-era fact.
    name = lambda key: names.get(str(key), f"Steam club {key} (historical name pending)")
    reviewed = bool(review) and all(str(key) in names for key in team_ids)
    rr = [group for group in groups if group["node_group_type"] == 2]
    brackets = [group for group in groups if group["node_group_type"] != 2]
    group_rows, matchlists, bracket_rows = [], [], []
    for group in rr:
        ordered = review.get("groups", {}).get(str(group["node_group_id"])) or [team["team_id"] for team in group["team_standings"] if team["team_id"] in team_ids]
        games = BEST_OF.get(group["default_node_type"])
        if not games:
            games = BEST_OF.get(group["nodes"][0]["node_type"], 1)
        group_nodes = [node for node in group["nodes"] if node in nodes]
        group_stamps = [node.get("actual_time") or node.get("scheduled_time") for node in group_nodes]
        row = {"name": group["name"] or "League stage", "rows": [{"team": name(key)} for key in ordered], "games": games,
               "start": day(min(group_stamps)), "end": day(max(group_stamps))}
        if reviewed and is_ti:
            row["tieBreak"] = review.get("tieBreak", {"boundaries": [4, 8], "lowerSeedWins": True, "coinToss": league_id != 13256, "twoTeamBestOf": 3})
        group_rows.append(row)
        matchlists.append({"matches": [{"teams": [name(node["team_id_1"]), name(node["team_id_2"])], "scores": [str(node["team_1_wins"]), str(node["team_2_wins"])], "timestamp": str(node.get("actual_time") or node.get("scheduled_time"))} for node in group_nodes]})
    for group in brackets:
        bracket_rows.append({"heading": group["name"] or "Playoffs", "matches": [{"teams": [name(node["team_id_1"]), name(node["team_id_2"])], "scores": [str(node["team_1_wins"]), str(node["team_2_wins"])], "timestamp": str(node.get("actual_time") or node.get("scheduled_time")), "bestOf": BEST_OF.get(node["node_type"]), "round": node["name"] or "Bracket series"} for node in group["nodes"] if node in nodes]})
    pool = prize.get("total_prize_pool", 0) if kind != "qualifier" else 0
    splits = prize.get("prize_split_pct_x100", []) if kind != "qualifier" else []
    placements = {}
    # A final bracket contains ranked finishing bands. Other group tables are
    # retained as research and do not become assumed global placements.
    for group in brackets:
        # Some old parent flags were never finalized, although every dated
        # series and the final standings are complete (notably TI2018).
        if not group["nodes"] or any(not node.get("is_completed") for node in group["nodes"]):
            continue
        for team in group["team_standings"]:
            if team["standing"] > 0 and team["team_id"] in team_ids:
                placements[team["team_id"]] = team["standing"]
    if reviewed and is_ti:
        for group in rr:
            ordered = review["groups"][str(group["node_group_id"])]
            for rank, key in enumerate(ordered, 1):
                advance_count = review.get("advanceCount", 8)
                if rank > advance_count:
                    placements[key] = 17 + (rank - advance_count - 1) * len(rr)
    buckets = {}
    for key, rank in placements.items():
        buckets.setdefault(rank, []).append(key)
    rows = []
    for rank, keys in sorted(buckets.items()):
        for index, key in enumerate(keys):
            last = rank + len(keys) - 1
            amount = rounded_prize(pool, splits[rank - 1]) if len(splits) >= rank else 0
            rows.append({"place": (str(rank) if rank == last else f"{rank}-{last}") if index == 0 else "", "cells": [str(rank) if rank == last else f"{rank}-{last}", name(key), f"${amount:,}"] if index == 0 else [name(key)]})
    formats = []
    for group in groups:
        lengths = sorted(set(BEST_OF.get(node["node_type"], 0) for node in group["nodes"]))
        mode = {2: "round-robin", 3: "Swiss", 4: "single-elimination", 5: "double-elimination", 6: "double-elimination", 8: "GSL groups", 9: "placement"}.get(group["node_group_type"], "stage (advancement under review)")
        title = group["name"] or ("Group stage" if mode == "round-robin" else "Playoffs")
        formats.append(f"{title}: {len(group['team_standings'])} listed teams; {mode}; " + "/".join(f"BO{n}" for n in lengths if n) + ".")
    if reviewed and is_ti:
        formats = [f"Group Stage: two groups of {len(rr[0]['team_standings'])}, single round-robin, all BO2. Top four in each advance to the upper bracket; fifth through eighth to the lower bracket; remaining teams eliminated.", "Main Event: sixteen-team double-elimination bracket. First lower-bracket round BO1, grand final BO5, all other series BO3. No grand-final default win. Boundary ties use BO3 for two teams and BO1 round robin for three or more."]
    if review.get("format"):
        formats = [review["format"]]
    limitations = list(review.get("limitations", []))
    if not reviewed:
        limitations.append("Valve's dated fixture/stage and prize-pool records are cached; event-era team identities, tier classification, entry rules and complete advancement still require review.")
    if not splits and pool:
        limitations.append("Valve's archive does not provide a usable per-placement cash split.")
    if reviewed and is_ti and len(placements) != len(team_ids):
        limitations.append("A finishing placement is missing from the reviewed main-event field.")
    suffix = f": {REGIONS.get(region, '')}" if selected is not None and kind == "qualifier" else ""
    result = {"url": url, "name": info["name"] + (" Regional Qualifier" + suffix if suffix else ""), "kind": kind,
              "year": int(start[:4]), "tier": 1 if is_ti or event_type == 2 else 2,
              "fields": {"Game": "Dota 2", "Start Date": start, "End Date": end, "Teams": str(len(team_ids)), "Type": "Offline" if is_ti or (event_type == 2 and not region) or league_id == 14642 else "Online", "Prize Pool": f"${pool:,}"},
              "location": review.get("location", REGIONS.get(region, "")), "format": " ".join(formats), "participants": [name(key) + ("\nInvited" if reviewed and key not in review.get("qualified", []) else "") for key in sorted(team_ids)],
              "groups": group_rows, "matchlists": matchlists, "brackets": bracket_rows,
              "prizes": [{"headers": ["Place", "Participant", "$ USD"], "rows": rows}], "limitations": limitations,
              "additionalSources": list(dict.fromkeys([source, *review.get("sources", [])])), "reviewNotes": review.get("notes", "")}
    if review:
        result["replaceArchived"] = True
    if reviewed and pool:
        result["poolNote"] = "Allocations use Valve's final prize pool and published percentage splits, rounded to the nearest whole USD. Rounded allocations may differ from the pool by a few dollars; no extra reward is invented."
    if region:
        result["region"] = REGIONS[region]
    if parent:
        result["parent"] = parent
    return result


def source_records():
    path = ROOT / "scripts/data/valve-tournament-facts.json.gz"
    if not path.exists():
        return []
    with gzip.open(path, "rt", encoding="utf8") as file:
        cache = json.load(file)
    reviews = json.loads((ROOT / "scripts/data/valve-tournament-reviews.json").read_text(encoding="utf8"))["events"]
    records, seen = [], set()
    events = list(cache["events"])
    if cache.get("additionalLeagues"):
        events.append({"event_type": 4, "event_name": "historical-ti", "leagues": [{"league_id": key, "region": 0, "division": 0} for key in cache["additionalLeagues"]]})
    for event in events:
        for reference in event["leagues"]:
            key = str(reference["league_id"])
            if key in seen:
                continue
            seen.add(key)
            league = cache["leagues"].get(key)
            if not league:
                continue
            review = reviews.get(key)
            if int(key) in TI_LEAGUES:
                main_groups = [group for group in leaves(league["node_groups"]) if group["phase"] != 1]
                record = normalize_league(league, event["event_type"], 0, 0, review, main_groups)
                if record:
                    record["kind"] = "ti"
                    if review and review.get("useArchivedPrizes"):
                        with gzip.open(ROOT / "scripts/data/tournament-facts.json.gz", "rt", encoding="utf8") as file:
                            archived = next(item for item in json.load(file)["events"] if item["url"] == record["url"])
                        record["prizes"] = archived["prizes"]
                        record["fields"]["Prize Pool"] = archived["fields"]["Prize Pool"]
                        record["poolNote"] = review["poolNote"]
                    records.append(record)
                if key == "13256":
                    for group in leaves(league["node_groups"]):
                        if group["phase"] == 1 and not group["is_tiebreaker"]:
                            qualifier = normalize_league(league, 1, group["region"], 0, review, [group], "qualifier", "https://liquipedia.net/dota2/The_International/2021")
                            if qualifier:
                                qualifier["limitations"].append("Regional-league eligibility and the complete qualifier field must be reviewed before entry.")
                                records.append(qualifier)
            else:
                kind = "qualifier" if "qual" in event["event_name"] else "event"
                record = normalize_league(league, event["event_type"], reference["region"], reference["division"], review, kind=kind)
                if record:
                    records.append(record)
    return records
