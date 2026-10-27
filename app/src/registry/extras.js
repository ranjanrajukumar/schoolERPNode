// Home tiles that are not pages of a module: quick links for teachers and the staff password page.
// Their labels, icons, order and visibility come from the menu in the database; these are the built-in defaults and the routes they open.
export const STAFF_QUICK = [
  { key: 'q.myclass', label: 'My Class', icon: 'people-outline', route: 'MyClass', roles: ['admin', 'teacher'] },
  { key: 'q.mark', label: 'Mark Attendance', icon: 'checkbox-outline', route: 'MarkAttendance', roles: ['admin', 'teacher'] },
  { key: 'q.marks', label: 'Enter Marks', icon: 'create-outline', route: 'Exams', roles: ['admin', 'teacher'] },
];

export const PASSWORD_TILE = { key: 'password', label: 'Change Password', icon: 'key-outline', route: 'ChangePassword' };
