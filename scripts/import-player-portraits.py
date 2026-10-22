"""Discover Commons photos, then import explicitly reviewed player/file selections.

python scripts/import-player-portraits.py discover
python scripts/import-player-portraits.py import
Requires requests and Pillow. Metadata/originals are cached in ignored .local/.
The checked-in references file records identity evidence and reviewed crops.
"""
import hashlib
import html
import io
import json
from pathlib import Path
import re
import sys
import time

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.local/player-portrait-research'
REFERENCES = ROOT / 'scripts/data/player-portrait-references.json'
API = 'https://commons.wikimedia.org/w/api.php'
HEADERS = {'User-Agent': 'AegisManager/0.1 (Dota player portrait research; Wikimedia Commons)'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def retry_delay(response, attempt):
    delay = max(5 * (attempt + 1), int(response.headers.get('Retry-After', '0')) + 2)
    if delay > 60:
        raise RuntimeError(f'Server requests a {delay}-second pause; retry the import later.')
    time.sleep(delay)


def fetch(params):
    key = hashlib.sha256(json.dumps(params, sort_keys=True).encode()).hexdigest()
    path = CACHE / (key + '.json')
    if path.exists():
        return read(path)
    for attempt in range(4):
        response = requests.get(API, params={**params, 'format': 'json'}, headers=HEADERS, timeout=45)
        if response.status_code in (429, 503):
            retry_delay(response, attempt)
            continue
        response.raise_for_status()
        result = response.json()
        if 'error' in result:
            raise ValueError(result['error'])
        write(path, result)
        time.sleep(1.1)
        return result
    raise RuntimeError('Commons rate limit; retry later')


def members(category, page_id=None):
    rows, continuation = [], {}
    while True:
        params = {'action': 'query', 'list': 'categorymembers', 'cmlimit': 500, **continuation}
        params.update({'cmpageid': page_id} if page_id else {'cmtitle': category})
        data = fetch(params)
        rows.extend(data['query']['categorymembers'])
        if 'continue' not in data:
            return rows
        continuation = data['continue']


def normalize(value):
    return re.sub(r'[^a-z0-9]', '', value.casefold())


def discover():
    identities = read(ROOT / 'src/data/player-identities.json')['players']
    aliases = {}
    for p in identities:
        for name in p['names']:
            aliases.setdefault(normalize(name), set()).add(p['id'])
    overrides = {'Noone-': 'real-no%5Bo%5Dne', 'Paparazi (gamer)': 'real-paparazi', 'Fly (Dota 2 player)': 'real-fly'}
    category_rows = [p for p in members('Category:Dota 2 players') if p['ns'] == 14]
    categories = [p['title'] for p in category_rows]
    category_ids = {p['title']: p['pageid'] for p in category_rows}
    matched, unmatched = {}, []
    for cat in categories:
        name = cat.removeprefix('Category:')
        handle = re.sub(r' \([^)]*\)', '', name)
        candidates = aliases.get(normalize(handle), set())
        player = overrides.get(name) or (next(iter(candidates)) if len(candidates) == 1 else None)
        if player:
            matched[cat] = player
        else:
            unmatched.append(cat)
    files, metadata = {}, {}
    for cat in matched:
        try:
            old_params = {'action': 'query', 'list': 'categorymembers', 'cmtitle': cat, 'cmlimit': 500}
            old_key = hashlib.sha256(json.dumps(old_params, sort_keys=True).encode()).hexdigest()
            rows = read(CACHE / (old_key + '.json'))['query']['categorymembers'] if (CACHE / (old_key + '.json')).exists() else members(cat, category_ids[cat])
            files[cat] = [r['title'] for r in rows if r['ns'] == 6]
        except Exception as error:
            print(f'Category unavailable: {cat}: {error}', flush=True)
            files[cat] = []
        print(f'{len(files)}/{len(matched)}: {cat}: {len(files[cat])} files', flush=True)
    titles = sorted({title for rows in files.values() for title in rows})
    for start in range(0, len(titles), 40):
        data = fetch({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata',
                      'iiurlwidth': 600, 'titles': '|'.join(titles[start:start + 40])})
        metadata.update({p['title']: p.get('imageinfo', [{}])[0] for p in data['query']['pages'].values()})
        print(f'Photo metadata: {min(start + 40, len(titles))}/{len(titles)}', flush=True)
    write(CACHE / 'discovery.json', {'categories': matched, 'files': files, 'metadata': metadata, 'unmatched': unmatched})
    print(json.dumps({'matched': len(matched), 'files': len(metadata), 'unmatched': unmatched}, indent=2), flush=True)


def plain(value):
    return html.unescape(re.sub(r'<[^>]*>', '', value)).strip()


def import_photos():
    refs = read(REFERENCES)
    catalog_path = ROOT / 'src/data/player-portraits.json'
    previous = read(catalog_path)['players'] if catalog_path.exists() else {}
    discovery = read(CACHE / 'discovery.json') if (CACHE / 'discovery.json').exists() else {'metadata': {}}
    missing = [r['file'] for r in refs['players'] if r['file'] not in discovery['metadata']]
    for start in range(0, len(missing), 40):
        data = fetch({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata',
                      'iiurlwidth': 600, 'titles': '|'.join(missing[start:start + 40])})
        discovery['metadata'].update({p['title']: p.get('imageinfo', [{}])[0] for p in data['query']['pages'].values()})
    # Commons rounds thumbnail sizes into CDN buckets. Request a smaller bucket
    # for small originals, avoiding needless original-image downloads.
    unscaled = [r['file'] for r in refs['players'] if 'upload.wikimedia.org' in discovery['metadata'][r['file']].get('thumburl', '')]
    for start in range(0, len(unscaled), 40):
        data = fetch({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url',
                      'iiurlwidth': 200, 'titles': '|'.join(unscaled[start:start + 40])})
        for p in data['query']['pages'].values():
            info = p['imageinfo'][0]
            if 'upload.wikimedia.org' in info.get('thumburl', ''):
                tiny = fetch({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url',
                              'iiurlwidth': max(1, discovery['metadata'][p['title']]['width'] // 4), 'titles': p['title']})
                info = next(iter(tiny['query']['pages'].values()))['imageinfo'][0]
            discovery['metadata'][p['title']]['thumburl'] = info['thumburl']
    output = ROOT / 'public/player-portraits'
    output.mkdir(parents=True, exist_ok=True)
    originals = CACHE / 'originals'
    originals.mkdir(exist_ok=True)
    # Retain the separately sourced headshots/card photos when refreshing Commons.
    catalog = {id: p for id, p in previous.items() if p.get('source') in ('liquipedia', 'spectral-player-card')}
    for index, ref in enumerate(refs['players'], 1):
        info = discovery['metadata'][ref['file']]
        ext = info['extmetadata']
        license_name = plain(ext.get('LicenseShortName', {}).get('value', ''))
        license_url = ext.get('LicenseUrl', {}).get('value', '')
        if not (license_name.startswith(('CC BY', 'CC0')) or license_name == 'Public domain'):
            raise ValueError(f"Unreviewed license: {ref['file']} {license_name}")
        if not license_url.startswith('https://'):
            license_url = license_url.replace('http://', 'https://')
        source_key = hashlib.sha256(ref['file'].encode()).hexdigest()[:20]
        key = hashlib.sha256((ref['id'] + '|' + ref['file']).encode()).hexdigest()[:20]
        cached = originals / source_key
        if not cached.exists():
            for attempt in range(4):
                response = requests.get(info.get('thumburl', info['url']).split('?')[0], headers=HEADERS, timeout=60)
                if response.status_code in (429, 503):
                    retry_delay(response, attempt)
                    continue
                response.raise_for_status()
                break
            response.raise_for_status()
            if not response.headers.get('Content-Type', '').startswith('image/') or len(response.content) > 20_000_000:
                raise ValueError('Invalid image response')
            Image.open(io.BytesIO(response.content)).verify()
            cached.write_bytes(response.content)
            time.sleep(1)
        with Image.open(cached) as image:
            image = ImageOps.exif_transpose(image).convert('RGB')
            # Crop coordinates are normalized to the entire EXIF-oriented image.
            if ref.get('crop'):
                x, y, right, bottom = ref['crop']
                image = image.crop((round(x * image.width), round(y * image.height), round(right * image.width), round(bottom * image.height)))
            image = ImageOps.fit(image, (320, 400), method=Image.Resampling.LANCZOS, centering=(.5, .35))
            image.save(output / (key + '.webp'), format='WEBP', quality=84, method=6)
        catalog[ref['id']] = {'path': f'player-portraits/{key}.webp', 'filePage': info['descriptionurl'],
                              'imageUrl': info['url'], 'author': plain(ext.get('Artist', {}).get('value', '')),
                              'credit': plain(ext.get('Credit', {}).get('value', '')),
                              'license': license_name, 'licenseUrl': license_url,
                              'photoDate': plain(ext.get('DateTimeOriginal', {}).get('value', 'Unknown')),
                              'identitySource': ref['category'], 'changes': 'Cropped, resized and converted to WebP.'}
        print(f"{index}/{len(refs['players'])}: {ref['id']}", flush=True)
    retained_paths = {p['path'] for p in catalog.values()}
    for photo in previous.values():
        if photo['path'] not in retained_paths and re.fullmatch(r'player-portraits/[a-f0-9]{20}\.webp', photo['path']):
            old_path = (ROOT / 'public' / photo['path']).resolve()
            if old_path.parent == output.resolve() and old_path.exists():
                old_path.unlink()  # Only an exact obsolete asset from this generator's prior manifest.
    write(catalog_path, {'reviewedOn': '2026-10-21',
          'method': 'Wikimedia Commons photos with separately sourced headshots/card photos retained. Exact player IDs; one reference appearance per player, not season-specific. Consult per-file credits and rights.',
          'players': catalog})
    write(output / 'credits.json', {'players': catalog})
    print(f'Imported {len(catalog)} portraits.', flush=True)


if __name__ == '__main__':
    {'discover': discover, 'import': import_photos}[sys.argv[1]]()
