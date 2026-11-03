import { parentPort, workerData } from 'node:worker_threads';
import { renderPdf, renderXlsx } from './engine.js';

/**
 * Renders one report off the main thread, so a large report never stops the server answering other people.
 * Receives { design, rows, format, options } and posts the finished file back as bytes.
 */
try {
  const { design, rows, format, options } = workerData;
  const file =
    format === 'xlsx' ? await renderXlsx(design, rows, options) : await renderPdf(design, rows, options);
  parentPort.postMessage({ ok: true, bytes: new Uint8Array(file) });
} catch (err) {
  parentPort.postMessage({ ok: false, error: String(err?.message ?? err).slice(0, 300) });
}
