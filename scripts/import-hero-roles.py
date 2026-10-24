"""Compile cached primary role tables. Offline; no requests during builds/play."""
import gzip
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'scripts/data/hero-role-sources'

class Positions(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows = []; self.row = None; self.group = None; self.cell = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'tr' and 'data-value-overview_total' in a:
            self.row = {'played': int(a['data-value-overview_total']), 'counts': [int(a.get('data-value-position_'+p, 0)) for p in ['1.1','1.2','1.3','0.3','0.1']], 'winRates': [None]*5}
        if self.row is not None:
            if tag == 'a' and re.search(r'heroid(\d+)',a.get('href','')): self.row['valveId'] = re.search(r'heroid(\d+)',a['href'])[1]
            if tag == 'img' and 'hero_portrait' in a.get('class',''): self.row['slug'] = a.get('alt')
            if tag == 'td': self.group = a.get('data-col-group'); self.cell = ''
    def handle_data(self, data):
        if self.cell is not None: self.cell += data
    def handle_endtag(self, tag):
        if tag in ['td','th'] and self.row is not None and self.cell is not None:
            if self.group in ['position_1-1','position_1-2','position_1-3','position_0-3','position_0-1'] and '%' in self.cell:
                # Each group has ratio followed by win rate; last percentage wins.
                i = ['position_1-1','position_1-2','position_1-3','position_0-3','position_0-1'].index(self.group)
                try: self.row['winRates'][i] = float(self.cell.strip().replace('%',''))
                except ValueError: pass
            self.cell = None
        if tag == 'tr' and self.row is not None:
            if self.row.get('slug') and self.row.get('valveId'): self.rows.append(self.row)
            self.row = None

def main():
    catalog = json.loads((ROOT/'src/data/heroes-2011.json').read_text(encoding='utf8'))['heroes'] + [h for b in json.loads((ROOT/'src/data/hero-releases.json').read_text(encoding='utf8'))['batches'] for h in b['heroes']]
    aliases = dict(zip('antimage nevermore rattletrap doom_bringer furion windrunner zuus shredder wisp life_stealer skeleton_king obsidian_destroyer abyssal_underlord vengefulspirit necrolyte magnataur queenofpain'.split(), 'anti_mage shadow_fiend clockwerk doom natures_prophet windranger zeus timbersaw io lifestealer wraith_king outworld_destroyer underlord vengeful_spirit necrophos magnus queen_of_pain'.split()))
    aliases.update({'centaur':'centaur_warrunner','treant':'treant_protector'})
    ids = {h['id'] for h in catalog}; sources = []; unknown = set()
    cache = ROOT/'scripts/data/hero-role-sources.json.gz'
    raw = json.loads(gzip.decompress(cache.read_bytes())) if cache.exists() else {}
    raw.update({p.name:p.read_text(encoding='utf8') for p in sorted(RAW.glob('ti*.html'))})
    if not raw: raise ValueError('Missing cached role sources; refusing to overwrite evidence with an empty archive')
    for name, body in sorted(raw.items()):
        year = int(re.search(r'(\d{4})',name)[1]); parser = Positions(); parser.feed(body)
        rows = []
        for row in parser.rows:
            slug = aliases.get(row.pop('slug'),None) if row.get('slug') in aliases else row.pop('slug')
            if slug not in ids: unknown.add(slug); continue
            if sum(row['counts']) > row['played']: raise ValueError(f'{year}: invalid role counts for {slug}')
            rows.append({'id': slug, **row})
        league = {2013:3,2014:4,2015:5,2016:6,2017:7,2018:8,2019:9,2021:10,2022:11,2023:12,2024:13,2025:14,2026:15}.get(year,year-2010)
        sources.append({'year':year,'url':f'https://stats.ru.spectral.gg/lrg2/?league=ti{league}&mod=heroes-positions',
            'status':'observed-lane-and-farm' if rows else 'unavailable', 'rows':rows})
    # Compact observations are committed; raw primary HTML remains reproducible.
    if unknown: raise ValueError(f'Unmapped hero aliases: {sorted(unknown)}')
    with cache.open('wb') as stream:
        with gzip.GzipFile(filename='',fileobj=stream,mode='wb',mtime=0) as f: f.write(json.dumps(raw,ensure_ascii=False).encode('utf8'))
    out = {'version':1,'retrievedOn':'2026-10-23','method':'Spectral observed core/support crossed with lane; lane swaps can differ from team farm-priority positions. Main-event samples are phase proxies, not complete patch coverage.', 'sources':sources}
    (ROOT/'src/data/hero-role-evidence.json').write_text(json.dumps(out,separators=(',',':'))+'\n',encoding='utf8')
    print(f'{sum(bool(s["rows"]) for s in sources)} usable annual role tables; {sum(len(s["rows"]) for s in sources)} hero/event rows; aliases missing: {sorted(unknown)}')

if __name__ == '__main__': main()
