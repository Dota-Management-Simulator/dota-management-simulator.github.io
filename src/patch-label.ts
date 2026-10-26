import { patchById } from "./patches";

type PatchReference = { id: string; versions?: string };

/** Presentation only: saved composite IDs still select the same simulation rules.
 * Use the final version in the covered range; notes retain the full lineage. */
export function patchLabel(reference?: string | PatchReference): string {
  if (!reference) return "Legacy";
  const id = typeof reference === "string" ? reference : reference.id;
  const patch = patchById(id);
  if (patch?.generated) return `Future ${(patch.year - 2027) * 2 + patch.phase}`;
  const versions = (typeof reference === "string" ? undefined : reference.versions) ?? patch?.versions;
  const numbers = versions?.split("/")[0].match(/\b\d+\.\d+[a-z]?\b/g);
  return numbers?.at(-1) ?? (/^\d{1,2}\.\d+[a-z]?$/.test(id) ? id : "Unknown");
}

/** Older inbox entries keep their saved text and read/archive state. */
export function patchMessageText(message: { category: string }, text: string): string {
  return message.category === "patches" ? text.replace(/\b20\d{2}\.[12]\b/g, id => patchLabel(id)) : text;
}
