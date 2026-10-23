/** Paraphrase recovered source notes without implying exact spells are modeled. */
export function simplifiedHeroNote(note: string): string {
  const text = note.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const increased = /increased/i.test(text), decreased = /decreased|reduced/i.test(text);
  if (/cooldown/i.test(text) && (increased || decreased)) return increased ? "An ability takes longer to become available again." : "An ability can be used more often.";
  if (/mana cost/i.test(text) && (increased || decreased)) return increased ? "An ability costs more mana." : "An ability costs less mana.";
  if (/damage/i.test(text) && (increased || decreased)) return increased ? "A damage value was raised." : "A damage value was lowered.";
  if (/duration/i.test(text) && (increased || decreased)) return increased ? "An effect lasts longer." : "An effect ends sooner.";
  if (/agility|strength|intelligence/i.test(text) && (increased || decreased)) return increased ? "A base attribute or its growth was increased." : "A base attribute or its growth was reduced.";
  if (/mana gain/i.test(text) && decreased) return "Mana recovery was reduced.";
  if (/bounce/i.test(text) && increased) return "Attacks or spells can bounce to more targets.";
  return "Hero rules changed in the original game; the source has the full detail.";
}
