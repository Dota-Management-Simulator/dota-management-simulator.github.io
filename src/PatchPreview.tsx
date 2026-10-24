import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, LayoutDashboard } from "lucide-react";
import App from "./App";
import type { Page } from "./game";
import { campaignPatch } from "./patches";
import { createPatchPreviewCampaign, previewMoment, previewMoments, previewPatch, previewPatches } from "./patch-preview";
import "./patch-preview.css";

export default function PatchPreview() {
  const [id, setId] = useState(() => previewPatch(new URLSearchParams(location.search).get("patch-preview")).id);
  const [date, setDate] = useState(() => previewMoment(new URLSearchParams(location.search).get("date"))?.date);
  const [page, setPage] = useState<Page>("overview");
  const [revision, setRevision] = useState(0);
  const campaign = useMemo(() => createPatchPreviewCampaign(id, date), [id, date, revision]);
  const jump = (nextId: string, nextDate?: string) => {
    const patch = nextDate ? campaignPatch(createPatchPreviewCampaign(nextId, nextDate)) : previewPatch(nextId);
    const url = new URL(location.href);
    url.searchParams.set("patch-preview", patch.id);
    if (nextDate) url.searchParams.set("date", nextDate); else url.searchParams.delete("date");
    history.replaceState(null, "", url);
    setId(patch.id);
    setDate(nextDate);
    setRevision(value => value + 1);
  };
  const exit = new URL(location.href);
  exit.searchParams.delete("patch-preview");
  exit.searchParams.delete("date");

  return <App key={`${id}:${revision}`} preview={{ campaign, page, onPageChange: setPage,
    controls: (current, onPage, busy) => {
      const active = campaignPatch(current);
      const index = previewPatches.findIndex(patch => patch.id === active.id);
      return <section className="local-patch-preview" aria-label="Local patch preview">
        <div className="preview-label"><strong>LOCAL PATCH PREVIEW</strong><span>Explore freely. Each jump resets this sandbox.</span></div>
        <div className="preview-patch-controls">
          <button className="button secondary" disabled={busy || index <= 0} onClick={() => jump(previewPatches[index - 1].id)}><ChevronLeft size={16} />Back</button>
          <label className="preview-patch-picker"><span>Jump to patch · {index + 1} / {previewPatches.length}</span>
            <select aria-label="Jump to patch" disabled={busy} value={active.id} onChange={event => jump(event.target.value)}>
              {previewPatches.map(patch => <option key={patch.id} value={patch.id}>{patch.id} · {patch.generated ? "Fictional future" : patch.versions}</option>)}
            </select>
          </label>
          <label className="preview-patch-picker"><span>Jump to event or TI</span>
            <select aria-label="Jump to event or TI" disabled={busy} value={date ?? ""} onChange={event => event.target.value ? jump(id, event.target.value) : jump(id)}>
              <option value="">Patch start</option>
              {previewMoments.map(moment => <option key={moment.date} value={moment.date}>{moment.date} · {moment.label}</option>)}
            </select>
          </label>
          <button className="button primary" disabled={busy || index < 0 || index === previewPatches.length - 1} onClick={() => jump(previewPatches[index + 1].id)}>Next patch<ChevronRight size={16} /></button>
        </div>
        <div className="preview-view-controls">
          <button className="button secondary" disabled={busy} aria-pressed={page === "patch"} onClick={() => onPage("patch")}><FileText size={15} />Patch notes</button>
          <button className="button secondary" disabled={busy} aria-pressed={page === "overview"} onClick={() => onPage("overview")}><LayoutDashboard size={15} />Desk</button>
          <a className="text-link" href={exit.href}>Exit preview</a>
        </div>
      </section>;
    },
  }} />;
}
