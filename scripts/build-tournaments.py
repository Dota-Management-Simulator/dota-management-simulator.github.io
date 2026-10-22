"""Compile browser-extracted historical facts; never supply an invented format.

python scripts/build-tournaments.py
The source snapshots retain their URLs and CC-BY-SA attribution. Unknown dates,
prizes, missing stages and ambiguous advancement prevent an event being playable.
"""
import collections
import datetime as dt
import hashlib
import gzip
import json
from pathlib import Path
import re
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts/data/tournament-facts.json.gz"
RULES = ROOT / "scripts/data/tournament-source-rules.json"
OUT = ROOT / "src/data/tournaments.json"
REVIEWED = "2026-10-22"
source_rules = json.loads(RULES.read_text(encoding="utf8"))["pages"] if RULES.exists() else []
match_rules = {match["sourceId"]: match for page in source_rules for match in page["matches"]}
correction_path = ROOT / "scripts/data/tournament-corrections.json"
corrections = json.loads(correction_path.read_text(encoding="utf8"))["events"] if correction_path.exists() else {}


def norm(value):
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


aliases = {}
logos = json.loads((ROOT / "src/data/team-logos.json").read_text(encoding="utf8"))
for club, record in logos["teams"].items():
    for name in record["names"]:
        aliases[norm(name)] = club
aliases.update({"mith": "mith", "madeinthailand": "mith", "mtw": "mtw", "mortalteamwork": "mtw",
                "teamgamersleague": "fnatic", "gamersleague": "fnatic", "fnaticeu": "fnatic", "monkeybusiness": "monkeybusiness",
                "clg": "counter-logic-gaming", "complexity": "complexity"})


def team(name):
    return aliases.get(norm(name), norm(name))


def identifier(url):
    return "historical-" + hashlib.sha256(url.encode()).hexdigest()[:12]


def dollars(value):
    found = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", value or "")
    return round(float(found[1].replace(",", "")), 2) if found else None


def fields_for(raw):
    fields = raw.get("fields", {})
    if not fields:
        for key in ["Start Date", "End Date", "Game", "Teams", "Prize Pool", "Format"]:
            found = re.search(re.escape(key) + r":\n([^\n]+)", raw.get("info", ""))
            if found:
                fields[key] = found[1].strip()
    return fields


def prize_tables(raw, team_lookup=team):
    tables = raw.get("prizes", [])
    if tables and "cells" in tables[0]:
        tables = [{"headers": ["Place", "Participant", "$ USD"], "rows": tables}]
    table = next((t for t in tables if any("USD" in h for h in t["headers"])), None)
    if not table and raw.get("kind") == "qualifier":
        table = next(iter(tables), None)
    if not table:
        return [], {}
    payouts = []
    places = {}
    place = None
    for row in table["rows"]:
        if row.get("place"):
            p = re.findall(r"\d+", row["place"])
            place = (int(p[0]), int(p[-1])) if p else None
            amount = next((dollars(v) for v in row["cells"] if dollars(v) is not None), 0)
            if place:
                payouts.append({"from": place[0], "to": place[1], "usd": amount})
                point_index = next((i for i, header in enumerate(table["headers"]) if re.search(r"\bPoints\b", header)), None)
                if point_index is not None and point_index < len(row["cells"]):
                    points = re.sub(r"[^\d.]", "", row["cells"][point_index])
                    if points:
                        payouts[-1]["points"] = float(points)
        if place:
            # Rows after a rowspan contain just the next participant. Currency
            # and qualification columns are excluded from identity matching.
            cells = row["cells"][1:] if row.get("place") else row["cells"]
            name = next((v.strip() for v in cells if v.strip() and not re.fullmatch(r"[\d\s.,$%\-–]+", v.strip())), None)
            if name:
                places[team_lookup(name)] = place
    return payouts, places


def compile_event(raw):
    raw = dict(raw)
    if raw.get("kind") == "qualifier" and not raw.get("parent") and raw.get("parentSource"):
        raw["parent"] = raw["parentSource"]
    correction = corrections.get(raw["url"], {})
    if correction.get("excludeBrackets"):
        raw["brackets"] = [bracket for index, bracket in enumerate(raw.get("brackets", [])) if index not in correction["excludeBrackets"]]
    if correction.get("format"):
        raw["format"] = correction["format"]
    scoped_aliases = {norm(key): val for key, val in correction.get("aliases", {}).items()}
    def team(name):
        return globals()["team"](scoped_aliases.get(norm(name), name))
    rules = next((page for page in source_rules if page["source"] == raw.get("canonicalSource", raw["url"])), None)
    if rules:
        raw["fields"] = {**fields_for(raw), **rules.get("fields", {})}
    if correction.get("fields"):
        raw["fields"] = {**fields_for(raw), **correction["fields"]}
    if correction.get("groups"):
        raw["groups"] = correction["groups"]
    fields = fields_for(raw)
    if fields.get("Game") and fields["Game"] != "Dota 2":
        return None
    if "Dota 2" not in fields.get("Game", raw.get("info", "")):
        return None
    start, end = fields.get("Start Date", ""), fields.get("End Date", "")
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", start) or not re.fullmatch(r"\d{4}-\d\d-\d\d", end):
        return None
    event_id = identifier(raw["url"])
    format_text = raw.get("format", "").split("Prizepool[edit]")[0].strip()
    prizes, original_placements = prize_tables(raw, team)
    native_pool = rules.get("nativePool") if rules else None
    if native_pool:
        currency_table = next((t for t in raw.get("prizes", []) if "headers" in t and any(native_pool["currency"] in h for h in t["headers"]) and any("USD" in h for h in t["headers"])), None)
        if currency_table:
            currency_column = next(i for i, h in enumerate(currency_table["headers"]) if native_pool["currency"] in h)
            for row in currency_table["rows"]:
                rank = re.findall(r"\d+", row.get("place", ""))
                if rank and len(row["cells"]) > currency_column:
                    amount = re.sub(r"[^\d.]", "", row["cells"][currency_column])
                    for prize in prizes:
                        if amount and prize["from"] == int(rank[0]) and prize["to"] == int(rank[-1]):
                            prize["nativeAmount"] = float(amount)
    for payout in correction.get("payouts", []):
        for prize in prizes:
            if prize["from"] == payout["from"] and prize["to"] == payout["to"]:
                prize.update(payout)
    limitations = list(raw.get("limitations", []))
    if not format_text:
        limitations.append("The source does not provide a complete format.")
    if not prizes and raw.get("kind") != "qualifier":
        limitations.append("Placement payouts have not been verified.")
    if raw.get("kind") == "qualifier" and not raw.get("qualification") and not raw.get("qualifyingPlaces"):
        limitations.append("The qualifier's advancement awards have not been verified.")
    groups, fixtures = [], []
    group_stages = {}
    names = {}
    source_ranks = {}
    previous_stage = {}
    current_stage_names = set()
    stage = 0
    # Tables enumerate historical final standings, used solely to recover the
    # group-size and advancement slots. Historical wins never decide a game.
    gsl = bool(re.search(r"GSL|double.elimination group", format_text, re.I))
    raw_groups = [g for g in raw.get("groups", []) if len(g.get("rows", [])) >= 2
                  and not re.search(r"tiebreak", g.get("name", "") or "", re.I)]
    group_description = re.split(r"Playoffs?|Main Event|Grand Final", format_text, flags=re.I)[0]
    def group_format(stage_number):
        markers = list(re.finditer(r"(?:Group Stage\s*#?\s*[123]|First Group Stage|Second Group Stage)", group_description, re.I))
        description = group_description
        if len(markers) > stage_number:
            description = group_description[markers[stage_number].start():markers[stage_number + 1].start() if len(markers) > stage_number + 1 else len(group_description)]
        match = re.search(r"\bBo([123])\b|best.of.(1|2|3|one|two|three)", description, re.I)
        number = (match[1] or match[2]).lower() if match else None
        games = int(number) if number and number.isdigit() else {"one": 1, "two": 2, "three": 3}.get(number, 2 if re.search(r"(?:2|two) times|twice", description, re.I) else 1)
        legs = 2 if re.search(r"double round.robin", description, re.I) and games != 2 else 1
        return games, legs
    if not gsl:
        for index, source_group in enumerate(raw_groups):
            rows = [r for r in source_group["rows"] if r.get("team")]
            keys = [team(r["team"]) for r in rows]
            if len(set(keys)) != len(keys) or len(keys) < 2:
                continue
            if current_stage_names.intersection(keys):
                previous_stage = dict(source_ranks)
                current_stage_names = set()
                stage += 1
            gid = f"group-{index}"
            slots = []
            for rank, row in enumerate(rows):
                key = team(row["team"])
                names[key] = row["team"]
                slots.append(previous_stage.get(key, {"team": key}))
                source_ranks[key] = {"group": gid, "rank": rank + 1}
                current_stage_names.add(key)
            groups.append({"id": gid, "name": source_group.get("name", f"Group {index + 1}"),
                           "teams": slots, "mode": "swiss" if "swiss" in group_description.lower() else "round-robin",
                           "games": source_group.get("games", group_format(stage)[0]), "legs": group_format(stage)[1],
                           **{key: source_group[key] for key in ["start", "end", "scoring", "tieBreak"] if key in source_group}})
            group_stages[gid] = stage
    matches = []
    for bracket_index, bracket in enumerate(raw.get("brackets", [])):
        rows = bracket if isinstance(bracket, list) else bracket.get("matches", [])
        for index, match in enumerate(rows):
            if len(match.get("teams", [])) != 2 or not all(match["teams"]):
                continue
            details = match.get("details", "") or ""
            if re.search(r"\bTBD\b", " ".join(match["teams"])):
                continue
            scores = [int(s) if re.fullmatch(r"\d+", s or "") else None for s in match.get("scores", [])]
            if len(scores) != 2 or None in scores or scores[0] == scores[1]:
                limitations.append("A bracket match has no usable advancement result.")
                continue
            rule = match_rules.get(match.get("sourceId"), {})
            rule = {**rule, **next((item for item in correction.get("fixtureRules", []) if item["teams"] == match["teams"] and item.get("bestOf") == min(7, max(scores) * 2 - 1)), {})}
            date_verified = False
            try:
                stamp = dt.datetime.fromtimestamp(int(rule.get("timestamp", match.get("timestamp", ""))), dt.timezone.utc).isoformat().replace("+00:00", "Z")
                precise = True
                date_verified = True
            except (ValueError, OSError, OverflowError):
                date_match = re.search(r"([A-Za-z]+ \d{1,2}, \d{4})", details)
                day = rule.get("date") or (dt.datetime.strptime(date_match[1], "%B %d, %Y").date().isoformat() if date_match else None)
                stamp = day or end
                date_verified = bool(day)
                precise = False
            bestof = rule.get("bestOf", match.get("bestOf") or min(7, max(scores) * 2 - 1))
            if bestof not in (1, 3, 5, 7):
                limitations.append("An unusual series length needs a reviewed override.")
                continue
            matches.append({"id": f"bracket-{bracket_index}-{index}", "stage": (bracket.get("heading", "Playoffs") if isinstance(bracket, dict) else "Playoffs") or "Playoffs",
                            "label": rule.get("round") or match.get("round") or "Bracket series", "at": stamp, "timeVerified": precise, "dateVerified": date_verified,
                            "bestOf": bestof, "original": match["teams"], "scores": scores,
                            "details": details, "advantage": rule.get("advantage"), "order": len(matches)})
    # Source timestamps determine cross-bracket order; native bracket order is
    # retained when a source only records the day.
    if matches and all(m["timeVerified"] for m in matches):
        matches.sort(key=lambda m: (m["at"], m["order"]))
    last_output = {}
    consumed = set()
    for match in matches:
        slots = []
        for name in match["original"]:
            key = team(name)
            names.setdefault(key, name)
            slot = last_output.get(key) or source_ranks.get(key) or {"team": key}
            slots.append(slot)
            if "match" in slot:
                consumed.add((slot["match"], slot["outcome"]))
        winner = 0 if match["scores"][0] > match["scores"][1] else 1
        for side, name in enumerate(match["original"]):
            last_output[team(name)] = {"match": match["id"], "outcome": "winner" if side == winner else "loser"}
        fixture = {k: match[k] for k in ["id", "stage", "label", "at", "timeVerified", "dateVerified", "bestOf"]}
        fixture["slots"] = slots
        if match["advantage"] or re.search(r"1.0 lead|one.game advantage|1.game advantage", match["details"], re.I):
            fixture["advantage"] = match["advantage"] or [1, 0]
        fixtures.append(fixture)
    # Once the documented paid placements exhaust the pool, all omitted teams
    # have zero cash prizes. Their tied placement bands follow the stage where
    # the advancement graph eliminates them, rather than an invented loser %.
    pool = dollars(fields.get("Prize Pool")) or dollars(raw.get("prize")) or 0
    allocated = sum(p["usd"] * (p["to"] - p["from"] + 1) for p in prizes)
    pool_note = correction.get("poolNote", raw.get("poolNote"))
    if native_pool and abs(sum(p.get("nativeAmount", 0) * (p["to"] - p["from"] + 1) for p in prizes) - native_pool["amount"]) < 0.01:
        if abs(allocated - pool) > 1:
            pool_note = f"Original pool: {native_pool['amount']:g} {native_pool['currency']}. USD {pool:,.2f} was an approximate headline conversion; gameplay uses the archived per-placement USD conversions, totaling USD {allocated:,.2f}."
            pool = round(allocated, 2)
    count = int(re.search(r"\d+", fields.get("Teams", "0"))[0]) if re.search(r"\d+", fields.get("Teams", "0")) else 0
    if prizes and abs(allocated - pool) > max(1, count * 0.51):
        limitations.append("Placement payouts do not reconcile to the stated prize pool.")
    roots = {s["team"] for g in groups for s in g["teams"] if "team" in s}
    roots.update(s["team"] for f in fixtures for s in f["slots"] if "team" in s)
    if prizes and abs(allocated - pool) <= max(1, pool * 0.0001):
        winner_children = {}
        for fixture in fixtures:
            for slot in fixture["slots"]:
                if "match" in slot and slot["outcome"] == "winner":
                    winner_children[slot["match"]] = fixture["id"]

        def distance(match_id, seen=None):
            seen = set() if seen is None else seen
            if match_id in seen:
                return 0
            seen.add(match_id)
            return 1 + distance(winner_children[match_id], seen) if match_id in winner_children else 0

        buckets = collections.defaultdict(list)
        for key in sorted(roots):
            slot = last_output.get(key) or source_ranks.get(key)
            if not slot:
                continue
            if "group" in slot:
                bucket = (0, group_stages[slot["group"]])
            else:
                bucket = (1, -distance(slot["match"])) if slot["outcome"] == "loser" else (2, 0)
            buckets[bucket].append(key)
        remaining = len(roots)
        for _, keys in sorted(buckets.items()):
            known = [original_placements[key] for key in keys if key in original_placements]
            missing = [key for key in keys if key not in original_placements]
            first = min((p[0] for p in known), default=remaining - len(keys) + 1)
            last = max((p[1] for p in known), default=remaining)
            for key in missing:
                original_placements[key] = (first, last)
            if missing and not any(p["from"] == first and p["to"] == last for p in prizes):
                prizes.append({"from": first, "to": last, "usd": 0})
            remaining = first - 1
        prizes.sort(key=lambda p: p["from"])
    placements = []
    for key, (first, last) in original_placements.items():
        slot = last_output.get(key) or source_ranks.get(key)
        if slot:
            placements.append({"slot": slot, "from": first, "to": last})
        elif any(p["usd"] > 0 and p["from"] == first and p["to"] == last for p in prizes):
            limitations.append("A paid placement cannot yet be linked to its advancement slot.")
    if re.search(r"Playoffs?|Grand Final|Main Event", format_text, re.I) and not matches:
        limitations.append("The source describes playoffs whose full fixture graph is still missing.")
    if re.search(r"Group Stage|round.robin", format_text, re.I) and not groups:
        group_brackets = any(re.search(r"group", m["stage"], re.I) for m in matches)
        if not (gsl and group_brackets):
            limitations.append("A documented group stage has not been recovered; playoff matches alone are incomplete.")
    for prize in prizes:
        if prize["usd"] and sum(p["from"] == prize["from"] and p["to"] == prize["to"] for p in placements) != prize["to"] - prize["from"] + 1:
            limitations.append("A paid placement cannot yet be linked to its advancement slot.")
    if not groups and not fixtures:
        limitations.append("The complete stage schedule has not been recovered.")
    total_match = re.search(r"\d+", fields.get("Teams", raw.get("teams", "0")) or "0")
    total = int(total_match[0]) if total_match else 0
    entrants = {s["team"] for g in groups for s in g["teams"] if "team" in s}
    entrants.update(s["team"] for f in fixtures for s in f["slots"] if "team" in s)
    if total and len(entrants) != total:
        limitations.append(f"Recovered {len(entrants)} of {total} entry slots; missing stages require review.")
    if groups and any(g["mode"] == "swiss" for g in groups):
        limitations.append("Swiss advancement needs event-specific win/loss thresholds.")
    if total and len(placements) != total and raw.get("kind") != "qualifier":
        limitations.append("Not every finishing placement has a verified advancement slot.")
    for group in groups:
        if group["mode"] == "round-robin":
            count = len(group["teams"])
            group_keys = {team(r["team"]) for r in raw_groups[int(group["id"].split("-")[-1])]["rows"] if r.get("team")}
            recorded = []
            for matchlist in raw.get("matchlists", []):
                candidates = matchlist.get("matches", [])
                keys = {team(name) for match in candidates for name in match.get("teams", []) if name}
                if keys == group_keys:
                    recorded.extend(candidates)
            expected = count * (count - 1) // 2 * group["legs"]
            pair_counts = collections.Counter(tuple(sorted(team(name) for name in m.get("teams", []))) for m in recorded)
            if len(recorded) == expected and len(pair_counts) == count * (count - 1) // 2 and all(n == group["legs"] for n in pair_counts.values()) and all(len(m.get("teams", [])) == 2 and all(name and team(name) in group_keys for name in m["teams"]) for m in recorded):
                for index, match in enumerate(recorded):
                    try:
                        at = dt.datetime.fromtimestamp(int(match.get("timestamp", "")), dt.timezone.utc).isoformat().replace("+00:00", "Z")
                        precise = True
                        date_verified = True
                    except (ValueError, OSError, OverflowError):
                        stamp = re.match(r"([A-Za-z]+ \d{1,2}, \d{4})", match.get("details", "") or "")
                        at = dt.datetime.strptime(stamp[1], "%B %d, %Y").date().isoformat() if stamp else start
                        precise = False
                        date_verified = bool(stamp)
                    rows = [r for r in raw_groups[int(group["id"].split("-")[-1])]["rows"] if r.get("team")]
                    lookup = {team(r["team"]): group["teams"][i] for i, r in enumerate(rows)}
                    fixtures.insert(0, {"id": f"{group['id']}-recorded-{index}", "stage": group["name"], "label": "Group series", "at": at, "timeVerified": precise, "dateVerified": date_verified, "bestOf": group["games"], "slots": [lookup[team(name)] for name in match["teams"]], "group": group["id"]})
                continue
            # A circle schedule spaces unrecovered pair dates across the sourced
            # stage window. These dates stay explicitly estimated, not historical.
            rotation = list(range(count)) + ([-1] if count % 2 else [])
            pair_round = {}
            for round_index in range(len(rotation) - 1):
                for i in range(len(rotation) // 2):
                    pair = tuple(sorted((rotation[i], rotation[-i - 1])))
                    if -1 not in pair:
                        pair_round[pair] = round_index
                rotation = rotation[:1] + rotation[-1:] + rotation[1:-1]
            first_day = dt.date.fromisoformat(group.get("start", start))
            last_day = dt.date.fromisoformat(group.get("end", group.get("start", start)))
            for leg in range(group["legs"]):
                for a in range(count):
                    for b in range(a + 1, count):
                        round_number = leg * (len(rotation) - 1) + pair_round[(a, b)]
                        round_total = group["legs"] * (len(rotation) - 1)
                        day = first_day + dt.timedelta(days=round_number * (last_day - first_day).days // max(1, round_total - 1))
                        fixtures.insert(0, {"id": f"{group['id']}-{leg}-{a}-{b}", "stage": group["name"], "label": "Group series",
                            "at": day.isoformat(), "timeVerified": False, "dateVerified": False, "bestOf": group["games"],
                            "slots": [group["teams"][a], group["teams"][b]], "group": group["id"]})
    invited = []
    if rules:
        invited.extend(team(p["team"]) for p in rules["participants"] if re.fullmatch(r"invite[ds]?|direct invite", p["qualification"], re.I) and team(p["team"]) in entrants)
    for participant in raw.get("participants", []):
        text = participant if isinstance(participant, str) else participant.get("name", "") or ""
        if re.search(r"\bInvited\b|Direct Inv", text, re.I):
            direct = team(re.split(r"\n|Invited|Direct Inv", text, flags=re.I)[0])
            if direct in entrants:
                invited.append(direct)
                continue
            candidates = [key for key, name in names.items() if norm(name) in norm(text)]
            if candidates:
                invited.append(max(candidates, key=lambda key: len(norm(names[key]))))
    return {"id": event_id, "name": raw["name"], "year": int(start[:4]), "tier": raw.get("tier", 1),
            "start": start, "end": end, "location": raw.get("location", "").strip(),
            "online": fields.get("Type") == "Online",
            "pool": pool,
            **({"nativePool": native_pool} if native_pool else {}),
            **({"poolNote": pool_note} if pool_note else {}),
            "additionalSources": list(dict.fromkeys(raw.get("additionalSources", []) + correction.get("sources", []))),
            "prizes": prizes, "source": raw["url"], "reviewedOn": REVIEWED, "format": format_text,
            "teams": sorted(entrants), "teamNames": names,
            "invited": sorted(set(invited)), "kind": raw.get("kind", "ti" if "/The_International/" in raw["url"] and raw["url"].count("/") == 5 else "event"),
            **({"parent": identifier(raw["parent"]) if raw["parent"].startswith("https:") else raw["parent"]} if raw.get("parent") else {}),
            **({"region": raw["region"]} if raw.get("region") else {}),
            **({"qualifyingPlaces": raw["qualifyingPlaces"]} if raw.get("qualifyingPlaces") else {}),
            **({"qualification": [{"eventId": identifier(award["event"]), "from": award["from"], "to": award["to"], "slots": [team(name) for name in award.get("slots", [])]} for award in raw["qualification"]]} if raw.get("qualification") else {}),
            "groups": groups, "fixtures": fixtures, "placements": placements,
            "status": "scheduled" if start > REVIEWED else "needs-review" if limitations else "ready",
            "limitations": list(dict.fromkeys(limitations))}


def main():
    with gzip.open(RAW, "rt", encoding="utf8") as file:
        facts = json.load(file)
    raw, stages = facts["events"], facts.get("stages", [])
    supplemental = ROOT / "scripts/data/tournament-supplements.json"
    if supplemental.exists():
        raw.extend(json.loads(supplemental.read_text(encoding="utf8"))["events"])
    from valve_tournaments import source_records
    valve = source_records()
    # Reviewed first-party stage graphs replace matching incomplete records.
    # Unreviewed first-party records never downgrade a recovered playable one.
    known = {record["url"]: record for record in raw}
    for record in valve:
        if record["url"] not in known or record.get("replaceArchived") or not record.get("limitations"):
            known[record["url"]] = record
        else:
            previous = known[record["url"]]
            previous["additionalSources"] = list(dict.fromkeys(previous.get("additionalSources", []) + record.get("additionalSources", [])))
    raw = list(known.values())
    for record in raw:
        children = [stage for stage in stages if stage.get("parentSource") == record["url"]]
        for child in children:
            existing = {tuple(row.get("team") for row in group["rows"]) for group in record.get("groups", [])}
            record.setdefault("groups", []).extend(group for group in child.get("groups", []) if tuple(row.get("team") for row in group["rows"]) not in existing)
            record.setdefault("matchlists", []).extend(child.get("matchlists", []))
            if not record.get("brackets"):
                record["brackets"] = child.get("brackets", [])
    events = [event for record in raw if (event := compile_event(record))]
    events.sort(key=lambda event: (event["start"], event["id"]))
    OUT.write_text(json.dumps({"reviewedOn": REVIEWED, "attribution": "Historical facts from Liquipedia contributors, CC-BY-SA 3.0, and Valve's public esports league records; each record links its sources. Independent gameplay results are not historical outcomes.",
                              "events": events}, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"events": len(events), "statuses": dict(collections.Counter(e["status"] for e in events)),
                      "years": dict(collections.Counter(e["year"] for e in events))}))


if __name__ == "__main__":
    main()
