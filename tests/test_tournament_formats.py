import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from tournament_formats import group_format, is_gsl, starting_advantage


class TournamentFormatTests(unittest.TestCase):
    def test_tiebreak_length_never_defines_regular_groups(self):
        rule = group_format("2 points for a 2 - 0, 1 point for 1 - 1 and 0 points for 0 - 2.\nIndividual game result applies.\nTiebreaker (bo3).")
        self.assertEqual((rule["games"], rule["legs"]), (2, 1))

    def test_qualifier_rules_never_define_main_groups(self):
        rule = group_format("Main Qualifier:\nMatches are Bo1.\nLeague Play:\nEight teams play round-robin.\nMatches are best of two.\nPlayoffs:\nAll BO3.")
        self.assertEqual(rule["games"], 2)

    def test_two_bo1_meetings_are_not_a_bo2_series(self):
        rule = group_format("League\nEach team will face each other twice.\nAll matches are played Best of One.\nPlayoffs\nBO5.")
        self.assertEqual((rule["games"], rule["legs"]), (1, 2))

    def test_double_round_robin_bo2_has_two_legs(self):
        rule = group_format("Group Stage\nBO2 double round-robin.")
        self.assertEqual((rule["games"], rule["legs"]), (2, 2))

    def test_missing_length_stays_unknown(self):
        self.assertIsNone(group_format("Round Robin")["games"])
        self.assertIsNone(group_format("Group Play\nTwo groups play round robin.\nPlayoffs\nBest of three.")["games"])

    def test_numbered_group_stages_keep_separate_rules(self):
        text = "Group Stage #1\nBest of one.\nGroup Stage #2\nBest of two.\nPlayoffs\nBO5."
        self.assertEqual(group_format(text, 0)["games"], 1)
        self.assertEqual(group_format(text, 1)["games"], 2)

    def test_finals_table_uses_its_own_rules(self):
        text = "Online League\nBO2 round-robin.\nLAN Finals\nSix teams play round-robin.\nPlayoffs\nBO3."
        self.assertIsNone(group_format(text, name="Round Robin")["games"])
        self.assertEqual(group_format(text, name="League Play")["games"], 2)

    def test_gsl_prose_is_not_a_round_robin(self):
        self.assertTrue(is_gsl("Four groups of four.\nDouble-elimination format with matches played in BO3."))
        self.assertTrue(is_gsl("Each group is played in a double-elimination bracket format."))
        self.assertFalse(is_gsl("Group matches BO2.\nTop two teams from each group advance to a double-elimination bracket."))

    def test_inline_group_and_playoff_sections_are_distinct(self):
        rule = group_format("Group Stage: four groups, single round robin, all BO2. Playoffs: double elimination, BO3 except BO5 final.")
        self.assertEqual(rule["games"], 2)
        self.assertFalse(rule["gsl"])

    def test_playoff_narrative_does_not_supply_group_length(self):
        self.assertIsNone(group_format("Groups play on Monday.\nThe playoff will be played in BO3.")["games"])

    def test_fixed_three_maps_is_detected_separately(self):
        rule = group_format("Group Stage:\n3-game series round-robin.\nEach map win equals one point.")
        self.assertEqual(rule["fixedMaps"], 3)

    def test_default_map_wording_and_negative_statements(self):
        for description in ["upper winner has a 1-0 lead", "upper winner had one map advantage", "ABC had a one map lead"]:
            self.assertTrue(starting_advantage(description))
        self.assertFalse(starting_advantage("No one map advantage applies."))
        self.assertFalse(starting_advantage("Player was forced to forfeit game 1."))

    def test_nearest_round_header_does_not_borrow_upper_format(self):
        spec = importlib.util.spec_from_file_location("normalizer", ROOT / "scripts/normalize-tournament-source.py")
        normalizer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(normalizer)
        headers = {"R2M1": "Upper Bracket BO3", "R2M5": "Lower Bracket BO1", "R2M8": "Later BO5"}
        self.assertEqual(normalizer.round_header(headers, "R2M6"), "Lower Bracket BO1")
        self.assertEqual(normalizer.round_header(headers, "R2M8"), "Later BO5")
        self.assertEqual(normalizer.round_header(headers, "R3M1"), "")


if __name__ == "__main__":
    unittest.main()
