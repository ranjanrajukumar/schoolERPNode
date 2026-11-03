/** Ready-made reports on students: lists, contact sheets, records to fix, recent admissions. */
export const studentReports = {
  folder: 'Students',
  pages: ['students'], // the screen that lists these reports
  description: 'Student lists and contact sheets',
  reports: [
    {
      name: 'Student directory',
      description: 'Every student with class, gender, guardian phone and status',
      pages: ['students', 'classes'],
      config: {
        dataset: 'students',
        columns: [
          'admissionNo',
          'rollNo',
          'firstName',
          'lastName',
          'class',
          'gender',
          'guardianPhone',
          'status',
        ],
        sortBy: 'class',
      },
    },
    {
      name: 'Parent contact list',
      description: 'Father, mother and guardian phone numbers by class',
      config: {
        dataset: 'students',
        columns: [
          'admissionNo',
          'firstName',
          'lastName',
          'class',
          'fatherName',
          'fatherPhone',
          'motherName',
          'motherPhone',
          'guardianPhone',
        ],
        sortBy: 'class',
      },
    },
    {
      name: 'Students with no guardian phone',
      description: 'Records to fix so messages and alerts reach someone',
      config: {
        dataset: 'students',
        columns: [
          'admissionNo',
          'firstName',
          'lastName',
          'class',
          'guardianName',
          'fatherPhone',
          'motherPhone',
        ],
        filters: [{ column: 'guardianPhone', op: 'empty', value: '' }],
        sortBy: 'class',
      },
    },
    {
      name: 'Admissions by date',
      description: 'Newest admissions first; set a date range to narrow it',
      config: {
        dataset: 'students',
        columns: ['admissionNo', 'firstName', 'lastName', 'class', 'admissionDate', 'previousSchool'],
        sortBy: 'admissionDate',
        sortDir: 'desc',
        dateColumn: 'admissionDate',
      },
    },
  ],
};
