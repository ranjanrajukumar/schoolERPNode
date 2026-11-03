# Utilities module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 60 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| AddPaymentGateway | Gap |
| Approval Setup | Likely covered |
| Approve_Doc | Gap |
| Assignment | Likely covered |
| Assignment Submission | Partial / check |
| BlackListedEntry | Gap |
| Button Access By Group Setup | Partial / check |
| Button Access By User Setup | Partial / check |
| CallingSetUp | Gap |
| College Maintenance Setup | Partial / check |
| Complaint Box | Gap |
| Customized Form | Partial / check |
| Customized Form Data | Partial / check |
| DataEntry Summary | Gap |
| Document Print Mail History | Likely covered |
| Document Viewer (Uploaded) | Partial / check |
| Documents Formatting | Partial / check |
| Edit Master Data | Likely covered |
| Employee Detail | Gap |
| Employee Notice | Partial / check |
| Event Management | Likely covered |
| Expense Approval | Likely covered |
| Feedback Administration | Partial / check |
| Feedback Questionnaire | Partial / check |
| frmAdvertisementPlan | Gap |
| frmChangePassword | Gap |
| frmSpecialReport | Gap |
| Gate Attendance Card | Likely covered |
| Gate Pass Entry | Likely covered |
| GI Manager | Gap |
| GIHome | Gap |
| Grid Panel | Gap |
| Grievance Cell Administration | Partial / check |
| Grievance Cell Monitoring | Partial / check |
| I-Sim Design | Likely covered |
| iCard Reissue | Gap |
| iCardAcknowledge | Gap |
| iCardCashTransfer | Gap |
| iCardPayment | Gap |
| Mail SMS Tool | Likely covered |
| Marks Analysis | Partial / check |
| Master_Doc_Approval | Likely covered |
| Merge Master Data | Partial / check |
| Mobile App Management | Likely covered |
| MySummary | Gap |
| News Alert | Partial / check |
| No Dues Verification | Partial / check |
| Question Bank | Gap |
| Role Management | Likely covered |
| Student Setup Detail | Likely covered |
| Student Web Management | Likely covered |
| Task Assignment Team | Partial / check |
| Task Management | Partial / check |
| Time Table Datewise | Partial / check |
| Time Table Setup(Manual) | Partial / check |
| TimeTableEntryNew | Gap |
| Today Birth Day | Gap |
| Update Licence | Partial / check |
| User Rights Management | Likely covered |
| User Role Management(Data) | Likely covered |

## Page details

### AddPaymentGateway
- URL: `Utilities/AddPaymentGateway`
- Actions: X, OK, New Entry, Edit, Delete
- Input fields: CaseCSS, ClientName, MCPH_UCPH_txtCollegeId, CollegeShortName, CollegeName, Program, GatewayName, GatewayVersion, MCPH_UCPH_txtMerchantId, MCPH_UCPH_txtMerchantKey, MCPH_UCPH_txtSaltKey, MCPH_UCPH_txtWorkingKey, MCPH_UCPH_txtAccessCode, GatewayWebsite, SuccessUrl, FailUrl, MCPH_UCPH_txtReconciliationUrl, ReceiptBankName, MultiSelectSearchBase
- Dropdowns/lists: GatewayStatus

### Approval Setup
- URL: `Utilities/Approval Setup`
- Actions: New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: ApprovalSetup, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Approve_Doc
- URL: `Utilities/Approve_Doc`
- Actions: Save, X
- Input fields: CaseCSS, MCPH_UCPH_gvDocAppDetail_txtRemark_0, MCPH_UCPH_gvDocAppDetail_txtRemark_1, MCPH_UCPH_gvDocAppDetail_txtRemark_2, MCPH_UCPH_gvDocAppDetail_txtRemark_3, MCPH_UCPH_gvDocAppDetail_txtRemark_4, MCPH_UCPH_gvDocAppDetail_txtRemark_5, MCPH_UCPH_gvDocAppDetail_txtRemark_6, MCPH_UCPH_gvDocAppDetail_txtRemark_7, MCPH_UCPH_gvDocAppDetail_txtRemark_8, MCPH_UCPH_gvDocAppDetail_txtRemark_9, MCPH_UCPH_gvDocAppDetail_txtRemark_10, MCPH_UCPH_gvDocAppDetail_txtRemark_11, MCPH_UCPH_gvDocAppDetail_txtRemark_12, MCPH_UCPH_gvDocAppDetail_txtRemark_13, MCPH_UCPH_gvDocAppDetail_txtRemark_14, MCPH_UCPH_gvDocAppDetail_txtRemark_15, MCPH_UCPH_gvDocAppDetail_txtRemark_16, MCPH_UCPH_gvDocAppDetail_txtRemark_17, MCPH_UCPH_gvDocAppDetail_txtRemark_18, MCPH_UCPH_gvDocAppDetail_txtRemark_19, MCPH_UCPH_gvDocAppDetail_txtRemark_20, MCPH_UCPH_gvDocAppDetail_txtRemark_21, MCPH_UCPH_gvDocAppDetail_txtRemark_22, MCPH_UCPH_gvDocAppDetail_txtRemark_23, MCPH_UCPH_gvDocAppDetail_txtRemark_24, MCPH_UCPH_gvDocAppDetail_txtRemark_25, MCPH_UCPH_gvDocAppDetail_txtRemark_26, MCPH_UCPH_gvDocAppDetail_txtRemark_27, MCPH_UCPH_gvDocAppDetail_txtRemark_28, MCPH_UCPH_gvDocAppDetail_txtRemark_29, MCPH_UCPH_gvDocAppDetail_txtRemark_30, MCPH_UCPH_gvDocAppDetail_txtRemark_31, MCPH_UCPH_gvDocAppDetail_txtRemark_32, MCPH_UCPH_gvDocAppDetail_txtRemark_33, MCPH_UCPH_gvDocAppDetail_txtRemark_34, MCPH_UCPH_gvDocAppDetail_txtRemark_35, MCPH_UCPH_gvDocAppDetail_txtRemark_36, MCPH_UCPH_gvDocAppDetail_txtRemark_37, MCPH_UCPH_gvDocAppDetail_txtRemark_38
- Dropdowns/lists: MCPH_UCPH_gvDocAppDetail_ddlStatus_0, MCPH_UCPH_gvDocAppDetail_ddlStatus_1, MCPH_UCPH_gvDocAppDetail_ddlStatus_2, MCPH_UCPH_gvDocAppDetail_ddlStatus_3, MCPH_UCPH_gvDocAppDetail_ddlStatus_4, MCPH_UCPH_gvDocAppDetail_ddlStatus_5, MCPH_UCPH_gvDocAppDetail_ddlStatus_6, MCPH_UCPH_gvDocAppDetail_ddlStatus_7, MCPH_UCPH_gvDocAppDetail_ddlStatus_8, MCPH_UCPH_gvDocAppDetail_ddlStatus_9, MCPH_UCPH_gvDocAppDetail_ddlStatus_10, MCPH_UCPH_gvDocAppDetail_ddlStatus_11, MCPH_UCPH_gvDocAppDetail_ddlStatus_12, MCPH_UCPH_gvDocAppDetail_ddlStatus_13, MCPH_UCPH_gvDocAppDetail_ddlStatus_14, MCPH_UCPH_gvDocAppDetail_ddlStatus_15, MCPH_UCPH_gvDocAppDetail_ddlStatus_16, MCPH_UCPH_gvDocAppDetail_ddlStatus_17, MCPH_UCPH_gvDocAppDetail_ddlStatus_18, MCPH_UCPH_gvDocAppDetail_ddlStatus_19, MCPH_UCPH_gvDocAppDetail_ddlStatus_20, MCPH_UCPH_gvDocAppDetail_ddlStatus_21, MCPH_UCPH_gvDocAppDetail_ddlStatus_22, MCPH_UCPH_gvDocAppDetail_ddlStatus_23, MCPH_UCPH_gvDocAppDetail_ddlStatus_24

### Assignment
- URL: `Utilities/Assignment`
- Actions:  , Assignment/Homework/Online Class Schedule, Previous Assignment/Home Work/Online Class Schedule, Review Assignment/Home Work/Online Submission, Final Submission, Close, Add New Option, Add To Grid, Upload &amp; Publish, Download, Print, Delete, OK, X, Add, Clear, rbSearchFor, Remove, Search
- Input fields: CaseCSS, UserId, EmpCode, College, Dept, EmpName, Status, Desg, assgFile, AssgName, StDate, EndDate, MCPH_UCPH_txtFromAmPm, MCPH_UCPH_txtToAmPm, Link, LinkURL, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, flag
- Dropdowns/lists: Type, FromHrs, FromMin, ToHrs, ToMin, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Assignment Submission
- URL: `Utilities/Assignment Submission`
- Actions: Download, Print, X
- Input fields: CaseCSS, UserId

### BlackListedEntry
- URL: `Utilities/BlackListedEntry`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, AadharNo, MobileNo, Name
- Dropdowns/lists: MCPH_UCPH_ddlStatus

### Button Access By Group Setup
- URL: `Utilities/Button Access By Group Setup`
- Actions: New Entry, Save, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, GName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Button Access By User Setup
- URL: `Utilities/Button Access By User Setup`
- Actions: Print, Unlock Now, New Entry, Save, Delete, Goup Detail, BindSelectedDetail, Encrypt Pwd, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, GName, UserName, EmpCode, EmpName, pass, conpass, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_UCPH_ddlModule, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### CallingSetUp
- URL: `Utilities/CallingSetUp`
- Actions: Save, X
- Input fields: CaseCSS, From, To, High, Medium, Low, DnotCall, NoOfAgent, NoOfCalls, MCPH_UCPH_grdCallStatus_txtCallFrom_0, MCPH_UCPH_grdCallStatus_txtCallTo_0, MCPH_UCPH_grdCallStatus_txtCallFrom_1, MCPH_UCPH_grdCallStatus_txtCallTo_1, MCPH_UCPH_grdCallStatus_txtCallFrom_2, MCPH_UCPH_grdCallStatus_txtCallTo_2, MCPH_UCPH_grdCallStatus_txtCallFrom_3, MCPH_UCPH_grdCallStatus_txtCallTo_3, MCPH_UCPH_grdCallStatus_txtCallFrom_4, MCPH_UCPH_grdCallStatus_txtCallTo_4, MCPH_UCPH_grdCallStatus_txtCallFrom_5, MCPH_UCPH_grdCallStatus_txtCallTo_5, MCPH_UCPH_grdCallStatus_txtCallFrom_6, MCPH_UCPH_grdCallStatus_txtCallTo_6
- Dropdowns/lists: MCPH_UCPH_gvCallingSetUp_ddlPriority_0, MCPH_UCPH_grdCallStatus_drpCallStatus_0, MCPH_UCPH_grdCallStatus_drpCallStatus_1, MCPH_UCPH_grdCallStatus_drpCallStatus_2, MCPH_UCPH_grdCallStatus_drpCallStatus_3, MCPH_UCPH_grdCallStatus_drpCallStatus_4, MCPH_UCPH_grdCallStatus_drpCallStatus_5, MCPH_UCPH_grdCallStatus_drpCallStatus_6

### College Maintenance Setup
- URL: `Utilities/College Maintenance Setup`
- Actions: Save, New Entry, Edit, Delete, X
- Input fields: CaseCSS, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_0, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_0, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_1, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_1, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_2, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_2, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_3, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_3, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_4, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_4, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_5, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_5, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_6, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_6, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_7, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_7, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_8, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_8, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_9, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_9, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_10, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_10, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_11, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_11, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_12, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_12, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_13, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_13, MCPH_UCPH_grdBuildingBlockIncharge_txtInchargeName_14, MCPH_UCPH_grdBuildingBlockIncharge_txtCoOrdinator_14, SelectAll, MCPH_UCPH_grdCoordinateComplaintto_txtnatureofComplaint_0, MCPH_UCPH_grdCoordinateComplaintto_txtempName_0, MCPH_UCPH_grdCoordinateComplaintto_txtnatureOfComplaintId_0, MCPH_UCPH_grdCoordinateComplaintto_txtEmpCode_0, MCPH_UCPH_grdCoordinateComplaintto_txtDepartment_0, MCPH_UCPH_grdCoordinateComplaintto_txtDesignation_0, MCPH_UCPH_grdCoordinateComplaintto_txtnatureofComplaint_1, MCPH_UCPH_grdCoordinateComplaintto_txtempName_1
- Dropdowns/lists: MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_0, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_1, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_2, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_3, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_4, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_5, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_6, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_7, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_8, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_9, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_10, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_11, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_12, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_13, MCPH_UCPH_grdBuildingBlockIncharge_ddlSearchControl_14

### Complaint Box
- URL: `Utilities/Complaint Box`
- Actions: New Entry, Submit, Delete, Assign, Print, Summary Show, X, Add, Clear, rbSearchFor, OK, Remove, Search, Download
- Input fields: CaseCSS, CodeAdm, College, DesgProg, Name, SesDept, ComplaintNo, ComplaintDate, ComplaintLoc, ComplaintNature, GoToComplaintNo, MCPH_UCPH_GridEmployee_txtNameFdwTo_0, MCPH_UCPH_GridEmployee_txtNameFdwTo_1, MCPH_UCPH_GridEmployee_txtNameFdwTo_2, MCPH_UCPH_GridEmployee_txtNameFdwTo_3, MCPH_UCPH_GridEmployee_txtNameFdwTo_4, MCPH_UCPH_GridEmployee_txtNameFdwTo_5, MCPH_UCPH_GridEmployee_txtNameFdwTo_6, MCPH_UCPH_GridEmployee_txtNameFdwTo_7, MCPH_UCPH_GridEmployee_txtNameFdwTo_8, MCPH_UCPH_GridEmployee_txtNameFdwTo_9, MCPH_UCPH_GridEmployee_txtNameFdwTo_10, MCPH_UCPH_GridEmployee_txtNameFdwTo_11, MCPH_UCPH_GridEmployee_txtNameFdwTo_12, MCPH_UCPH_GridEmployee_txtNameFdwTo_13, MCPH_UCPH_GridEmployee_txtNameFdwTo_14, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpProbStatus, drpInchargeStatus, drpStatusIncharge, DrpCoordinatorStatus, DrpEmployeeStatus, drpStatusEmployee, StatusTeam, ForTeam, drpUserStatus, drpAdminStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Customized Form
- URL: `Utilities/Customized Form`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EventName, StartDate, EndDate, MCPH_UCPH_grdCustomized_txtFieldName_0, MCPH_UCPH_grdCustomized_txtFieldType_0, MCPH_UCPH_grdCustomized_txtDefaultValue_0, MCPH_UCPH_grdCustomized_txtDescription_0, MCPH_UCPH_grdCustomized_txtAutoFilledField_0, MCPH_UCPH_grdCustomized_txtFieldName_1, MCPH_UCPH_grdCustomized_txtFieldType_1, MCPH_UCPH_grdCustomized_txtDefaultValue_1, MCPH_UCPH_grdCustomized_txtDescription_1, MCPH_UCPH_grdCustomized_txtAutoFilledField_1, MCPH_UCPH_grdCustomized_txtFieldName_2, MCPH_UCPH_grdCustomized_txtFieldType_2, MCPH_UCPH_grdCustomized_txtDefaultValue_2, MCPH_UCPH_grdCustomized_txtDescription_2, MCPH_UCPH_grdCustomized_txtAutoFilledField_2, MCPH_UCPH_grdCustomized_txtFieldName_3, MCPH_UCPH_grdCustomized_txtFieldType_3, MCPH_UCPH_grdCustomized_txtDefaultValue_3, MCPH_UCPH_grdCustomized_txtDescription_3, MCPH_UCPH_grdCustomized_txtAutoFilledField_3, MCPH_UCPH_grdCustomized_txtFieldName_4, MCPH_UCPH_grdCustomized_txtFieldType_4, MCPH_UCPH_grdCustomized_txtDefaultValue_4, MCPH_UCPH_grdCustomized_txtDescription_4, MCPH_UCPH_grdCustomized_txtAutoFilledField_4, MCPH_UCPH_grdCustomized_txtFieldName_5, MCPH_UCPH_grdCustomized_txtFieldType_5, MCPH_UCPH_grdCustomized_txtDefaultValue_5, MCPH_UCPH_grdCustomized_txtDescription_5, MCPH_UCPH_grdCustomized_txtAutoFilledField_5, MCPH_UCPH_grdCustomized_txtFieldName_6, MCPH_UCPH_grdCustomized_txtFieldType_6, MCPH_UCPH_grdCustomized_txtDefaultValue_6, MCPH_UCPH_grdCustomized_txtDescription_6, MCPH_UCPH_grdCustomized_txtAutoFilledField_6, FistCond
- Dropdowns/lists: MCPH_UCPH_grdCustomized_ddlFieldType_0, MCPH_UCPH_grdCustomized_ddlFieldType_1, MCPH_UCPH_grdCustomized_ddlFieldType_2, MCPH_UCPH_grdCustomized_ddlFieldType_3, MCPH_UCPH_grdCustomized_ddlFieldType_4, MCPH_UCPH_grdCustomized_ddlFieldType_5, MCPH_UCPH_grdCustomized_ddlFieldType_6, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Customized Form Data
- URL: `Utilities/Customized Form Data`
- Actions: Show, Print, X
- Input fields: CaseCSS
- Dropdowns/lists: EventName

### DataEntry Summary
- URL: `Utilities/DataEntry Summary`
- Actions: Show Summary, Print, X
- Input fields: CaseCSS, Date
- Dropdowns/lists: MCPH_UCPH_PrntID

### Document Print Mail History
- URL: `Utilities/Document Print Mail History`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Document Viewer (Uploaded)
- URL: `Utilities/Document Viewer (Uploaded)`
- Actions: Show, Download All, Download, X
- Input fields: CaseCSS, UserId, CollegeStudent, SessionStudent, ProgramStudent, SemesterStudent, AdmissionNoStudent, StudentNameStudent, EnqRegNo, EmpCode, EmpName, College, Dept, Desg
- Dropdowns/lists: Category, ModuleNameStudent, ModuleNameEmployee

### Documents Formatting
- URL: `Utilities/Documents Formatting`
- Actions: Upload, New Entry, Edit, Delete, Preview, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MCPH_UCPH_txtLetterName, MCPH_UCPH_txtPrintingHeader, MCPH_UCPH_txtRefNo, LetterType, StPhoto, DocumentUploadedDate, DocumentUploadedTime, MCPH_UCPH_grdDocumentFormatAttachment_ImageRefName_0, MCPH_UCPH_grdDocumentFormatAttachment_fu1_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_UCPH_ddlPrit, Category, MCPH_UCPH_lstFields, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Edit Master Data
- URL: `Utilities/Edit Master Data`
- Actions: Search, X
- Input fields: CaseCSS, MCPH_UCPH_txtKeyword, MCPH_UCPH_grdMasterNames_txtNewName_0, MCPH_UCPH_txtNewMaster
- Dropdowns/lists: MCPH_UCPH_ddlDisplayName

### Employee Detail
- URL: `Utilities/Employee Detail`
- Actions: Remove Official Info Right, Remove Package Info Right, Remove Leave Sanction Authorities Info Right, Remove Qualification Info Right, Remove Publications Info Right, Remove Documents Info Right, Remove Library Info Right, Remove Inventory Info Right, Remove Weekly Off Info Right, Remove Contact Info Right, Remove Other Work/Duties Info Right, Remove Emp CPI Info Right
- Labels on screen: Personal Information; Address; Official Information; Package Details; Employee Leave Sanction Authorities; Publication Details; Library Details; Inventory Details; Weekly Off Details; Contact Details; Other Work/Duties Details; Emp CPI Details; Current Timing Package; Current Basic Salary Range; Selected Heads; Emp. Wise Salary Head; Ideal Salary of the Employee; Current Leave Info; Current Perk Info; Current Reimburse Info; Current Loan Info

### Employee Notice
- URL: `Utilities/Employee Notice`
- Actions: Show, X
- Input fields: CaseCSS

### Event Management
- URL: `Utilities/Event Management`
- Actions: Upload, New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, EventDateFrom, EventDateTo, TimingFrom, TimingTo, EventName, EventVanue, Remark, SelectAll, SelectAllD, MCPH_UCPH_grdguest_txtGuestCatName_0, MCPH_UCPH_grdguest_txtName_0, MCPH_UCPH_grdguest_txtParticular_0, MCPH_UCPH_grdOrgMember_txtOrgCategoryName_0, MCPH_UCPH_grdOrgMember_txtEmpName_0, MCPH_UCPH_grdOrgMember_txtEmpCode_0, MCPH_UCPH_grdOrgMember_txtDepartment_0, MCPH_UCPH_grdOrgMember_txtDesignation_0, MCPH_UCPH_FileUpload1, IDCodeEM, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Expense Approval
- URL: `Utilities/Expense Approval`
- Actions: X, OK, Show, Approve, Reject, Add, Clear, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, MultiSelectSearchBase, College, Dept, Desg, EmpCode, EmpName, ExpenseFrom, ExpenseTo, TotalAmount, TotalPaid, TotalDue, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: ApprovalSetup, Status, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Feedback Administration
- URL: `Utilities/Feedback Administration`
- Actions: Show, ⇑, ⇓, New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FB_Name, DFrom, DTo, Att_From, Att_To, PerFrom, PerTo, PdpLecName, ColgName, Department, Desgination, MinLecture, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, DateFrom, DateTo
- Dropdowns/lists: MCPH_UCPH_ddlStatus, MCPH_UCPH_ddlCategory, AppliedTo, Substitue, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Feedback Questionnaire
- URL: `Utilities/Feedback Questionnaire`
- Actions: New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, GroupName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: CriteriaCategory, AppliedTo, CategoryType, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### frmAdvertisementPlan
- URL: `Utilities/frmAdvertisementPlan`
- Actions: Show, Save, Cancel, X
- Input fields: CaseCSS, DFrom, MCPH_UCPH_gvSubSource_txtSubSourceName_0, MCPH_UCPH_gvSubSource_txtSourceName_0, MCPH_UCPH_gvSubSource_txtSourceCategory_0, MCPH_UCPH_gvSubSource_txtRemark_0

### frmChangePassword
- URL: `Utilities/frmChangePassword`
- Actions: Save
- Input fields: UserID, EmpNameMaster, StudentName, EmpName, Consultant, oldpassword, newpassword, confirmnewpassword, answer
- Dropdowns/lists: ddQuestion
- Labels on screen: Logout; Change Password; Student; Consultant; User Name; Name; Old Password; New Password; Confirm Password; Secret Question; Answer; Password Must Include; F.A.Q.

### frmSpecialReport
- URL: `Utilities/frmSpecialReport`
- Actions: Show, Clear, Save, Delete, Search, X
- Input fields: CaseCSS, RptCategory, College, Session, Program, Sem, CTNature

### Gate Attendance Card
- URL: `Utilities/Gate Attendance Card`
- Input fields: Number
- Labels on screen: Name; Programme; Semester; Admission Number

### Gate Pass Entry
- URL: `Utilities/Gate Pass Entry`
- Actions: Take Photo, New Entry, Edit, BindSelectedDetail, Revisit, Print, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, RevistMob, MCPH_UCPH_txtSeqNo, Name, MobileNo, City, District, State, TextBox3, Country, ConPerson, NoOfPerson, OtrConPerson, Ve, InDate, OutDate, InTime, OutTime, StPhoto, MCPH_UCPH_txtAutoGenNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### GI Manager
- URL: `Utilities/GI Manager`
- Actions: Send Mail, Send SMS, Activate, Dormant, Deactivate, Save, Clear, X
- Input fields: CaseCSS, UserId, ClientId, ClientName, SystemId, MacId, PublicIp, Status, MCPH_UCPH_gvConDetails_txtPName_0, MCPH_UCPH_gvConDetails_txtEmail_0, MCPH_UCPH_gvConDetails_txtMobile_0, InstallDate, Version, LastUpdate, PayementDue, GraceUpto, SoftExp, Subject
- Dropdowns/lists: EmailCol, MsgCol

### GIHome
- URL: `Utilities/GIHome`
- Actions: Payment, Card Acknowledgement, Re-Issue, Cash Transfer
- Labels on screen: Administrator; Logout; Fee; Hostel; Inventory; Library; Mess; Student; Transport; Utilities

### Grid Panel
- URL: `Utilities/Grid Panel`
- Actions: Show, ⇑, ⇓, Save Sequence
- Input fields: Module, Page
- Labels on screen: Module Name; Page Name

### Grievance Cell Administration
- URL: `Utilities/Grievance Cell Administration`
- Actions: X, Map Now, New Entry, Edit, Delete, BindSelectedDetail, Map To, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, GrievanceNo, GrievanceName, AutoForward, SelectAll, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_0, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_0, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_1, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_1, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_2, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_2, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_3, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_3, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_4, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_4, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_5, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_5, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_6, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_6, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_7, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_7, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_8, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_8, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_9, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_9, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_10, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_10, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_11, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_11, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_12, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_12, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_13, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_13, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_14, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_14, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_15, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_15, MCPH_UCPH_GridForSessionCourse_txtSCEmpName_16, MCPH_UCPH_GridForSessionCourse_txtSCEmpCode_16
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Grievance Cell Monitoring
- URL: `Utilities/Grievance Cell Monitoring`
- Actions: Show, Save, Summary Show, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Download
- Input fields: CaseCSS, MEmpCode, MEmpName, MCollege, MDepart, MDesign, MStatus, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpGrievStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### I-Sim Design
- URL: `Utilities/I-Sim Design`
- Actions: X
- Input fields: CaseCSS

### iCard Reissue
- URL: `Utilities/iCard Reissue`
- Actions: NEXT, Save
- Input fields: AdmissionNo, Amount, RecAmount
- Labels on screen: Administrator; Scan; Re-Issue; Student Name; Admission No; College; Session; Program; Batch; Mobile No.; Mail Id; Fees Status; Card Status

### iCardAcknowledge
- URL: `Utilities/iCardAcknowledge`
- Actions: NEXT, Next
- Input fields: AdmissionNo, OTP, OTPMobile
- Labels on screen: Administrator; Logout; SCAN; VERIFY; Preview; Acknowledgement; Scan; Verify; Name; Adm. No; Guardian Name; Validity; DOB; Emergency No; College; Session; Program; Batch; Mobile; Mail Id; Official Mail Id; Blood Group; Address; City; State; District; Pin; Hostel; Floor; Room No; Accept & Confirm; Instructions; Print; Re-Generate OTP

### iCardCashTransfer
- URL: `Utilities/iCardCashTransfer`
- Actions: Show, Click here to download Excel..., Counter Close, Received, Transfer
- Input fields: FromDate, ToDate, RecGenerateAmount, CashInHandAmount
- Dropdowns/lists: DayENdUserWise, drpUserList
- Labels on screen: Administrator; Logout; Cash Collection; Search Summary; From; Total Collection Receipt Wise; DayEnd Of User; Transfer Authentication Required; Day Wise Collection; Total Cash in Hand; Transfer amount to User; Transfer Authentication Pending; Summary Detail; Close; Search Summary Detail; No Of admission Date wise; Day End Detail; User and Date wise Receipt Detail; User Wise; Date Wise

### iCardPayment
- URL: `Utilities/iCardPayment`
- Actions: NEXT, Next, Refresh Receipt, Print, Successfully Printed? (YES)
- Input fields: AdmissionNo, RecAmount, RecReturnAmt, DDNO, BankName, Date, RectNumber, PinNo
- Labels on screen: Please wait your request is in process.; Administrator; Logout; Scan; Verify; Collect; Print; Student Name; Admission No; College; Session; Program; Batch; Mobile No.; Mail Id; Cash; Demand Draft; Card Payment; CASH; Amount Tendered; For 1; For 200; For 500; For 1000; For 2000; Save; Card; Student Copy; Name; Adm No; Date; Amt. Tendered; Amt. Returned; Ref. No.; Mode; Acknowledgement Copy

### Mail SMS Tool
- URL: `Utilities/Mail SMS Tool`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Module, Page, MailSubject, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpApplyOn, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Marks Analysis
- URL: `Utilities/Marks Analysis`
- Actions: Show, Print, X, OK
- Input fields: CaseCSS, College, Session, Program, Semester, ExamName, ExamNameInt, MultiSelectSearchBase
- Dropdowns/lists: MarksAnalysisRpt

### Master_Doc_Approval
- URL: `Utilities/Master_Doc_Approval`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, MCPH_UCPH_grddocMaster_txtDocName_0, MCPH_UCPH_grddocMaster_txtDocID_0, MCPH_UCPH_grddocMaster_txtFee_0, MCPH_UCPH_grddocMaster_txtAuthName_0, MCPH_UCPH_grddocMaster_txtAuth_0, MCPH_UCPH_grddocMaster_txtOpen_0, MCPH_UCPH_grddocMaster_txtDocName_1, MCPH_UCPH_grddocMaster_txtDocID_1, MCPH_UCPH_grddocMaster_txtFee_1, MCPH_UCPH_grddocMaster_txtAuthName_1, MCPH_UCPH_grddocMaster_txtAuth_1, MCPH_UCPH_grddocMaster_txtOpen_1, MCPH_UCPH_grddocMaster_txtDocName_2, MCPH_UCPH_grddocMaster_txtDocID_2, MCPH_UCPH_grddocMaster_txtFee_2, MCPH_UCPH_grddocMaster_txtAuthName_2, MCPH_UCPH_grddocMaster_txtAuth_2, MCPH_UCPH_grddocMaster_txtOpen_2, MCPH_UCPH_grddocMaster_txtDocName_3, MCPH_UCPH_grddocMaster_txtDocID_3, MCPH_UCPH_grddocMaster_txtFee_3, MCPH_UCPH_grddocMaster_txtAuthName_3, MCPH_UCPH_grddocMaster_txtAuth_3, MCPH_UCPH_grddocMaster_txtOpen_3
- Dropdowns/lists: MCPH_UCPH_grddocMaster_ddlStatus_0, MCPH_UCPH_grddocMaster_ddlStatus_1, MCPH_UCPH_grddocMaster_ddlStatus_2, MCPH_UCPH_grddocMaster_ddlStatus_3

### Merge Master Data
- URL: `Utilities/Merge Master Data`
- Actions: Show, X
- Input fields: CaseCSS, Box, Rb
- Dropdowns/lists: DataMerge

### Mobile App Management
- URL: `Utilities/Mobile App Management`
- Actions: X, OK, Show, Remove Rights, Activate Rights
- Input fields: CaseCSS, MultiSelectSearchBase, CollegeS, SessionS, ProgramS, SemesterS, AdmissionNoS, StudentNameS
- Dropdowns/lists: MCPH_UCPH_ddlCategory, Status, RightsS

### MySummary
- URL: `Utilities/MySummary`
- Actions: X
- Input fields: CaseCSS, UserId, flag

### News Alert
- URL: `Utilities/News Alert`
- Actions: Save, X
- Input fields: CaseCSS, MCPH_UCPH_GridForCollegeAlerts_lblCollege_0, MCPH_UCPH_GridForCollegeAlerts_lblTitle_0, MCPH_UCPH_GridForCollegeAlerts_txtCollegeId_0, MCPH_UCPH_GridForCollegeAlerts_lblHeading_0, MCPH_UCPH_GridForCollegeAlerts_lblUpdateDate_0, MCPH_UCPH_GridForCollegeAlerts_lblExpiry_0, MCPH_UCPH_GridForCollegeAlerts_lblImagePath_0, MCPH_UCPH_GridForCollegeAlerts_lblCollege_1, MCPH_UCPH_GridForCollegeAlerts_lblTitle_1, MCPH_UCPH_GridForCollegeAlerts_txtCollegeId_1, MCPH_UCPH_GridForCollegeAlerts_lblHeading_1, MCPH_UCPH_GridForCollegeAlerts_lblUpdateDate_1, MCPH_UCPH_GridForCollegeAlerts_lblExpiry_1, MCPH_UCPH_GridForCollegeAlerts_lblImagePath_1
- Dropdowns/lists: MCPH_UCPH_GridForCollegeAlerts_ddlReadStatus_0, MCPH_UCPH_GridForCollegeAlerts_ddlStatus_0, MCPH_UCPH_GridForCollegeAlerts_ddlReadStatus_1, MCPH_UCPH_GridForCollegeAlerts_ddlStatus_1

### No Dues Verification
- URL: `Utilities/No Dues Verification`
- Actions: .:., Load, Update Remark, Print, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Question Bank
- URL: `Utilities/Question Bank`
- Actions:  , Add New Question, Save, Add New Option, Upload, Show, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, UserId, EmpCode, College, Dept, EmpName, Status, Desg, assgFile, SPCollege, SPSession, SPProgram, SPSemester, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print
- Labels on screen: Please wait your request is in process.

### Role Management
- URL: `Utilities/Role Management`
- Actions: X, OK, Show, New Entry, Edit, Delete, Add, Clear, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, MultiSelectSearchBase, RoleName, PrmNo, UserRoleName, College, Depart, Design, UserNameRole, SelectAll, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Teach, isDisabled, drpStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Student Setup Detail
- URL: `Utilities/Student Setup Detail`
- Actions: Save, Show, Save Rights, X
- Input fields: CaseCSS, ER, ERA, StdRptFrom, StdRptTo, Age, ExamBest, NDCERA, OpenManualSession, NextDueDT, MarksDataFrom, MarksDataTo, DuesUpTO, MinRegFee, ProspectusFeeMin, DashBoardStartDate, HostelFrom, HostelTo, TransFrom, TransTo, MCPH_UCPH_gvQuotaWiseFee_txtRegFeeQuota_0, MCPH_UCPH_gvQuotaWiseFee_txtQuotaProsAmt_0, MCPH_UCPH_gvQuotaWiseFee_txtRegFeeQuota_1, MCPH_UCPH_gvQuotaWiseFee_txtQuotaProsAmt_1, MCPH_UCPH_gvQuotaWiseFee_txtRegFeeQuota_2, MCPH_UCPH_gvQuotaWiseFee_txtQuotaProsAmt_2, MCPH_UCPH_gvQuotaWiseFee_txtRegFeeQuota_3, MCPH_UCPH_gvQuotaWiseFee_txtQuotaProsAmt_3, MCPH_UCPH_gvQuotaWiseFee_txtRegFeeQuota_4, MCPH_UCPH_gvQuotaWiseFee_txtQuotaProsAmt_4, MCPH_UCPH_gvQuotaWiseFee_txtRegFeeQuota_5, MCPH_UCPH_gvQuotaWiseFee_txtQuotaProsAmt_5, Duesdate, Balance, MCPH_UCPH_gvServices_txtserviceDT_0, MCPH_UCPH_gvServices_txtBalanceService_0, MCPH_UCPH_gvServices_txtserviceDT_1, MCPH_UCPH_gvServices_txtBalanceService_1, MCPH_UCPH_gvServices_txtserviceDT_2, MCPH_UCPH_gvServices_txtBalanceService_2

### Student Web Management
- URL: `Utilities/Student Web Management`
- Actions: .:., Load, Reset Password, Make User Name And AdmNo Same, Create User, X, OK, Clear, Show, Disable User, Suspended User, Enable User, Activate Mobile App, Add, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MultiSelectSearchBase, College, Session, Program, Semester, Category, Quota, SubQuota, AdmUnder, Admission, StdName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: ddGender, UserStatus, Disabled, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Task Assignment Team
- URL: `Utilities/Task Assignment Team`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, SearchName, SearchCode, EmpStatus, College, Department, Designation, MCPH_UCPH_grdTaskAssignTeam_txtEmpCode_0, MCPH_UCPH_grdTaskAssignTeam_txtEmpID_0, MCPH_UCPH_grdTaskAssignTeam_txtEmpName_0, MCPH_UCPH_grdTaskAssignTeam_txtCollg_0, MCPH_UCPH_grdTaskAssignTeam_txtDept_0, MCPH_UCPH_grdTaskAssignTeam_txtDesgn_0, MCPH_UCPH_grdTaskAssignTeam_txtStatus_0, MCPH_UCPH_grdTaskAssignTeam_txtEmpCode_1, MCPH_UCPH_grdTaskAssignTeam_txtEmpID_1, MCPH_UCPH_grdTaskAssignTeam_txtEmpName_1, MCPH_UCPH_grdTaskAssignTeam_txtCollg_1, MCPH_UCPH_grdTaskAssignTeam_txtDept_1, MCPH_UCPH_grdTaskAssignTeam_txtDesgn_1, MCPH_UCPH_grdTaskAssignTeam_txtStatus_1, MCPH_UCPH_grdTaskAssignTeam_txtEmpCode_2, MCPH_UCPH_grdTaskAssignTeam_txtEmpID_2, MCPH_UCPH_grdTaskAssignTeam_txtEmpName_2, MCPH_UCPH_grdTaskAssignTeam_txtCollg_2, MCPH_UCPH_grdTaskAssignTeam_txtDept_2, MCPH_UCPH_grdTaskAssignTeam_txtDesgn_2, MCPH_UCPH_grdTaskAssignTeam_txtStatus_2

### Task Management
- URL: `Utilities/Task Management`
- Actions: Show, X, New Entry, Edit, Delete, FillTaskNo, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MEmpCode, MEmpName, MCollege, MDepart, MDesign, MStatus, TaskNo, TaskDate, EmpCode, EmpName, College, Depart, Design, MobileNo, TargetDate, CompletionDate, SrchTaskNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Time Table Datewise
- URL: `Utilities/Time Table Datewise`
- Actions: Show, New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, TimeSlotHead, College, Session, Group, TimeTableDate, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, FacCode, FacName, Hallno
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Time Table Setup(Manual)
- URL: `Utilities/Time Table Setup(Manual)`
- Actions: View, Fill Cell, New Entry, Save,  Delete ,  Deactivate , Map, Print, Print All, Vacant Hall, Add Faculty, X, Submit, Close, OK, Show Active Time Table, Deactivate, Show, Change Room, Add, Clear, rbSearchFor, Remove, Search, Map Group
- Input fields: CaseCSS, CollegeID, College, GSessionId, GSessionTxt, GGrpId, GGrpTxt, EffectiveFrom, EffDate, EffectiveToTT, IdFaculty, Faculity, SubId, SubType, SubCompEle, Subject, HallId, Hall, EffectiveToTTFinal, ActiveAsOnDT, EffectiveToTTChangeStatus, RoomNoOld, RoomAsOnDate, MCPH_UCPH_txtRoomNoNew, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, DateFrom, DateTo, DateReport, AddIdFaculty, AddFaculity, DayIdFrom, DayFrom, OnEffDate
- Dropdowns/lists: drpSlotHead, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### TimeTableEntryNew
- URL: `Utilities/TimeTableEntryNew`
- Actions: Search, View, Fill Cell, New Entry, Save,  Delete ,  Deactivate , Map, Print, Print All, Vacant Hall, Add Faculty, X, Submit, Close, OK, Show Active Time Table, Deactivate, Show, Change Room, Transfer TimeTable, Add, Clear, rbSearchFor, Remove, Map Group
- Input fields: CaseCSS, College, SessionTxt, GrpText, ActiveAsOnDT, EffDate, EffectiveToTT, IdFaculty, FacultyCode, Faculity, SubId, SubType, SubCompEle, SubjectCode, Subject, HallId, Hall, EffectiveToTTFinal, AddIdFaculty, AddFaculity, ActiveAsOnDTNew, EffectiveToTTChangeStatus, RoomNoOld, RoomAsOnDate, MCPH_UCPH_txtRoomNoNew, TransferDate, TransferFaculity, TransFacultyCode, TransFacultyCollege, TransFacultyDepartment, TransFacultyDesignation, TrnsTTTofacultyID, TrnsTTToFacultyCode, TrnsTTToFacultyCollege, TrnsTTToFacultyDepartment, TrnsTTToFacultyDesignation, FistCond, Date1, SecondCond, Date2
- Dropdowns/lists: drpSlotHead, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Today Birth Day
- URL: `Utilities/Today Birth Day`
- Labels on screen: DEEPAK DUNGRIYAL

### Update Licence
- URL: `Utilities/Update Licence`
- Actions: Update License
- Input fields: InstallationDate, LastUpdate, Remaining, VersionInstalled, ComponentInstalled
- Labels on screen: Logout; Home; Update License; Installation Date; Last Update; No Of Remaining Days to Recharge; Version Installed; Component Installed; Day Used Since Last Update; Remaining Days To Recharge

### User Rights Management
- URL: `Utilities/User Rights Management`
- Actions: Show, Save, Delete, X
- Input fields: CaseCSS, GName, ColgName, UserName, Module, FormName
- Dropdowns/lists: MCPH_UCPH_ddlModule, MCPH_UCPH_ddlRights, MCPH_UCPH_ddlCategory, MCPH_UCPH_drpUserStatus, MCPH_UCPH_ddlGroupName

### User Role Management(Data)
- URL: `Utilities/User Role Management(Data)`
- Actions: Show, X, OK, Save
- Input fields: CaseCSS, UserName, PrmNo, MultiSelectSearchBase
