/** Ready-made reports on staff: directory, qualifications, joining dates. */
export const staffReports = {
  folder: 'Staff',
  pages: ['staff'], // the screen that lists these reports
  description: 'Staff lists, qualifications and joining dates',
  reports: [
    {
      name: 'Staff directory',
      description: 'All staff with designation, contact and employment type',
      config: {
        dataset: 'staff',
        columns: [
          'staffNo',
          'firstName',
          'lastName',
          'designation',
          'phone',
          'email',
          'employmentType',
          'status',
        ],
        sortBy: 'designation',
      },
    },
    {
      name: 'Staff qualifications',
      description: 'Highest qualification and years of experience',
      config: {
        dataset: 'staff',
        columns: ['staffNo', 'firstName', 'lastName', 'designation', 'qualification', 'experienceYears'],
        sortBy: 'designation',
      },
    },
    {
      name: 'Staff by joining date',
      description: 'Newest joiners first; set a date range to narrow it',
      config: {
        dataset: 'staff',
        columns: ['staffNo', 'firstName', 'lastName', 'designation', 'joinDate', 'employmentType'],
        sortBy: 'joinDate',
        sortDir: 'desc',
        dateColumn: 'joinDate',
      },
    },
  ],
};
