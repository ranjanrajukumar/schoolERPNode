import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import ReportButton from './ReportButton.jsx';

/**
 * The reports attached to a screen, listed by themselves. Put one line in the screen:
 *
 *   <PageReports page="students" />
 *
 * and every report whose author ticked "Students" under "Show on these pages" (Reports > Report Designer > Save) appears as a button.
 * A new report needs no change to the screen. Each button follows the Export right of that screen's module on the Role Rights page,
 * and the same sharing as every report: a person who may not run or export a report simply does not see its button.
 *
 * The screens that can carry reports are listed in server/src/modules/reports/reportPages.js.
 */
export default function PageReports({ page, className = 'ghost' }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let live = true;
    api(`/report-designer/templates/for-page?page=${encodeURIComponent(page)}`)
      .then((r) => live && setReports(r))
      .catch(() => live && setReports([]));
    return () => {
      live = false;
    };
  }, [page]);

  return reports.map((r) => (
    <ReportButton key={r.id} report={r} label={`▤ ${r.name}`} className={className} />
  ));
}
