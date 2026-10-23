import type { Campaign } from "./game";
import { campaignPatch } from "./patches";
import { talentsEnabled } from "./patch-milestones";
import { automaticTalents, choosePlayerTalent, normalizeTalentPlan, talentTiers } from "./talents";
import { playerTournamentLock } from "./tournament-locks";
import "./patches.css";

export default function PlayerTalents({ campaign, playerId, onChange }: { campaign: Campaign; playerId: string; onChange: (c: Campaign) => void }) {
  const enabled = talentsEnabled(campaignPatch(campaign));
  const managed = campaign.roster.includes(playerId);
  const player = campaign.players.find(p => p.id === playerId)!;
  const role = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"].indexOf(player.role);
  const plan = normalizeTalentPlan(campaign.talentPlans?.[playerId] ?? (managed ? {} : automaticTalents(role)));
  const lock = playerTournamentLock(campaign, playerId);
  return <section className="player-talents" aria-label="Player talent tree">
    <h3>Player talent tree {enabled ? "· unlocked" : "· locked until 7.00"}</h3>
    <p>{enabled ? "Choose a branch for each tier. The bonus unlocks when this player's hero reaches that level in each match; levels reset next map. Choices stay with the player across heroes and transfers." : "The New Journey composite (2017.1, including 7.00) introduces talents for every player."}</p>
    {enabled && <>
      <p>These are simplified player talents. You can change choices between tournaments; ongoing tournaments lock them. Unselected tiers grant no bonus. AI clubs choose by role.</p>
      {lock && <p className="patch-lock">Talent choices locked: {lock}</p>}
      <div className="talent-tree">{talentTiers.map(tier => <fieldset key={tier.level} disabled={!managed || !!lock}>
        <legend>Level {tier.level}</legend>
        {tier.choices.map((choice, index) => <button type="button" key={choice.name} aria-pressed={plan[tier.level] === index}
          onClick={() => onChange(choosePlayerTalent(campaign, playerId, tier.level, index as 0 | 1))}>
          <strong>{choice.name}</strong><span>{choice.detail}</span>{plan[tier.level] === index && <small>SELECTED</small>}
        </button>)}
      </fieldset>)}</div>
      {!managed && <p>Recruit this player to manage their choices.</p>}
    </>}
  </section>;
}
