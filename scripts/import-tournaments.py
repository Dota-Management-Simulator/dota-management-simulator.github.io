"""Cached, rate-limited Liquipedia research import (read-only public API).

Requires beautifulsoup4. Run from this project root:
  python -X utf8 scripts/import-tournaments.py --expand

Uses a descriptive contact URL, gzip, at least 31 seconds between parse calls,
and persistent compressed caches. Never fetches media, writes to the wiki, or
supplies undocumented historical values. Rebuild gameplay data separately with
build-tournaments.py. Historical facts retain individual source attribution.
"""
import argparse
from collections import deque
import datetime as dt
import gzip
import hashlib
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from bs4 import BeautifulSoup
from tournament_inventory import load_inventory

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / ".local/tournament-research"
CACHE = WORK / "api"
BASE = "https://liquipedia.net/dota2/"
AGENT = "AegisManagerResearch/0.1 (https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io)"
last_request = 0


def read_json(path, fallback=None):
    return json.loads(path.read_text(encoding="utf8")) if path.exists() else fallback


def save_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    for attempt in range(12):
        try:
            temporary.replace(path)
            return
        except PermissionError:
            # OneDrive and antivirus scanners can briefly hold either file.
            # Keep both recoverable and retry the same checked workspace paths.
            if attempt == 11:
                raise
            time.sleep(min(2, 0.1 * (attempt + 1)))


def page_title(url):
    return urllib.parse.unquote(url.split("/dota2/", 1)[1]).replace("_", " ")


def fetch(url):
    global last_request
    key = hashlib.sha256(url.encode()).hexdigest()
    path = CACHE / f"{key}.json.gz"
    if path.exists():
        with gzip.open(path, "rt", encoding="utf8") as file:
            return json.load(file)
    if url == BASE + "The_International/2011" and (WORK / "api-ti2011.json").exists():
        result = read_json(WORK / "api-ti2011.json")
    else:
        wait = max(0, last_request + 31 - time.monotonic())
        if wait:
            time.sleep(wait)
        query = urllib.parse.urlencode({"action": "parse", "page": page_title(url), "prop": "text|wikitext|links", "format": "json", "redirects": 1})
        request = urllib.request.Request(BASE + "api.php?" + query, headers={"User-Agent": AGENT, "Accept-Encoding": "gzip"})
        last_request = time.monotonic()
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
            if response.headers.get("Content-Encoding") == "gzip":
                body = gzip.decompress(body)
            result = json.loads(body)
    if "error" in result:
        raise ValueError(result["error"].get("info", str(result["error"])))
    with gzip.open(path, "wt", encoding="utf8") as file:
        json.dump(result, file, ensure_ascii=False)
    return result


def text(node, separator=" "):
    return node.get_text(separator, strip=True) if node else ""


def href(anchor):
    return urllib.parse.urljoin(BASE, anchor.get("href", ""))


def links(node):
    return [{"name": text(a), "url": href(a)} for a in node.select("a[href]")] if node else []


def preceding_heading(node):
    return text(node.find_previous(["h2", "h3", "h4"]))


def extract(result, entry):
    parsed = result["parse"]
    soup = BeautifulSoup(parsed["text"]["*"], "html.parser")
    info = soup.select_one(".fo-nttax-infobox")
    fields = {text(node).rstrip(":"): text(node.find_next_sibling()) for node in soup.select(".infobox-description")}
    source = parsed.get("wikitext", {}).get("*", "")
    for key, parameter in [("Start Date", "sdate"), ("End Date", "edate"), ("Teams", "team_number")]:
        match = re.search(r"\|" + parameter + r"\s*=\s*([^|\n}]+)", source)
        if match and not fields.get(key):
            fields[key] = match[1].strip()
    if not fields.get("Game"):
        game = re.search(r"\|game\s*=\s*([^|\n}]+)", source)
        fields["Game"] = "DotA" if game and game[1].strip().lower() in ["dota", "dota1", "warcraft"] else "Dota 2"

    def section(identifier):
        heading = soup.find(id=identifier)
        if not heading:
            return ""
        parent = heading.parent if heading.parent and "mw-heading" in heading.parent.get("class", []) else heading
        content = []
        for node in parent.next_siblings:
            if getattr(node, "name", None) == "h2" or getattr(node, "select_one", lambda _: None)("h2"):
                break
            if getattr(node, "get_text", None):
                content.append(node.get_text("\n", strip=True))
        return "\n".join(content)

    def match_data(match, matchlist=False):
        opponents = match.select(":scope > .brkts-matchlist-opponent" if matchlist else ":scope > .brkts-opponent-entry")
        score_nodes = match.select(":scope > .brkts-matchlist-score" if matchlist else ":scope > .brkts-opponent-entry .brkts-opponent-score-inner")
        stamp = match.select_one("[data-timestamp]")
        source_link = next((a for a in links(match) if "title=Match:ID_" in a["url"]), None)
        return {"teams": [opponent.get("aria-label") or text(opponent.select_one(".team-name")) for opponent in opponents],
                "scores": [text(node) for node in score_nodes], "timestamp": stamp.get("data-timestamp") if stamp else None,
                "details": text(match.select_one(".brkts-popup")),
                **({"sourceId": urllib.parse.unquote(source_link["url"].split("title=Match:ID_", 1)[1].split("&")[0])} if source_link else {})}

    groups = []
    for table in soup.select(".grouptable"):
        rows = []
        for row in table.select("tr"):
            slot = row.select_one(".grouptableslot")
            if slot:
                name = slot.select_one(".team-template-text") or slot.select_one(".name")
                anchor = name.select_one("a[href]") if name else None
                rows.append({"rank": text(row.select_one("th")), "team": text(name), "label": " ".join(row.get("class", [])), "teamUrl": href(anchor) if anchor else None})
        groups.append({"name": text(table.select_one("th")), "heading": preceding_heading(table), "rows": rows})
    all_links = links(soup)
    canonical = BASE + parsed["title"].replace(" ", "_")
    prefix = canonical.rstrip("/") + "/"
    descendants = [link for link in all_links if link["url"].startswith(prefix) and "#" not in link["url"] and not re.search(r"action=|/Statistics|/Team_Rosters", link["url"]) and link["name"]]
    stage_links = [link for link in all_links if link["url"].startswith(BASE) and "#" not in link["url"] and not re.search(r"index.php|Portal:|Qualifier_Tournaments|Statistics", link["url"]) and re.search(r"Group Stage|Playoffs|Main Event|Phase [123]|Qualifiers?|Wild Card|Round of", link["name"], re.I)]
    record = {**entry, "url": entry["url"], "canonicalSource": canonical, "pageTitle": parsed["title"], "info": text(info, "\n"), "fields": fields,
              "format": section("Format"), "reviewedOn": dt.date.today().isoformat(), "apiVersion": 1,
              "prizes": [{"headers": [text(th) for th in table.select("th")], "rows": [{"place": text(row.select_one(".prizepooltable-place")), "cells": [text(td) for td in row.select("td")], "links": links(row)} for row in table.select("tr") if row.select("td")]} for table in soup.select(".prizepooltable")],
              "participants": [{"name": text(card.select_one(".team-participant-card__header-main")), "text": text(card), "links": links(card)} for card in soup.select(".team-participant-card")],
              "groups": groups,
              "brackets": [{"heading": preceding_heading(bracket), "matches": [match_data(match) for match in bracket.select(".brkts-match")]} for bracket in soup.select(".brkts-bracket")],
              "matchlists": [{"name": text(listing.select_one(".brkts-matchlist-title")), "heading": preceding_heading(listing), "matches": [match_data(match, True) for match in listing.select(".brkts-matchlist-match")]} for listing in soup.select(".brkts-matchlist")],
              "links": descendants, "stageLinks": stage_links, "sections": [heading.get("id", "") for heading in soup.select("h2,h3")]}
    return record


def unique_links(record):
    seen = set()
    for link in record.get("links", []) + record.get("stageLinks", []):
        if link["url"] not in seen:
            seen.add(link["url"])
            yield link


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--expand", action="store_true")
    parser.add_argument("--max-pages", type=int, default=2500)
    parser.add_argument("--remaining-only", action="store_true")
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    records = {row["url"]: row for row in read_json(WORK / "events.json", [])}
    stages = read_json(WORK / "stages.json", [])
    stage_keys = {(row["url"], row["parentSource"]) for row in stages}
    inventory = load_inventory()
    root_urls = {row["url"] for row in inventory}
    queue = deque()
    queued = set()
    for entry in sorted(inventory, key=lambda e: (e["year"], e["tier"], e["url"])):
        old = records.get(entry["url"], {})
        if old.get("fields", {}).get("Game") == "DotA" or old.get("apiVersion"):
            continue
        if args.remaining_only and old.get("fields"):
            continue
        queue.append((entry, None, "root"))
        queued.add(entry["url"])
    # Discover narrowly relevant stages and qualifiers from observed page links.
    # Ordinary series navigation, statistics, and unrelated qualifier indexes
    # are excluded. Parent relationships are retained with their source links.
    def expand(record, root):
        if not args.expand or record.get("fields", {}).get("Game") == "DotA":
            return
        source_root = record.get("canonicalSource", record["url"]).rstrip("/")
        for link in unique_links(record):
            name, url = link["name"], link["url"]
            if url in root_urls or url in queued or not url.startswith(source_root + "/"):
                continue
            if re.search(r"Qualif|Wild.?Card|Play.In|BYOC", name + " " + url, re.I):
                kind = "qualifier"
            elif re.search(r"Group|Playoff|Main.Event|Prelim|Phase|Round.of|Finals", name + " " + url, re.I):
                kind = "stage"
            else:
                continue
            queued.add(url)
            if kind == "stage" and (url, root) in stage_keys:
                continue
            if kind == "qualifier" and records.get(url, {}).get("apiVersion"):
                continue
            queue.append(({"url": url, "name": f"{record['name']}: {name}", "year": record["year"], "tier": record.get("tier", 2), **({"kind": "qualifier", "parentSource": record["url"]} if kind == "qualifier" else {})}, root, kind))
    if args.expand:
        for record in list(records.values()):
            expand(record, record["url"])
    processed = 0
    errors = read_json(WORK / "api-errors.json", [])
    while queue and processed < args.max_pages:
        entry, parent, kind = queue.popleft()
        try:
            record = extract(fetch(entry["url"]), entry)
            if kind == "stage":
                record["parentSource"] = parent
                stages = [row for row in stages if (row["url"], row["parentSource"]) != (record["url"], parent)] + [record]
                stage_keys.add((record["url"], parent))
                save_json(WORK / "stages.json", stages)
            else:
                records[entry["url"]] = record
                save_json(WORK / "events.json", list(records.values()))
                expand(record, record["url"])
            processed += 1
            if processed % 10 == 0:
                print(json.dumps({"processed": processed, "events": len(records), "stages": len(stages), "remaining": len(queue), "last": entry["name"]}), flush=True)
        except (ValueError, urllib.error.URLError, TimeoutError) as error:
            errors.append({"url": entry["url"], "error": str(error)})
            save_json(WORK / "api-errors.json", errors)
            print(json.dumps({"error": entry["url"], "reason": str(error)}), flush=True)
            if isinstance(error, urllib.error.HTTPError) and error.code in [403, 429, 503]:
                print("Source access stopped. Cached records are preserved; do not retry through another identity or proxy.", flush=True)
                break
    print(json.dumps({"finished": not queue, "processed": processed, "events": len(records), "stages": len(stages), "remaining": len(queue), "errors": len(errors)}), flush=True)


if __name__ == "__main__":
    main()
