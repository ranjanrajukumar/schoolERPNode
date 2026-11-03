# Reports on pages

Every screen can list its own reports. A new report needs no code change.

## Add a report to a page
1. Reports > Report Designer, design the report.
2. Save, then tick the pages under "Show on these pages".
3. The report is now a button on those screens, for everyone it is shared with.

## Print and export rights
Print, PDF, Excel and CSV on a page follow the **Export** switch of that page's module on the Role Rights page.
A role without Export does not see the buttons, and the server refuses the request too.

## Make a new screen carry reports
1. Add the screen to `server/src/modules/reports/reportPages.js` (`key`, `label`, `module`).
2. Put one line in the screen header: `<PageReports page="key" />` (from `client/src/modules/reports/PageReports.jsx`).

Screens wired now: students, fees, attendance, classes, exams, admissions, staff, library.
Listed but not yet wired: inventory, transport, hostel, reports (add the line as above).
