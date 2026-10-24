import importlib.util
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location('hero_meta_import', Path(__file__).parent.parent/'scripts/import-hero-meta.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MetaImportTests(unittest.TestCase):
    def fixtures(self):
        draft = [{'hero_id': i+1, 'team': i % 2, 'is_pick': i < 10} for i in range(24)]
        match = {'match_id': 1, 'start_time': int(datetime(2026, 8, 15, tzinfo=timezone.utc).timestamp()),
                 'radiant_win': True, 'tier': 'premium', 'leagueid': 19719, 'patch': 60, 'picks_bans': draft}
        games = {'matches': [match], 'numericHeroIds': {str(i+1): f'h{i+1}' for i in range(24)},
                 'urlTemplate': 'https://api.opendota.com/api/matches/{match_id}'}
        roles = {'sources': [{'year': 2026, 'url': 'https://example.test/primary-role-table',
                              'rows': [{'id': f'h{i+1}', 'played': 1, 'counts': [1,0,0,0,0],
                                        'winRates': [100 if i % 2 == 0 else 0,None,None,None,None]} for i in range(10)]}]}
        phases = {'patches': [{'id': '2026.2', 'year': 2026, 'phase': 2, 'startsOn': '2026-06-04'}],
                  'seasons': [{'year': 2026, 'endsOn': '2026-08-23'}]}
        return roles, games, phases

    def test_exact_event_reconciliation_and_ban_counts(self):
        data = module.compile_meta(*self.fixtures())
        event = next(s for s in data['sources'] if s.get('representativeEvent'))
        self.assertEqual(event['matches'], 1)
        self.assertEqual(sum(h['picks'] for h in event['rows']), 10)
        self.assertEqual(sum(h['bans'] for h in event['rows']), 14)
        self.assertEqual(sum(h['wins'] for h in event['rows']), 5)

    def test_bad_drafts_dates_and_duplicate_games_do_not_inflate_meta(self):
        roles, games, phases = self.fixtures()
        good = games['matches'][0]
        duplicate = deepcopy(good)
        future = {**good, 'match_id': 2, 'start_time': int(datetime(2027, 1, 1, tzinfo=timezone.utc).timestamp())}
        bad = {**good, 'match_id': 3, 'picks_bans': good['picks_bans'][:10]}
        unknown = deepcopy(good); unknown['match_id'] = 4; unknown['picks_bans'][0]['hero_id'] = 999
        games['matches'] = [good, duplicate, future, bad, unknown]
        data = module.compile_meta(roles, games, phases)
        self.assertEqual(data['rejectedMatches'], {'duplicate': 1, 'outside-composites': 1, 'incomplete-bans': 1, 'invalid-draft': 1})
        self.assertTrue(all(s['matches'] == 1 for s in data['sources']))

    def test_conflicting_duplicate_fails_closed(self):
        roles, games, phases = self.fixtures()
        games['matches'].append({**deepcopy(games['matches'][0]), 'radiant_win': False})
        with self.assertRaisesRegex(ValueError, 'Conflicting duplicate'):
            module.compile_meta(roles, games, phases)

    def test_rounded_role_rates_only_recover_unambiguous_integer_wins(self):
        self.assertEqual(module.unique_wins(3, 66.7), 2)
        self.assertIsNone(module.unique_wins(0, None))
        self.assertIsNone(module.unique_wins(2000, 50.0))


if __name__ == '__main__':
    unittest.main()
