import type { Campaign } from "./game";
import { campaignPatch } from "./patches";
import { talentsEnabled } from "./patch-milestones";
import { automaticTalents, choosePlayerTalent, normalizeTalentPlan, talentTiers } from "./talents";
import { playerIdentityLock, playerTalentDetail } from './player-identity';
import { sharedTalentById } from './player-identity-data';
import "./patches.css";

export default function PlayerTalents({ campaign, playerId, onChange }: { campaign: Campaign; playerId: string; onChange: (c: Campaign) => void }) {
  const enabled = talentsEnabled(campaignPatch(campaign));
  const managed = campaign.roster.includes(playerId);
  const player = campaign.players.find(p => p.id === playerId)!;
  const role = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"].indexOf(player.role);
  const plan = normalizeTalentPlan(campaign.talentPlans?.[playerId] ?? (managed ? {} : automaticTalents(role,player.identity)));
  const lock = playerIdentityLock(campaign, playerId);
  const tree = player.identity?.tree.map(t=>({level:t.level,choices:t.choices.map(choice=>({name:sharedTalentById.get(choice.id)!.name,detail:playerTalentDetail(choice),rank:choice.rank}))})) ?? talentTiers.map(t=>({...t,choices:t.choices.map(choice=>({...choice,rank:1}))}));
  return <section className="player-talents" aria-label="Player talent tree">
    <h3>Player talent tree {enabled ? "· unlocked" : "· locked until 7.00"}</h3>
    <p>{enabled ? "Choose a branch for each tier. The bonus unlocks when this player's hero reaches that level in each match; levels reset next map. Choices stay with the player across heroes and transfers." : "The New Journey update (7.00) introduces talents for every player."}</p>
    {enabled && <>
      <p>Each player has a fixed tree drawn from 16 shared talents. Rank 2 strengthens a talent’s bonuses by 25%; the same talent and rank always have the same effect. Unselected tiers grant no bonus. Tournament and prepared-scrim lineups lock campaign choices.</p>
      <p>The first or second choice also selects the corresponding branch in the drafted hero’s historical tree. Supported spell cooldown, damage, healing and duration changes apply when that tier unlocks.</p>
      {lock && <p className="patch-lock">Talent choices locked: {lock}</p>}
      <div className="talent-tree">{tree.map(tier => <fieldset key={tier.level} disabled={!managed || !!lock}>
        <legend>Level {tier.level}</legend>
        {tier.choices.map((choice, index) => <button type="button" key={choice.name} aria-pressed={plan[tier.level] === index}
          onClick={() => onChange(choosePlayerTalent(campaign, playerId, tier.level, index as 0 | 1))}>
          <strong>{choice.name}</strong><span className="talent-rank">Rank {choice.rank}{choice.rank===2?' · specialty':''}</span><span>{choice.detail}</span>{plan[tier.level] === index && <small>SELECTED</small>}
        </button>)}
      </fieldset>)}</div>
      {!managed && <p>Recruit this player to manage their choices.</p>}
    </>}
  </section>;
}
