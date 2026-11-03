/** Ready-made reports on library books and inventory stock. */
export const libraryReports = {
  folder: 'Library and stock',
  pages: ['library'], // the screen that lists these reports
  description: 'Books and inventory',
  reports: [
    {
      name: 'Library catalogue',
      description: 'Every book with copies and how many are on the shelf',
      config: {
        dataset: 'books',
        columns: ['title', 'author', 'isbn', 'copies', 'available'],
        sortBy: 'title',
      },
    },
    {
      name: 'Books with no copy on the shelf',
      description: 'Titles where every copy is out',
      config: {
        dataset: 'books',
        columns: ['title', 'author', 'copies', 'available'],
        filters: [{ column: 'available', op: 'equals', value: '0' }],
        sortBy: 'title',
      },
    },
    {
      name: 'Inventory stock, lowest first',
      pages: ['inventory'],
      description: 'Compare quantity with the reorder level to see what to buy',
      config: {
        dataset: 'inventory',
        columns: ['name', 'unit', 'quantity', 'reorderLevel'],
        sortBy: 'quantity',
      },
    },
  ],
};
