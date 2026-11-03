# Fee module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 31 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| Add Cheque Bounce Info | Gap |
| All Student Dues | Partial / check |
| ChequeDDRecordByPost | Gap |
| Common Receipt | Partial / check |
| Create Dues | Gap |
| Currency Category | Gap |
| Fee Adjustment | Gap |
| Fee Authentication | Gap |
| Fee Head Master | Gap |
| Fee Relaxation(Dated) | Gap |
| Fee Waiver | Gap |
| FeeModificationStdWise | Gap |
| Fees Manipulation | Partial / check |
| FundsTransfer | Gap |
| GenerateChallan | Gap |
| HostelReceipt | Gap |
| Misc Dues Creation | Gap |
| NEFT Report | Gap |
| OFee Write Off Other | Partial / check |
| OnlinePaymentMode | Gap |
| Other Source Fee Received | Partial / check |
| Refund | Gap |
| Refund Status | Gap |
| Registration Fee | Likely covered |
| Registration Fee Refund | Partial / check |
| Scholarship | Gap |
| Scholarship on Dues | Gap |
| Semester Mapping | Gap |
| Structure Detail | Likely covered |
| Student Pocket Money | Partial / check |
| Write off | Gap |

## Page details

### Add Cheque Bounce Info
- URL: `Fee/Add Cheque Bounce Info`
- Actions: X, btnHandlePostback, New Entry, Edit, BindSelectedDetail, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Make A/c Entry
- Input fields: CaseCSS, ChequeNum, BDate, MCPH_FCPH_txtRefNo, MCPH_FCPH_txtFYRefNo, ReceiptNo, ReceiptDate, MCPH_FCPH_txtAdmNo, MCPH_FCPH_txtSession, MCPH_FCPH_txtStdName, MCPH_FCPH_txtProgram, MCPH_FCPH_txtCollege, MCPH_FCPH_txtSem, BankName, DDDate, ChequeNo, DDAmount, MCPH_FCPH_grdDues_txtGrid_0, ReceiveAmt, RevertAmt, RevInAcc, PenaltyAmt, UnderHead, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### All Student Dues
- URL: `Fee/All Student Dues`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Summary, Print
- Input fields: CaseCSS, From, To, DuesCreatedBTF, DuesCreatedBTT, DuesNotCreatedBTF, DuesNotCreatedBTT, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: DuesParticular, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### ChequeDDRecordByPost
- URL: `Fee/ChequeDDRecordByPost`
- Actions: New Entry, Edit, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, No, BankName, Amount, Date, PaybleAt, EnqNo, AdmNo, StdName, FatherName, MobileNo, RecivedBy, ReceivedDate, RefNo, Idcode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Common Receipt
- URL: `Fee/Common Receipt`
- Actions: X, New Entry, Edit, Print, btnHandlePostback, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, Receipt, College, FyRefNo, AdmEmp, ReceiptFrom, Receiptdate, OnAccount, FeeHead, CashAmount, Bank, PayableAt, No, Date, Amt, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpCategory, drpPaymentMode, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Create Dues
- URL: `Fee/Create Dues`
- Actions: Create, Clear, Show, Show1, Update, X, OK
- Input fields: CaseCSS, hdnTabIndex, College, Session, Program, Semester, Category, Quota, SubQuota, Status, SubStatus, AllotedCat, AllotedSubCat, AdmUnder, AdmissionNo, StudentName, MultiSelectSearchBase
- Dropdowns/lists: ddGender, Migrated, ddYear

### Currency Category
- URL: `Fee/Currency Category`
- Actions: Save, Delete, BindSelectedDetail, X
- Input fields: CaseCSS, Category, MCPH_FCPH_gvCurrencyDetails_txtDateFrom_0, MCPH_FCPH_gvCurrencyDetails_txtDateTo_0, CurrValue

### Fee Adjustment
- URL: `Fee/Fee Adjustment`
- Actions: Search Student, New Entry, Edit, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MCPH_FCPH_txtRefNo, MCPH_FCPH_txtfyRefNo, TrnsDate, College, Session, Program, Semester, Quota, SubQuota, AdmissionNo1, StudentName, TotalAdjAmount, MCPH_FCPH_gridItemDetails_txtAmount_0, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_FCPH_ddlFeeAdjSource, Filter, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Fee Authentication
- URL: `Fee/Fee Authentication`
- Actions: Show, Authenticate, Revert, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FeeHead, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: ProcessName, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Fee Head Master
- URL: `Fee/Fee Head Master`
- Actions: ▲, ▼, New Entry , Edit, Delete, Search, X, Add, Clear, rbSearchFor, OK, Remove, Print
- Input fields: CaseCSS, HeadName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: HeadCategory, ddType, drpFeeType, MCPH_FCPH_lstHeadName, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Fee Relaxation(Dated)
- URL: `Fee/Fee Relaxation(Dated)`
- Actions: .:., Load, New Entry, Edit, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Make A/c Entry
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MCPH_FCPH_txtRefNo, TransDate, MCPH_FCPH_txtFYRefNo, NextDueDt, ApprovalBy, Cancel, CalPerAgeAmont, MCPH_FCPH_grdWriteOffData_txtGrid_0, MCPH_FCPH_grdWriteOffData_txtGrid_1, MCPH_FCPH_grdWriteOffData_txtGrid_2, MCPH_FCPH_grdWriteOffData_txtGrid_3, MCPH_FCPH_grdWriteOffData_txtGrid_4, TotalAmount, TransferAmt, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_FCPH_ddDateFrom, MCPH_FCPH_ddDateTo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Fee Waiver
- URL: `Fee/Fee Waiver`
- Actions: .:., Load, New Entry, Edit, Print, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MCPH_FCPH_txtRefNo, TransDate, MCPH_FCPH_txtFYRefNo, ApprovalBy, CalPerAgeAmont, MCPH_FCPH_grdWriteOffData_txtGrid_0, MCPH_FCPH_grdWriteOffData_txtGrid_1, TotalAmount, TransferAmt, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_FCPH_ddDateFrom, MCPH_FCPH_ddDateTo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### FeeModificationStdWise
- URL: `Fee/FeeModificationStdWise`
- Actions: .:., Load, New Entry, X
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, TransDate, ApprovalBy, TotalSchol, TotalWriteOff, TotalWaiver
- Dropdowns/lists: MCPH_FCPH_ddDateFrom, MCPH_FCPH_ddDateTo

### Fees Manipulation
- URL: `Fee/Fees Manipulation`
- Actions: Write off, Scholarship, Fund Transfer, Fee Waiver, Clear, Save, X, OK
- Input fields: CaseCSS, College, Session, Program, AdmUnder, Semester, Category, Status, AllotedCat, Quota, SubQuota, SubStatus, SubCat, AdmNo, StudentName, FFromDate, FToDate, TFromDate, TToDate, PercentCal, TransDateWriteOff, PercentCalSch, TransDateScholarship, PercentCalFund, TransDateFundTransfer, PercentCalWaiver, TransDateWaiver, MultiSelectSearchBase
- Dropdowns/lists: ddGender, FromFeeHead, ToFeeHead

### FundsTransfer
- URL: `Fee/FundsTransfer`
- Actions: .:., Load, New Entry, Edit, Print, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MCPH_FCPH_txtRefNo, TransDate, MCPH_FCPH_txtFYRefNo, MCPH_FCPH_grdfundTrnfData_txtGrid_0, TotalAmount, TransferAmt, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: BalTransferType, MCPH_FCPH_ddDateFrom, MCPH_FCPH_ddDateTo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### GenerateChallan
- URL: `Fee/GenerateChallan`
- Actions: .:., Load, New Entry, Edit, Print, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, RefNo, FYRefNo, Date, BalAmt, PayAmt, Cancel, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### HostelReceipt
- URL: `Fee/HostelReceipt`
- Actions: X, .:., Load, Submit, New Entry, Edit, Print, Print (Pre Printed), Send(Pending Mail), BindSelectedDetail, btnHandlePostback, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry, Email Receipt
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, RefNo, FYRefNo, Adjustable, HdnAdjRcptNo, TransDate, Registration, TotalNoteCtr, CurrAmtSumm, jsonBankDtl, jsonOthers, HeadAdjustable, CurrencyValue, Cash, Bank, TotCashBank, TotToBeRec, TotalReceived, jsonDuesData, TotalDues, HeadwiseReceived, TotalBalance, TotalAdjustable, Cancel, RecID, PanNo, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, DateFrom
- Dropdowns/lists: drpInstlOf, drpFeeSem, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID, drpReceiptMail

### Misc Dues Creation
- URL: `Fee/Misc Dues Creation`
- Actions: Clear, Show, Update, Create, Delete, X, OK
- Input fields: CaseCSS, College, Session, Program, Semester, Category, Quota, SubQuota, Status, SubStatus, AllotedCat, AllotedSubCat, AdmUnder, AdmissionNo, StudentName, AnyDuesFrom, AnyDuesTo, AnyDuesAmtFrom, AnyDuesAmtTo, Amount, Date, MultiSelectSearchBase
- Dropdowns/lists: Migrated, ddGender, drpHeadName, drpDrCr

### NEFT Report
- URL: `Fee/NEFT Report`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Accepted, Rejected
- Input fields: CaseCSS, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### OFee Write Off Other
- URL: `Fee/OFee Write Off Other`
- Actions: .:., Load, Show, New Entry, Edit, Print, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, FeeAdjSource, MCPH_FCPH_txtRefNo, TransDate, MCPH_FCPH_txtFYRefNo, Cancel, TotalAmount, TransferAmt, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### OnlinePaymentMode
- URL: `Fee/OnlinePaymentMode`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, ModeName, Category
- Dropdowns/lists: MCPH_FCPH_lstHeadName

### Other Source Fee Received
- URL: `Fee/Other Source Fee Received`
- Actions: New Entry, Edit, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Make A/c Entry
- Input fields: CaseCSS, ReceiptNo, FyRefNO, ReceiptDate, College, DemandFrom, CashAmount, GoReceiptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_FCPH_ddlPaymentMode, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Refund
- URL: `Fee/Refund`
- Actions: X, .:., Load, New Entry, Edit, Print, Print (With Desc), BindSelectedDetail, btnHandlePostback, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, RefundNum, Date, FYRefNo, ApprovalBy, DDDate, ChequeNo, DDAmount, TotalAmount, MCPH_FCPH_gvData_txtAmount_0, MCPH_FCPH_gvData_txtAmount_1, MCPH_FCPH_gvData_txtAmount_2, FeeS, MCPH_FCPH_txtGoRefundNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: PaymentMode, MCPH_FCPH_ddlBank, MCPH_FCPH_ddDateFrom, MCPH_FCPH_ddDateTo, MCPH_FCPH_ddlCollegeTo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Refund Status
- URL: `Fee/Refund Status`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Update
- Input fields: CaseCSS, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames

### Registration Fee
- URL: `Fee/Registration Fee`
- Actions: X, Submit, New Entry, Edit, Print, BindSelectedDetail, btnHandlePostback, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry, Email Receipt
- Input fields: CaseCSS, MCPH_FCPH_txtRcptNo, EntryFrom, MCPH_FCPH_txtFYRefNo, enquirydate, RcptDate, FatherName, RegNo, EnquiryNo, AppFormNo, StdName, AdmissionNo, ProsFee, RegCollege, RegFee, RegStatus, TotFee, Transfered, FeeLocation, Refunded, TotalNoteCtr, CurrAmtSumm, jsonOthers, TotCash, fieldTitle_75, TotCashBank, TotToBeRec, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, MCPH_FCPH_grdAmount_txtAmount_0
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Registration Fee Refund
- URL: `Fee/Registration Fee Refund`
- Actions: New Entry, Edit, Print, Print(With Desc), BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, MCPH_FCPH_txtRefNo, MCPH_FCPH_txttxtRefNoPrevious, enquirydate, MCPH_FCPH_txtFYRefNo, FatherName, RefDate, EnquiryNo, StudentID, RegNo, AdmissionNo, StdName, RegCollege, RegStatus, MCPH_FCPH_gvStdRegsRef_txtRefPros_0, MCPH_FCPH_gvStdRegsRef_txtRefReg_0, MCPH_FCPH_gvStdRegsRef_txtRefTotal_0, TotalAmount, CashAmount, DDDate, ChequeNo, DDAmount, FavourOf, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: PaymentMode, MCPH_FCPH_ddlBank, MCPH_FCPH_ddlChequeNo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Scholarship
- URL: `Fee/Scholarship`
- Actions: .:., Load, New Entry, Edit, btnHandlePostback, BindSelectedDetail, Search Status, Accept, Reject, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MCPH_FCPH_txtRefNo, ApplyDate, MCPH_FCPH_txtfyRefNo, MCPH_FCPH_txtDOScholar, MCPH_FCPH_txtFYIncome, DemandFrom, SrchRcptNo, College, Session, Program, Semester, Quota, SubQuota, SDemand, AdmissionNo1, StudentNames, AccRejDate, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Scholarship on Dues
- URL: `Fee/Scholarship on Dues`
- Actions: .:., Load, New Entry, Edit, Print, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MCPH_FCPH_txtRefNo, TransDate, MCPH_FCPH_txtFYRefNo, ApprovalBy, SchlID, CalPerAgeAmont, MCPH_FCPH_grdSchlData_txtScholarship_0, TotalAmount, TransferAmt, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_FCPH_ddDateFrom, MCPH_FCPH_ddDateTo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Semester Mapping
- URL: `Fee/Semester Mapping`
- Actions: Show, New Entry, Edit, Delete, Map, X, Submit
- Input fields: CaseCSS, College, Session, MCPH_FCPH_GVSemmapping_txtDateFrom_0, MCPH_FCPH_GVSemmapping_txtDateTo_0, MCPH_FCPH_GVSemmapping_txtDateFrom_1, MCPH_FCPH_GVSemmapping_txtDateTo_1, MCPH_FCPH_GVSemmapping_txtDateFrom_2, MCPH_FCPH_GVSemmapping_txtDateTo_2, MCPH_FCPH_GVSemmapping_txtDateFrom_3, MCPH_FCPH_GVSemmapping_txtDateTo_3, MCPH_FCPH_GVSemmapping_txtDateFrom_4, MCPH_FCPH_GVSemmapping_txtDateTo_4, MCPH_FCPH_GVSemmapping_txtDateFrom_5, MCPH_FCPH_GVSemmapping_txtDateTo_5, MCPH_FCPH_GVSemmapping_txtDateFrom_6, MCPH_FCPH_GVSemmapping_txtDateTo_6, MCPH_FCPH_GVSemmapping_txtDateFrom_7, MCPH_FCPH_GVSemmapping_txtDateTo_7, MCPH_FCPH_GVSemmapping_txtDateFrom_8, MCPH_FCPH_GVSemmapping_txtDateTo_8, MCPH_FCPH_GVSemmapping_txtDateFrom_9, MCPH_FCPH_GVSemmapping_txtDateTo_9
- Dropdowns/lists: drpStructure

### Structure Detail
- URL: `Fee/Structure Detail`
- Actions: Map Group, New Entry, Edit, Delete, NA, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FeeHead, FeeHeadId, Amount, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpMonth, drpDueDate, drpPeriod, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Student Pocket Money
- URL: `Fee/Student Pocket Money`
- Actions: .:., Load, New Entry, Edit, btnHandlePostback, Upload &amp; View, Save File, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MInHand, Date, RefNo, FyRefNo, Remark, MCPH_FCPH_gvStudentPMRec_txtParticular_0, MCPH_FCPH_gvStudentPMRec_txtAmount_0, SrchRcptNo, MCPH_FCPH_flUploadVerify, AdmissionNO, Amount, ExpenseDate, Particular, Remarks, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, DateFrom, DateTo
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Write off
- URL: `Fee/Write off`
- Actions: .:., Load, New Entry, Edit, Print, BindSelectedDetail, btnHandlePostback, X, Add, Clear, rbSearchFor, OK, Remove, Search, Make A/c Entry
- Input fields: CaseCSS, AdmissionNo, EnrollNo, StudentName, RollNo, MCPH_FCPH_txtRefNo, TransDate, MCPH_FCPH_txtFYRefNo, ApprovalBy, Cancel, CalPerAgeAmont, MCPH_FCPH_grdWriteOffData_txtGrid_0, TotalAmount, TransferAmt, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_FCPH_ddDateFrom, MCPH_FCPH_ddDateTo, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID
