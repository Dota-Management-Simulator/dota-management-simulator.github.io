"""Read the cached research inventory, including on a fresh checkout."""
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_inventory():
    local = [ROOT / f".local/tournament-research/tier{tier}-index.json" for tier in (1, 2)]
    if all(path.exists() for path in local):
        return [entry for path in local for entry in json.loads(path.read_text(encoding="utf8"))]
    tracked = ROOT / "scripts/data/tournament-index.json.gz"
    if not tracked.exists():
        raise RuntimeError("No tournament inventory found; existing research caches were preserved.")
    with gzip.open(tracked, "rt", encoding="utf8") as file:
        return json.load(file)["entries"]
