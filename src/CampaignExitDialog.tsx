import { ArrowLeft, Check, Power, Save } from "lucide-react";
import "./campaign-exit.css";

export default function CampaignExitDialog({ team, saveError, saved, onSave, onExit, onCancel }: {
  team: string; saveError: boolean; saved: boolean; onSave: () => void;
  onExit: (destination: "steam" | "campaigns") => void; onCancel: () => void;
}) {
  return <div className="text-modal campaign-exit-dialog">
    <div className="eyebrow">AEGIS MANAGER</div>
    <h2 id="modal-title"><Power size={24} /> Leave the game?</h2>
    <p>Save {team} and choose where to go next.</p>
    {saveError ? <p className="alert warning" role="alert">Saving failed. Your campaign is still open. Free browser storage or allow local storage, then try saving again.</p>
      : saved ? <p className="campaign-exit-saved" role="status"><Check size={16} /> Campaign saved on this browser.</p>
      : <p className="campaign-exit-note">Your campaign is saved before you leave.</p>}
    <div className="campaign-exit-actions">
      <button className="button primary full" onClick={() => onExit("steam")}><Power size={17} /> Save and return to Steam</button>
      <button className="button secondary full" onClick={() => onExit("campaigns")}><ArrowLeft size={17} /> Save and return to main menu</button>
      <button className="button secondary full" onClick={onSave}><Save size={17} /> Save campaign</button>
    </div>
    <button className="text-link campaign-exit-cancel" onClick={onCancel}>Keep playing</button>
  </div>;
}
