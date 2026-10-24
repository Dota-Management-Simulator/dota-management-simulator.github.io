"""Offline dated pro-meta evidence. No network or reads from other projects.

Inputs: committed TI role observations and frozen public OpenDota match details.
The latter were reduced from the user-provided Dota Drafter cache; no player
profiles, account IDs, chat or private settings are included.
"""
import gzip
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf8'))


def unique_wins(played, percent):
    if not played or percent is None:
        return None
    # The primary role tables round to one decimal place. Only recover an
    # integer count when that displayed percentage admits exactly one answer.
    possible = [w for w in range(played + 1) if abs(w / played * 100 - percent) <= .051]
    return possible[0] if len(possible) == 1 else None


def compile_meta(roles, matches, profiles):
    phases = profiles['patches']
    ends = {p['id']: (next(q['startsOn'] for q in phases if q['year'] == p['year'] and q['phase'] == 2)
                     if p['phase'] == 1 else
                     (datetime.fromisoformat(next(s['endsOn'] for s in profiles['seasons'] if s['year'] == p['year'])) + timedelta(days=1)).date().isoformat()) for p in phases}
    sources = []
    for event in roles['sources']:
        if not event['rows']:
            continue
        picks = sum(h['played'] for h in event['rows'])
        if picks % 10:
            raise ValueError(f"Incomplete pick coverage for TI{event['year']}")
        rows = []
        for hero in event['rows']:
            wins = win_sample = 0
            for count, rate in zip(hero['counts'], hero['winRates']):
                w = unique_wins(count, rate)
                if w is not None:
                    wins += w
                    win_sample += count
            rows.append({'id': hero['id'], 'picks': hero['played'], 'bans': None,
                         'wins': wins, 'winSample': win_sample})
        sources.append({'key': f"ti{event['year']}", 'patchId': f"{event['year']}.2",
                        'label': f"TI{event['year']} observed picks and classified-role results",
                        'url': event['url'], 'matches': picks // 10, 'completePicks': True,
                        'completeBans': False, 'population': 'TI event', 'versions': [],
                        'note': 'Complete event pick counts; bans are unavailable in this cached table. Wins are recovered only from uniquely determined classified-role counts. This event is a phase proxy, not a full-patch census.',
                        'rows': rows})

    groups = defaultdict(list)
    rejected = Counter()
    seen = {}
    for match in matches['matches']:
        mid = match['match_id']
        if mid in seen:
            if seen[mid] != match:
                raise ValueError(f'Conflicting duplicate match {mid}')
            rejected['duplicate'] += 1
            continue
        seen[mid] = match
        actions = match.get('picks_bans') or []
        picks = [a for a in actions if a.get('is_pick') is True]
        if match.get('tier') not in ('professional', 'premium') or type(match.get('radiant_win')) is not bool:
            rejected['population-or-result'] += 1
            continue
        if len(picks) != 10 or any(sum(a['team'] == s for a in picks) != 5 for s in (0, 1)):
            rejected['incomplete-draft'] += 1
            continue
        if len({a['hero_id'] for a in actions}) != len(actions) or any(a.get('team') not in (0, 1) or type(a.get('is_pick')) is not bool or str(a['hero_id']) not in matches['numericHeroIds'] for a in actions):
            rejected['invalid-draft'] += 1
            continue
        at = datetime.fromtimestamp(match['start_time'], timezone.utc).date().isoformat()
        phase = next((p for p in phases if p['startsOn'] <= at < ends[p['id']]), None)
        # Letter variants use actual timestamps, never OpenDota's family ID.
        if phase is None:
            rejected['outside-composites'] += 1
            continue
        era = (phase['year'], phase['phase'])
        expected_bans = 14 if era >= (2020, 2) else 12 if era >= (2018, 1) else 10 if era >= (2012, 1) else 8
        if len(actions) != 10 + expected_bans:
            rejected['incomplete-bans'] += 1
            continue
        if phase['year'] == 2026 and match['patch'] != 60:
            rejected['patch-date-conflict'] += 1
            continue
        groups[phase['id']].append(match)

    populations = []
    for patch_id, games in sorted(groups.items()):
        populations.append((patch_id, games, None))
        # A complete cached event is a better TI-window proxy than a wider
        # regional sample. Link it only after exact count reconciliation.
        event = next((s for s in sources if s['patchId'] == patch_id and s['population'] == 'TI event'), None)
        if event:
            by_league = defaultdict(list)
            for match in games:
                by_league[match['leagueid']].append(match)
            expected = {h['id']: h['picks'] for h in event['rows']}
            for league_games in by_league.values():
                picked = Counter(matches['numericHeroIds'][str(a['hero_id'])] for m in league_games for a in m['picks_bans'] if a['is_pick'])
                won = Counter(matches['numericHeroIds'][str(a['hero_id'])] for m in league_games for a in m['picks_bans'] if a['is_pick'] and ((a['team'] == 0) == m['radiant_win']))
                results_match = all(won[h['id']] == h['wins'] for h in event['rows'] if h['winSample'] == h['picks'])
                if len(league_games) == event['matches'] and dict(picked) == expected and results_match:
                    populations.append((patch_id, league_games, event))

    for patch_id, games, event in populations:
        counts = defaultdict(lambda: {'picks': 0, 'bans': 0, 'wins': 0, 'winSample': 0})
        for match in games:
            for action in match['picks_bans']:
                hero = counts[matches['numericHeroIds'][str(action['hero_id'])]]
                if action['is_pick']:
                    hero['picks'] += 1
                    hero['winSample'] += 1
                    hero['wins'] += int((action['team'] == 0) == match['radiant_win'])
                else:
                    hero['bans'] += 1
        if sum(h['picks'] for h in counts.values()) != len(games) * 10 or sum(h['wins'] for h in counts.values()) != len(games) * 5:
            raise ValueError(f'Invalid team/result totals for {patch_id}')
        first, last = min(m['start_time'] for m in games), max(m['start_time'] for m in games)
        def version(match):
            bounds = [b for b in matches.get('letteredPatchBoundaries', []) if datetime.fromisoformat(b['released_utc'].replace('Z', '+00:00')).timestamp() <= match['start_time']]
            return max(bounds, key=lambda b: b['released_utc'])['name'] if bounds else f"OpenDota family {match['patch']}"
        sources.append({'key': f"{event['key']}-drafts" if event else f'cached-pro-{patch_id}', 'patchId': patch_id,
                        'label': f"{event['key'].upper()} complete picks, bans and results ({len(games)} maps)" if event else f'Dated professional Captain’s Mode sample ({len(games)} maps)',
                        'url': matches['urlTemplate'].format(match_id=games[0]['match_id']),
                        'from': datetime.fromtimestamp(first, timezone.utc).date().isoformat(),
                        'through': datetime.fromtimestamp(last, timezone.utc).date().isoformat(),
                        'matches': len(games), 'completePicks': True, 'completeBans': True,
                        'representativeEvent': bool(event),
                        'crossCheckUrl': event['url'] if event else None,
                        'population': 'OpenDota professional/premium league sample',
                        'versions': sorted({version(m) for m in games}),
                        'matchIds': sorted(m['match_id'] for m in games),
                        'leagues': dict(sorted(Counter(str(m['leagueid']) for m in games).items())),
                        'note': 'Frozen public match details, deduplicated and cut to this composite by actual start time. Professional/premium leagues only; a sample, not a complete professional census. Patch-family IDs are not used to blend other phases.',
                        'rows': [{'id': hero, **counts[hero]} for hero in sorted(counts)]})
    return {'version': 1, 'retrievedOn': '2026-10-23', 'method': 'Phase-scoped factual pick/ban counts and sample-aware results; no cross-phase strength carry.',
            'rejectedMatches': dict(rejected), 'sources': sources}


def main():
    roles = read('src/data/hero-role-evidence.json')
    matches = json.loads(gzip.decompress((ROOT / 'scripts/data/pro-meta-matches.json.gz').read_bytes()))
    evidence = compile_meta(roles, matches, read('src/data/patches.json'))
    with (ROOT / 'scripts/data/hero-meta-sources.json.gz').open('wb') as stream:
        with gzip.GzipFile(filename='', fileobj=stream, mode='wb', mtime=0) as out:
            out.write(json.dumps(evidence, ensure_ascii=False, separators=(',', ':')).encode())
    for source in evidence['sources']:
        print(source['patchId'], source['matches'], 'maps', 'picks+bans' if source['completeBans'] else 'picks + classified results')
    print('Rejected cache records:', evidence['rejectedMatches'])


if __name__ == '__main__':
    main()
