/** Keep the subject and replacement rule, dropping arithmetic from short notes. */
export function simplifiedHeroNote(note: string): string {
  return note.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
    .replace(/\b(increased|decreased|reduced|rescaled) from [+-]?[\d.,%/]+\s*(?:seconds?|secs?|s|gold|HP|mana)? to [+-]?[\d.,%/]+\s*(?:seconds?|secs?|s|gold|HP|mana)?\b/gi,'$1')
    .replace(/\bfrom [+-]?[\d.,%/]+ to [+-]?[\d.,%/]+\b/gi,'changed')
    .replace(/\b(increased|decreased|reduced|rescaled)%/gi,'$1')
    .replace(/\s+([.,;])/g,'$1');
}
