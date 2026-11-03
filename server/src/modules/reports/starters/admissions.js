/** Ready-made reports on admission applicants. */
export const admissionReports = {
  folder: 'Admissions',
  pages: ['admissions'], // the screen that lists these reports
  description: 'Applicants and their progress',
  reports: [
    {
      name: 'Applicants by status',
      description: 'Everyone who applied, grouped by where they are in the process',
      config: {
        dataset: 'admissions',
        columns: ['applicantName', 'class', 'status', 'source', 'guardianName', 'guardianPhone'],
        sortBy: 'status',
      },
    },
  ],
};
