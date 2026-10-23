import { useState } from "react";
import { Check, Pencil, Save, X } from "lucide-react";
import type { Campaign } from "./game";
import { applyTrainingPreset, MAX_TRAINING_PRESETS } from "./training-presets";
import { pinQuickSlot, quickSlots, renameQuickSlot, saveQuickSlot } from "./training-quick-slots";
import "./training-quick-slots.css";

export default function TrainingQuickSlots({ campaign, onChange, notify }: {
  campaign: Campaign;
  onChange: (change: (c: Campaign) => Campaign) => void;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [overwrite, setOverwrite] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const slots = quickSlots(campaign);
  const presets = campaign.trainingPresets ?? [];
  const full = presets.length >= MAX_TRAINING_PRESETS;

  return (
    <div className="training-quick-slots" role="group" aria-label="Quick training plans">
      {slots.map((preset, slot) => {
        if (!preset) return (
          <div className="training-quick-slot empty" key={slot}>
            <select aria-label={`Pin a saved plan to quick slot ${slot + 1}`} value=""
              onChange={(e) => {
                const picked = presets.find(p => p.id === e.target.value);
                if (!picked) return;
                onChange(c => pinQuickSlot(c, slot, picked.id));
                notify(`“${picked.name}” pinned to quick slot ${slot + 1}.`);
              }}>
              <option value="">Empty · Slot {slot + 1}</option>
              {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="button" className="training-quick-icon" disabled={full}
              aria-label={`Save current plan to quick slot ${slot + 1}`}
              title={full ? `All ${MAX_TRAINING_PRESETS} saved plans are used. Delete one below to make room.` : "Save the current weekly plan as a new quick plan"}
              onClick={() => {
                onChange(c => saveQuickSlot(c, slot, crypto.randomUUID()));
                notify(`Current weekly plan saved to quick slot ${slot + 1}.`);
              }}>
              <Save size={12} />
            </button>
          </div>
        );
        if (editing === slot) return (
          <form className="training-quick-slot" key={slot}
            onSubmit={(e) => { e.preventDefault(); onChange(c => renameQuickSlot(c, slot, draft)); setEditing(null); }}>
            <input autoFocus aria-label={`Name for quick slot ${slot + 1}`} value={draft} maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }} />
            <button type="submit" className="training-quick-icon" aria-label="Save name"><Check size={13} /></button>
          </form>
        );
        return (
          <div className="training-quick-slot" key={slot}>
            <button type="button" className="training-quick-apply" title={`Apply ${preset.name}`}
              onClick={() => {
                onChange(c => applyTrainingPreset(c, preset.id));
                notify(`Applied “${preset.name}”. Workloads respect current contract limits.`);
              }}>
              {preset.name}
            </button>
            <button type="button" className="training-quick-icon" aria-label={`Rename ${preset.name}`}
              onClick={() => { setDraft(preset.name); setEditing(slot); setOverwrite(null); }}>
              <Pencil size={12} />
            </button>
            {overwrite === slot ? (
              <button type="button" className="training-quick-confirm" autoFocus onBlur={() => setOverwrite(null)}
                onClick={() => {
                  onChange(c => saveQuickSlot(c, slot, preset.id));
                  setOverwrite(null);
                  notify(`Updated “${preset.name}” with the current weekly plan.`);
                }}>
                Overwrite?
              </button>
            ) : (
              <button type="button" className="training-quick-icon" aria-label={`Overwrite ${preset.name} with the current plan`}
                title="Overwrite with the current weekly plan" onClick={() => setOverwrite(slot)}>
                <Save size={12} />
              </button>
            )}
            <button type="button" className="training-quick-icon" aria-label={`Unpin ${preset.name}`}
              title="Unpin (the saved plan is kept)"
              onClick={() => { onChange(c => pinQuickSlot(c, slot, null)); notify(`“${preset.name}” unpinned. It stays in your saved plans.`); }}>
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
