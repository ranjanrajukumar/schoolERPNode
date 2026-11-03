import { api, fetchBlob, getToken } from '../../../services/api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE = ['done', 'failed', 'expired'];

/**
 * Asks the server to build a saved design as a file and waits for it. A quick report is finished by the time the first answer
 * arrives; a big one is queued, and this polls until it is done. `onStatus` is told each time the run changes.
 */
export async function runReport(templateId, format, onStatus) {
  let run = await api('/report-designer/runs', { method: 'POST', body: { templateId, format } });
  onStatus?.(run);
  for (let waited = 0; !DONE.includes(run.status); waited += 700) {
    if (waited > 180_000)
      throw new Error(
        'The report is taking a long time. It will appear in your report history when it is ready',
      );
    await sleep(700);
    run = await api(`/report-designer/runs/${run.id}`);
    onStatus?.(run);
  }
  if (run.status !== 'done') throw new Error(run.error || 'The report could not be built');
  return run;
}

/** Opens an empty tab right now, while the click still counts, so a browser does not block it once the server has answered. */
export const openTab = () => window.open('', '_blank');

/** Shows a PDF in that tab (or a new one if it was closed). The browser's own viewer has the Print button. */
export function showInTab(tab, blob) {
  const url = URL.createObjectURL(blob);
  if (tab && !tab.closed) tab.location.href = url;
  else window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/**
 * Print: the server builds the report as a clean PDF (title, column headings, rows, page numbers and nothing else) and it opens in a
 * new tab to print. Pass { templateId } for a saved report, or { request, title } for one that is not saved.
 */
export async function printTable(body) {
  const tab = openTab();
  try {
    showInTab(tab, await printBlob(body));
  } catch (e) {
    tab?.close();
    throw e;
  }
}

/** A table report as a clean PDF file in memory, not shown anywhere yet. Same body as printTable. */
export async function printBlob(body) {
  const res = await fetch('/api/report-designer/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error((await res.json().catch(() => ({}))).error || 'The report could not be printed');
  return res.blob();
}

/** A table report as a spreadsheet-ready CSV file in memory. */
export async function csvBlob(templateId) {
  const res = await fetch(`/api/report-designer/templates/${templateId}/csv`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not download');
  return res.blob();
}

/** The file of a finished run, in memory. */
export const runBlob = (run) => fetchBlob(`/report-designer/runs/${run.id}/download`);

/** Saves a file the way the browser saves a download. */
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Downloads a finished run. A PDF opens in a new tab (where the browser can print it); a spreadsheet is saved. */
export async function openRun(run, tab = null) {
  const blob = await runBlob(run);
  if (run.format === 'pdf') return showInTab(tab, blob);
  saveBlob(blob, run.fileName ?? 'report.xlsx');
}

/** The live preview: a PDF of the first rows of a design that has not been saved. */
export async function previewDesign(design, board) {
  const res = await fetch('/api/report-designer/designs/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ design, board: board || undefined }),
  });
  if (!res.ok)
    throw new Error((await res.json().catch(() => ({}))).error || 'The preview could not be built');
  return URL.createObjectURL(await res.blob());
}
