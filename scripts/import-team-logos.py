"""Build the dated logo catalog from reviewed, browser-extracted Liquipedia references.

Run from the project root: python scripts/import-team-logos.py
Originals are cached locally; bundled images are lossless WebP thumbnails.
Requires Pillow for image conversion. This does not scrape HTML or guess logos.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src/data"
OUTPUT = ROOT / "public/team-logos"
RESEARCH = ROOT / "scripts/data/team-logo-references.json"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalize(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def page_year(page):
    match = re.search(r"20\d{2}", page)
    return int(match[0]) if match else 2020 if page.startswith("BTS/") else 2011


def usable(file, year):
    name = urllib.parse.unquote(file.split("/")[-1])
    if re.match(r"(?:Default|Placeholder|Unknown_logo|Dota_2|Defence_of_the_Ancients)", name, re.I):
        return False
    dates = re.findall(r"20\d{2}", name)
    # The MOUZ gallery labels this the original pre-2021 mark. The 2011–2015
    # event tables use it too; '2016' in the filename is not its introduction.
    if name == "Mousesports_2016_allmode.png":
        return True
    return not dates or max(map(int, dates)) <= year


def download(file):
    # The path was extracted from an actual rendered image, not inferred from a club name.
    url = "https://liquipedia.net/commons/images/" + file
    suffix = Path(urllib.parse.unquote(file)).suffix.lower()
    stem = hashlib.sha256(file.encode()).hexdigest()[:20]
    filename = stem + ".webp"
    target = OUTPUT / filename
    cache = ROOT / ".local/team-logo-originals"
    cache.mkdir(parents=True, exist_ok=True)
    original = cache / (stem + suffix)
    previous = OUTPUT / (stem + suffix)
    if not original.exists() and previous.exists():
        original.write_bytes(previous.read_bytes())
    if not original.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "AegisManager/0.1 (team logo asset import)"})
        with urllib.request.urlopen(request, timeout=45) as response:
            body = response.read()
            if not response.headers.get("Content-Type", "").startswith("image/"):
                raise ValueError(f"Not an image: {url}")
            if len(body) > 5_000_000:
                raise ValueError(f"Oversized image: {url}")
        # Reject error documents even if a server incorrectly calls them images.
        if not (body.startswith(b"\x89PNG\r\n\x1a\n") or body.startswith(b"\xff\xd8")
                or body.startswith((b"GIF87a", b"GIF89a")) or body[8:12] == b"WEBP"):
            raise ValueError(f"Unsupported image: {url}")
        original.write_bytes(body)
    if not target.exists():
        with Image.open(original) as image:
            image = image.convert("RGBA")
            image.thumbnail((128, 128), Image.Resampling.LANCZOS)
            image.save(target, format="WEBP", lossless=True, method=6)
    if previous != target and previous.exists():
        previous.unlink()  # Only the exact generated original imported by this script.
    return {"path": f"team-logos/{filename}", "imageUrl": url,
            "filePage": "https://liquipedia.net/commons/File:" + file.split("/")[-1]}


def main():
    baseline = read(DATA / "rosters-2011.json")
    batches = [read(p) for p in sorted((DATA / "rosters").glob("*.json"))]
    refs = [(2011, t) for t in baseline["opening"] + baseline["postTi"]]
    refs += [(b["year"], t) for b in batches for t in b["teams"]]
    sources = {s["id"]: s["url"] for b in [baseline] + batches for s in b["sources"]}
    evidence = read(RESEARCH)["logoPages"]
    by_year = {}
    for page, rows in evidence.items():
        year = page_year(page)
        for name, file in rows:
            if usable(file, year):
                by_year.setdefault((year, normalize(name)), []).append((file, page))
    for extra in read(RESEARCH).get("supplements", []):
        by_year.setdefault((extra["year"], normalize(extra["name"])), []).append((extra["file"], extra["page"]))
    teams = {}
    for year, ref in refs:
        club = teams.setdefault(ref["id"], {"names": [], "firstYear": year, "versions": []})
        if ref["name"] not in club["names"]:
            club["names"].append(ref["name"])
        candidates = by_year.get((year, normalize(ref["name"])), [])
        if not candidates:
            continue
        preferred_page = sources[ref["source"]].removeprefix("https://liquipedia.net/dota2/")
        file, page = next((c for c in candidates if c[1] == preferred_page), candidates[0])
        version = {"year": year, "name": ref["name"], "file": file,
                   "source": "https://liquipedia.net/dota2/" + page}
        # One annual snapshot; later dated roster entries replace earlier entries in that year.
        club["versions"] = [v for v in club["versions"] if v["year"] != year] + [version]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    files = sorted({v["file"] for t in teams.values() for v in t["versions"]})
    assets, failures = {}, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(download, file): file for file in files}
        for future in concurrent.futures.as_completed(futures):
            file = futures[future]
            try:
                assets[file] = future.result()
            except Exception as error:
                failures.append({"file": file, "error": str(error)})
    for club in teams.values():
        versions = []
        for version in sorted(club["versions"], key=lambda v: v["year"]):
            file = version.pop("file")
            if file in assets:
                versions.append({**version, **assets[file]})
        club["versions"] = versions
        club["status"] = "sourced" if versions else "missing"
    catalog = {"reviewedOn": "2026-10-21", "throughYear": 2026,
               "method": "Annual tournament-page snapshots; years are observations, not exact rebrand dates. Latest observed version persists until replaced. Future-dated files and generic game icons are excluded.",
               "rights": "Team logos are trademarks of their respective owners. Media rights vary; consult each linked Commons file page. No blanket media license is asserted.",
               "teams": teams}
    (DATA / "team-logos.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    report = {"clubs": len(teams), "withLogos": sum(bool(t["versions"]) for t in teams.values()),
              "assets": len(assets), "missing": {id: t["names"] for id, t in teams.items() if not t["versions"]},
              "downloadFailures": failures}
    (ROOT / ".local/logo-import-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
