import type { Campaign } from './game';
import type { OfficeAction } from './office';
import { managerPriorities } from './manager-priorities';
import './manager-priorities.css';
export default function ManagerPriorities({ campaign, onAction }: { campaign: Campaign; onAction: (action: OfficeAction) => void }) {
  return <section className="manager-priorities" aria-label="Your next decisions"><div><span className="eyebrow">YOUR NEXT DECISIONS</span><p>What needs your attention before continuing</p></div><div className="manager-priority-list">{managerPriorities(campaign).map(row => <button type="button" key={row.id} className={row.urgency >= 85 ? 'urgent' : ''} onClick={() => onAction(row.action)}><strong>{row.title}</strong><span>{row.detail}</span><small>Review →</small></button>)}</div></section>;
}
