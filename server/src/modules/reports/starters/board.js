/** Board-specific designs: a report tied to one board sees only that board's classes. */
export const BOARD_FOLDER = {
  name: 'Board returns',
  description: 'Reports that see only one board’s classes',
};
export const BOARDS = ['CBSE', 'UP Board'];

/**
 * A class-by-class student register for one board, as a visual design. It is tied to the board, so it only ever lists that board's
 * classes, and its affiliation line prints only when the school's affiliation to the board is recorded as verified.
 */
export function studentRegisterDesign(board) {
  const w = 523;
  const head = { type: 'text', y: 6, height: 12, bold: true };
  return {
    version: 1,
    title: `Student register: ${board}`,
    dataset: 'students',
    groupBy: 'class',
    sort: [{ field: 'firstName', dir: 'asc' }],
    page: { size: 'A4', orientation: 'portrait', margins: [36, 36, 36, 36] },
    bands: {
      reportHeader: {
        height: 62,
        elements: [
          {
            type: 'text',
            x: 0,
            y: 4,
            width: w,
            height: 22,
            text: '{{board}} · Student register',
            bold: true,
            size: 15,
            color: '#1f3a6e',
          },
          {
            type: 'text',
            x: 0,
            y: 28,
            width: w,
            height: 12,
            text: '{{affiliation}}',
            size: 9,
            color: '#555555',
          },
          {
            type: 'text',
            x: 0,
            y: 42,
            width: w,
            height: 12,
            text: 'Printed {{printedOn}}',
            size: 8,
            color: '#888888',
          },
        ],
      },
      pageHeader: {
        height: 24,
        elements: [
          { ...head, x: 0, width: 70, text: 'Adm no' },
          { ...head, x: 75, width: 170, text: 'Student' },
          { ...head, x: 250, width: 50, text: 'Gender' },
          { ...head, x: 305, width: 80, text: 'Date of birth' },
          { ...head, x: 390, width: 133, text: 'Guardian phone' },
          { type: 'line', x: 0, y: 21, width: w, height: 0, color: '#1f3a6e' },
        ],
      },
      groupHeader: {
        height: 22,
        elements: [
          { type: 'box', x: 0, y: 2, width: w, height: 17, fill: '#f4f6fa', color: '#f4f6fa' },
          {
            type: 'text',
            x: 6,
            y: 4,
            width: 300,
            height: 12,
            text: 'Class {{group}}',
            bold: true,
            color: '#1f3a6e',
          },
        ],
      },
      detail: {
        height: 15,
        elements: [
          { type: 'field', field: 'admissionNo', x: 0, y: 2, width: 70, height: 12 },
          { type: 'field', field: 'firstName', x: 75, y: 2, width: 80, height: 12 },
          { type: 'field', field: 'lastName', x: 160, y: 2, width: 85, height: 12 },
          { type: 'field', field: 'gender', x: 250, y: 2, width: 50, height: 12 },
          { type: 'field', field: 'dob', x: 305, y: 2, width: 80, height: 12, format: 'date' },
          { type: 'field', field: 'guardianPhone', x: 390, y: 2, width: 133, height: 12 },
        ],
      },
      groupFooter: {
        height: 22,
        elements: [
          { type: 'line', x: 0, y: 1, width: w, height: 0, color: '#999999' },
          { type: 'text', x: 75, y: 6, width: 120, height: 12, text: 'Students in class', bold: true },
          {
            type: 'summary',
            func: 'count',
            field: 'admissionNo',
            scope: 'group',
            x: 250,
            y: 6,
            width: 50,
            height: 12,
            format: 'number',
            bold: true,
          },
        ],
      },
      reportFooter: {
        height: 26,
        elements: [
          { type: 'text', x: 75, y: 8, width: 120, height: 12, text: 'All students', bold: true, size: 10 },
          {
            type: 'summary',
            func: 'count',
            field: 'admissionNo',
            scope: 'report',
            x: 250,
            y: 8,
            width: 50,
            height: 12,
            format: 'number',
            bold: true,
            size: 10,
          },
        ],
      },
      pageFooter: {
        height: 22,
        elements: [
          { type: 'line', x: 0, y: 2, width: w, height: 0, color: '#cccccc' },
          {
            type: 'text',
            x: 0,
            y: 7,
            width: 300,
            height: 10,
            text: '{{board}} · Student register',
            size: 8,
            color: '#888888',
          },
          {
            type: 'pageNumber',
            x: 323,
            y: 7,
            width: 200,
            height: 10,
            text: 'Page {{page}} of {{pages}}',
            size: 8,
            align: 'right',
            color: '#888888',
          },
        ],
      },
    },
  };
}
