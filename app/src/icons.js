// Outline icons (Ionicons) for the home tiles, by module key and by page key.
export const MODULE_ICON = {
  admissions: 'document-text-outline', students: 'school-outline', academics: 'book-outline', attendance: 'checkbox-outline', exams: 'create-outline',
  fees: 'wallet-outline', transport: 'bus-outline', hostel: 'bed-outline', library: 'library-outline', inventory: 'cube-outline', hr: 'people-outline',
  safety: 'medkit-outline', activities: 'ribbon-outline', documents: 'document-attach-outline', communication: 'chatbubbles-outline', portal: 'people-circle-outline',
  academic: 'book-outline', exam: 'create-outline', admin: 'document-attach-outline', other: 'apps-outline',
};

export const SCREEN_ICON = {
  homework: 'create-outline', materials: 'folder-outline', online: 'videocam-outline', timetable: 'time-outline', revaluations: 'clipboard-outline',
  notices: 'megaphone-outline', calendar: 'calendar-outline', activities: 'ribbon-outline', messages: 'chatbubbles-outline', library: 'library-outline',
  transport: 'bus-outline', leave: 'mail-outline', balance: 'bar-chart-outline', documents: 'document-attach-outline', feedback: 'heart-outline',
};

// page-specific icons, by "module.page"; pages not listed here get an icon for their kind (list, summary, custom)
Object.assign(SCREEN_ICON, {
  'admissions.enquiries': 'help-circle-outline', 'admissions.applications': 'document-text-outline', 'admissions.offers': 'checkmark-circle-outline', 'admissions.summary': 'stats-chart-outline',
  'students.students': 'school-outline', 'students.health': 'medical-outline', 'students.alumni': 'ribbon-outline', 'students.accounts': 'key-outline',
  'academics.classes': 'layers-outline', 'academics.subjects': 'book-outline', 'academics.years': 'calendar-outline', 'academics.homework': 'create-outline', 'academics.materials': 'folder-outline', 'academics.online': 'videocam-outline', 'academics.calendar': 'calendar-outline',
  'attendance.mark': 'checkbox-outline', 'attendance.myclass': 'people-outline', 'attendance.leaves': 'mail-open-outline',
  'exams.marks': 'create-outline', 'exams.exams': 'document-text-outline', 'exams.reval': 'clipboard-outline', 'exams.grading': 'trending-up-outline',
  'fees.fees': 'wallet-outline', 'fees.payments': 'receipt-outline', 'fees.structure': 'layers-outline', 'fees.groups': 'pricetag-outline', 'fees.defaulters': 'alert-circle-outline', 'fees.finance': 'cash-outline', 'fees.collection': 'stats-chart-outline',
  'transport.vehicles': 'bus-outline', 'transport.routes': 'map-outline', 'transport.stops': 'location-outline', 'transport.assignments': 'people-outline', 'transport.staff': 'person-outline', 'transport.tracking': 'navigate-outline',
  'hostel.hostels': 'business-outline', 'hostel.rooms': 'bed-outline', 'hostel.allocations': 'people-outline', 'hostel.visitors': 'walk-outline', 'hostel.meals': 'restaurant-outline',
  'library.books': 'book-outline', 'library.issues': 'swap-horizontal-outline', 'library.members': 'id-card-outline', 'library.reservations': 'bookmark-outline',
  'inventory.requests': 'paper-plane-outline', 'inventory.categories': 'pricetags-outline', 'inventory.items': 'cube-outline', 'inventory.orders': 'cart-outline', 'inventory.movements': 'swap-horizontal-outline', 'inventory.suppliers': 'storefront-outline', 'inventory.assets': 'laptop-outline', 'inventory.assetSummary': 'stats-chart-outline', 'inventory.maintenance': 'construct-outline',
  'hr.staff': 'people-outline', 'hr.leaves': 'mail-open-outline', 'hr.payslips': 'cash-outline', 'hr.salaries': 'wallet-outline', 'hr.openings': 'briefcase-outline',
  'safety.incidents': 'alert-circle-outline', 'activities.activities': 'ribbon-outline',
  'documents.requests': 'document-attach-outline',
  'communication.notices': 'megaphone-outline', 'communication.history': 'chatbubbles-outline', 'communication.feedback': 'heart-outline',
  'hostel.details': 'bed-outline', 'hostel.meals': 'restaurant-outline', 'hostel.attendance': 'moon-outline', 'hostel.visitors': 'walk-outline',
  'academic.attendance': 'checkbox-outline', 'exam.results': 'document-text-outline', 'other.password': 'key-outline',
  'portal.parents': 'people-circle-outline', 'portal.users': 'person-outline', 'portal.logins': 'shield-checkmark-outline',
});
