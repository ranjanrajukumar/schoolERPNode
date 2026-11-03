import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { api } from '../../../services/api.js';
import Canvas from './Canvas.jsx';
import Palette from './Palette.jsx';
import Properties from './Properties.jsx';
import {
  addElement,
  blankDesign,
  changeDataset,
  commit,
  elementForField,
  elementForTool,
  newHistory,
  newId,
  pageGeometry,
  redo,
  removeElement,
  setBandHeight,
  setGroupBy,
  toggleBand,
  undo,
  updateElement,
} from './designerModel.js';
import { openRun, openTab, previewDesign, runReport } from './runReport.js';
import './designer.css';

const EMPTY_META = { id: null, name: '', folderId: '', description: '', roles: [], pages: [], board: '' };
const MAX_IMAGE = 400 * 1024;
const typing = (e) =>
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;

/** Designs saved before the designer existed carry no element ids; the screen needs them to select things. */
const withIds = (design) => ({
  ...design,
  bands: Object.fromEntries(
    Object.entries(design.bands).map(([k, b]) => [
      k,
      { ...b, elements: b.elements.map((el) => ({ ...el, id: el.id ?? newId() })) },
    ]),
  ),
});

/**
 * The visual report designer: bands on a page, fields and tools dragged onto them, settings on both sides, a live preview made by the
 * server's own renderer, and PDF or Excel files built on the server from the saved design.
 */
export default function ReportDesigner() {
  const [h, setH] = useState(() => newHistory(blankDesign()));
  const design = h.present;
  const [meta, setMeta] = useState(EMPTY_META);
  const [savedSnap, setSavedSnap] = useState(null);
  const [selection, setSelection] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [datasets, setDatasets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [roleChoices, setRoleChoices] = useState(['teacher', 'accountant']);
  const [pageChoices, setPageChoices] = useState([]);
  const [list, setList] = useState(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(null); // the save dialog: { name, folderId, newFolder, description, roles }
  const [preview, setPreview] = useState(null); // { url } | { busy } | { error }
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const pickFor = useRef(null);
  const iframeRef = useRef(null);
  const centerRef = useRef(null);

  const geo = useMemo(() => pageGeometry(design), [design]);
  const columns = datasets.find((d) => d.key === design.dataset)?.columns ?? [];
  const snapshot = JSON.stringify({
    design,
    name: meta.name,
    folderId: meta.folderId,
    description: meta.description,
    roles: meta.roles,
    pages: meta.pages,
    board: meta.board,
  });
  const dirty = savedSnap !== snapshot;

  /* ---------- loading ---------- */

  const loadFolders = useCallback(
    () =>
      api('/report-designer/folders')
        .then(setFolders)
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    api('/report-designer/designs/fields')
      .then((d) => {
        setDatasets(d);
        // a new report starts on the first dataset, so the field list is not empty
        setH((prev) =>
          prev.present.dataset ? prev : newHistory({ ...prev.present, dataset: d[0]?.key ?? '' }),
        );
      })
      .catch((e) => setError(e.message));
    loadFolders();
    api('/report-designer/pages')
      .then(setPageChoices)
      .catch(() => {});
    api('/roles')
      .then((r) => setRoleChoices(['teacher', 'accountant', ...(r.roles ?? r).map((x) => x.name)]))
      .catch(() => {});
  }, [loadFolders]);
  useEffect(() => {
    if (savedSnap === null && datasets.length && design.dataset) setSavedSnap(snapshot);
  }, [datasets, design.dataset, savedSnap, snapshot]);

  useEffect(() => {
    const warn = (e) => {
      if (dirty && savedSnap !== null) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, savedSnap]);

  const fitWidth = useCallback(() => {
    const w = centerRef.current?.clientWidth;
    if (w) setZoom(Math.min(2, Math.max(0.5, Math.floor(((w - 40) / geo.contentWidth) * 20) / 20)));
  }, [geo.contentWidth]);
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && datasets.length) {
      fitted.current = true;
      fitWidth();
    }
  }, [datasets, fitWidth]);

  /* ---------- editing ---------- */

  const change = (next, key) => setH((prev) => commit(prev, next, key));
  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice((n) => (n === text ? '' : n)), 4000);
  };

  const onElementChange = (bandKey, id, patch, key) => change(updateElement(design, bandKey, id, patch), key);

  const place = (bandKey, el) => {
    change(addElement(design, bandKey, el));
    setSelection({ band: bandKey, id: el.id });
  };

  const onDrop = (bandKey, item, x, y) => {
    setError('');
    if (item.kind === 'field') {
      place(bandKey, elementForField(item.field, bandKey, x, y, geo.contentWidth));
      return;
    }
    const made = elementForTool(item.tool, bandKey, x, y, geo.contentWidth, columns);
    if (made.why) return setError(made.why);
    place(bandKey, made.el);
    if (made.needsFile) {
      pickFor.current = { band: bandKey, id: made.el.id };
      setTimeout(() => fileRef.current?.click(), 0);
    }
  };

  const onDelete = (bandKey, id) => {
    change(removeElement(design, bandKey, id));
    setSelection({ band: bandKey });
  };
  const onDuplicate = (bandKey, el) => {
    const copy = {
      ...el,
      id: newId(),
      x: Math.min(el.x + 8, Math.max(0, geo.contentWidth - el.width)),
      y: Math.min(el.y + 8, Math.max(0, design.bands[bandKey].height - (el.type === 'line' ? 0 : el.height))),
    };
    place(bandKey, copy);
  };
  const onNudge = (e, bandKey, el) => {
    const step = e.shiftKey ? 10 : 1;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[
      e.key
    ];
    if (move) {
      e.preventDefault();
      const band = design.bands[bandKey];
      const x = Math.min(Math.max(0, el.x + move[0]), Math.max(0, geo.contentWidth - el.width));
      const y = Math.min(
        Math.max(0, el.y + move[1]),
        Math.max(0, band.height - (el.type === 'line' ? 0 : el.height)),
      );
      onElementChange(bandKey, el.id, { x, y }, `nudge-${el.id}`);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(bandKey, el.id);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      onDuplicate(bandKey, el);
    }
  };

  const onBandHeight = (bandKey, height) => change(setBandHeight(design, bandKey, height), `band-${bandKey}`);
  const onRemoveBand = (bandKey) => {
    if (
      design.bands[bandKey].elements.length &&
      !window.confirm('This band has items in it. Remove the band and everything in it?')
    )
      return;
    change(toggleBand(design, bandKey, false));
    setSelection(null);
  };
  const onToggleBand = (bandKey, on) => {
    if (
      !on &&
      design.bands[bandKey]?.elements.length &&
      !window.confirm('This band has items in it. Remove the band and everything in it?')
    )
      return;
    change(toggleBand(design, bandKey, on));
    if (!on) setSelection(null);
  };

  const onGroupBy = (field) => {
    if (!field) {
      const n =
        (design.bands.groupHeader?.elements.length ?? 0) + (design.bands.groupFooter?.elements.length ?? 0);
      if (
        n &&
        !window.confirm(
          'Removing the grouping also removes the group header and footer and what is in them. Continue?',
        )
      )
        return;
      change(setGroupBy(design, null));
      setSelection(null);
      return;
    }
    let next = setGroupBy(design, field);
    // the first time, give the group a heading and room for its totals, as a designer would expect
    if (!next.bands.groupHeader) {
      next = toggleBand(next, 'groupHeader', true);
      next = addElement(next, 'groupHeader', {
        id: newId(),
        type: 'text',
        x: 0,
        y: 3,
        width: 300,
        height: 14,
        text: '{{group}}',
        bold: true,
        size: 10,
        color: '#1f3a6e',
      });
    }
    if (!next.bands.groupFooter) next = toggleBand(next, 'groupFooter', true);
    change(next);
  };

  const onDataset = (key) => {
    const cols = datasets.find((d) => d.key === key)?.columns ?? [];
    const { design: next, dropped } = changeDataset(design, key, cols);
    if (
      dropped &&
      !window.confirm(
        `${dropped} item(s) use fields this data does not have. They will be removed. Continue?`,
      )
    )
      return;
    change(next);
  };

  const onPickImage = (bandKey, id) => {
    pickFor.current = { band: bandKey, id };
    fileRef.current?.click();
  };
  const imageChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = pickFor.current;
    if (!file || !target) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) return setError('Choose a PNG or JPEG picture');
    if (file.size > MAX_IMAGE)
      return setError(
        `That picture is ${Math.round(file.size / 1024)} KB. Pictures can be up to ${MAX_IMAGE / 1024} KB`,
      );
    const reader = new FileReader();
    reader.onload = () => {
      setError('');
      change(updateElement(design, target.band, target.id, { data: reader.result, source: undefined }));
    };
    reader.readAsDataURL(file);
  };

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        startSave();
      } else if (mod && !typing(e) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setH((p) => (e.shiftKey ? redo(p) : undo(p)));
      } else if (mod && !typing(e) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setH((p) => redo(p));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---------- saving, opening ---------- */

  const body = (m, folderId) => ({
    name: m.name.trim(),
    folderId: folderId || null,
    description: m.description,
    roles: m.roles,
    pages: m.pages,
    board: m.board || null,
    config: { kind: 'design', design },
  });

  const persist = async (m) => {
    const res = m.id
      ? await api(`/report-designer/templates/${m.id}`, { method: 'PUT', body: body(m, m.folderId) })
      : await api('/report-designer/templates', { method: 'POST', body: body(m, m.folderId) });
    const next = { ...m, id: res.id };
    setMeta(next);
    setSavedSnap(
      JSON.stringify({
        design,
        name: next.name,
        folderId: next.folderId,
        description: next.description,
        roles: next.roles,
        pages: next.pages,
        board: next.board,
      }),
    );
    setList(null);
    loadFolders();
    return next;
  };

  const startSave = (asCopy = false) => {
    setError('');
    if (meta.id && meta.name && !asCopy) {
      setBusy('saving');
      persist(meta)
        .then(() => flash(`Saved “${meta.name}”.`))
        .catch((e) => setError(e.message))
        .finally(() => setBusy(''));
      return;
    }
    setSaving({
      name: asCopy ? `${meta.name} (copy)` : meta.name,
      folderId: meta.folderId,
      newFolder: '',
      description: meta.description,
      roles: meta.roles,
      pages: meta.pages,
      copy: asCopy,
    });
  };

  const confirmSave = async (e) => {
    e.preventDefault();
    setError('');
    setBusy('saving');
    try {
      let folderId = saving.folderId;
      if (saving.newFolder.trim())
        folderId = (
          await api('/report-designer/folders', { method: 'POST', body: { name: saving.newFolder.trim() } })
        ).id;
      const next = await persist({
        ...meta,
        id: saving.copy ? null : meta.id,
        name: saving.name,
        folderId,
        description: saving.description,
        roles: saving.roles,
        pages: saving.pages,
      });
      setSaving(null);
      flash(`Saved “${next.name}”.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const openList = async () => {
    setError('');
    setOpening(true);
    try {
      setList((await api('/report-designer/templates')).filter((t) => t.kind === 'design'));
    } catch (e) {
      setError(e.message);
    }
  };

  const loadTemplate = (t) => {
    if (dirty && !window.confirm('You have changes that are not saved. Open another report anyway?')) return;
    const loaded = withIds(t.config.design);
    const nextMeta = {
      id: t.id,
      name: t.name,
      folderId: t.folderId ?? '',
      description: t.description ?? '',
      roles: t.roles ?? [],
      pages: t.pages ?? [],
      board: t.board ?? '',
    };
    setH(newHistory(loaded));
    setMeta(nextMeta);
    setSavedSnap(
      JSON.stringify({
        design: loaded,
        name: nextMeta.name,
        folderId: nextMeta.folderId,
        description: nextMeta.description,
        roles: nextMeta.roles,
        pages: nextMeta.pages,
        board: nextMeta.board,
      }),
    );
    setSelection(null);
    setOpening(false);
  };

  const newReport = () => {
    if (dirty && !window.confirm('You have changes that are not saved. Start a new report anyway?')) return;
    const fresh = blankDesign(datasets[0]?.key ?? '');
    setH(newHistory(fresh));
    setMeta(EMPTY_META);
    setSavedSnap(
      JSON.stringify({
        design: fresh,
        name: '',
        folderId: '',
        description: '',
        roles: [],
        pages: [],
        board: '',
      }),
    );
    setSelection(null);
  };

  const copyTemplate = async (t) => {
    const name = window.prompt('Name for the copy', `${t.name} (copy)`);
    if (!name) return;
    try {
      await api('/report-designer/templates', {
        method: 'POST',
        body: {
          name,
          folderId: t.folderId,
          description: t.description,
          roles: t.roles,
          pages: t.pages,
          board: t.board,
          config: t.config,
        },
      });
      flash(`Copied as “${name}”.`);
      openList();
    } catch (e) {
      setError(e.message);
    }
  };
  const deleteTemplate = async (t) => {
    if (!window.confirm(`Delete the report “${t.name}”? Its history stays, but it cannot be run again.`))
      return;
    try {
      await api(`/report-designer/templates/${t.id}`, { method: 'DELETE' });
      if (meta.id === t.id) {
        setMeta({ ...meta, id: null });
        setSavedSnap(null);
      }
      openList();
    } catch (e) {
      setError(e.message);
    }
  };

  /* ---------- preview, files ---------- */

  const showPreview = async () => {
    setError('');
    setPreview({ busy: true });
    try {
      setPreview({ url: await previewDesign(design, meta.board) });
    } catch (e) {
      setPreview({ error: e.message });
    }
  };
  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const makeFile = async (format) => {
    setError('');
    if (!meta.id || !meta.name) return startSave();
    const tab = format === 'pdf' ? openTab() : null; // opened now, at the click, so the browser lets it show the PDF later
    try {
      setBusy('saving');
      if (dirty) await persist(meta);
      setBusy(`building ${format === 'pdf' ? 'the PDF' : 'the Excel file'}`);
      const run = await runReport(meta.id, format);
      await openRun(run, tab);
      flash(
        `${run.rows} row(s) · ${format === 'pdf' ? 'PDF opened in a new tab' : 'Excel file downloaded'}.`,
      );
    } catch (e) {
      tab?.close();
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="rd-shell">
      <div className="profile-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Report designer</h1>
          <p className="hint">
            Lay a report out on bands, drag fields onto it, and see it as the server will print it. Saved
            reports can be shared with roles and built as PDF or Excel.
          </p>
        </div>
      </div>

      <div className="rd-bar">
        <input
          className="rd-name"
          placeholder="Report name"
          value={meta.name}
          maxLength={120}
          onChange={(e) => setMeta({ ...meta, name: e.target.value })}
          aria-label="Report name"
        />
        <button type="button" className="ghost" onClick={newReport}>
          New
        </button>
        <button type="button" className="ghost" onClick={openList}>
          Open…
        </button>
        <button type="button" className="big-action" disabled={Boolean(busy)} onClick={() => startSave()}>
          {busy === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="ghost" onClick={() => startSave(true)}>
          Save a copy…
        </button>
        <span className="rd-sep" />
        <button
          type="button"
          className="ghost"
          disabled={h.past.length === 0}
          onClick={() => setH(undo)}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          className="ghost"
          disabled={h.future.length === 0}
          onClick={() => setH(redo)}
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
        <span className="rd-sep" />
        <button type="button" className="ghost" onClick={showPreview}>
          Preview
        </button>
        <button type="button" className="ghost" disabled={Boolean(busy)} onClick={() => makeFile('pdf')}>
          PDF
        </button>
        <button type="button" className="ghost" disabled={Boolean(busy)} onClick={() => makeFile('xlsx')}>
          Excel
        </button>
        <label className="rd-zoom">
          Zoom
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
          />
          <button type="button" className="ghost" onClick={fitWidth} title="Fit the page to the space">
            Fit
          </button>
        </label>
        <span className={`rd-status${dirty ? ' dirty' : ''}`}>
          {busy && busy !== 'saving'
            ? `Please wait, ${busy}…`
            : dirty
              ? 'Unsaved changes'
              : meta.id
                ? 'Saved'
                : ''}
        </span>
      </div>

      {notice && (
        <p className="success" style={{ margin: 0 }}>
          {notice}
        </p>
      )}
      {error && !saving && (
        <p className="error" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      <div className="rd-main">
        <Palette
          datasets={datasets}
          design={design}
          columns={columns}
          board={meta.board}
          setBoard={(board) => setMeta({ ...meta, board })}
          onDataset={onDataset}
          onChange={change}
          onGroupBy={onGroupBy}
          onToggleBand={onToggleBand}
        />
        <div className="rd-center" ref={centerRef}>
          <Canvas
            design={design}
            geo={geo}
            zoom={zoom}
            selection={selection}
            onSelect={setSelection}
            onElementChange={onElementChange}
            onDrop={onDrop}
            onBandHeight={onBandHeight}
            onNudge={onNudge}
          />
        </div>
        <Properties
          design={design}
          columns={columns}
          selection={selection}
          contentWidth={geo.contentWidth}
          onElement={onElementChange}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onBandHeight={onBandHeight}
          onRemoveBand={onRemoveBand}
          onPickImage={onPickImage}
        />
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={imageChosen} />

      {/* the live preview, made by the server's renderer from the first rows of the data */}
      {preview && (
        <div className="rd-preview" role="dialog" aria-modal="true" aria-label="Report preview">
          <div className="rd-preview-card">
            <header>
              <h2>Preview</h2>
              <button type="button" className="ghost" onClick={showPreview}>
                Refresh
              </button>
              <button
                type="button"
                className="ghost"
                disabled={!preview.url}
                onClick={() => iframeRef.current?.contentWindow?.print()}
              >
                Print
              </button>
              <button type="button" onClick={closePreview}>
                Close
              </button>
            </header>
            {preview.busy && (
              <p className="hint" style={{ padding: 20 }}>
                Building the preview…
              </p>
            )}
            {preview.error && (
              <p className="error" role="alert" style={{ padding: 20 }}>
                {preview.error}
              </p>
            )}
            {preview.url && <iframe ref={iframeRef} title="Report preview" src={preview.url} />}
            <div className="rd-note">
              The preview uses the first 100 rows. Save the report and use PDF or Excel for the full result.
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(saving)}
        title={saving?.copy ? 'Save a copy' : 'Save the report'}
        onClose={() => setSaving(null)}
      >
        {saving && (
          <form onSubmit={confirmSave} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label>
              <span>Report name *</span>
              <input
                value={saving.name}
                onChange={(e) => setSaving({ ...saving, name: e.target.value })}
                required
                maxLength={120}
              />
            </label>
            <label>
              <span>Folder</span>
              <select
                value={saving.folderId}
                onChange={(e) => setSaving({ ...saving, folderId: e.target.value })}
              >
                <option value="">Not in a folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>…or a new folder</span>
              <input
                value={saving.newFolder}
                onChange={(e) => setSaving({ ...saving, newFolder: e.target.value })}
                maxLength={80}
                placeholder="Leave empty to use the folder above"
              />
            </label>
            <label>
              <span>Description</span>
              <input
                value={saving.description}
                onChange={(e) => setSaving({ ...saving, description: e.target.value })}
                maxLength={255}
              />
            </label>
            <fieldset>
              <legend>Who else may run it</legend>
              <p className="hint">
                The administrator always can. The roles you tick can run and export it, not change it.
              </p>
              <span className="check-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
                {roleChoices.map((r) => (
                  <label key={r}>
                    <input
                      type="checkbox"
                      checked={saving.roles.includes(r)}
                      onChange={(e) =>
                        setSaving({
                          ...saving,
                          roles: e.target.checked
                            ? [...saving.roles, r]
                            : saving.roles.filter((x) => x !== r),
                        })
                      }
                    />{' '}
                    {r}
                  </label>
                ))}
              </span>
            </fieldset>
            <fieldset>
              <legend>Show on these pages</legend>
              <p className="hint">
                Each page lists its reports by itself, so ticking a page puts this report there with no change
                to the page. Print and Excel then follow that page’s Export right on the Role Rights page.
              </p>
              <span className="check-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
                {pageChoices.map((pg) => (
                  <label key={pg.key}>
                    <input
                      type="checkbox"
                      checked={(saving.pages ?? []).includes(pg.key)}
                      onChange={(e) =>
                        setSaving({
                          ...saving,
                          pages: e.target.checked
                            ? [...(saving.pages ?? []), pg.key]
                            : (saving.pages ?? []).filter((x) => x !== pg.key),
                        })
                      }
                    />{' '}
                    {pg.label}
                  </label>
                ))}
              </span>
            </fieldset>
            <div className="form-actions">
              <button type="submit" disabled={busy === 'saving'}>
                {busy === 'saving' ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="ghost" onClick={() => setSaving(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={opening} title="Open a report" onClose={() => setOpening(false)}>
        {!list && <p className="hint">Loading…</p>}
        {list && !list.length && <p className="hint">No designed reports yet. Build one and save it.</p>}
        {list &&
          [...folders.map((f) => [f.id, f.name]), [null, 'Not in a folder']].map(([fid, fname]) => {
            const inFolder = list.filter((t) => (t.folderId ?? null) === fid);
            if (!inFolder.length) return null;
            return (
              <div key={fname} className="rd-open-group">
                <h3>{fname}</h3>
                {inFolder.map((t) => (
                  <div key={t.id} className="rd-open-row">
                    <div className="grow">
                      <b>{t.name}</b>
                      <small>
                        {t.board ? `${t.board} only · ` : ''}
                        {t.roles.length ? `shared with ${t.roles.join(', ')}` : 'administrator only'}
                      </small>
                    </div>
                    <button type="button" onClick={() => loadTemplate(t)}>
                      Open
                    </button>
                    <button type="button" className="ghost" onClick={() => copyTemplate(t)}>
                      Duplicate
                    </button>
                    <button type="button" className="ghost danger" onClick={() => deleteTemplate(t)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
      </Modal>
    </div>
  );
}
