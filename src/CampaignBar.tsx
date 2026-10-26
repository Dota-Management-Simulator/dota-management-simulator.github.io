import { patchLabel } from "./patch-label";
import { ArrowRight, CalendarDays, Coins } from "lucide-react";
import type { Campaign } from "./game";
import { money, weeklyIncome, weeklyWages } from "./game";
import { formatDate } from "./tournaments";
import type { ContinueAction } from "./manager-view";
import { campaignPatch } from "./patches";

export default function CampaignBar({ campaign, action, busy, onContinue, onPatch }: {
  campaign: Campaign; action: ContinueAction; busy: boolean; onContinue: () => void; onPatch?: () => void;
}) {
  const net = weeklyIncome(campaign) - weeklyWages(campaign);
  return <div className="campaign-bar" aria-label="Campaign controls">
    <div className="campaign-date"><CalendarDays size={18} /><div><strong>{campaign.calendar ? formatDate(campaign.calendar.now) : `Week ${campaign.week} · ${campaign.year}`}</strong><span>{campaign.settings.team} · <button className="text-link" disabled={busy} onClick={onPatch}>Patch {patchLabel(campaignPatch(campaign))}</button></span></div></div>
    <div className="campaign-balance"><Coins size={17} /><div><strong>{money(campaign.cash)}</strong><span>{net > 0 ? "+" : ""}{money(net)} net / week</span></div></div>
    <div className="campaign-next"><span>{action.kind === "advance" ? "NEXT STEP" : "YOUR ATTENTION"}</span><strong>{action.detail}</strong></div>
    <button className="button primary campaign-continue" disabled={busy} onClick={onContinue}>{busy ? "Series in progress" : action.label}<ArrowRight size={17} /></button>
  </div>;
}
