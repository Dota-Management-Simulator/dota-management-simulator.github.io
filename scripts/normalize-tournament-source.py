"""Extract explicit rules from cached MediaWiki source, without network access.

Requires mwparserfromhell. Caches may come from fetch-tournament-wikitext.py
or the older parse importer. Emits a small, attributable facts file consumed by
build-tournaments.py; no rendered HTML or historical player ratings are copied.
"""
import datetime as dt
import gzip
import json
from pathlib import Path
import re
from urllib.parse import quote
import mwparserfromhell as mw

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / ".local/tournament-research"
OUT = ROOT / "scripts/data/tournament-source-rules.json"
OFFSETS = {"UTC": 0, "GMT": 0, "CET": 1, "CEST": 2, "EET": 2, "EEST": 3,
           "MSK": 3, "PST": -8, "PDT": -7, "EST": -5, "EDT": -4,
           "CST": 8, "SGT": 8, "KST": 9, "JST": 9}


def value(template, key, fallback=""):
    return re.sub(r"<!--.*?-->", "", str(template.get(key).value), flags=re.S).strip() if template.has(key) else fallback


def clean(source):
    # Expand only display abbreviations whose meaning is explicit in source.
    source = re.sub(r"{{abbr/(Bo[12357])}}", r"\1", source, flags=re.I)
    return mw.parse(source).strip_code().replace("'''", "").strip()


def source_url(title):
    return "https://liquipedia.net/dota2/" + quote(title.replace(" ", "_"), safe="/:()'!.,-+")


def match_id(bracket_id, key):
    match = re.fullmatch(r"R(\d+)M(\d+)", key)
    return f"{bracket_id}_R{int(match[1]):02}-M{int(match[2]):03}" if match else f"{bracket_id}_{key}"


def round_header(headers, key):
    if key in headers:
        return headers[key]
    match = re.fullmatch(r"(R\w+)?M(\d+)", key)
    if not match:
        return ""
    prefix, number = match[1] or "", int(match[2])
    candidates = [(int(found[1]), text) for header, text in headers.items()
                  if (found := re.fullmatch(re.escape(prefix) + r"M(\d+)", header)) and int(found[1]) <= number]
    return max(candidates, default=(-1, headers.get(prefix, "")))[1]


def parse_date(source):
    date = re.search(r"([A-Za-z]+ \d{1,2}, \d{4})(?:\s*-\s*(\d{1,2}):(\d\d))?", source)
    if not date:
        return {}
    try:
        day = dt.datetime.strptime(date[1], "%B %d, %Y")
    except ValueError:
        return {}
    zone = re.search(r"{{[Aa]bbr/([A-Za-z]+)}}", source)
    if date[2] and zone and zone[1].upper() in OFFSETS:
        # CST is ambiguous internationally. Only UTC or unambiguous zones are
        # converted automatically; rendered timestamps remain available otherwise.
        if zone[1].upper() == "CST":
            return {"date": day.date().isoformat()}
        day = day.replace(hour=int(date[2]), minute=int(date[3]), tzinfo=dt.timezone(dt.timedelta(hours=OFFSETS[zone[1].upper()])))
        return {"timestamp": int(day.timestamp()), "date": day.date().isoformat()}
    return {"date": day.date().isoformat()}


def extract(document):
    code = mw.parse(document["wikitext"])
    result = {"source": source_url(document["title"]), "reviewedOn": document.get("reviewedOn", "2026-10-22"), "matches": [], "participants": []}
    for template in code.filter_templates():
        name = str(template.name).strip().lower()
        if name == "infobox league":
            result["fields"] = {out: value(template, key) for out, key in [("Start Date", "sdate"), ("End Date", "edate"), ("Teams", "team_number"), ("Type", "type"), ("Version", "patch")] if value(template, key)}
            amount = value(template, "prizepool").replace(",", "")
            currency = value(template, "localcurrency").upper()
            if currency and re.fullmatch(r"\d+(?:\.\d+)?", amount):
                result["nativePool"] = {"currency": currency, "amount": float(amount)}
        elif name == "teamcard":
            result["participants"].append({"team": value(template, "team"), "qualification": clean(value(template, "qualifier"))})
        elif name == "teamparticipants":
            for param in template.params:
                for opponent in param.value.filter_templates(recursive=False):
                    if str(opponent.name).strip().lower() != "opponent":
                        continue
                    quals = mw.parse(value(opponent, "qualification")).filter_templates()
                    qualification = next((q for q in quals if str(q.name).strip().lower() == "qualification"), None)
                    result["participants"].append({"team": value(opponent, "1"), "qualification": value(qualification, "method") if qualification else clean(value(opponent, "qualification"))})
        elif name in ("bracket", "matchlist"):
            bracket_id = value(template, "id")
            headers = {str(p.name).strip().removesuffix("header"): clean(str(p.value)) for p in template.params if str(p.name).strip().endswith("header")}
            for param in template.params:
                key = str(param.name).strip()
                if not re.fullmatch(r"(?:R\w+)?M(?:\d+|TP)", key):
                    continue
                matches = [t for t in param.value.filter_templates(recursive=False) if str(t.name).strip().lower() == "match"]
                if not matches:
                    continue
                match = matches[0]
                header = round_header(headers, key)
                header_bo = re.search(r"\bBo([12357])\b", header, re.I)
                explicit = value(match, "bestof") or (header_bo[1] if header_bo else value(template, "bestof"))
                fact = {"sourceId": match_id(bracket_id, key), "container": bracket_id, "key": key, "round": header, **parse_date(value(match, "date"))}
                if explicit.isdigit() and int(explicit) in (1, 2, 3, 5, 7):
                    fact["bestOf"] = int(explicit)
                advantage = [0, 0]
                for game in match.params:
                    if re.fullmatch(r"map\d+", str(game.name).strip()):
                        for map_ in game.value.filter_templates(recursive=False):
                            if value(map_, "length").lower() == "default" and value(map_, "winner") in ("1", "2"):
                                advantage[int(value(map_, "winner")) - 1] += 1
                if any(advantage):
                    fact["advantage"] = advantage
                result["matches"].append(fact)
    return result


def main():
    documents = {}
    for path in (WORK / "api").glob("*.json.gz"):
        with gzip.open(path, "rt", encoding="utf8") as file:
            parsed = json.load(file)["parse"]
        documents[parsed["title"]] = {"title": parsed["title"], "wikitext": parsed.get("wikitext", {}).get("*", "")}
    for path in (WORK / "source").glob("*.json.gz"):
        with gzip.open(path, "rt", encoding="utf8") as file:
            document = json.load(file)
        documents[document["title"]] = document
    local = WORK / "ti2011-playoffs.wikitext.txt"
    if local.exists():
        documents["The International/2011/Playoffs"] = {"title": "The International/2011/Playoffs", "wikitext": local.read_text(encoding="utf8")}
    if not documents:
        raise RuntimeError("No cached source pages were found. The tracked source-rules file was preserved.")
    existing = json.loads(OUT.read_text(encoding="utf8"))["pages"] if OUT.exists() else []
    merged = {page["source"]: page for page in existing}
    merged.update({page["source"]: page for document in documents.values() if (page := extract(document))})
    facts = sorted(merged.values(), key=lambda page: page["source"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"attribution": "Liquipedia contributors, CC-BY-SA 3.0. Each source record retains its page URL.", "pages": facts}, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"pages": len(facts), "matches": sum(len(f["matches"]) for f in facts), "explicitFormats": sum("bestOf" in m for f in facts for m in f["matches"])}))


if __name__ == "__main__":
    main()
