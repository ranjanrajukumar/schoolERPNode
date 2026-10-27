import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import Login from '../modules/platform/Login.jsx';
import ChangePassword from '../modules/platform/ChangePassword.jsx';
import Dashboard from '../modules/platform/Dashboard.jsx';
import AuditLog from '../modules/platform/AuditLog.jsx';
import Parents from '../modules/portal/Parents.jsx';
import StudentAccounts from '../modules/portal/StudentAccounts.jsx';
import Portal from '../modules/portal/Portal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Vehicles from '../modules/transport/Vehicles.jsx';
import TransportStaff from '../modules/transport/TransportStaff.jsx';
import TransportRoutes from '../modules/transport/Routes.jsx';
import Stops from '../modules/transport/Stops.jsx';
import Maintenance from '../modules/transport/Maintenance.jsx';
import Assignments from '../modules/transport/Assignments.jsx';
import TransportAttendance from '../modules/transport/TransportAttendance.jsx';
import TransportFees from '../modules/transport/TransportFees.jsx';
import TransportReports from '../modules/transport/TransportReports.jsx';
import Hostels from '../modules/hostel/Hostels.jsx';
import Rooms from '../modules/hostel/Rooms.jsx';
import RoomAllocation from '../modules/hostel/RoomAllocation.jsx';
import HostelAttendance from '../modules/hostel/HostelAttendance.jsx';
import MessMenu from '../modules/hostel/MessMenu.jsx';
import HostelFees from '../modules/hostel/HostelFees.jsx';
import VisitorLog from '../modules/hostel/VisitorLog.jsx';
import HostelReports from '../modules/hostel/HostelReports.jsx';
import Documents from '../modules/documents/Documents.jsx';
import CertificatePage from '../modules/documents/CertificatePage.jsx';
import IdCards from '../modules/documents/IdCards.jsx';
import Departments from '../modules/hr/Departments.jsx';
import Designations from '../modules/hr/Designations.jsx';
import StaffAttendance from '../modules/hr/StaffAttendance.jsx';
import LeaveApplications from '../modules/hr/LeaveApplications.jsx';
import HrReports from '../modules/hr/HrReports.jsx';
import StudentProfile from '../modules/students/StudentProfile.jsx';
import HealthRecords from '../modules/students/HealthRecords.jsx';
import Behavior from '../modules/students/Behavior.jsx';
import Alumni from '../modules/students/Alumni.jsx';
import AcademicCalendar from '../modules/academics/AcademicCalendar.jsx';
import Holidays from '../modules/academics/Holidays.jsx';
import OnlineClasses from '../modules/academics/OnlineClasses.jsx';
import Homework from '../modules/academics/Homework.jsx';
import HomeworkTracker from '../modules/academics/HomeworkTracker.jsx';
import Syllabus from '../modules/academics/Syllabus.jsx';
import StudyMaterials from '../modules/academics/StudyMaterials.jsx';
import TeacherTimetable from '../modules/academics/TeacherTimetable.jsx';
import StudentLeaves from '../modules/attendance/StudentLeaves.jsx';
import AttendanceCorrections from '../modules/attendance/AttendanceCorrections.jsx';
import PeriodAttendance from '../modules/attendance/PeriodAttendance.jsx';
import AbsenceAlerts from '../modules/attendance/AbsenceAlerts.jsx';
import Settings from '../modules/settings/Settings.jsx';
import Planned from '../modules/platform/Planned.jsx';
import Users from '../modules/platform/Users.jsx';
import Applications from '../modules/admissions/Applications.jsx';
import ApplicationForm from '../modules/admissions/ApplicationForm.jsx';
import Admissions from '../modules/admissions/Admissions.jsx';
import Students from '../modules/academics/Students.jsx';
import Academics from '../modules/academics/Academics.jsx';
import ClassMapPage from '../modules/academics/ClassMapPage.jsx';
import Registrations from '../modules/academics/Registrations.jsx';
import Classes from '../modules/academics/Classes.jsx';
import Subjects from '../modules/academics/Subjects.jsx';
import ClassSubjects from '../modules/academics/ClassSubjects.jsx';
import Timetable from '../modules/academics/Timetable.jsx';
import Attendance from '../modules/academics/Attendance.jsx';
import MyClass from '../modules/academics/MyClass.jsx';
import Promotion from '../modules/academics/Promotion.jsx';
import AcademicYears from '../modules/academics/AcademicYears.jsx';
import Exams from '../modules/exams/Exams.jsx';
import MarkEntry from '../modules/exams/MarkEntry.jsx';
import GradeSetup from '../modules/exams/GradeSetup.jsx';
import ExamGroups from '../modules/exams/ExamGroups.jsx';
import MeritList from '../modules/exams/MeritList.jsx';
import Revaluation from '../modules/exams/Revaluation.jsx';
import Results from '../modules/exams/Results.jsx';
import ReportCard from '../modules/exams/ReportCard.jsx';
import ProgressCards from '../modules/exams/ProgressCards.jsx';
import HolisticProgressCard from '../modules/exams/HolisticProgressCard.jsx';
import BiometricAttendance from '../modules/attendance/BiometricAttendance.jsx';
import BusTracking from '../modules/transport/BusTracking.jsx';
import LeaveTypes from '../modules/settings/LeaveTypes.jsx';
import LeaveBalances from '../modules/attendance/LeaveBalances.jsx';
import Feedback from '../modules/communication/Feedback.jsx';
import MonthlyAttendance from '../modules/attendance/MonthlyAttendance.jsx';
import Fees from '../modules/finance/Fees.jsx';
import FeeStructures from '../modules/finance/FeeStructures.jsx';
import Expenses from '../modules/finance/Expenses.jsx';
import Income from '../modules/finance/Income.jsx';
import FeeTypes from '../modules/finance/FeeTypes.jsx';
import PaymentHistory from '../modules/finance/PaymentHistory.jsx';
import Staff from '../modules/hr/Staff.jsx';
import Payroll from '../modules/hr/Payroll.jsx';
import Library from '../modules/library/Library.jsx';
import SendMessage from '../modules/communication/SendMessage.jsx';
import MessageTemplates from '../modules/communication/MessageTemplates.jsx';
import MessageHistory from '../modules/communication/MessageHistory.jsx';
import FeeReminders from '../modules/finance/FeeReminders.jsx';
import ItemCategories from '../modules/inventory/ItemCategories.jsx';
import Items from '../modules/inventory/Items.jsx';
import Suppliers from '../modules/inventory/Suppliers.jsx';
import StockMovements from '../modules/inventory/StockMovements.jsx';
import PurchaseOrders from '../modules/inventory/PurchaseOrders.jsx';
import InventoryRequests from '../modules/inventory/InventoryRequests.jsx';
import Assets from '../modules/inventory/Assets.jsx';
import AssetMaintenance from '../modules/inventory/AssetMaintenance.jsx';
import ClinicVisits from '../modules/safety/ClinicVisits.jsx';
import Incidents from '../modules/safety/Incidents.jsx';
import SafetyInspections from '../modules/safety/SafetyInspections.jsx';
import HealthReports from '../modules/safety/HealthReports.jsx';
import Activities from '../modules/activities/Activities.jsx';
import ActivityDetail from '../modules/activities/ActivityDetail.jsx';
import ActivityReports from '../modules/activities/ActivityReports.jsx';
import BookCategories from '../modules/library/BookCategories.jsx';
import Reservations from '../modules/library/Reservations.jsx';
import LibraryMembers from '../modules/library/LibraryMembers.jsx';
import LibraryReports from '../modules/library/LibraryReports.jsx';
import ApplyOnline from '../modules/admissions/ApplyOnline.jsx';
import EntranceTests from '../modules/admissions/EntranceTests.jsx';
import InterviewSchedule from '../modules/admissions/InterviewSchedule.jsx';
import AdmissionOffers from '../modules/admissions/AdmissionOffers.jsx';
import AdmissionReports from '../modules/admissions/AdmissionReports.jsx';
import FeeGroups from '../modules/finance/FeeGroups.jsx';
import Recruitment from '../modules/hr/Recruitment.jsx';
import PerformanceReviews from '../modules/hr/PerformanceReviews.jsx';
import StaffDocuments from '../modules/hr/StaffDocuments.jsx';
import RoomSchedule from '../modules/academics/RoomSchedule.jsx';
import Substitutions from '../modules/academics/Substitutions.jsx';
import TimetableReports from '../modules/academics/TimetableReports.jsx';
import DocumentTemplates from '../modules/documents/DocumentTemplates.jsx';
import ParentLoginActivity from '../modules/portal/ParentLoginActivity.jsx';
import ParentRequests from '../modules/portal/ParentRequests.jsx';
import LoginHistory from '../modules/platform/LoginHistory.jsx';
import Roles from '../modules/platform/Roles.jsx';
import Permissions from '../modules/platform/Permissions.jsx';
import UserGroups from '../modules/platform/UserGroups.jsx';
import Branches from '../modules/settings/Branches.jsx';
import Integrations from '../modules/settings/Integrations.jsx';
import DataTools from '../modules/settings/DataTools.jsx';
import BackupRestore from '../modules/settings/BackupRestore.jsx';
import HelpCenter from '../modules/help/HelpCenter.jsx';
import UserGuide from '../modules/help/UserGuide.jsx';
import SupportRequests from '../modules/help/SupportRequests.jsx';
import SystemUpdates from '../modules/help/SystemUpdates.jsx';
import About from '../modules/help/About.jsx';
import CustomReports from '../modules/reports/CustomReports.jsx';
import PushNotifications from '../modules/communication/PushNotifications.jsx';
import StudentForm from '../modules/academics/StudentForm.jsx';
import StaffForm from '../modules/hr/StaffForm.jsx';
import AdmissionForm from '../modules/admissions/AdmissionForm.jsx';
import ParentForm from '../modules/portal/ParentForm.jsx';
import MasterData from '../modules/settings/MasterData.jsx';
import SchoolProfile from '../modules/settings/SchoolProfile.jsx';
import PublicLinks from '../modules/settings/PublicLinks.jsx';
import IdCardDesign from '../modules/settings/IdCardDesign.jsx';
import SetupGuide from '../modules/help/SetupGuide.jsx';
import ProcessMap from '../modules/help/ProcessMap.jsx';
import ClassMap from '../modules/help/ClassMap.jsx';
import StockReports from '../modules/inventory/StockReports.jsx';
import Notices from '../modules/communication/Notices.jsx';
import Reports from '../modules/reports/Reports.jsx';

/** Parents and students land on their portal; everyone else on the staff dashboard. */
function Home() {
  const { user } = useAuth();
  return ['parent', 'student'].includes(user?.role) ? <Navigate to="/portal" replace /> : <Dashboard />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/apply" element={<ApplyOnline />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="portal" element={<Portal />} />
          <Route path="parents" element={<Parents />} />
          <Route path="parents/new" element={<ParentForm />} />
          <Route path="parents/:id/edit" element={<ParentForm />} />
          <Route path="student-accounts" element={<StudentAccounts />} />
          <Route path="admissions" element={<Admissions />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/new" element={<ApplicationForm />} />
          <Route path="applications/:id" element={<ApplicationForm />} />
          <Route path="admissions/new" element={<AdmissionForm />} />
          <Route path="admissions/:id/edit" element={<AdmissionForm />} />
          <Route path="students" element={<Students />} />
          <Route path="registrations" element={<Registrations />} />
          <Route path="students/new" element={<StudentForm />} />
          <Route path="students/:id/edit" element={<StudentForm />} />
          <Route path="academics" element={<Academics />} />
          <Route path="class-profile" element={<ClassMapPage />} />
          <Route path="classes" element={<Classes />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="class-subjects" element={<ClassSubjects />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="my-class" element={<MyClass />} />
          <Route path="exams" element={<Exams />} />
          <Route path="settings" element={<Settings />} />
          <Route path="grade-setup" element={<GradeSetup />} />
          <Route path="exam-groups" element={<ExamGroups />} />
          <Route path="merit-list" element={<MeritList />} />
          <Route path="revaluation" element={<Revaluation />} />
          <Route path="exams/:examId/marks" element={<MarkEntry />} />
          <Route path="exams/:examId/results" element={<Results />} />
          <Route path="exams/:examId/report-card/:studentId" element={<ReportCard />} />
          <Route path="progress-cards" element={<ProgressCards />} />
          <Route path="progress-cards/:groupId/:studentId" element={<HolisticProgressCard />} />
          <Route path="biometric-attendance" element={<BiometricAttendance />} />
          <Route path="bus-tracking" element={<BusTracking />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="leave-types" element={<LeaveTypes />} />
          <Route path="student-leave-balance" element={<LeaveBalances kind="student" />} />
          <Route path="staff-leave-balance" element={<LeaveBalances kind="staff" />} />
          <Route path="monthly-attendance" element={<MonthlyAttendance kind="student" />} />
          <Route path="monthly-staff-attendance" element={<MonthlyAttendance kind="staff" />} />
          <Route path="promotion" element={<Promotion />} />
          <Route path="academic-years" element={<AcademicYears />} />
          <Route path="fee-structures" element={<FeeStructures />} />
          <Route path="fees" element={<Fees />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<Income />} />
          <Route path="fee-types" element={<FeeTypes />} />
          <Route path="payment-history" element={<PaymentHistory />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff/new" element={<StaffForm />} />
          <Route path="staff/:id/edit" element={<StaffForm />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="library" element={<Library />} />
          <Route path="notices" element={<Notices />} />
          <Route path="inventory-categories" element={<ItemCategories />} />
          <Route path="inventory-items" element={<Items />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="stock-in" element={<StockMovements type="in" />} />
          <Route path="stock-out" element={<StockMovements type="out" />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="assets" element={<Assets />} />
          <Route path="asset-maintenance" element={<AssetMaintenance />} />
          <Route path="clinic-visits" element={<ClinicVisits />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="safety-inspections" element={<SafetyInspections />} />
          <Route path="health-reports" element={<HealthReports />} />
          <Route path="activities" element={<Activities />} />
          <Route path="activities/:id" element={<ActivityDetail />} />
          <Route path="activity-reports" element={<ActivityReports />} />
          <Route path="library-categories" element={<BookCategories />} />
          <Route path="library-reservations" element={<Reservations />} />
          <Route path="library-members" element={<LibraryMembers />} />
          <Route path="library-reports" element={<LibraryReports />} />
          <Route path="entrance-tests" element={<EntranceTests />} />
          <Route path="interview-schedule" element={<InterviewSchedule />} />
          <Route path="admission-offers" element={<AdmissionOffers />} />
          <Route path="admission-reports" element={<AdmissionReports />} />
          <Route path="fee-groups" element={<FeeGroups />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="performance-reviews" element={<PerformanceReviews />} />
          <Route path="staff-documents" element={<StaffDocuments />} />
          <Route path="room-schedule" element={<RoomSchedule />} />
          <Route path="substitutions" element={<Substitutions />} />
          <Route path="timetable-reports" element={<TimetableReports />} />
          <Route path="document-templates" element={<DocumentTemplates />} />
          <Route path="parent-login-activity" element={<ParentLoginActivity />} />
          <Route path="parent-requests" element={<ParentRequests />} />
          <Route path="login-history" element={<LoginHistory />} />
          <Route path="roles" element={<Roles />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="user-groups" element={<UserGroups />} />
          <Route path="branches" element={<Branches />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="data-tools" element={<DataTools />} />
          <Route path="backup-restore" element={<BackupRestore />} />
          <Route path="help" element={<HelpCenter />} />
          <Route path="user-guide" element={<UserGuide />} />
          <Route path="support" element={<SupportRequests />} />
          <Route path="system-updates" element={<SystemUpdates />} />
          <Route path="about" element={<About />} />
          <Route path="custom-reports" element={<CustomReports />} />
          <Route path="push-notifications" element={<PushNotifications />} />
          <Route path="master-data" element={<MasterData />} />
          <Route path="school-profile" element={<SchoolProfile />} />
          <Route path="public-links" element={<PublicLinks />} />
          <Route path="id-card-design" element={<IdCardDesign />} />
          <Route path="setup" element={<SetupGuide />} />
          <Route path="process-map" element={<ProcessMap />} />
          <Route path="class-map" element={<ClassMap />} />
          <Route path="stock-reports" element={<StockReports />} />
          <Route path="inventory-requests" element={<InventoryRequests />} />
          <Route path="send-message" element={<SendMessage />} />
          <Route path="message-templates" element={<MessageTemplates />} />
          <Route path="message-history" element={<MessageHistory />} />
          <Route path="fee-reminders" element={<FeeReminders />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="students/:id/profile" element={<StudentProfile />} />
          <Route path="student-health" element={<HealthRecords />} />
          <Route path="behavior" element={<Behavior />} />
          <Route path="alumni" element={<Alumni />} />
          <Route path="student-leaves" element={<StudentLeaves />} />
          <Route path="attendance-corrections" element={<AttendanceCorrections />} />
          <Route path="period-attendance" element={<PeriodAttendance />} />
          <Route path="absence-alerts" element={<AbsenceAlerts />} />
          <Route path="calendar" element={<AcademicCalendar />} />
          <Route path="holidays" element={<Holidays />} />
          <Route path="online-classes" element={<OnlineClasses />} />
          <Route path="homework" element={<Homework />} />
          <Route path="homework/:id" element={<HomeworkTracker />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="study-materials" element={<StudyMaterials />} />
          <Route path="teacher-timetable" element={<TeacherTimetable />} />
          <Route path="departments" element={<Departments />} />
          <Route path="designations" element={<Designations />} />
          <Route path="staff-attendance" element={<StaffAttendance />} />
          <Route path="leave-applications" element={<LeaveApplications />} />
          <Route path="hr-reports" element={<HrReports />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/:id/print" element={<CertificatePage />} />
          <Route path="portal-print/:studentId/:id" element={<CertificatePage />} />
          <Route path="id-cards" element={<IdCards />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="transport-staff" element={<TransportStaff />} />
          <Route path="transport-routes" element={<TransportRoutes />} />
          <Route path="transport-stops" element={<Stops />} />
          <Route path="transport-maintenance" element={<Maintenance />} />
          <Route path="transport-assignments" element={<Assignments />} />
          <Route path="transport-attendance" element={<TransportAttendance />} />
          <Route path="transport-fees" element={<TransportFees />} />
          <Route path="transport-reports" element={<TransportReports />} />
          <Route path="hostels" element={<Hostels />} />
          <Route path="hostel-rooms" element={<Rooms />} />
          <Route path="hostel-allocation" element={<RoomAllocation />} />
          <Route path="hostel-attendance" element={<HostelAttendance />} />
          <Route path="hostel-mess" element={<MessMenu />} />
          <Route path="hostel-fees" element={<HostelFees />} />
          <Route path="hostel-visitors" element={<VisitorLog />} />
          <Route path="hostel-reports" element={<HostelReports />} />
          <Route path="audit"element={<AuditLog />} />
          <Route path="planned/:moduleSlug/:itemSlug" element={<Planned />} />
        </Route>
      </Route>
    </Routes>
  );
}
