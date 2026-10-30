import type { Campaign, Player } from "./game";
import { weeklyPractice } from "./contracts";
import { roundTraining, setTrainingSchedule, trainingIntensities, trainingLimits, trainingSchedule } from "./training";
import type { TrainingSchedule } from "./training";
import { HeroPracticeFocus } from './PlayerCareerPanel';

export default function TrainingWorkload({ campaign, player, onChange }: {
  campaign: Campaign;
  player: Player;
  onChange: (change: (c: Campaign) => Campaign) => void;
}) {
  const schedule = trainingSchedule(campaign, player);
  const limits = trainingLimits(campaign, player);
  const resting = campaign.training[player.id] === "Rest";
  const contract = campaign.contracts?.[player.id];
  const maxDaily = Math.min(12, limits.maxHours / schedule.daysPerWeek);
  const hours = [...new Set([
    ...Array.from({ length: Math.floor(maxDaily) }, (_, i) => i + 1),
    schedule.hoursPerDay, maxDaily,
  ])].sort((a, b) => a - b);
  const practice = weeklyPractice(campaign, player, campaign.training[player.id] || "Balanced");
  const projected = roundTraining(Math.max(0, Math.min(100, player.energy + practice.energy)));
  const change = (patch: Partial<TrainingSchedule>) => onChange((c) => setTrainingSchedule(c, player.id, patch));

  return (
    <div className="training-workload">
      <div className="training-workload-controls">
        <label>
          Intensity
          <select aria-label={`Training intensity for ${player.name}`} value={schedule.intensity} disabled={resting}
            onChange={(e) => change({ intensity: e.target.value as TrainingSchedule["intensity"] })}>
            {Object.entries(trainingIntensities).map(([name, multiplier]) => (
              <option key={name} value={name}>{name} · {multiplier}×</option>
            ))}
          </select>
        </label>
        <label>
          Hours / day
          <select aria-label={`Training hours per day for ${player.name}`} value={schedule.hoursPerDay} disabled={resting}
            onChange={(e) => change({ hoursPerDay: Number(e.target.value) })}>
            {hours.map((hours) => <option key={hours} value={hours}>{roundTraining(hours)}h / day</option>)}
          </select>
        </label>
        <label>
          Days / week
          <select aria-label={`Training days per week for ${player.name}`} value={schedule.daysPerWeek} disabled={resting}
            onChange={(e) => change({ daysPerWeek: Number(e.target.value) })}>
            {Array.from({ length: limits.maxDays }, (_, i) => i + 1).map((days) => (
              <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>
            ))}
          </select>
        </label>
      </div>
      <p className={projected < 40 ? "training-workload-summary low-energy" : "training-workload-summary"}>
        {resting ? "Recovery week · no practice" : `${roundTraining(schedule.hoursPerDay * schedule.daysPerWeek)}h / week · ${7 - schedule.daysPerWeek} days off`}
        {` · Next energy: ${projected}%`}{projected < 40 ? " · Low energy hurts match performance" : ""}
      </p>
      {contract && <p className="training-workload-summary">Contract limit: {contract.practiceHours}h / week · at least {contract.restDays} protected rest days. Open the player profile to negotiate.</p>}
      <HeroPracticeFocus campaign={campaign} player={player} onChange={onChange} />
    </div>
  );
}
