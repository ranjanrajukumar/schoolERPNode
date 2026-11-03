/** Ready-made reports on fees: dues and collections. Shared with the accountant. */
export const financeReports = {
  folder: 'Finance',
  pages: ['fees'], // the screen that lists these reports
  description: 'Dues and collections (shared with the accountant)',
  roles: ['accountant'],
  reports: [
    {
      name: 'Fee dues',
      description: 'Every fee with a balance left, earliest due first',
      config: {
        dataset: 'fees',
        columns: ['admissionNo', 'student', 'title', 'amount', 'paidAmount', 'balance', 'dueDate'],
        filters: [{ column: 'balance', op: 'greater', value: '0' }],
        sortBy: 'dueDate',
      },
    },
    {
      name: 'Fee collection',
      description: 'Payments received, newest first; set a date range for a day, week or month',
      config: {
        dataset: 'payments',
        columns: ['receiptNo', 'paidOn', 'admissionNo', 'student', 'title', 'amount', 'method'],
        sortBy: 'paidOn',
        sortDir: 'desc',
        dateColumn: 'paidOn',
      },
    },
  ],
};
