"""Import reviewed headshots/card photos, preserving the Commons collection.

python scripts/import-player-portrait-supplements.py
Requires requests and Pillow. Each reference records exact identity evidence and
image-specific rights; publicly accessible images are not assumed openly licensed.
"""
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import re
import time
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps
from player_portrait_index import write_portrait_index

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.local/additional-portrait-originals'
REFS = ROOT / 'scripts/data/player-portrait-supplements.json'
OUTPUT = ROOT / 'public/player-portraits'
HEADERS = {'User-Agent': 'AegisManager/0.1 (sourced player portrait import)'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def load_image(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ('liquipedia.net', 'courier.spectral.gg'):
        raise ValueError(f'Unreviewed image host: {url}')
    path = CACHE / hashlib.sha256(url.encode()).hexdigest()[:20]
    if not path.exists():
        for attempt in range(3):
            response = requests.get(url, headers=HEADERS, timeout=45)
            if response.status_code in (429, 503):
                delay = max(5 * (attempt + 1), int(response.headers.get('Retry-After', '0')) + 2)
                if delay > 60:
                    raise RuntimeError('Server requests a longer pause; retry the import later.')
                time.sleep(delay)
                continue
            response.raise_for_status()  # Player-card 404 fallbacks must never enter the catalog.
            if not response.headers.get('Content-Type', '').startswith('image/') or len(response.content) > 15_000_000:
                raise ValueError(f'Invalid image response: {url}')
            Image.open(io.BytesIO(response.content)).verify()
            path.write_bytes(response.content)
            break
        else:
            raise RuntimeError(f'Image unavailable: {url}')
    return path


def import_one(ref):
    path = load_image(ref['imageUrl'])
    key = hashlib.sha256((ref['id'] + '|' + ref['imageUrl']).encode()).hexdigest()[:20]
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original).convert('RGBA')
        if ref.get('crop'):
            left, top, right, bottom = ref['crop']
            if not (0 <= left < right <= 1 and 0 <= top < bottom <= 1):
                raise ValueError(f"Invalid reviewed crop: {ref['id']}")
            image = image.crop((round(left * image.width), round(top * image.height),
                                round(right * image.width), round(bottom * image.height)))
        # Keep the top of tall standing portraits: a centered crop can cut off faces.
        image = ImageOps.fit(image, (320, 400), method=Image.Resampling.LANCZOS, centering=(.5, 0))
        image.save(OUTPUT / (key + '.webp'), format='WEBP', quality=84, method=6)
    fields = ('filePage', 'imageUrl', 'author', 'credit', 'license', 'licenseUrl', 'photoDate',
              'source', 'rightsStatus', 'rightsStatement', 'sourceLinks')
    return ref['id'], {**{k: ref[k] for k in fields}, 'path': f'player-portraits/{key}.webp',
                       'identitySource': ref['profile'], 'rosterSource': ref['rosterSource'],
                       'changes': 'Cropped, resized and converted to WebP.'}


def main():
    refs = read(REFS)
    identity_ids = {p['id'] for p in read(ROOT / 'src/data/player-identities.json')['players']}
    selected_ids = [r['id'] for r in refs['players']]
    if len(set(selected_ids)) != len(selected_ids) or not set(selected_ids) <= identity_ids:
        raise ValueError('Supplement references must use unique, existing player IDs.')
    for ref in refs['players']:
        if not ref['profile'].startswith('https://liquipedia.net/dota2/') or not ref['rosterSource'].startswith('https://liquipedia.net/dota2/'):
            raise ValueError('Missing profile/roster identity evidence.')
        if re.search(r'NoImage|placeholder|unknown|default', ref['imageUrl'], re.I):
            raise ValueError('Placeholder image selected.')
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    catalog_path = ROOT / 'src/data/player-portraits.json'
    catalog = read(catalog_path)
    previous = catalog['players']
    # Only replace this importer's subset; retain all reviewed Commons photos.
    players = {id: p for id, p in previous.items() if p.get('source') not in ('liquipedia', 'spectral-player-card')}
    if set(players) & set(selected_ids):
        raise ValueError('Supplement would overwrite a retained Commons portrait.')
    # Cache each source once before rendering aliases, preventing concurrent writes
    # to a shared source file when several historical IDs link the same profile.
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(load_image, sorted({r['imageUrl'] for r in refs['players']})))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for id, photo in pool.map(import_one, refs['players']):
            players[id] = photo
    retained = {p['path'] for p in players.values()}
    for photo in previous.values():
        if photo['path'] not in retained and re.fullmatch(r'player-portraits/[a-f0-9]{20}\.webp', photo['path']):
            obsolete = (ROOT / 'public' / photo['path']).resolve()
            if obsolete.parent == OUTPUT.resolve() and obsolete.exists():
                obsolete.unlink()
    catalog.update({'reviewedOn': refs['reviewedOn'],
                    'method': 'Wikimedia Commons photos plus tournament-linked Liquipedia headshots and account-linked player-card images. Exact player IDs; one reference appearance per player, not season-specific. Image rights are recorded separately per file.',
                    'players': dict(sorted(players.items()))})
    write(catalog_path, catalog)
    write(OUTPUT / 'credits.json', {'players': catalog['players']})
    write_portrait_index(ROOT, catalog['players'])
    print(json.dumps({'supplements': len(selected_ids), 'totalPortraits': len(players)}, indent=2))


if __name__ == '__main__':
    main()
