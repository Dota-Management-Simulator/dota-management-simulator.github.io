import { useState } from "react";
import type { Campaign } from "./game";
import { applyTrainingPreset, deleteTrainingPreset, MAX_TRAINING_PRESETS, presetName, saveTrainingPreset } from "./training-presets";
import { roundTraining } from "./training";
import "./training-presets.css";

export default function TrainingPresets({ campaign, onChange, notify }: {
  campaign: Campaign;
  onChange: (change: (c: Campaign) => Campaign) => void;
  notify: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<"update" | "delete" | null>(null);
  const presets = campaign.trainingPresets ?? [];
  const selected = presets.find(p => p.id === selectedId);
  const duplicate = presets.some(p => p.name.toLowerCase() === presetName(name).toLowerCase());
  const duplicateOther = presets.some(p => p.id !== selectedId && p.name.toLowerCase() === presetName(name).toLowerCase());
  const save = () => {
    const id = crypto.randomUUID();
    onChange(c => saveTrainingPreset(c, name, id));
    setSelectedId(id);
    setConfirm(null);
    notify(`Saved “${presetName(name)}”.`);
  };
  return <section className="training-presets" aria-label="Training presets">
    <div><h3>Saved training plans</h3>
      <p>Save the squad’s focus and workload, then apply a plan whenever you need it. Adjust the weekly plan below and save a new name to create a variant.</p></div>
    <div className="training-preset-fields">
      <label>Saved plan
        <select aria-label="Saved plan" value={selected?.id ?? ""} onChange={e => {
          setSelectedId(e.target.value);
          setName(presets.find(p => p.id === e.target.value)?.name ?? "");
          setConfirm(null);
        }}>
          <option value="">{presets.length ? "Choose a plan" : "No saved plans yet"}</option>
          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label>Plan name
        <input maxLength={60} value={name} placeholder="e.g. Match week or Intensive practice"
          onChange={e => { setName(e.target.value); setConfirm(null); }} />
      </label>
    </div>
    <div className="training-preset-actions">
      <button type="button" className="button primary small-button" disabled={!selected} onClick={() => {
        if (!selected) return;
        onChange(c => applyTrainingPreset(c, selected.id));
        setConfirm(null);
        notify(`Applied “${selected.name}”. Workloads respect current contract limits.`);
      }}>Apply plan</button>
      <button type="button" className="button secondary small-button"
        disabled={!presetName(name) || duplicate || presets.length >= MAX_TRAINING_PRESETS} onClick={save}>Save as new plan</button>
      <button type="button" className="button secondary small-button"
        disabled={!selected || !presetName(name) || duplicateOther} onClick={() => setConfirm("update")}>Update selected</button>
      <button type="button" className="button secondary small-button" disabled={!selected} onClick={() => setConfirm("delete")}>Delete plan</button>
    </div>
    {duplicate && <p className="training-preset-help">Use a different name to save a variant, or update the selected plan.</p>}
    {presets.length >= MAX_TRAINING_PRESETS && <p className="training-preset-help">All {MAX_TRAINING_PRESETS} plan slots are used. Update or delete a plan to make room.</p>}
    {confirm && selected && <div className="training-preset-confirm" role="group" aria-label="Confirm plan change">
      <p>{confirm === "delete" ? `Delete “${selected.name}”? Your current weekly plan stays as it is.`
        : `Replace “${selected.name}” with the current squad settings${presetName(name) !== selected.name ? ` and rename it to “${presetName(name)}”` : ""}?`}</p>
      <button type="button" className="button secondary small-button" onClick={() => {
        if (confirm === "delete") {
          onChange(c => deleteTrainingPreset(c, selected.id));
          setSelectedId(""); setName("");
          notify(`Deleted “${selected.name}”.`);
        } else {
          onChange(c => saveTrainingPreset(c, name, selected.id));
          notify(`Updated “${presetName(name)}”.`);
        }
        setConfirm(null);
      }}>{confirm === "delete" ? "Confirm delete" : "Confirm update"}</button>
      <button type="button" className="button secondary small-button" onClick={() => setConfirm(null)}>Cancel</button>
    </div>}
    {selected && <details className="training-preset-preview">
      <summary>View saved settings · {selected.name}</summary>
      <ul>{selected.players.map(p => <li key={p.playerId}><strong>{p.role}</strong><span>{p.focus === "Rest" ? "Rest · no practice" : `${p.focus} · ${p.schedule.intensity} · ${roundTraining(p.schedule.hoursPerDay)}h/day · ${p.schedule.daysPerWeek} days/week`}</span></li>)}</ul>
    </details>}
    <p className="training-preset-help">Saved with this campaign. Plans follow retained players; replacements inherit the saved plan for their role. Contract limits apply. Applying a plan does not advance time.</p>
  </section>;
}
