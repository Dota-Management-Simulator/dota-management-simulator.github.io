"""Export cached research facts for deterministic, offline catalog builds."""
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / ".local/tournament-research"
KEEP = ["name", "url", "canonicalSource", "fields", "date", "location", "prize", "teams", "tier", "year", "info", "format", "prizes", "participants", "groups", "brackets", "matchlists", "kind", "parent", "parentSource", "region", "qualification", "qualifyingPlaces", "reviewedOn", "additionalSources"]


def main():
    source = WORK / "events.json"
    if not source.exists():
        raise RuntimeError("No research cache found; the tracked facts file was preserved.")
    records = json.loads(source.read_text(encoding="utf8"))
    stages = WORK / "stages.json"
    facts = {"attribution": "Liquipedia contributors, CC-BY-SA 3.0; each event retains its source URL.", "reviewedOn": "2026-10-22",
             "events": [{key: record[key] for key in KEEP if key in record} for record in records],
             "stages": json.loads(stages.read_text(encoding="utf8")) if stages.exists() else []}
    out = ROOT / "scripts/data/tournament-facts.json.gz"
    out.write_bytes(gzip.compress(json.dumps(facts, ensure_ascii=False).encode("utf8"), mtime=0))
    indexes = [WORK / f"tier{tier}-index.json" for tier in (1, 2)]
    if all(path.exists() for path in indexes):
        inventory = {"attribution": facts["attribution"], "reviewedOn": facts["reviewedOn"], "note": "Source tier indexes include pre-Dota-2 events. This is a research inventory, not a verified Dota 2 event count.", "entries": [entry for path in indexes for entry in json.loads(path.read_text(encoding="utf8"))]}
        (ROOT / "scripts/data/tournament-index.json.gz").write_bytes(gzip.compress(json.dumps(inventory, ensure_ascii=False).encode("utf8"), mtime=0))
    print(json.dumps({"events": len(records), "bytes": out.stat().st_size}))


if __name__ == "__main__":
    main()
