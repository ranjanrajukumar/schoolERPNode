import { sequelize } from '../config/database.js';
import { installAudit } from './auditSoftDelete.js';
import defineRecordExtra from './recordExtra.model.js';
import defineUser from './user.model.js';
import defineSchoolClass from './schoolClass.model.js';
import defineStudent from './student.model.js';
import defineAttendance from './attendance.model.js';
import defineFee from './fee.model.js';
import defineAcademicYear from './academicYear.model.js';
import defineSubject from './subject.model.js';
import defineStaff from './staff.model.js';
import defineClassSubject from './classSubject.model.js';
import defineAdmission from './admission.model.js';
import defineFeeStructure from './feeStructure.model.js';
import definePayment from './payment.model.js';
import defineSetting from './setting.model.js';
import defineActivity from './activity.model.js';
import defineActivityParticipant from './activityParticipant.model.js';
import defineExam from './exam.model.js';
import defineGradeBand from './gradeBand.model.js';
import defineGradingSetting from './gradingSetting.model.js';
import defineExamGroup from './examGroup.model.js';
import defineRevaluationRequest from './revaluationRequest.model.js';
import defineMark from './mark.model.js';
import defineTimetableSlot from './timetableSlot.model.js';
import defineNotice from './notice.model.js';
import defineBook from './book.model.js';
import defineBookIssue from './bookIssue.model.js';
import defineLibraryCategory from './libraryCategory.model.js';
import defineBookReservation from './bookReservation.model.js';
import defineStaffSalary from './staffSalary.model.js';
import definePayslip from './payslip.model.js';
import defineAppMenuItem from './appMenuItem.model.js';
import defineAuditLog from './auditLog.model.js';
import defineFeeAdjustment from './feeAdjustment.model.js';
import defineRefund from './refund.model.js';
import defineExpense from './expense.model.js';
import defineIncome from './income.model.js';
import defineFeeType from './feeType.model.js';
import defineParent from './parent.model.js';
import defineParentStudent from './parentStudent.model.js';
import defineStudentLeave from './studentLeave.model.js';
import defineAttendanceCorrection from './attendanceCorrection.model.js';
import definePeriodAttendance from './periodAttendance.model.js';
import defineAbsenceAlert from './absenceAlert.model.js';
import defineCalendarEvent from './calendarEvent.model.js';
import defineHomework from './homework.model.js';
import defineHomeworkSubmission from './homeworkSubmission.model.js';
import defineOnlineClass from './onlineClass.model.js';
import defineSyllabusTopic from './syllabusTopic.model.js';
import defineStudyMaterial from './studyMaterial.model.js';
import defineLmsCourse from './lmsCourse.model.js';
import defineLmsTag from './lmsTag.model.js';
import defineLmsModule from './lmsModule.model.js';
import defineLmsLesson from './lmsLesson.model.js';
import defineLmsLessonPart from './lmsLessonPart.model.js';
import defineLmsMaterial from './lmsMaterial.model.js';
import defineLmsProgress from './lmsProgress.model.js';
import defineLmsAssignment from './lmsAssignment.model.js';
import defineLmsSubmission from './lmsSubmission.model.js';
import defineLmsQuiz from './lmsQuiz.model.js';
import defineLmsQuizAttempt from './lmsQuizAttempt.model.js';
import defineLmsAnnouncement from './lmsAnnouncement.model.js';
import defineLmsEnrollment from './lmsEnrollment.model.js';
import defineStudentHealth from './studentHealth.model.js';
import defineBehaviorRecord from './behaviorRecord.model.js';
import defineDepartment from './department.model.js';
import defineDesignation from './designation.model.js';
import defineStaffAttendance from './staffAttendance.model.js';
import defineLeaveRequest from './leaveRequest.model.js';
import defineDocumentRequest from './documentRequest.model.js';
import defineVehicle from './vehicle.model.js';
import defineTransportStaff from './transportStaff.model.js';
import defineTransportRoute from './transportRoute.model.js';
import defineTransportStop from './transportStop.model.js';
import defineStudentTransport from './studentTransport.model.js';
import defineVehicleMaintenance from './vehicleMaintenance.model.js';
import defineTransportAttendance from './transportAttendance.model.js';
import defineHostel from './hostel.model.js';
import defineHostelRoom from './hostelRoom.model.js';
import defineHostelAllocation from './hostelAllocation.model.js';
import defineHostelAttendance from './hostelAttendance.model.js';
import defineFeedback from './feedback.model.js';
import defineFeedbackLog from './feedbackLog.model.js';
import defineLeaveType from './leaveType.model.js';
import defineBiometricDevice from './biometricDevice.model.js';
import defineBiometricPunch from './biometricPunch.model.js';
import defineCoScholasticArea from './coScholasticArea.model.js';
import defineCoScholasticGrade from './coScholasticGrade.model.js';
import defineVehicleTracker from './vehicleTracker.model.js';
import defineVehicleLocation from './vehicleLocation.model.js';
import defineHostelMeal from './hostelMeal.model.js';
import defineHostelVisitor from './hostelVisitor.model.js';
import defineStudentFile from './studentFile.model.js';
import definePhoto from './photo.model.js';
import defineApplicationDocument from './applicationDocument.model.js';
import defineStudentSubject from './studentSubject.model.js';
import defineStudentAccount from './studentAccount.model.js';
import defineMessage from './message.model.js';
import defineMessageTemplate from './messageTemplate.model.js';
import defineInventoryCategory from './inventoryCategory.model.js';
import defineInventoryItem from './inventoryItem.model.js';
import defineSupplier from './supplier.model.js';
import defineStockMovement from './stockMovement.model.js';
import defineInventoryRequest from './inventoryRequest.model.js';
import defineClinicVisit from './clinicVisit.model.js';
import defineIncident from './incident.model.js';
import defineSafetyInspection from './safetyInspection.model.js';
import defineFeeGroup from './feeGroup.model.js';
import defineFeeGroupItem from './feeGroupItem.model.js';
import defineStaffFile from './staffFile.model.js';
import defineJobOpening from './jobOpening.model.js';
import defineJobApplicant from './jobApplicant.model.js';
import definePerformanceReview from './performanceReview.model.js';
import defineRoom from './room.model.js';
import defineRoomBooking from './roomBooking.model.js';
import defineSubstitution from './substitution.model.js';
import defineLoginEvent from './loginEvent.model.js';
import defineDocumentTemplate from './documentTemplate.model.js';
import defineRole from './role.model.js';
import defineUserGroup from './userGroup.model.js';
import defineUserGroupMember from './userGroupMember.model.js';
import defineBranch from './branch.model.js';
import defineSupportTicket from './supportTicket.model.js';
import definePushSubscription from './pushSubscription.model.js';
import defineLibraryMembership from './libraryMembership.model.js';
import defineMasterItem from './masterItem.model.js';
import defineAsset from './asset.model.js';
import defineAssetMaintenance from './assetMaintenance.model.js';
import definePurchaseOrder from './purchaseOrder.model.js';
import definePurchaseOrderLine from './purchaseOrderLine.model.js';

// the seven audit / soft-delete columns on every table, installed before any model is defined
installAudit(sequelize);

export const RecordExtra = defineRecordExtra(sequelize);
export const User = defineUser(sequelize);
export const SchoolClass = defineSchoolClass(sequelize);
export const Student = defineStudent(sequelize);
export const Attendance = defineAttendance(sequelize);
export const Fee = defineFee(sequelize);
export const AcademicYear = defineAcademicYear(sequelize);
export const Subject = defineSubject(sequelize);
export const LmsTag = defineLmsTag(sequelize);
export const Staff = defineStaff(sequelize);
export const ClassSubject = defineClassSubject(sequelize);
export const Admission = defineAdmission(sequelize);
export const FeeStructure = defineFeeStructure(sequelize);
export const Payment = definePayment(sequelize);
export const Setting = defineSetting(sequelize);
export const Activity = defineActivity(sequelize);
export const ActivityParticipant = defineActivityParticipant(sequelize);
export const Exam = defineExam(sequelize);
export const GradeBand = defineGradeBand(sequelize);
export const GradingSetting = defineGradingSetting(sequelize);
export const ExamGroup = defineExamGroup(sequelize);
export const RevaluationRequest = defineRevaluationRequest(sequelize);
export const Mark = defineMark(sequelize);
export const TimetableSlot = defineTimetableSlot(sequelize);
export const Notice = defineNotice(sequelize);
export const Book = defineBook(sequelize);
export const BookIssue = defineBookIssue(sequelize);
export const LibraryCategory = defineLibraryCategory(sequelize);
export const BookReservation = defineBookReservation(sequelize);
export const StaffSalary = defineStaffSalary(sequelize);
export const Payslip = definePayslip(sequelize);
export const AppMenuItem = defineAppMenuItem(sequelize);
export const AuditLog = defineAuditLog(sequelize);
export const FeeAdjustment = defineFeeAdjustment(sequelize);
export const Refund = defineRefund(sequelize);
export const Expense = defineExpense(sequelize);
export const Income = defineIncome(sequelize);
export const FeeType = defineFeeType(sequelize);
export const Parent = defineParent(sequelize);
export const ParentStudent = defineParentStudent(sequelize);
export const StudentLeave = defineStudentLeave(sequelize);
export const AttendanceCorrection = defineAttendanceCorrection(sequelize);
export const PeriodAttendance = definePeriodAttendance(sequelize);
export const AbsenceAlert = defineAbsenceAlert(sequelize);
export const CalendarEvent = defineCalendarEvent(sequelize);
export const Homework = defineHomework(sequelize);
export const HomeworkSubmission = defineHomeworkSubmission(sequelize);
export const OnlineClass = defineOnlineClass(sequelize);
export const SyllabusTopic = defineSyllabusTopic(sequelize);
export const StudyMaterial = defineStudyMaterial(sequelize);
export const LmsCourse = defineLmsCourse(sequelize);
export const LmsModule = defineLmsModule(sequelize);
export const LmsLesson = defineLmsLesson(sequelize);
export const LmsLessonPart = defineLmsLessonPart(sequelize);
export const LmsMaterial = defineLmsMaterial(sequelize);
export const LmsProgress = defineLmsProgress(sequelize);
export const LmsAssignment = defineLmsAssignment(sequelize);
export const LmsSubmission = defineLmsSubmission(sequelize);
export const LmsQuiz = defineLmsQuiz(sequelize);
export const LmsQuizAttempt = defineLmsQuizAttempt(sequelize);
export const LmsAnnouncement = defineLmsAnnouncement(sequelize);
export const LmsEnrollment = defineLmsEnrollment(sequelize);
export const StudentHealth = defineStudentHealth(sequelize);
export const BehaviorRecord = defineBehaviorRecord(sequelize);
export const Department = defineDepartment(sequelize);
export const Designation = defineDesignation(sequelize);
export const StaffAttendance = defineStaffAttendance(sequelize);
export const LeaveRequest = defineLeaveRequest(sequelize);
export const DocumentRequest = defineDocumentRequest(sequelize);
export const Vehicle = defineVehicle(sequelize);
export const TransportStaff = defineTransportStaff(sequelize);
export const TransportRoute = defineTransportRoute(sequelize);
export const TransportStop = defineTransportStop(sequelize);
export const StudentTransport = defineStudentTransport(sequelize);
export const VehicleMaintenance = defineVehicleMaintenance(sequelize);
export const TransportAttendance = defineTransportAttendance(sequelize);
export const Hostel = defineHostel(sequelize);
export const HostelRoom = defineHostelRoom(sequelize);
export const HostelAllocation = defineHostelAllocation(sequelize);
export const HostelAttendance = defineHostelAttendance(sequelize);
export const LeaveType = defineLeaveType(sequelize);
export const Feedback = defineFeedback(sequelize);
export const FeedbackLog = defineFeedbackLog(sequelize);
export const BiometricDevice = defineBiometricDevice(sequelize);
export const BiometricPunch = defineBiometricPunch(sequelize);
export const CoScholasticArea = defineCoScholasticArea(sequelize);
export const CoScholasticGrade = defineCoScholasticGrade(sequelize);
export const VehicleTracker = defineVehicleTracker(sequelize);
export const VehicleLocation = defineVehicleLocation(sequelize);
export const HostelMeal = defineHostelMeal(sequelize);
export const HostelVisitor = defineHostelVisitor(sequelize);
export const StudentFile = defineStudentFile(sequelize);
export const Photo = definePhoto(sequelize);
export const ApplicationDocument = defineApplicationDocument(sequelize);
export const StudentSubject = defineStudentSubject(sequelize);
export const StudentAccount = defineStudentAccount(sequelize);
export const Message = defineMessage(sequelize);
export const MessageTemplate = defineMessageTemplate(sequelize);
export const InventoryCategory = defineInventoryCategory(sequelize);
export const InventoryItem = defineInventoryItem(sequelize);
export const Supplier = defineSupplier(sequelize);
export const StockMovement = defineStockMovement(sequelize);
export const InventoryRequest = defineInventoryRequest(sequelize);
export const ClinicVisit = defineClinicVisit(sequelize);
export const Incident = defineIncident(sequelize);
export const SafetyInspection = defineSafetyInspection(sequelize);
export const FeeGroup = defineFeeGroup(sequelize);
export const FeeGroupItem = defineFeeGroupItem(sequelize);
export const StaffFile = defineStaffFile(sequelize);
export const JobOpening = defineJobOpening(sequelize);
export const JobApplicant = defineJobApplicant(sequelize);
export const PerformanceReview = definePerformanceReview(sequelize);
export const Room = defineRoom(sequelize);
export const RoomBooking = defineRoomBooking(sequelize);
export const Substitution = defineSubstitution(sequelize);
export const LoginEvent = defineLoginEvent(sequelize);
export const DocumentTemplate = defineDocumentTemplate(sequelize);
export const Role = defineRole(sequelize);
export const UserGroup = defineUserGroup(sequelize);
export const UserGroupMember = defineUserGroupMember(sequelize);
export const Branch = defineBranch(sequelize);
export const SupportTicket = defineSupportTicket(sequelize);
export const PushSubscription = definePushSubscription(sequelize);
export const LibraryMembership = defineLibraryMembership(sequelize);
export const MasterItem = defineMasterItem(sequelize);
export const Asset = defineAsset(sequelize);
export const AssetMaintenance = defineAssetMaintenance(sequelize);
export const PurchaseOrder = definePurchaseOrder(sequelize);
export const PurchaseOrderLine = definePurchaseOrderLine(sequelize);

SchoolClass.hasMany(Student, { foreignKey: 'classId', onDelete: 'SET NULL' });
Student.belongsTo(SchoolClass, { foreignKey: 'classId' });

Student.hasMany(Attendance, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Attendance.belongsTo(Student, { foreignKey: 'studentId' });

Student.hasMany(Fee, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Fee.belongsTo(Student, { foreignKey: 'studentId' });

Fee.hasMany(Payment, { foreignKey: 'feeId', onDelete: 'CASCADE' });
Payment.belongsTo(Fee, { foreignKey: 'feeId' });

// Admissions
SchoolClass.hasMany(Admission, { foreignKey: 'classId', onDelete: 'SET NULL' });
Admission.belongsTo(SchoolClass, { foreignKey: 'classId' });
Admission.belongsTo(Student, { foreignKey: 'studentId', constraints: false });

// Fee structure per class
SchoolClass.hasMany(FeeStructure, { foreignKey: 'classId', onDelete: 'CASCADE' });
FeeStructure.belongsTo(SchoolClass, { foreignKey: 'classId' });

// Which subject a class studies and who teaches it
SchoolClass.hasMany(ClassSubject, { foreignKey: 'classId', onDelete: 'CASCADE' });
ClassSubject.belongsTo(SchoolClass, { foreignKey: 'classId' });
Subject.hasMany(ClassSubject, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
ClassSubject.belongsTo(Subject, { foreignKey: 'subjectId' });
Staff.hasMany(ClassSubject, { foreignKey: 'staffId', onDelete: 'SET NULL' });
ClassSubject.belongsTo(Staff, { foreignKey: 'staffId' });
Student.hasMany(StudentSubject, { foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentSubject.belongsTo(Student, { foreignKey: 'studentId' });
ClassSubject.hasMany(StudentSubject, { foreignKey: 'classSubjectId', onDelete: 'CASCADE' });
StudentSubject.belongsTo(ClassSubject, { foreignKey: 'classSubjectId' });

// Activities
SchoolClass.hasMany(Activity, { foreignKey: 'classId', onDelete: 'SET NULL' });
Activity.belongsTo(SchoolClass, { foreignKey: 'classId' });
Activity.hasMany(ActivityParticipant, { foreignKey: 'activityId', onDelete: 'CASCADE' });
ActivityParticipant.belongsTo(Activity, { foreignKey: 'activityId' });
Student.hasMany(ActivityParticipant, { foreignKey: 'studentId', onDelete: 'CASCADE' });
ActivityParticipant.belongsTo(Student, { foreignKey: 'studentId' });

// Exams and marks
SchoolClass.hasMany(Exam, { foreignKey: 'classId', onDelete: 'CASCADE' });
Exam.belongsTo(SchoolClass, { foreignKey: 'classId' });
Exam.hasMany(Mark, { foreignKey: 'examId', onDelete: 'CASCADE' });
Mark.belongsTo(Exam, { foreignKey: 'examId' });
Student.hasMany(Mark, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Mark.belongsTo(Student, { foreignKey: 'studentId' });
Subject.hasMany(Mark, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
Mark.belongsTo(Subject, { foreignKey: 'subjectId' });

// Exam groups and revaluation
SchoolClass.hasMany(ExamGroup, { foreignKey: 'classId', onDelete: 'CASCADE' });
ExamGroup.belongsTo(SchoolClass, { foreignKey: 'classId' });
ExamGroup.hasMany(Exam, { foreignKey: 'examGroupId', onDelete: 'SET NULL' });
Exam.belongsTo(ExamGroup, { foreignKey: 'examGroupId' });
Exam.hasMany(RevaluationRequest, { foreignKey: 'examId', onDelete: 'CASCADE' });
RevaluationRequest.belongsTo(Exam, { foreignKey: 'examId' });
Student.hasMany(RevaluationRequest, { foreignKey: 'studentId', onDelete: 'CASCADE' });
RevaluationRequest.belongsTo(Student, { foreignKey: 'studentId' });
Subject.hasMany(RevaluationRequest, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
RevaluationRequest.belongsTo(Subject, { foreignKey: 'subjectId' });

// Timetable
SchoolClass.hasMany(TimetableSlot, { foreignKey: 'classId', onDelete: 'CASCADE' });
TimetableSlot.belongsTo(SchoolClass, { foreignKey: 'classId' });
Subject.hasMany(TimetableSlot, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
TimetableSlot.belongsTo(Subject, { foreignKey: 'subjectId' });
Staff.hasMany(TimetableSlot, { foreignKey: 'staffId', onDelete: 'SET NULL' });
TimetableSlot.belongsTo(Staff, { foreignKey: 'staffId' });

// Library
Book.hasMany(BookIssue, { foreignKey: 'bookId', onDelete: 'CASCADE' });
BookIssue.belongsTo(Book, { foreignKey: 'bookId' });
LibraryCategory.hasMany(Book, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
Book.belongsTo(LibraryCategory, { foreignKey: 'categoryId' });
Book.hasMany(BookReservation, { foreignKey: 'bookId', onDelete: 'CASCADE' });
BookReservation.belongsTo(Book, { foreignKey: 'bookId' });
Student.hasMany(BookReservation, { foreignKey: 'studentId', onDelete: 'CASCADE' });
BookReservation.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(BookIssue, { foreignKey: 'studentId', onDelete: 'CASCADE' });
BookIssue.belongsTo(Student, { foreignKey: 'studentId' });

// Fee adjustments and refunds
Fee.hasMany(FeeAdjustment, { foreignKey: 'feeId', onDelete: 'CASCADE' });
FeeAdjustment.belongsTo(Fee, { foreignKey: 'feeId' });
Payment.hasMany(Refund, { foreignKey: 'paymentId', onDelete: 'CASCADE' });
Refund.belongsTo(Payment, { foreignKey: 'paymentId' });

// Parent portal: deleting the login removes the profile and its child links
User.hasOne(Parent, { foreignKey: 'userId', onDelete: 'CASCADE' });
Parent.belongsTo(User, { foreignKey: 'userId' });
Parent.hasMany(ParentStudent, { foreignKey: 'parentId', onDelete: 'CASCADE' });
ParentStudent.belongsTo(Parent, { foreignKey: 'parentId' });
Student.hasMany(ParentStudent, { foreignKey: 'studentId', onDelete: 'CASCADE' });
ParentStudent.belongsTo(Student, { foreignKey: 'studentId' });

// Attendance extras
Student.hasMany(StudentLeave, { foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentLeave.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(AttendanceCorrection, { foreignKey: 'studentId', onDelete: 'CASCADE' });
AttendanceCorrection.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(PeriodAttendance, { foreignKey: 'studentId', onDelete: 'CASCADE' });
PeriodAttendance.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(AbsenceAlert, { foreignKey: 'studentId', onDelete: 'CASCADE' });
AbsenceAlert.belongsTo(Student, { foreignKey: 'studentId' });

// Academics
SchoolClass.hasMany(Homework, { foreignKey: 'classId', onDelete: 'CASCADE' });
Homework.belongsTo(SchoolClass, { foreignKey: 'classId' });
Subject.hasMany(Homework, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
Homework.belongsTo(Subject, { foreignKey: 'subjectId' });
SchoolClass.hasMany(OnlineClass, { foreignKey: 'classId', onDelete: 'CASCADE' });
OnlineClass.belongsTo(SchoolClass, { foreignKey: 'classId' });
Subject.hasMany(OnlineClass, { foreignKey: 'subjectId', onDelete: 'SET NULL' });
OnlineClass.belongsTo(Subject, { foreignKey: 'subjectId' });
Homework.hasMany(HomeworkSubmission, { foreignKey: 'homeworkId', onDelete: 'CASCADE' });
HomeworkSubmission.belongsTo(Homework, { foreignKey: 'homeworkId' });
Student.hasMany(HomeworkSubmission, { foreignKey: 'studentId', onDelete: 'CASCADE' });
HomeworkSubmission.belongsTo(Student, { foreignKey: 'studentId' });
SchoolClass.hasMany(SyllabusTopic, { foreignKey: 'classId', onDelete: 'CASCADE' });
SyllabusTopic.belongsTo(SchoolClass, { foreignKey: 'classId' });
Subject.hasMany(SyllabusTopic, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
SyllabusTopic.belongsTo(Subject, { foreignKey: 'subjectId' });
SchoolClass.hasMany(StudyMaterial, { foreignKey: 'classId', onDelete: 'CASCADE' });
StudyMaterial.belongsTo(SchoolClass, { foreignKey: 'classId' });
Subject.hasMany(StudyMaterial, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
StudyMaterial.belongsTo(Subject, { foreignKey: 'subjectId' });
SchoolClass.hasMany(LmsCourse, { foreignKey: 'classId', onDelete: 'CASCADE' });
LmsCourse.belongsTo(SchoolClass, { foreignKey: 'classId' });
Subject.hasMany(LmsCourse, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
LmsCourse.belongsTo(Subject, { foreignKey: 'subjectId' });
LmsCourse.hasMany(LmsLesson, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsLesson.belongsTo(LmsCourse, { foreignKey: 'courseId' });
LmsCourse.hasMany(LmsModule, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsModule.belongsTo(LmsCourse, { foreignKey: 'courseId' });
LmsModule.hasMany(LmsLesson, { foreignKey: 'moduleId', onDelete: 'SET NULL' });
LmsLesson.belongsTo(LmsModule, { foreignKey: 'moduleId' });
LmsCourse.hasMany(LmsAnnouncement, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsAnnouncement.belongsTo(LmsCourse, { foreignKey: 'courseId' });
LmsCourse.hasMany(LmsEnrollment, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsEnrollment.belongsTo(LmsCourse, { foreignKey: 'courseId' });
Student.hasMany(LmsEnrollment, { foreignKey: 'studentId', onDelete: 'CASCADE' });
LmsEnrollment.belongsTo(Student, { foreignKey: 'studentId' });
LmsCourse.hasMany(LmsMaterial, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsMaterial.belongsTo(LmsCourse, { foreignKey: 'courseId' });
LmsLesson.hasMany(LmsLessonPart, { foreignKey: 'lessonId', onDelete: 'CASCADE' });
LmsLessonPart.belongsTo(LmsLesson, { foreignKey: 'lessonId' });
LmsCourse.hasMany(LmsLessonPart, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsLessonPart.belongsTo(LmsCourse, { foreignKey: 'courseId' });
LmsLesson.hasMany(LmsProgress, { foreignKey: 'lessonId', onDelete: 'CASCADE' });
LmsProgress.belongsTo(LmsLesson, { foreignKey: 'lessonId' });
Student.hasMany(LmsProgress, { foreignKey: 'studentId', onDelete: 'CASCADE' });
LmsProgress.belongsTo(Student, { foreignKey: 'studentId' });
LmsCourse.hasMany(LmsAssignment, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsAssignment.belongsTo(LmsCourse, { foreignKey: 'courseId' });
LmsAssignment.hasMany(LmsSubmission, { foreignKey: 'assignmentId', onDelete: 'CASCADE' });
LmsSubmission.belongsTo(LmsAssignment, { foreignKey: 'assignmentId' });
Student.hasMany(LmsSubmission, { foreignKey: 'studentId', onDelete: 'CASCADE' });
LmsSubmission.belongsTo(Student, { foreignKey: 'studentId' });
LmsCourse.hasMany(LmsQuiz, { foreignKey: 'courseId', onDelete: 'CASCADE' });
LmsQuiz.belongsTo(LmsCourse, { foreignKey: 'courseId' });
LmsQuiz.hasMany(LmsQuizAttempt, { foreignKey: 'quizId', onDelete: 'CASCADE' });
LmsQuizAttempt.belongsTo(LmsQuiz, { foreignKey: 'quizId' });
Student.hasMany(LmsQuizAttempt, { foreignKey: 'studentId', onDelete: 'CASCADE' });
LmsQuizAttempt.belongsTo(Student, { foreignKey: 'studentId' });

// Student life
Student.hasOne(StudentHealth, { foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentHealth.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(BehaviorRecord, { foreignKey: 'studentId', onDelete: 'CASCADE' });
BehaviorRecord.belongsTo(Student, { foreignKey: 'studentId' });

// HR
Department.hasMany(Staff, { foreignKey: 'departmentId', onDelete: 'SET NULL' });
Staff.belongsTo(Department, { foreignKey: 'departmentId' });
Staff.hasMany(StaffAttendance, { foreignKey: 'staffId', onDelete: 'CASCADE' });
StaffAttendance.belongsTo(Staff, { foreignKey: 'staffId' });
Staff.hasMany(LeaveRequest, { foreignKey: 'staffId', onDelete: 'CASCADE' });
LeaveRequest.belongsTo(Staff, { foreignKey: 'staffId' });

// Documents
// Issued certificates are a register; a student who has any cannot be deleted (make them inactive instead).
Student.hasMany(DocumentRequest, { foreignKey: 'studentId', onDelete: 'RESTRICT' });
DocumentRequest.belongsTo(Student, { foreignKey: 'studentId' });

// Transport
Vehicle.hasMany(TransportStaff, { foreignKey: 'vehicleId', onDelete: 'SET NULL' });
TransportStaff.belongsTo(Vehicle, { foreignKey: 'vehicleId' });
Vehicle.hasMany(TransportRoute, { foreignKey: 'vehicleId', onDelete: 'SET NULL' });
TransportRoute.belongsTo(Vehicle, { foreignKey: 'vehicleId' });
TransportRoute.hasMany(TransportStop, { foreignKey: 'routeId', onDelete: 'CASCADE' });
TransportStop.belongsTo(TransportRoute, { foreignKey: 'routeId' });
Student.hasOne(StudentTransport, { foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentTransport.belongsTo(Student, { foreignKey: 'studentId' });
TransportRoute.hasMany(StudentTransport, { foreignKey: 'routeId', onDelete: 'CASCADE' });
StudentTransport.belongsTo(TransportRoute, { foreignKey: 'routeId' });
TransportStop.hasMany(StudentTransport, { foreignKey: 'stopId', onDelete: 'CASCADE' });
StudentTransport.belongsTo(TransportStop, { foreignKey: 'stopId' });
Vehicle.hasMany(VehicleMaintenance, { foreignKey: 'vehicleId', onDelete: 'CASCADE' });
VehicleMaintenance.belongsTo(Vehicle, { foreignKey: 'vehicleId' });
Student.hasMany(TransportAttendance, { foreignKey: 'studentId', onDelete: 'CASCADE' });
TransportAttendance.belongsTo(Student, { foreignKey: 'studentId' });

// Student login: deleting the login removes the link
User.hasOne(StudentAccount, { foreignKey: 'userId', onDelete: 'CASCADE' });
StudentAccount.belongsTo(User, { foreignKey: 'userId' });
Student.hasOne(StudentAccount, { foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentAccount.belongsTo(Student, { foreignKey: 'studentId' });

// Student files (photo, documents)
Student.hasMany(StudentFile, { foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentFile.belongsTo(Student, { foreignKey: 'studentId' });

// Inventory
InventoryCategory.hasMany(InventoryItem, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
InventoryItem.belongsTo(InventoryCategory, { foreignKey: 'categoryId' });
InventoryItem.hasMany(StockMovement, { foreignKey: 'itemId', onDelete: 'CASCADE' });
StockMovement.belongsTo(InventoryItem, { foreignKey: 'itemId' });
Supplier.hasMany(StockMovement, { foreignKey: 'supplierId', onDelete: 'SET NULL' });
StockMovement.belongsTo(Supplier, { foreignKey: 'supplierId' });
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId', onDelete: 'RESTRICT' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId' });
PurchaseOrder.hasMany(PurchaseOrderLine, { foreignKey: 'orderId', onDelete: 'CASCADE' });
PurchaseOrderLine.belongsTo(PurchaseOrder, { foreignKey: 'orderId' });
InventoryItem.hasMany(PurchaseOrderLine, { foreignKey: 'itemId', onDelete: 'RESTRICT' });
PurchaseOrderLine.belongsTo(InventoryItem, { foreignKey: 'itemId' });

InventoryItem.hasMany(InventoryRequest, { foreignKey: 'itemId', onDelete: 'RESTRICT' });
InventoryRequest.belongsTo(InventoryItem, { foreignKey: 'itemId' });

InventoryCategory.hasMany(Asset, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
Asset.belongsTo(InventoryCategory, { foreignKey: 'categoryId' });
Asset.hasMany(AssetMaintenance, { foreignKey: 'assetId', onDelete: 'CASCADE' });
AssetMaintenance.belongsTo(Asset, { foreignKey: 'assetId' });

Student.hasMany(ClinicVisit, { foreignKey: 'studentId', onDelete: 'CASCADE' });
ClinicVisit.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(Incident, { foreignKey: 'studentId', onDelete: 'SET NULL' });
Incident.belongsTo(Student, { foreignKey: 'studentId' });

FeeGroup.hasMany(FeeGroupItem, { foreignKey: 'groupId', onDelete: 'CASCADE' });
FeeGroupItem.belongsTo(FeeGroup, { foreignKey: 'groupId' });
// Staff documents and reviews are records: a staff member who has them cannot be deleted (mark them inactive).
Staff.hasMany(StaffFile, { foreignKey: 'staffId', onDelete: 'RESTRICT' });
StaffFile.belongsTo(Staff, { foreignKey: 'staffId' });
Staff.hasMany(PerformanceReview, { foreignKey: 'staffId', onDelete: 'RESTRICT' });
PerformanceReview.belongsTo(Staff, { foreignKey: 'staffId' });
Department.hasMany(JobOpening, { foreignKey: 'departmentId', onDelete: 'SET NULL' });
JobOpening.belongsTo(Department, { foreignKey: 'departmentId' });
JobOpening.hasMany(JobApplicant, { foreignKey: 'openingId', onDelete: 'RESTRICT' });
JobApplicant.belongsTo(JobOpening, { foreignKey: 'openingId' });

Room.hasMany(TimetableSlot, { foreignKey: 'roomId', onDelete: 'RESTRICT' });
TimetableSlot.belongsTo(Room, { foreignKey: 'roomId' });
Room.hasMany(RoomBooking, { foreignKey: 'roomId', onDelete: 'RESTRICT' });
RoomBooking.belongsTo(Room, { foreignKey: 'roomId' });
TimetableSlot.hasMany(Substitution, { foreignKey: 'slotId', onDelete: 'CASCADE' });
Substitution.belongsTo(TimetableSlot, { foreignKey: 'slotId' });
Staff.hasMany(Substitution, { foreignKey: 'substituteId', onDelete: 'RESTRICT' });
Substitution.belongsTo(Staff, { as: 'Substitute', foreignKey: 'substituteId' });

Role.hasMany(User, { foreignKey: 'roleId', onDelete: 'RESTRICT' });
User.belongsTo(Role, { foreignKey: 'roleId' });
UserGroup.hasMany(UserGroupMember, { foreignKey: 'groupId', onDelete: 'CASCADE' });
UserGroupMember.belongsTo(UserGroup, { foreignKey: 'groupId' });
User.hasMany(UserGroupMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserGroupMember.belongsTo(User, { foreignKey: 'userId' });

Branch.hasMany(SchoolClass, { foreignKey: 'branchId', onDelete: 'RESTRICT' });
SchoolClass.belongsTo(Branch, { foreignKey: 'branchId' });

User.hasMany(PushSubscription, { foreignKey: 'userId', onDelete: 'CASCADE' });
PushSubscription.belongsTo(User, { foreignKey: 'userId' });

Student.hasOne(LibraryMembership, { foreignKey: 'studentId', onDelete: 'CASCADE' });
LibraryMembership.belongsTo(Student, { foreignKey: 'studentId' });

Staff.hasMany(SchoolClass, { foreignKey: 'classTeacherId', onDelete: 'SET NULL' });
SchoolClass.belongsTo(Staff, { as: 'ClassTeacher', foreignKey: 'classTeacherId' });

// Hostel
Hostel.hasMany(HostelRoom, { foreignKey: 'hostelId', onDelete: 'CASCADE' });
HostelRoom.belongsTo(Hostel, { foreignKey: 'hostelId' });
Hostel.hasMany(HostelMeal, { foreignKey: 'hostelId', onDelete: 'CASCADE' });
HostelMeal.belongsTo(Hostel, { foreignKey: 'hostelId' });
Student.hasOne(HostelAllocation, { foreignKey: 'studentId', onDelete: 'CASCADE' });
HostelAllocation.belongsTo(Student, { foreignKey: 'studentId' });
HostelRoom.hasMany(HostelAllocation, { foreignKey: 'roomId', onDelete: 'CASCADE' });
HostelAllocation.belongsTo(HostelRoom, { foreignKey: 'roomId' });
Student.hasMany(HostelAttendance, { foreignKey: 'studentId', onDelete: 'CASCADE' });
HostelAttendance.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(HostelVisitor, { foreignKey: 'studentId', onDelete: 'CASCADE' });
HostelVisitor.belongsTo(Student, { foreignKey: 'studentId' });

LeaveType.hasMany(LeaveRequest, { foreignKey: 'leaveTypeId', onDelete: 'SET NULL' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leaveTypeId' });
LeaveType.hasMany(StudentLeave, { foreignKey: 'leaveTypeId', onDelete: 'SET NULL' });
StudentLeave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId' });

// (Department.headStaffId is deliberately not a foreign key: Staff and Department would reference each other)
Feedback.hasMany(FeedbackLog, { foreignKey: 'feedbackId', onDelete: 'CASCADE' });
FeedbackLog.belongsTo(Feedback, { foreignKey: 'feedbackId' });
Student.hasMany(Feedback, { foreignKey: 'studentId', onDelete: 'SET NULL' });
Feedback.belongsTo(Student, { foreignKey: 'studentId' });

// Biometric attendance, co-scholastic grades, live bus position
BiometricDevice.hasMany(BiometricPunch, { foreignKey: 'deviceId', onDelete: 'CASCADE' });
BiometricPunch.belongsTo(BiometricDevice, { foreignKey: 'deviceId' });
Student.hasMany(BiometricPunch, { foreignKey: 'studentId', onDelete: 'SET NULL' });
BiometricPunch.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(CoScholasticGrade, { foreignKey: 'studentId', onDelete: 'CASCADE' });
CoScholasticGrade.belongsTo(Student, { foreignKey: 'studentId' });
CoScholasticArea.hasMany(CoScholasticGrade, { foreignKey: 'areaId', onDelete: 'CASCADE' });
CoScholasticGrade.belongsTo(CoScholasticArea, { foreignKey: 'areaId' });
ExamGroup.hasMany(CoScholasticGrade, { foreignKey: 'examGroupId', onDelete: 'CASCADE' });
CoScholasticGrade.belongsTo(ExamGroup, { foreignKey: 'examGroupId' });
Vehicle.hasOne(VehicleTracker, { foreignKey: 'vehicleId', onDelete: 'CASCADE' });
VehicleTracker.belongsTo(Vehicle, { foreignKey: 'vehicleId' });
Vehicle.hasMany(VehicleLocation, { foreignKey: 'vehicleId', onDelete: 'CASCADE' });
VehicleLocation.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

// Payroll
Staff.hasOne(StaffSalary, { foreignKey: 'staffId', onDelete: 'CASCADE' });
StaffSalary.belongsTo(Staff, { foreignKey: 'staffId' });
// Payslips are payroll records; staff who have any cannot be deleted (mark them inactive instead).
Staff.hasMany(Payslip, { foreignKey: 'staffId', onDelete: 'RESTRICT' });
Payslip.belongsTo(Staff, { foreignKey: 'staffId' });

export { sequelize };
