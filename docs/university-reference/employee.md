# Employee module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 78 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| Academic Content View | Likely covered |
| Attendence daily | Gap |
| Authenticate Comp Off | Partial / check |
| Authentication | Gap |
| Bench Marking | Gap |
| Center for Learning and Teaching(CLaT) | Partial / check |
| Change Leave Auth Multiple | Partial / check |
| Class Teacher | Likely covered |
| COPOMatrix | Gap |
| Daily Task Reporting | Gap |
| Dashboard | Likely covered |
| Define Salary Package | Gap |
| Department | Likely covered |
| Designation | Likely covered |
| DocumentVerification | Likely covered |
| Emp Salary Show | Gap |
| Employee Detail | Gap |
| Employee Feedback Questionnaire | Partial / check |
| Employee Feedback Setup | Partial / check |
| Employee Full N Final | Gap |
| Employee Grievance | Partial / check |
| Employee Investment | Gap |
| Employee Leave Earning | Partial / check |
| Employee Professional Detail | Gap |
| Employee Professional Detail New | Gap |
| Employee Punishment | Gap |
| Employee TDS Detail Fill | Gap |
| Employee Time Discrepancy | Partial / check |
| Employee-Student No Dues Verification | Partial / check |
| Employer Details | Gap |
| Employment Approval Authentication | Partial / check |
| ExamMarksEntryOBE | Gap |
| ExamMarksEntryOBE_New | Gap |
| ExamSettingOBE | Gap |
| Faculty Daily Diary | Gap |
| Faculty Feedback | Partial / check |
| Indirect Attainment | Gap |
| Interview Panel | Partial / check |
| InterviewAttendance | Gap |
| Interviewee Details | Gap |
| InterviewFinalResult | Gap |
| InterviewProcess | Gap |
| Investment Declaration | Gap |
| JobPost | Gap |
| Leave Apply | Likely covered |
| Leave Apply Cr Based | Partial / check |
| Leave Master | Likely covered |
| List of Holidays | Likely covered |
| Manpower Workload | Gap |
| Monthly Attendance | Likely covered |
| Monthly Attendance New | Likely covered |
| My Info | Gap |
| Opening Remaining Leaves | Partial / check |
| Packages Master | Gap |
| Payroll Setup | Likely covered |
| PeerEvaluation | Gap |
| PMS Acadmic Calender | Gap |
| PMS Activity | Likely covered |
| PMS Activity Planning | Partial / check |
| PMS Activity Planning Freeze | Partial / check |
| PMS Activity Planning Rating | Partial / check |
| PMS Performance Score Card | Partial / check |
| PMS Responsibility | Gap |
| PO-PEO Master | Review |
| POPEOMatrix | Gap |
| Previous Employment Salary | Gap |
| Record Modification | Partial / check |
| Reimbursement Approval | Partial / check |
| Reimbursement Entry | Gap |
| Responsibility Mapping | Gap |
| Salary Calculation | Gap |
| Salary Calculation Manual | Gap |
| Salary Package | Gap |
| Subject Query Management | Partial / check |
| TDS Calculation | Gap |
| TDS Setup | Review |
| TDSChallan | Gap |
| VisionMission | Gap |

## Page details

### Academic Content View
- URL: `Employee/Academic Content View`
- Actions: Show, Clear, X, OK
- Input fields: CaseCSS, EmpCode, EmpName, College, Depart, Design, Doj, FrmDt, ToDt, Session, Group, Subject, MultiSelectSearchBase
- Dropdowns/lists: Teach, EmpStatus, Period

### Attendence daily
- URL: `Employee/Attendence daily`
- Actions: Show, TransferAttendance, Mark My Attendance, Show Disable Card List , Enable Card, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, IDCode, EmpCode1, Department, Name, Desg, DateShow, Empname, College, Dept, EmpCode2, Desg1, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Authenticate Comp Off
- URL: `Employee/Authenticate Comp Off`
- Actions: X, OK, Show, Clear, Approve, Reject, Add, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, SCollege, SDepart, SDesign, MultiSelectSearchBase, SEmpname, SEmpcode, DateFrom, DateTo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: CompOffStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Authentication
- URL: `Employee/Authentication`
- Actions: Search, Clear Search, Save Attendance, X, Add, Clear, rbSearchFor, OK, Remove, Print
- Input fields: CaseCSS, AtDtFrom, AtDtTo, EmpCode, Dept, College, EmpName, Desg, Status, AtDtFrom1, AtDtTo1, EmpCode1, Dept1, College1, EmpName1, Desg1, Status1, RouteName, GraceMin, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Bench Marking
- URL: `Employee/Bench Marking`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, EmpCode, Empname, Session, Course, Semester, MCPH_EMCPH_GVBechMark_txtSubCode_0, MCPH_EMCPH_GVBechMark_txtSubID_0, MCPH_EMCPH_GVBechMark_txtSubName_0, MCPH_EMCPH_GVBechMark_txtPassPer_0, MCPH_EMCPH_GVBechMark_txtAvgMarks_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_EMCPH_GVBechMark_ddlType_0, Verified, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Center for Learning and Teaching(CLaT)
- URL: `Employee/Center for Learning and Teaching(CLaT)`
- Actions: Show, X, Upload, Ok, Delete, Map, OK, Add, Clear, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, College, Depart, Design, Empcode, Empname, fuCLatDoc, Particular, MultiSelectSearchBase, MEmpCode, MEmpName, MCollege, MDepart, MDesign, MStatus, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Teach, EmpStatus, FileName, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Change Leave Auth Multiple
- URL: `Employee/Change Leave Auth Multiple`
- Actions: Show, Save, X
- Input fields: CaseCSS, College, Dept, Desg, EmpCode, Empname, FwdSanctionAuth, ChangeAuthEmpCode, ChangeAuthEmpName
- Dropdowns/lists: Level, EmpStatus, EmpCategory

### Class Teacher
- URL: `Employee/Class Teacher`
- Actions: Show, Clear, Save, Delete, X, OK, Show Class Teachers, Add, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, College, Session, Program, Semester, Group, StdName, AdmNo, CTNature, MultiSelectSearchBase, CollegeHOP, SessionHOP, ProgramHOP, SemesterHOP, EmpNameHOP, EmpCodeHOP, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### COPOMatrix
- URL: `Employee/COPOMatrix`
- Actions: Search, New Entry, Edit, Delete, Print, Print Pending Entry, X, Apply, Add, Clear, rbSearchFor, OK, Remove
- Input fields: CaseCSS, College, Session, Program, Sem, NoOfCO, SubjectCode, SubjectName, IDCode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Type, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Daily Task Reporting
- URL: `Employee/Daily Task Reporting`
- Actions: .:., Load, Show, Upload, Show All, X, OK, New Entry, Edit, Delete
- Input fields: CaseCSS, EmpCode, EmpName, Dated, MCPH_EMCPH_gvDailyTask_txtCategoryName_0, MCPH_EMCPH_gvDailyTask_txtTitle_0, MCPH_EMCPH_gvDailyTask_txtWorkParticular_0, MCPH_EMCPH_gvDailyTask_txtDateFrom_0, MCPH_EMCPH_gvDailyTask_txtDateTo_0, MCPH_EMCPH_gvDailyTask_txtWorkDuration_0, MCPH_EMCPH_gvDailyTask_fu1_0, SCollege, SDepart, SDesign, SEmpcode, SEmpname, DateFrom, DateTo, MultiSelectSearchBase

### Dashboard
- URL: `Employee/Dashboard`
- Actions: Go, Sanction, Save, Show, Print, Send, Print Faculty Wise, Print Group Wise
- Labels on screen: Administrator(Aman Bansal); Account; Logout; Home; Today's Intime Chart; Employee Attendance Status (Today); Total Employee (00); Employee Attendance Status (Last 7 days); Employee Attendance Status (Monthly); Highest Present (00/00); Highest Absent (00/00); Avg. Leave (0.00); Mentor/Mentee Activity; Student; Student Information; External Marks Analysis; Internal Marks Analysis; Marks Analysis Report; Teaching; Non Teaching; In Time; Out Time; Attendance Date; Attendance Month

### Define Salary Package
- URL: `Employee/Define Salary Package`
- Actions: Clear, Show, Save, X, OK
- Input fields: CaseCSS, College, Depart, Design, Package, Empname, Empcode, MultiSelectSearchBase
- Dropdowns/lists: EmpStatus, MCPH_EMCPH_drpEmpSortOrder

### Department
- URL: `Employee/Department`
- Actions: ▲, ▼, New Entry, Edit, Delete, Print, X
- Input fields: CaseCSS, IDcode, Department, SubDept, ShortName, MCPH_EMCPH_gvDepartmentHODDetail_txtEmpName_0, MCPH_EMCPH_gvDepartmentHODDetail_txtEmpID_0, MCPH_EMCPH_gvDepartmentHODDetail_txtEmpCode_0, MCPH_EMCPH_gvDepartmentHODDetail_txtDayFrom_0, MCPH_EMCPH_gvDepartmentHODDetail_txtDayTo_0
- Dropdowns/lists: MCPH_EMCPH_DeptList

### Designation
- URL: `Employee/Designation`
- Actions: ▲, ▼, New Entry, Edit, Delete, Print, Search, Show, Save, Map, X
- Input fields: CaseCSS, DesgName, DesgID, ShortName, DesgClass, MaxNoEmp, College, MCPH_EMCPH_grdOrganogram_txtReportingDesg_0, MCPH_EMCPH_grdOrganogram_txtReportingDesg_1, MCPH_EMCPH_grdOrganogram_txtReportingDesg_2, MCPH_EMCPH_grdOrganogram_txtReportingDesg_3, MCPH_EMCPH_grdOrganogram_txtReportingDesg_4, MCPH_EMCPH_grdOrganogram_txtReportingDesg_5, MCPH_EMCPH_grdOrganogram_txtReportingDesg_6, MCPH_EMCPH_grdOrganogram_txtReportingDesg_7, MCPH_EMCPH_grdOrganogram_txtReportingDesg_8, MCPH_EMCPH_grdOrganogram_txtReportingDesg_9, MCPH_EMCPH_grdOrganogram_txtReportingDesg_10, MCPH_EMCPH_grdOrganogram_txtReportingDesg_11, MCPH_EMCPH_grdOrganogram_txtReportingDesg_12, MCPH_EMCPH_grdOrganogram_txtReportingDesg_13, MCPH_EMCPH_grdOrganogram_txtReportingDesg_14, MCPH_EMCPH_grdOrganogram_txtReportingDesg_15, MCPH_EMCPH_grdOrganogram_txtReportingDesg_16, MCPH_EMCPH_grdOrganogram_txtReportingDesg_17, MCPH_EMCPH_grdOrganogram_txtReportingDesg_18, MCPH_EMCPH_grdOrganogram_txtReportingDesg_19, MCPH_EMCPH_grdOrganogram_txtReportingDesg_20, MCPH_EMCPH_grdOrganogram_txtReportingDesg_21, MCPH_EMCPH_grdOrganogram_txtReportingDesg_22, MCPH_EMCPH_grdOrganogram_txtReportingDesg_23, MCPH_EMCPH_grdOrganogram_txtReportingDesg_24, MCPH_EMCPH_grdOrganogram_txtReportingDesg_25, MCPH_EMCPH_grdOrganogram_txtReportingDesg_26, MCPH_EMCPH_grdOrganogram_txtReportingDesg_27, MCPH_EMCPH_grdOrganogram_txtReportingDesg_28, MCPH_EMCPH_grdOrganogram_txtReportingDesg_29, MCPH_EMCPH_grdOrganogram_txtReportingDesg_30, MCPH_EMCPH_grdOrganogram_txtReportingDesg_31, MCPH_EMCPH_grdOrganogram_txtReportingDesg_32
- Dropdowns/lists: DesgMaster

### DocumentVerification
- URL: `Employee/DocumentVerification`
- Actions: Show, Download All, Authenticate Level 1, Authenticate Level 2, Download, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, CandidateCode, CandidateName, JobCode, Designation, College, Department, GenerateDate, GenCollege, GenDept, GenDesig, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Emp Salary Show
- URL: `Employee/Emp Salary Show`
- Actions: Show, Clear, New Entry, Delete, X
- Input fields: CaseCSS, College, Dept, Desg, EmpCode, Empname, WeekOffDate
- Dropdowns/lists: EmpStatus

### Employee Detail
- URL: `Employee/Employee Detail`
- Actions: X, New Contract Emp, Refresh, Show Detail, Upload, Library &amp; Inventory Details, New Entry, Edit, Delete, BindSelectedDetail, Remark Entry, Search, Print Letter, Print (Service Book), More Employee Data, Employee Joining Report, Add, Clear, rbSearchFor, OK, Remove, Print, Close
- Input fields: CaseCSS, SearchCode, SearchName, EmpStatus, EmpFName, EmpMName, EmpLName, FatherName, fatherMiddlename, fatherlastname, MotherName, mothermiddlename, Motherlastname, transliterateTextArea, DOB, DOM, Spose, DTCon, Religion, Caste, SubCaste, Quota, SubQuota, Mobile, NickName, MCPH_EMCPH_txtPerEMail, MCPH_EMCPH_txtOffEMail, Aadhaar, PassPort, PAN, ESI, PF, UANNO, NPSAcNo, PRANNo, InsurNo, VisaNo, VisaType, VisaExpDate, PCity
- Dropdowns/lists: drpInitial, MCPH_EMCPH_drpfinitial, MCPH_EMCPH_drpminitialname, drpSex, drpBloodGroup, drpMaritalStatus, drpSpouseInitial, MCPH_EMCPH_drpCategory, Nationality, drpFacultyType, MCPH_EMCPH_ddlPayMode, drpStatus, drpApptType, drpEmpType, drpRelation, MCPH_EMCPH_drpTimePackage, MCPH_EMCPH_drpSalaryPackage, MCPH_EMCPH_drpLeavePackage, MCPH_EMCPH_drpPerkPackage, MCPH_EMCPH_drpReimbursePackage, MCPH_EMCPH_drpLoanPackage, MCPH_EMCPH_gvLeaveAuthority_drpLeaveLevel_0, MCPH_EMCPH_gvQualification_drpCollggType_0, MCPH_EMCPH_gvQualification_drpEduType_0, MCPH_EMCPH_gvQualification_drpMedium_0

### Employee Feedback Questionnaire
- URL: `Employee/Employee Feedback Questionnaire`
- Actions: New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, GroupName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: CriteriaCategory, AppliedTo, CategoryType, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Employee Feedback Setup
- URL: `Employee/Employee Feedback Setup`
- Actions: Show, New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FB_Name, DFrom, DTo, ColgName, Department, Desgination, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_EMCPH_ddlStatus, MCPH_EMCPH_ddlCategory, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Employee Full N Final
- URL: `Employee/Employee Full N Final`
- Actions: Show, Refresh, X, New Entry, Edit, btnHandlePostback, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, IDCode, EmpCode1, name, Dept, EmpDOJ, College, Desg, EmpStatus, TechStatus, CreditMonth, SalaryUnderHead, FNFDate, TotalCalcValue, OneDaySalary, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Employee Grievance
- URL: `Employee/Employee Grievance`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, GrievanceNo, GrievanceName, GrievanceDate, Particulars, GoToComplaintNo

### Employee Investment
- URL: `Employee/Employee Investment`
- Actions: Button, New Entry, Save, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, IDCode, EmpCode, EmpName, Dept, College, Desg, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpFinancial, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Employee Leave Earning
- URL: `Employee/Employee Leave Earning`
- Actions: Show, Clear, Earn From Package, X, OK, Add, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, SCollege, SDepart, SDesign, SLpkg, SEmpcode, SEmpname, Leavedate, MultiSelectSearchBase, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: EmpStatus, drpLeaveName, MCPH_EMCPH_drpEmpSortOrder, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Employee Professional Detail
- URL: `Employee/Employee Professional Detail`
- Actions: Upload, New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, Dept, College, EmpName, Desg, Joining, MCPH_EMCPH_gvEmpJournal_txtBookType_0, MCPH_EMCPH_gvEmpJournal_txtCategory_0, MCPH_EMCPH_gvEmpJournal_txtBookTitle_0, MCPH_EMCPH_gvEmpJournal_txtName_0, MCPH_EMCPH_gvEmpJournal_txtYearOrg_0, MCPH_EMCPH_gvEmpJournal_txtDateFrom_0, MCPH_EMCPH_gvEmpJournal_txtDateTo_0, MCPH_EMCPH_gvEmpJournal_txtVenue_0, MCPH_EMCPH_gvEmpJournal_txtExpAmt_0, MCPH_EMCPH_gvEmpJournal_txtPassAmt_0, MCPH_EMCPH_gvEmpJournal_txtRemark_0, MCPH_EMCPH_gvEmpJournal_txtImageUpload_0, MCPH_EMCPH_gvEmpJournal_txtIdcode_0, MCPH_EMCPH_gvEmpBookPub_txtBookType_0, MCPH_EMCPH_gvEmpBookPub_txtCategory_0, MCPH_EMCPH_gvEmpBookPub_txtCoAuther_0, MCPH_EMCPH_gvEmpBookPub_txtBookTitle_0, MCPH_EMCPH_gvEmpBookPub_txtConfTitle_0, MCPH_EMCPH_gvEmpBookPub_txtVolume_0, MCPH_EMCPH_gvEmpBookPub_txtBookChapter_0, MCPH_EMCPH_gvEmpBookPub_txtPage_0, MCPH_EMCPH_gvEmpBookPub_txtNameOfEditor_0, MCPH_EMCPH_gvEmpBookPub_txtIssueNumber_0, MCPH_EMCPH_gvEmpBookPub_txtISBN_0, MCPH_EMCPH_gvEmpBookPub_txtConfYear_0, MCPH_EMCPH_gvEmpBookPub_txtListedIn_0, MCPH_EMCPH_gvEmpBookPub_txtPublisher_0, MCPH_EMCPH_gvEmpBookPub_txtPlace_0, MCPH_EMCPH_gvEmpBookPub_txtPublishedDate_0, MCPH_EMCPH_gvEmpBookPub_txtRemark_0, MCPH_EMCPH_gvEmpBookPub_txtImageUpload_0, MCPH_EMCPH_gvEmpBookPub_txtIdcode_0, MCPH_EMCPH_gvEmpGrant_txtGrantType_0
- Dropdowns/lists: MCPH_EMCPH_gvEmpJournal_ddlStatus_0, MCPH_EMCPH_gvEmpJournal_ddlPrec_0, MCPH_EMCPH_gvProjGuide_ddlCategory_0, MCPH_EMCPH_gvEmpPatent_ddlStatusofPatent_0, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Employee Professional Detail New
- URL: `Employee/Employee Professional Detail New`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Save Publish, Save Conference, Save Grants, Save Consultancy, Save Project Guide, Save Patent, Save Prof. Membership, Save Award, Save Interact Professional, Delete Publish, Delete Conference, Delete Grants, Delete Consultancy, Delete Project Guide, Delete Patent, Delete Prof. Membership, Delete Award, Delete Interact Professional
- Input fields: CaseCSS, EmpCode, Dept, College, EmpName, Desg, Joining, BookType, Category, BookTitle, Name, DateFrom, DateTo, YearOrg, Venue, ExpAmt, PassAmt, RegAmt, AwardAmt, TravAmt, TotalAmt, SEStatus, BookTypeP, CategoryP, CoAuther, BookTitleP, ConfTitle, Volume, BookChapter, Page, NameOfEditor, IssueNumber, ISBN, ConfYear, ListedIn, Publisher, Place, PublishedDate, GrantType, ProjTitle
- Dropdowns/lists: Status, Prec, Category, StatusofPatent, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Employee Punishment
- URL: `Employee/Employee Punishment`
- Actions: .:., Load, New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, EmpName, SuspFromDate, SuspToDate, MCPH_EMCPH_txtSuspOrderNo, MCPH_EMCPH_txtRefNo, SuspOrderDate, MCPH_EMCPH_txtRevokOrderNo, RevokOrderDate, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpPunishCategory, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Employee TDS Detail Fill
- URL: `Employee/Employee TDS Detail Fill`
- Actions: Save, X
- Input fields: CaseCSS, SrNo, ChallanSerialNo, UpdateMode, EmpPAN, EmpName, DateEmployed, TaxableAmt, TotAmtSalary, DeductUnderSection16_2, IncomeChargeable, GrossTotalIncome, AmountDeductible80CCF, AmountDeductibleUnderProvision, TotTaxableIncome, Surcharge, IncomeTax, TotTDS, TotTaxWholeYear, DateToEmployed, ReportedTax, DeductUnderSection16_1, TotalDeduction, IncomeUnderHead, AggregateAmount, AmountDeductible80CCG, TotAmtDeduct, TaxOnTotIncome, EduCess, NetTax, ReportedAmtTDS, ShortFall, PAN1, PAN2, PAN3, PAN4, Lord1, Lord2, Lord3, Lord4
- Dropdowns/lists: drpDeducteeType, drpFinancial, drpQuarter, drpHigherRate, drpAggregateRent, drpPANLandlord1, drpPANLandlord2, drpPANLandlord3, drpPANLandlord4, drpInterestPaid, drpSuperAnnuation, drpInCaseLender1, drpInCaseLender2, drpInCaseLender3, drpInCaseLender4

### Employee Time Discrepancy
- URL: `Employee/Employee Time Discrepancy`
- Actions: New Entry, Edit, Show, Approve, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, Dept, College, EmpName, Desg, Joining, DDate, DiscrepancyInTime, DiscrepancyOutTime, ActualInTime, ActualOutTime, DescDateApprove, DescDateApproveTo, AddonDTFrom, AddonDTTo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: DrpStatusPA, Sort, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Employee-Student No Dues Verification
- URL: `Employee/Employee-Student No Dues Verification`
- Actions: .:., Load, Search, No Dues, X
- Input fields: CaseCSS, EmpCode, Dept, College, EmpName, Desg, Joining, AdmissionNo, EnrollNo, StudentName, RollNo
- Dropdowns/lists: Category

### Employer Details
- URL: `Employee/Employer Details`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmployerName, EmployerBranch, EmployerAddress1, EmployerAddress2, EmployerAddress3, EmployerAddress4, EmployerAddress5, EmployerState, EmployerPIN, EmployerEmailID, PAN, TAN, EmployerSTDcode, EmployerTelPhoneNo, NamePersonResp4PaySal, DesgPersonResp4PaySal, Resp4PaySalAddress1, Resp4PaySalAddress2, Resp4PaySalAddress3, Resp4PaySalAddress4, Resp4PaySalAddress5, Resp4PaySalState, Resp4PaySalPIN, Resp4PaySalEmailID, MobileNumber, MobileNumberAlternate, Resp4PaySalSTDCODE, Resp4PaySalTelPhoneNo, Resp4PaySalPAN, Resp4PaySalPAORegNo, Resp4PaySalDDORegNo, EmployerSTDcodeAlternate, EmployerTelPhoneNoAlternate, EmployerEmailIDAlternate, Resp4PaySalSTDCODEAlternate, Resp4PaySalTelPhoneNoAlternate, Resp4PaySalEmailIDAlternate, AOIDNo, GSTIN
- Dropdowns/lists: drpDeductorType, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Employment Approval Authentication
- URL: `Employee/Employment Approval Authentication`
- Actions: Show, Clear, Approve, Disapprove, Authenticate, Unauthenticate, Print, X, OK, DownLoad
- Input fields: CaseCSS, SCollege, SDepart, SDesign, SEmpname, SEmpcode, DOJFrom, DOJTo, EntryDateFrom, EntryDateTo, MultiSelectSearchBase
- Dropdowns/lists: Teach, KMJ, Gender, EmpAuthStatus, ChangeType, drpStatus

### ExamMarksEntryOBE
- URL: `Employee/ExamMarksEntryOBE`
- Actions: Show, X, Save, Get Att Type, Clear, Refresh, Print Co Evaluation, Add, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, TotObtained, GSession, GGrpText, EmpCode, EmpName, SubjectType, SubjectCode, SubjectName, ExamCode, ExamName, ExamMonth, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Attend, MCPH_EMCPH_ddMarksType, MCPH_EMCPH_ddBasedOn, istBasedOn, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### ExamMarksEntryOBE_New
- URL: `Employee/ExamMarksEntryOBE_New`
- Actions: Show, Get Att Type, Clear, X
- Input fields: CaseCSS, GSession, GGrpText, EmpCode, EmpName, SubjectType, SubjectCode, SubjectName, ExamCode, ExamName, ExamMonth
- Dropdowns/lists: MCPH_EMCPH_ddMarksType, MCPH_EMCPH_ddBasedOn, istBasedOn

### ExamSettingOBE
- URL: `Employee/ExamSettingOBE`
- Actions: Search, New Entry, Edit, Delete, X
- Input fields: CaseCSS, Session, Program, Sem, SubjectCode, SubjectName, ExamCode, ExamName

### Faculty Daily Diary
- URL: `Employee/Faculty Daily Diary`
- Actions: Show, Save, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, College, Dept, EmpName, DOJ, Desg, Date, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Faculty Feedback
- URL: `Employee/Faculty Feedback`
- Actions: Save, X
- Input fields: CaseCSS, Faculty, FacultyName, Colg, Dept, Desg, JoinDate

### Indirect Attainment
- URL: `Employee/Indirect Attainment`
- Actions: Show, New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, Session, Course, DirectAttainment, IndirectAttainment, IDCode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Interview Panel
- URL: `Employee/Interview Panel`
- Actions: New Entry, Edit, Delete, Search, X, Add, Clear, rbSearchFor, OK, Remove, Print
- Input fields: CaseCSS, PanelName, TestName, MCPH_EMCPH_gvInterviewPanel_txtEmpCode_0, MCPH_EMCPH_gvInterviewPanel_txtEmpName_0, MCPH_EMCPH_gvInterviewPanel_txtCollege_0, MCPH_EMCPH_gvInterviewPanel_txtDepartment_0, MCPH_EMCPH_gvInterviewPanel_txtDesignation_0, MCPH_EMCPH_gvInterviewPanel_txtMobileNo_0, MCPH_EMCPH_gvInterviewPanel_txtEmail_0, MCPH_EMCPH_gvInterviewPanel_txtStatus_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_EMCPH_gvInterviewPanel_ddlPanelStatus_0, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### InterviewAttendance
- URL: `Employee/InterviewAttendance`
- Actions: Mark Attendence, Show, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, CandidateCode, CandidateName, TestName, JobCode, Designation, College, Department, PEAttDate, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Interviewee Details
- URL: `Employee/Interviewee Details`
- Actions: X, Refresh, Upload, New Entry, Edit, Delete, BindSelectedDetail, Search, Add, Clear, rbSearchFor, OK, Remove, Print
- Input fields: CaseCSS, EmpFName, EmpMName, EmpLName, FatherName, fatherMiddlename, fatherlastname, MotherName, mothermiddlename, Motherlastname, DOB, Religion, Caste, SubCaste, Quota, SubQuota, Mobile, NickName, MCPH_EMCPH_txtPerEMail, Department, Aadhaar, PassPort, PAN, ESI, PF, UANNO, InsurNo, VisaNo, VisaType, VisaExpDate, PCity, PState, PDist, PCountry, PPin, PPhone, CCity, CState, CDist, CCountry
- Dropdowns/lists: drpInitial, MCPH_EMCPH_drpfinitial, MCPH_EMCPH_drpminitialname, drpSex, drpBloodGroup, drpMaritalStatus, MCPH_EMCPH_drpCategory, Nationality, MCPH_EMCPH_gvQualification_drpCollggType_0, MCPH_EMCPH_gvQualification_drpEduType_0, MCPH_EMCPH_gvQualification_drpMedium_0, MCPH_EMCPH_gvQualification_drpEduStatus_0, MCPH_EMCPH_gvQualification_drpCollggType_1, MCPH_EMCPH_gvQualification_drpEduType_1, MCPH_EMCPH_gvQualification_drpMedium_1, MCPH_EMCPH_gvQualification_drpEduStatus_1, MCPH_EMCPH_gvQualification_drpCollggType_2, MCPH_EMCPH_gvQualification_drpEduType_2, MCPH_EMCPH_gvQualification_drpMedium_2, MCPH_EMCPH_gvQualification_drpEduStatus_2, MCPH_EMCPH_gvQualification_drpCollggType_3, MCPH_EMCPH_gvQualification_drpEduType_3, MCPH_EMCPH_gvQualification_drpMedium_3, MCPH_EMCPH_gvQualification_drpEduStatus_3, MCPH_EMCPH_gvQualification_drpCollggType_4

### InterviewFinalResult
- URL: `Employee/InterviewFinalResult`
- Actions: Show, Edit, Authenticate, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, JobCode, Designation, College, Department, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### InterviewProcess
- URL: `Employee/InterviewProcess`
- Actions: Show, Save, Send Mail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, JobCode, Designation, IntOpen, IntOpenTo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Investment Declaration
- URL: `Employee/Investment Declaration`
- Actions: Save Employment, Clear, Delete Employment, Save Regime Choice, New Entry, Edit, Delete, Search, Submit, X
- Input fields: CaseCSS, MCPH_EMCPH_txtSempcode, MCPH_EMCPH_txtSempName, SEmployerName, EmpCode, EmpName, Dept, Status, DOJ, College, Desg, Gender, DOB, EmployerName, PANOptional, TANOptional, EmpRefNo, EmpFlatNo, EmpBuilding, EmpRoad, EmpLocality, EmpPin, EmpCity, EmpState, EEmployer, ETAN, EAddress, ECity, EPin, EPAN, EEmployementFrom, EEmployementTo, MCPH_EMCPH_txtOldTaxation, MCPH_EMCPH_txtNewTaxation, MCPH_EMCPH_txtOldTaxationYear, MCPH_EMCPH_txtNewTaxationYear, IncomeFRMOtherSourse, HouseCode, TenantName, PAN
- Dropdowns/lists: drpFinancial, ECategory, MCPH_EMCPH_drpRegimeChoice

### JobPost
- URL: `Employee/JobPost`
- Actions: Upload, New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MCPH_EMCPH_txtJobCode, Designation, MCPH_EMCPH_grdInterviewSlc_txtTestName_0, MCPH_EMCPH_grdInterviewSlc_txtTestName_1, MCPH_EMCPH_grdInterviewSlc_txtTestName_2, SelectAll, MCPH_EMCPH_grdPostDetail_txtCollegeName_0, MCPH_EMCPH_grdPostDetail_txtDepartmentName_0, MCPH_EMCPH_grdPostDetail_txtLocation_0, MCPH_EMCPH_grdPostDetail_txtOpenFrom_0, MCPH_EMCPH_grdPostDetail_txtOpenTo_0, MCPH_EMCPH_grdPostDetail_txtPackage_0, MCPH_EMCPH_grdPostDetail_txtMinExp_0, MCPH_EMCPH_grdPostDetail_txtNoSeats_0, MCPH_EMCPH_grdPostDetail_txtRemark_0, MCPH_EMCPH_grdPostDetail_txtRefIDcode_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Leave Apply
- URL: `Employee/Leave Apply`
- Actions:  , Refresh Grid, Refresh, Convert Now, Earned, New Entry, Edit, Print Leave Status, My Attendance, My Salary Slip, Print Slip, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, College, Dept, EmpName, DOJ, Desg, DateFrom, DateTo, ApplyDate, TimeFrom, TimeTo, Checkbox1, LastEarnedUpdate, AttStartFrom, EndDate, LeaveBetween, LeaveBetweenTo, ECode, EName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, RptDate
- Dropdowns/lists: drpCurrentLeave, drpLeaveConversion, drpConvertTo, drpLeaveStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Leave Apply Cr Based
- URL: `Employee/Leave Apply Cr Based`
- Actions:  , Refresh Grid, Refresh, Convert Now, New Entry, Edit, Print Leave Status, My Attendance, My Salary Slip, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, College, Dept, EmpName, DOJ, Desg, DateFrom, DateTo, ApplyDate, CompensatoryLeaveOfDate, LeaveReason, TimeFrom, TimeTo, Checkbox1, LastEarnedUpdate, AttStartFrom, EndDate, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, RptDate
- Dropdowns/lists: drpCurrentLeave, drpLeaveConversion, drpConvertTo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Leave Master
- URL: `Employee/Leave Master`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, MCPH_EMCPH_txtCaseCSS, LName, Abbr, DocMinDays
- Dropdowns/lists: CalBase, Hours, Min, GraceTime, MCPH_EMCPH_ddlPart, Leave

### List of Holidays
- URL: `Employee/List of Holidays`
- Actions: X, OK, Show, New Entry, Edit, Delete, Add, Clear, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, MultiSelectSearchBase, DateFrom, To, MCPH_EMCPH_txtHoliday, College, Dept, Desg, LeavePkg, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: ApplyOn, MCPH_EMCPH_drpCategory, MCPH_EMCPH_drpStatus, YearsFil, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Manpower Workload
- URL: `Employee/Manpower Workload`
- Actions: Show, New Entry, Edit, Delete, BindSelectedDetail, X
- Input fields: CaseCSS, AcadSession, Session, MCPH_EMCPH_grdWorkLoad_txtCategory_0, MCPH_EMCPH_grdWorkLoad_txtTeacherName_0, MCPH_EMCPH_grdWorkLoad_txtProgram_0, MCPH_EMCPH_grdWorkLoad_txtSubjectName_0, MCPH_EMCPH_grdWorkLoad_txtSubjectCode_0, MCPH_EMCPH_grdWorkLoad_txtNoofStd_0, MCPH_EMCPH_grdWorkLoad_txtTheory_0, MCPH_EMCPH_grdWorkLoad_txtPractical_0, MCPH_EMCPH_grdWorkLoad_txtTutorial_0, MCPH_EMCPH_grdWorkLoad_txtTotLectPerWeek_0, MCPH_EMCPH_grdWorkLoad_txtTotWeeklyWorkLoad_0, MCPH_EMCPH_grdWorkLoad_txtExtraWorkAllocated_0, MCPH_EMCPH_grdWorkLoad_txtRemarks_0, MCPH_EMCPH_grdClassTraining_txtProgramT_0, MCPH_EMCPH_grdClassTraining_txtDurOfTraining_0, MCPH_EMCPH_grdClassTraining_txtNoOfStdT_0, MCPH_EMCPH_grdClassTraining_txtEffectOnWorkload_0, MCPH_EMCPH_grdClassTraining_txtRemarks_0

### Monthly Attendance
- URL: `Employee/Monthly Attendance`
- Actions: X, Apply, Show, Update Sandwich (W/HL), Save, Clear, Freeze Att, UnFreeze Att, Leave Conversion, Authenticate Late Info, Print, OK
- Input fields: CaseCSS, RemarkStatus, TimeFrom, TimeTo, DateFrom, DateTo, College, SalaryPackage, Dept, Desg, EmpCode, Empname, From, To, RouteName, TimingPkg, DesgClass, GraceRemark, MultiSelectSearchBase
- Dropdowns/lists: EmpStatus, drpApptType, drpLeaveAbbr, OthferPayRoll, PrntID

### Monthly Attendance New
- URL: `Employee/Monthly Attendance New`
- Actions: Approve, Apply, Show, Update Sandwich (W/HL), Save, Clear, Freeze Att, UnFreeze Att, Leave Conversion, Authenticate Leave, Authenticate Late Info, Print, X, OK
- Input fields: CaseCSS, College, SalaryPackage, Dept, Desg, EmpCode, Empname, From, To, RouteName, TimingPkg, DesgClass, GraceRemark, TimeTo, MultiSelectSearchBase
- Dropdowns/lists: EmpStatus, drpApptType, drpLeaveAbbr, OthferPayRoll, PrntID

### My Info
- URL: `Employee/My Info`
- Actions: X, New Contract Emp, Refresh, Show Detail, Upload, Library &amp; Inventory Details, Edit, BindSelectedDetail, Search, Print (Service Book), More Employee Data, Employee Joining Report, Add, Clear, rbSearchFor, OK, Remove, Print, Close
- Input fields: CaseCSS, SearchCode, SearchName, EmpStatus, EmpFName, EmpMName, EmpLName, FatherName, fatherMiddlename, fatherlastname, MotherName, mothermiddlename, Motherlastname, transliterateTextArea, DOB, DOM, Spose, DTCon, Religion, Caste, SubCaste, Quota, SubQuota, Mobile, NickName, MCPH_EMCPH_txtPerEMail, MCPH_EMCPH_txtOffEMail, Aadhaar, PassPort, PAN, ESI, PF, UANNO, NPSAcNo, PRANNo, InsurNo, VisaNo, VisaType, VisaExpDate, PCity
- Dropdowns/lists: drpInitial, MCPH_EMCPH_drpfinitial, MCPH_EMCPH_drpminitialname, drpSex, drpBloodGroup, drpMaritalStatus, drpSpouseInitial, MCPH_EMCPH_drpCategory, Nationality, drpFacultyType, MCPH_EMCPH_ddlPayMode, drpStatus, drpApptType, drpEmpType, drpRelation, MCPH_EMCPH_drpTimePackage, MCPH_EMCPH_drpSalaryPackage, MCPH_EMCPH_drpLeavePackage, MCPH_EMCPH_drpPerkPackage, MCPH_EMCPH_drpReimbursePackage, MCPH_EMCPH_drpLoanPackage, MCPH_EMCPH_gvLeaveAuthority_drpLeaveLevel_0, MCPH_EMCPH_gvQualification_drpCollggType_0, MCPH_EMCPH_gvQualification_drpEduType_0, MCPH_EMCPH_gvQualification_drpMedium_0

### Opening Remaining Leaves
- URL: `Employee/Opening Remaining Leaves`
- Actions: Show, Clear, Update, X
- Input fields: CaseCSS, College, Dept, Desg, EmpCode, Empname, Leavedate, MCPH_EMCPH_txtLeaveEarneddate
- Dropdowns/lists: EmpStatus, MCPH_EMCPH_drpLeavepackage

### Packages Master
- URL: `Employee/Packages Master`
- Actions: New Entry, Edit, Delete, Salary Heads, Leave Heads, X
- Input fields: CaseCSS, TPackage, MinHOurs, MCPH_EMCPH_gvLateAlwdCtr_txtFromTimeLate_0, MCPH_EMCPH_gvLateAlwdCtr_txtToTimeLate_0, MCPH_EMCPH_gvLateAlwdCtr_txtNoLateTimeLate_0, Rate, SalPackname, MinRange, Increment, MaxRange, PackStartFrom, LeavePackage, MCPH_EMCPH_gridleavepackage_txtLeaveName_0, MCPH_EMCPH_gridleavepackage_txtGrdLeaveAllow_0, MCPH_EMCPH_gridleavepackage_txtMinLeftEncash_0, MCPH_EMCPH_gridleavepackage_txtGrdExpMonths_0, MCPH_EMCPH_gridleavepackage_txtMaxAllowed_0, MCPH_EMCPH_gridleavepackage_txtGrdFreqFrom_0, MCPH_EMCPH_gridleavepackage_txtGrdFreqTo_0, MCPH_EMCPH_gridleavepackage_txtGrdLeaveGap_0, MCPH_EMCPH_gridleavepackage_txtGrdWDReq_0, MCPH_EMCPH_gridleavepackage_txtCreditLeaveOnOrBefore_0, MCPH_EMCPH_gridleavepackage_txtMinAppliedDays_0, MCPH_EMCPH_gridleavepackage_txtMaxAppliedDays_0, MCPH_EMCPH_gridleavepackage_txtBackDaysRes_0, MCPH_EMCPH_gridleavepackage_txtFutureDaysRes_0, MCPH_EMCPH_gridleavepackage_txtApplyCount_0, MCPH_EMCPH_gridleavepackage_txtMTimeFrom_0, MCPH_EMCPH_gridleavepackage_txtMTimeTo_0, MCPH_EMCPH_gridleavepackage_txtETimeFrom_0, MCPH_EMCPH_gridleavepackage_txtETimeTo_0, MCPH_EMCPH_gridleavepackage_txtWorkHrsReq_0
- Dropdowns/lists: InHH, InMM, InSS, MCPH_EMCPH_ddlGraceTime, OutHH, OutMM, OutSS, LateHH, LateMM, LateSS, Relaxation, Duration, Late, MGapTime, EGapTime, ExTimingPackage, AvailHeads, SelectedHeads, SalExPackage, MCPH_EMCPH_gridleavepackage_drpFreqMonth_0, MCPH_EMCPH_gridleavepackage_drpRestriction_0, MCPH_EMCPH_gridleavepackage_ddlApplyCountType_0, ExLeavePackage

### Payroll Setup
- URL: `Employee/Payroll Setup`
- Actions: Button, Add, Add To Grid, ▲, ▼,  Save , Print, X
- Input fields: CaseCSS, Leave, LeaveFrom, TimeFrom, LeaveTo, TimeTo, NumberFrom, LeaveConvertFrom, NumberTo, LeaveConvertTo, StartingYear, SalaryAttStFrom, DisableNumberOfDays, AutoCancelLeaveVal, BckDateAtt, reimbUptoDT, MCPH_EMCPH_GVLeaveClubbed_txtLeave1_0, MCPH_EMCPH_GVLeaveClubbed_txtLeaveID1_0, MCPH_EMCPH_GVLeaveClubbed_txtLeave2_0, MCPH_EMCPH_GVLeaveClubbed_txtLeaveID2_0, MCPH_EMCPH_GVLeaveClubbed_txtLeave1_1, MCPH_EMCPH_GVLeaveClubbed_txtLeaveID1_1, MCPH_EMCPH_GVLeaveClubbed_txtLeave2_1, MCPH_EMCPH_GVLeaveClubbed_txtLeaveID2_1, MCPH_EMCPH_gvMinDays_txtDayName_0, MCPH_EMCPH_gvMinDays_txtDayID_0, MCPH_EMCPH_gvMinDays_txtLeaveName_0, MCPH_EMCPH_gvMinDays_txtLeaveID_0, MCPH_EMCPH_gvMinDays_txtMinDays_0, MCPH_EMCPH_txtBackDate, MCPH_EMCPH_txtTimeOnDate, MCPH_EMCPH_txtFutureDate, MCPH_EMCPH_txtSancDays, MCPH_EMCPH_txtSancTime, MinMonth, ActDTFrom, ActDTTo, CompDTStart, MCPH_EMCPH_gvNoLeave_txtLeaveName_0, MCPH_EMCPH_gvNoLeave_txtNoLeaveDate_0
- Dropdowns/lists: drpMonth, drpLateExceedLimitMarkAbsent, drpExceedLimitdays, MCPH_EMCPH_drpAWIMarkAbsent, MCPH_EMCPH_drpAWIDeductLeave, MCPH_EMCPH_drpGWATLeaveMarkAbsent, MCPH_EMCPH_drpGWATLeaveDeductLeave, MCPH_EMCPH_drpAASLAbsent, MCPH_EMCPH_drpAASLDeduct, MCPH_EMCPH_drpMALintimeEntryMarkAbsent, drpMALintimeEntryDeductLeave, drpENMOMarkAbsent, drpENMODeductLeave, DrpMIAILMarkAbsent, drpMIAILDeductLeave

### PeerEvaluation
- URL: `Employee/PeerEvaluation`
- Actions: Date Change, Show, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Faculty, FacultyName, TTDate, EmpCodeView, EmpNameView, DFrom, DTo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### PMS Acadmic Calender
- URL: `Employee/PMS Acadmic Calender`
- Actions: Show, New Session, New Entry, Edit, X
- Input fields: CaseCSS, College, StartDate, EndDate, MCPH_EMCPH_gvPMSAcadmicCalender_txtGvEventName_0, MCPH_EMCPH_gvPMSAcadmicCalender_txtGvDateFrom_0, MCPH_EMCPH_gvPMSAcadmicCalender_txtGvDateTo_0

### PMS Activity
- URL: `Employee/PMS Activity`
- Actions: New Entry, Edit, X
- Input fields: CaseCSS, Category, MCPH_EMCPH_gvPMSActivity_txtActivityName_0

### PMS Activity Planning
- URL: `Employee/PMS Activity Planning`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, btnEventSet, X
- Input fields: CaseCSS, College, Session, Course, EmpCode, Empname, Dept, Desg, Joining, MCPH_EMCPH_GVActPlann_txtActCategoryID_0, MCPH_EMCPH_GVActPlann_txtActCategory_0, MCPH_EMCPH_GVActPlann_txtSesID_0, MCPH_EMCPH_GVActPlann_txtSession_0, MCPH_EMCPH_GVActPlann_txtPrgID_0, MCPH_EMCPH_GVActPlann_txtProgram_0, MCPH_EMCPH_GVActPlann_txtSemID_0, MCPH_EMCPH_GVActPlann_txtSemeter_0, MCPH_EMCPH_GVActPlann_txtActivityID_0, MCPH_EMCPH_GVActPlann_txtActivity_0, MCPH_EMCPH_GVActPlann_txtDesc_0, MCPH_EMCPH_GVActPlann_txtStDate_0, MCPH_EMCPH_GVActPlann_txtEndDate_0, MCPH_EMCPH_GVActPlann_txtNoOfStd_0
- Dropdowns/lists: SemType, MCPH_EMCPH_GVActPlann_ddlActType_0, MCPH_EMCPH_GVActPlann_ddlComp_0

### PMS Activity Planning Freeze
- URL: `Employee/PMS Activity Planning Freeze`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, btnEventSet, Freeze, X
- Input fields: CaseCSS, College, Session, Course, EmpCode, Empname, Dept, Desg, Joining, MCPH_EMCPH_GVActPlann_txtSesID_0, MCPH_EMCPH_GVActPlann_txtSession_0, MCPH_EMCPH_GVActPlann_txtPrgID_0, MCPH_EMCPH_GVActPlann_txtProgram_0, MCPH_EMCPH_GVActPlann_txtSemID_0, MCPH_EMCPH_GVActPlann_txtSemeter_0, MCPH_EMCPH_GVActPlann_txtActivityID_0, MCPH_EMCPH_GVActPlann_txtActivity_0, MCPH_EMCPH_GVActPlann_txtDesc_0, MCPH_EMCPH_GVActPlann_txtStDate_0, MCPH_EMCPH_GVActPlann_txtEndDate_0, MCPH_EMCPH_GVActPlann_txtExecDT_0, MCPH_EMCPH_GVActPlann_txtNoOfStd_0
- Dropdowns/lists: SemType, MCPH_EMCPH_GVActPlann_ddlActType_0, MCPH_EMCPH_GVActPlann_ddlComp_0, Rating

### PMS Activity Planning Rating
- URL: `Employee/PMS Activity Planning Rating`
- Actions: BindSelectedDetail, X
- Input fields: CaseCSS, Session
- Dropdowns/lists: SemType

### PMS Performance Score Card
- URL: `Employee/PMS Performance Score Card`
- Actions: X, Show, New Entry, Edit, BindSelectedDetail, Summary, Print Score Card, Freeze
- Input fields: CaseCSS, CalFrom, CalTo, College, Empname, MCPH_EMCPH_GVPers_txtEFactor_0, MCPH_EMCPH_GVPers_txtPmsPoints_0, MCPH_EMCPH_GVPers_txtPointAwarded_0

### PMS Responsibility
- URL: `Employee/PMS Responsibility`
- Actions: Edit, X
- Input fields: CaseCSS, MCPH_EMCPH_gvResponsibility_txtResponsibility_0
- Dropdowns/lists: MCPH_EMCPH_gvResponsibility_ddlType_0

### PO-PEO Master
- URL: `Employee/PO-PEO Master`
- Actions: Show, New Entry, Edit, Delete, BindSelectedDetail, BindSelected, Map, X, Map Group
- Input fields: CaseCSS, College, Session, Course, ClgNew, ClgNewId
- Dropdowns/lists: Type

### POPEOMatrix
- URL: `Employee/POPEOMatrix`
- Actions: Search, New Entry, Edit, Delete, X
- Input fields: CaseCSS, College, Session, Program, IDCode
- Dropdowns/lists: Type

### Previous Employment Salary
- URL: `Employee/Previous Employment Salary`
- Actions: Show, Refresh, Save, X
- Input fields: CaseCSS, IDCode, EmpCode1, name, Dept, EmpDOJ, College, Desg, EmpStatus, TechStatus, EmployerName, EmployerRefNo, EmployerPANNo, EmployerTANNo, FlatNo, Road, PinNo, Building, Locality, City, PDist, State, MCPH_EMCPH_gvSalaryDet_txtParticular_0, MCPH_EMCPH_gvSalaryDet_txtReceived_0, MCPH_EMCPH_gvSalaryDet_txtExempt_0, MCPH_EMCPH_gvSalaryDet_txtParticular_1, MCPH_EMCPH_gvSalaryDet_txtReceived_1, MCPH_EMCPH_gvSalaryDet_txtExempt_1, MCPH_EMCPH_gvSalaryDet_txtIfAnyAmount_1, MCPH_EMCPH_gvSalaryDet_txtParticular_2, MCPH_EMCPH_gvSalaryDet_txtReceived_2, MCPH_EMCPH_gvSalaryDet_txtExempt_2, MCPH_EMCPH_gvSalaryDet_txtParticular_3, MCPH_EMCPH_gvSalaryDet_txtReceived_3, MCPH_EMCPH_gvSalaryDet_txtExempt_3, MCPH_EMCPH_gvSalaryDet_txtParticular_4, MCPH_EMCPH_gvSalaryDet_txtReceived_4, MCPH_EMCPH_gvSalaryDet_txtExempt_4, MCPH_EMCPH_gvSalaryDet_txtParticular_5, MCPH_EMCPH_gvSalaryDet_txtReceived_5
- Dropdowns/lists: drpFinancial, EmployerStatus, MCPH_EMCPH_gvSalaryDet_ddlIfAnyYesNo_3

### Record Modification
- URL: `Employee/Record Modification`
- Actions: Show, Refresh, Show History, Save, X, OK
- Input fields: CaseCSS, IDCode, EmpCode1, name, Dept, EmpDOJ, College, Desg, EmpStatus, TechStatus, CreateDateTiming, Currentpckg, MCPH_EMCPH_txtIntime, MCPH_EMCPH_txtINtimeGrace, MCPH_EMCPH_txtLastTimeEntry, MCPH_EMCPH_txtNoLate, MCPH_EMCPH_txtOutTime, MCPH_EMCPH_txtLatetime, MCPH_EMCPH_txtRph, MCPH_EMCPH_txtMorningGap, MCPH_EMCPH_txtEveningGap, ChangeTimePckg, MCPH_EMCPH_txtChangeIntime, MCPH_EMCPH_txtChangeINTimeGrace, MCPH_EMCPH_txtChangeLastINTime, MCPH_EMCPH_txtNoOfLate, MCPH_EMCPH_txtOutTime1, MCPH_EMCPH_txtLastTimeDuration, MCPH_EMCPH_txtChangeRPH, MCPH_EMCPH_txtChngMorningGap, MCPH_EMCPH_txtChngEveningGap, effectivetime, CreateDateSalary, MCPH_EMCPH_txtCurrentSalaryPckg, MCPH_EMCPH_txtCurntMin, curntmin1, Curntmax, MCPH_EMCPH_txtDate, ChangeSalaryPckg, ChngMin
- Dropdowns/lists: DropDownList1, drpEmpType, drpEmpTypeNew, drpAllPakageType, EmpStatus, MCPH_EMCPH_drpEmpSortOrder

### Reimbursement Approval
- URL: `Employee/Reimbursement Approval`
- Actions: X, OK, Show, Approve, Reject, Reimburse, Cancel Reimbursement, Refresh, Add, Clear, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, MultiSelectSearchBase, College, Dept, Desg, EmpCode, EmpName, ExpenseFrom, ExpenseTo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Status, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Reimbursement Entry
- URL: `Employee/Reimbursement Entry`
- Actions: Show, Save, Clear, X, Add, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EmpCode, EmpName, College, Dept, Desg, Package, Amount, ExpenseDate, MCPH_EMCPH_fu1, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Status, Particular, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Responsibility Mapping
- URL: `Employee/Responsibility Mapping`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X
- Input fields: CaseCSS, College, MCPH_EMCPH_GVResMapping_txtEmpID_0, MCPH_EMCPH_GVResMapping_txtEmpName_0, MCPH_EMCPH_GVResMapping_txtEmpCode_0, MCPH_EMCPH_GVResMapping_txtResponsibilityID_0, MCPH_EMCPH_GVResMapping_txtResponsibility_0, MCPH_EMCPH_GVResMapping_txtStDate_0, MCPH_EMCPH_GVResMapping_txtEndDate_0

### Salary Calculation
- URL: `Employee/Salary Calculation`
- Actions: X, Final Hold, Projection, Make A/C JV, Save, Calculate, Trnf To Web, Un Freeze, Freeze, Show, Remove Web, Un Hold, Hold, Clear, Save Change, Print, Make A/C Entry, OK
- Input fields: CaseCSS, SCollege, SDepart, SDesign, SPackage, SEmpname, SEmpcode, From, DesgClass, EmpStatus, SCCollege, SCDepart, SCDesign, SCPackage, SCEmpname, SCEmpcode, SCHead, SCDate, TotalAmt, EmpTotal, College, Depart, Design, Package, Empname, Empcode, Bank, NetSalFrom, NetSalTo, SalDisDate, SalDisToDate, PayFDate, PayTDate, BankChequeNo, PaymentDate, ChequeAmt, AllRemark, ACollege, ADepart, ADesign
- Dropdowns/lists: MCPH_EMCPH_drpEmpSortOrder, MCPH_EMCPH_drpEmpPayMode, MCPH_EMCPH_ddlPayMode, ChequeBank, MCPH_EMCPH_PrntIDDF, MCPH_EMCPH_ddlMode

### Salary Calculation Manual
- URL: `Employee/Salary Calculation Manual`
- Actions: Show, Clear, Print, Save, Delete, X, OK, Final Copy
- Input fields: CaseCSS, College, Depart, Design, Package, Empname, Head, EmployeeStatus, Empcode, SCDate, NetAmountTot, TotEmp, MultiSelectSearchBase, NoDay
- Dropdowns/lists: MCPH_EMCPH_drpEmpSortOrder, Month, MonthLMS

### Salary Package
- URL: `Employee/Salary Package`
- Actions: X, ▼, ◄, Ok, Cancel, Save, Show Salary, Check Salary Impact, ..., OK, Calculate
- Input fields: CaseCSS, EarningList, DeductionList, P, A, W, HL, PLeave, UnLeave, TotalDay, BasicSal
- Dropdowns/lists: Heads, Operator, ddSalPkg, Months

### Subject Query Management
- URL: `Employee/Subject Query Management`
- Actions: Save, Show, X
- Input fields: CaseCSS, StUpload

### TDS Calculation
- URL: `Employee/TDS Calculation`
- Actions: X, OK, Show, TDS Calculate
- Input fields: CaseCSS, SCollege, SDepart, SDesign, SPackage, SEmpname, SEmpcode, From, DesgClass, EmployerName, MultiSelectSearchBase
- Dropdowns/lists: drpFinancial

### TDS Setup
- URL: `Employee/TDS Setup`
- Actions: New Entry, Edit, Delete, Investment Master, TDS Modification, X, Add Section, Save, Copy Section, Close
- Input fields: CaseCSS, MCPH_EMCPH_gridGrossIncome_grdtxtIncomeFrom_0, MCPH_EMCPH_gridGrossIncome_grdtxtIncomeTo_0, MCPH_EMCPH_gridGrossIncome_grdtxtPercentage_0, SectionLimit, MCPH_EMCPH_grdSectionDetails_grdtxtInst_0, MCPH_EMCPH_grdSectionDetails_grdtxtMaxLimit_0, SecNameNew, SecLimitNew
- Dropdowns/lists: TfFinancialYear, Type, FinYear, Section, NewSecFinYear

### TDSChallan
- URL: `Employee/TDSChallan`
- Actions: Submit, Select, Save, Clear, X
- Input fields: CaseCSS, EmpName, MCPH_EMCPH_grdTDSChallan_txtUpdateChallan_0, MCPH_EMCPH_grdTDSChallan_txtSecCode_0, MCPH_EMCPH_grdTDSChallan_txtTDS_0, MCPH_EMCPH_grdTDSChallan_txtSurCharge_0, MCPH_EMCPH_grdTDSChallan_txtEduCess_0, MCPH_EMCPH_grdTDSChallan_txtInterest_0, MCPH_EMCPH_grdTDSChallan_txtFee_0, MCPH_EMCPH_grdTDSChallan_txtPenalty_0, MCPH_EMCPH_grdTDSChallan_txtLstTotTax_0, MCPH_EMCPH_grdTDSChallan_txtTotAmt_0, MCPH_EMCPH_grdTDSChallan_txtCheque_0, MCPH_EMCPH_grdTDSChallan_txtBSRCode_0, MCPH_EMCPH_grdTDSChallan_txtLstDate_0, MCPH_EMCPH_grdTDSChallan_txtDateDeposit_0, MCPH_EMCPH_grdTDSChallan_txtTrnsfrVoucher_0, MCPH_EMCPH_grdTDSChallan_txtChallanSerialNo_0, MCPH_EMCPH_grdTDSChallan_txtInterestAllocated_0, MCPH_EMCPH_grdTDSChallan_txtOthers_0, MCPH_EMCPH_grdTDSChallan_txtChallanBalance_0, MCPH_EMCPH_txtSNo, MCPH_EMCPH_txtFY, MCPH_EMCPH_txtQuarter1, MCPH_EMCPH_txtSectionID
- Dropdowns/lists: drpFinancial, drpFrmName, drpQuarter, MCPH_EMCPH_grdTDSChallan_txtModeDeposit_0, MCPH_EMCPH_grdTDSChallan_txtMinorHead_0

### VisionMission
- URL: `Employee/VisionMission`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, Category, College
- Dropdowns/lists: Category
