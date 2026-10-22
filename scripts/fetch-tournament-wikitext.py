"""Fetch public tournament source in cached batches through action=query.

Unlike action=parse (one request per 30 seconds), this uses the documented
two-second query limit, requesting up to 20 source pages per HTTP call. Reuses
one HTTPS connection and gzip; no generated HTML endpoints are scraped.
Requires mwparserfromhell. Run: python -X utf8 scripts/fetch-tournament-wikitext.py
"""
from collections import deque
import datetime as dt
import gzip
import hashlib
import http.client
import json
from pathlib import Path
import re
import time
import urllib.parse
import mwparserfromhell as mw
from tournament_inventory import load_inventory

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / ".local/tournament-research"
CACHE = WORK / "source"
AGENT = "AegisManagerResearch/0.1 (https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io)"


def normalize(title):
    return title.replace("_", " ").strip().lstrip(":")


def path_for(title):
    return CACHE / (hashlib.sha256(normalize(title).encode()).hexdigest() + ".json.gz")


def source_url(title):
    return "https://liquipedia.net/dota2/" + urllib.parse.quote(title.replace(" ", "_"), safe="/:()'!.,-+")


def title_for(url):
    return normalize(urllib.parse.unquote(url.split("/dota2/", 1)[1]))


def value(template, key, default=""):
    return str(template.get(key).value).strip() if template.has(key) else default


def related(source, title, context):
    code = mw.parse(source)
    links = set()
    for link in code.filter_wikilinks():
        links.add(str(link.title).strip())
    for template in code.filter_templates():
        name = str(template.name).strip()
        if name.startswith(":"):
            links.add(name[1:])
        if name.lower().startswith("#lst:"):
            links.add(name.split(":", 1)[1])
        if name.lower() in ["toggle bracket start", "showmatchlist", "showbracket", "qualification", "qualifier"]:
            for param in template.params:
                val = str(param.value).strip()
                if "/" in val and not val.startswith(("http", "{{")):
                    links.add(val)
    prefix = context["rootTitle"]
    for link in sorted(links):
        link = link.replace("{{FULLPAGENAME}}", title).replace("{{BASEPAGENAME}}", title.rsplit("/", 1)[0]).replace("{{PAGENAME}}", title.rsplit("/", 1)[-1])
        link = normalize(link.split("#", 1)[0])
        if not link.startswith(prefix + "/") or link == title or re.search(r"Statistics|Team Rosters|Player Statistics|Countries|All-Star|Showmatch", link, re.I):
            continue
        suffix = link[len(prefix) + 1:]
        qualifier = bool(re.search(r"qualif|wild.?card|open|closed|byoc", suffix, re.I))
        region = re.fullmatch(r"(?:Western |Eastern )?Europe|China|North America|South America|Americas|Southeast Asia|CIS|East|West|SEA|WEU|EEU|NA|SA", suffix, re.I)
        stage = bool(re.search(r"Group|Playoff|Main Event|Prelim|Phase|Round of|Finals|Play.In", suffix, re.I))
        if qualifier or region or stage:
            yield link, {**context, "kind": "qualifier" if qualifier or region else "stage", "parentTitle": title}


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    entries = load_inventory()
    queue = deque()
    contexts = {}
    for entry in entries:
        title = title_for(entry["url"])
        context = {"rootTitle": title, "rootURL": entry["url"], "kind": "root", "name": entry["name"], "year": entry["year"], "tier": entry["tier"]}
        contexts.setdefault(title, []).append(context)
        queue.append(title)
    seen = set()
    missing = []
    fetched = 0
    connection = http.client.HTTPSConnection("liquipedia.net", timeout=45)
    last_request = 0

    def add_related(document, requested):
        for context in contexts.get(requested, []):
            canonical_context = {**context}
            if context["kind"] == "root":
                canonical_context["rootTitle"] = document["title"]
            for child, child_context in related(document["wikitext"], document["title"], canonical_context):
                if child not in contexts:
                    queue.append(child)
                if child_context not in contexts.setdefault(child, []):
                    contexts[child].append(child_context)

    while queue:
        batch = []
        while queue and len(batch) < 20:
            title = queue.popleft()
            if title in seen:
                continue
            seen.add(title)
            path = path_for(title)
            if path.exists():
                with gzip.open(path, "rt", encoding="utf8") as file:
                    add_related(json.load(file), title)
            else:
                batch.append(title)
        if not batch:
            continue
        query = urllib.parse.urlencode({"action": "query", "prop": "revisions", "rvprop": "content|timestamp", "rvslots": "main", "titles": "|".join(batch), "redirects": 1, "format": "json", "formatversion": 2})
        wait = max(0, last_request + 2.2 - time.monotonic())
        if wait:
            time.sleep(wait)
        try:
            last_request = time.monotonic()
            connection.request("GET", "/dota2/api.php?" + query, headers={"User-Agent": AGENT, "Accept-Encoding": "gzip", "Accept": "application/json"})
            response = connection.getresponse()
            body = response.read()
            if response.status == 429:
                (WORK / "source-contexts.json").write_text(json.dumps(contexts, ensure_ascii=False, indent=2), encoding="utf8")
                (WORK / "source-missing.json").write_text(json.dumps(missing, ensure_ascii=False, indent=2), encoding="utf8")
                connection.close()
                raise RuntimeError("Liquipedia rate-limited this connection. Research stopped; cached source is preserved. Resume only after source access has been restored. Do not retry through a proxy or another identity.")
            if response.status != 200:
                raise RuntimeError(f"HTTP {response.status}: {body[:120]!r}")
            if response.getheader("Content-Encoding") == "gzip":
                body = gzip.decompress(body)
            result = json.loads(body)
            if "error" in result:
                raise RuntimeError(str(result["error"]))
            data = result["query"]
            redirects = {normalize(item["from"]): normalize(item["to"]) for item in data.get("normalized", []) + data.get("redirects", [])}
            pages = {normalize(page["title"]): page for page in data["pages"]}
            for requested in batch:
                canonical = requested
                redirect_seen = set()
                while canonical in redirects and canonical not in redirect_seen:
                    redirect_seen.add(canonical)
                    canonical = redirects[canonical]
                page = pages.get(canonical)
                if not page or page.get("missing") or not page.get("revisions"):
                    missing.append({"title": requested, "canonical": canonical})
                    continue
                revision = page["revisions"][0]
                document = {"requested": requested, "title": canonical, "source": source_url(canonical), "timestamp": revision["timestamp"], "reviewedOn": dt.date.today().isoformat(), "wikitext": revision["slots"]["main"]["content"]}
                with gzip.open(path_for(requested), "wt", encoding="utf8") as file:
                    json.dump(document, file, ensure_ascii=False)
                add_related(document, requested)
                fetched += 1
            (WORK / "source-contexts.json").write_text(json.dumps(contexts, ensure_ascii=False, indent=2), encoding="utf8")
            (WORK / "source-missing.json").write_text(json.dumps(missing, ensure_ascii=False, indent=2), encoding="utf8")
            print(json.dumps({"fetched": fetched, "cachedOrFetched": len(seen), "remaining": len(queue), "discovered": len(contexts), "missing": len(missing), "last": batch[-1]}), flush=True)
        except (OSError, http.client.HTTPException) as error:
            print(json.dumps({"retrying": str(error)}), flush=True)
            connection.close()
            connection = http.client.HTTPSConnection("liquipedia.net", timeout=45)
            for title in batch:
                seen.remove(title)
                queue.appendleft(title)
            time.sleep(10)
    connection.close()
    (WORK / "source-contexts.json").write_text(json.dumps(contexts, ensure_ascii=False, indent=2), encoding="utf8")
    print(json.dumps({"complete": True, "sourcePages": len(seen), "missing": len(missing)}), flush=True)


if __name__ == "__main__":
    main()
