import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { csvBlob, printBlob, runBlob, runReport, saveBlob } from './designer/runReport.js';
import './designer/designer.css';

/**
 * One component that puts any saved report on any screen. Design the report once in Reports > Report Designer, then:
 *
 *   <ReportButton name="Fee dues" />
 *   <ReportButton name="Student register: CBSE" folder="Board returns" label="CBSE register" />
 *
 * (A screen that lists all the reports of a page uses <PageReports page="students" /> instead, see PageReports.jsx.)
 *
 * `name` is the report's name, and `folder` is needed only if two folders hold a report of that name. `label` changes the button's
 * text (it shows the report's name by default) and `className` its look.
 *
 * Clicking it shows the report in a viewer on the same screen, with Print, Open in a tab, and Excel (a designed report) or CSV (a table
 * report). The report is built on the server, with the same role checks as everywhere else. If the report does not exist, or this
 * login may not run it, the button is not shown at all, so a screen can offer a report without checking who is looking.
 */
export default function ReportButton({ name, folder, label, className = 'ghost', report: given = null }) {
  const [report, setReport] = useState(given); // null until found, and for ever if it is missing or not for this login
  const [view, setView] = useState(null); // { busy } | { url } | { error }
  const [working, setWorking] = useState(false);
  const frame = useRef(null);

  useEffect(() => {
    if (given) return undefined; // the screen already found it (see PageReports)
    let live = true;
    const query = new URLSearchParams({ name, ...(folder ? { folder } : {}) });
    api(`/report-designer/templates/by-name?${query}`)
      .then((r) => live && setReport(r))
      .catch(() => live && setReport(null));
    return () => {
      live = false;
    };
  }, [name, folder, given]);

  const close = () => {
    if (view?.url) URL.revokeObjectURL(view.url);
    setView(null);
  };

  useEffect(() => {
    if (!view) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!report) return null;
  const designed = report.kind === 'design';

  const show = async () => {
    setView({ busy: true });
    try {
      const blob = designed
        ? await runBlob(await runReport(report.id, 'pdf'))
        : await printBlob({ templateId: report.id });
      setView({ url: URL.createObjectURL(blob) });
    } catch (e) {
      setView({ error: e.message });
    }
  };

  const download = async () => {
    setWorking(true);
    try {
      if (designed) {
        const run = await runReport(report.id, 'xlsx');
        saveBlob(await runBlob(run), run.fileName ?? `${report.name}.xlsx`);
      } else {
        saveBlob(await csvBlob(report.id), `${report.name.replace(/[^A-Za-z0-9._-]+/g, '-')}.csv`);
      }
    } catch (e) {
      setView({ error: e.message });
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={show} title={report.description ?? undefined}>
        {label ?? report.name}
      </button>
      {view && (
        <div className="rd-preview" role="dialog" aria-modal="true" aria-label={report.name}>
          <div className="rd-preview-card">
            <header>
              <h2>{report.name}</h2>
              <button
                type="button"
                className="ghost"
                disabled={!view.url}
                onClick={() => frame.current?.contentWindow?.print()}
              >
                Print
              </button>
              <button
                type="button"
                className="ghost"
                disabled={!view.url}
                onClick={() => window.open(view.url, '_blank')}
              >
                Open in a tab
              </button>
              <button type="button" className="ghost" disabled={working} onClick={download}>
                {working ? 'Building…' : designed ? 'Excel' : 'CSV'}
              </button>
              <button type="button" onClick={close}>
                Close
              </button>
            </header>
            {view.busy && (
              <p className="hint" style={{ padding: 20 }}>
                Building the report…
              </p>
            )}
            {view.error && (
              <p className="error" role="alert" style={{ padding: 20 }}>
                {view.error}
              </p>
            )}
            {view.url && <iframe ref={frame} title={report.name} src={view.url} />}
          </div>
        </div>
      )}
    </>
  );
}
