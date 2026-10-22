"""Keep UI portrait fields small; complete provenance ships in credits.json."""
import json


def write_portrait_index(root, players):
    fields = ('path', 'filePage', 'author', 'license', 'photoDate')
    index = {}
    for id, photo in sorted(players.items()):
        entry = {key: photo[key] for key in fields}
        if photo['licenseUrl'] != photo['filePage']:
            entry['licenseUrl'] = photo['licenseUrl']
        index[id] = entry
    (root / 'src/data/player-portrait-index.json').write_text(
        json.dumps({'players': index}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
