import { patchMessageText } from "./patch-label";
import { formatOfficeDate } from "./office-date";
import { useState } from "react";
import { Archive, ArrowRight, CheckCheck, Inbox, Mail, MailOpen } from "lucide-react";
import type { Campaign } from "./game";
import { markInboxRead, unreadMessages, updateMessage } from "./office";
import type { OfficeAction, OfficeMessage } from "./office";
import "./office.css";

export default function ManagerInbox({ campaign, onChange, onAction }: { campaign: Campaign; onChange: (c: Campaign) => void; onAction: (action: OfficeAction) => void }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const messages = campaign.office?.messages ?? [];
  const visible = messages.filter(m => (filter === "expired" ? !!m.expired : !m.expired && (filter === "archive" ? m.archived : !m.archived && (filter === "all" || (filter === "unread" ? !m.read || m.id === selected : m.category === filter)))) && `${patchMessageText(m, m.subject)} ${m.sender} ${patchMessageText(m, m.body)}`.toLowerCase().includes(search.toLowerCase()));
  const current = visible.find(m => m.id === selected);
  const open = (message: OfficeMessage) => { setSelected(message.id); onChange(updateMessage(campaign, message.id, { read: true })); };
  return <section className="panel manager-inbox">
    <div className="inbox-toolbar"><div><h2><Inbox size={23} /> Club inbox</h2><p>{unreadMessages(campaign)} unread · Invitations, agreements and club decisions</p></div><button className="button secondary small-button" onClick={() => onChange(markInboxRead(campaign))} disabled={!unreadMessages(campaign)}><CheckCheck size={16} /> Mark all read</button></div>
    <div className="inbox-filters"><label className="inbox-search">Search messages<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Sender, subject or message" /></label><label>Show<select aria-label="Inbox message filter" value={filter} onChange={e => { setFilter(e.target.value); setSelected(null); }}><option value="all">All messages</option><option value="unread">Unread</option><option value="tournaments">Tournaments</option><option value="scrims">Scrim requests</option><option value="contracts">Player contracts</option><option value="sponsors">Sponsors</option><option value="club">Club updates</option><option value="patches">Patch updates</option><option value="archive">Archived</option><option value="expired">Expired</option></select></label></div>
    <div className="inbox-layout"><div className="inbox-list" aria-label="Messages">
      {!visible.length && <div className="inbox-empty"><Inbox size={30} /><h3>You're all caught up.</h3><p>New invitations and notices arrive as your campaign moves forward.</p></div>}
      {visible.map(m => <button key={m.id} className={`inbox-message ${!m.read && !m.expired ? "unread" : ""} ${current?.id === m.id ? "selected" : ""}`} aria-pressed={current?.id === m.id} onClick={() => open(m)}>
        {m.read || m.expired ? <MailOpen size={17} /> : <Mail size={17} />}<span><small>{m.sender}{m.expired ? " · Expired" : ""}</small><strong>{patchMessageText(m, m.subject)}</strong><span>{patchMessageText(m, m.body)}</span><time>{formatOfficeDate(m.at)}</time></span>{!m.read && !m.expired && <i className="inbox-unread-dot" aria-label="Unread" />}
      </button>)}
    </div><article className="inbox-detail" aria-live="polite">
      {current ? <><span className="eyebrow">{current.category.toUpperCase()}</span><h2>{patchMessageText(current, current.subject)}</h2><p className="inbox-sender">{current.sender} · {formatOfficeDate(current.at)}</p><p className="inbox-body">{patchMessageText(current, current.body)}</p>
        {current.expired && <div className="inbox-expiry" role="status"><strong>Expired · no longer actionable</strong><p>{current.expired.reason}</p><small>{formatOfficeDate(current.expired.at)}</small></div>}
        {current.action && !current.expired && <button className="button primary" onClick={() => onAction(current.action!)}>{patchMessageText(current, current.actionLabel ?? "Review")} <ArrowRight size={16} /></button>}
        {!current.expired && <div className="inbox-message-actions"><button className="text-link" onClick={() => { onChange(updateMessage(campaign, current.id, { read: !current.read })); if (filter === "unread") setSelected(null); }}>{current.read ? "Mark unread" : "Mark read"}</button><button className="text-link" onClick={() => { onChange(updateMessage(campaign, current.id, { archived: !current.archived, read: true })); setSelected(null); }}><Archive size={14} />{current.archived ? "Move to inbox" : "Archive message"}</button></div>}
      </> : <div className="inbox-empty"><MailOpen size={36} /><h3>A little clarity for your next move.</h3><p>Select a message to read it and review its action.</p></div>}
    </article></div>
  </section>;
}
