# Accounts module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 22 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| Balance Sheet | Partial / check |
| Balance Sheet Structure | Partial / check |
| BRS Detail | Review |
| Budget Entry | Gap |
| CashFlow | Gap |
| Cheque Book Master | Partial / check |
| Daybook Detail | Gap |
| Fee Plan Setup | Likely covered |
| Financial Year | Partial / check |
| Group Master | Likely covered |
| Income Expense | Likely covered |
| Ledger Creation | Gap |
| Ledger Detail | Gap |
| LoanEMI | Gap |
| New Budget Entry | Gap |
| TDSSetup | Gap |
| Teller System | Partial / check |
| Trial Balance | Partial / check |
| Voucher Creation | Gap |
| Voucher Detail | Gap |
| Voucher TDS Setup | Gap |
| VoucherCreationNew | Gap |

## Page details

### Balance Sheet
- URL: `Accounts/Balance Sheet`
- Actions: Search, Print, X, OK
- Input fields: CaseCSS, DFrom
- Dropdowns/lists: MCPH_ACCPH_ddlFinancial, PrntID

### Balance Sheet Structure
- URL: `Accounts/Balance Sheet Structure`
- Actions: X, OK, Save
- Input fields: CaseCSS, MultiSelectSearchBase
- Dropdowns/lists: Financial

### BRS Detail
- URL: `Accounts/BRS Detail`
- Actions: Search, Print, X
- Input fields: CaseCSS, DFrom, DTo, Ledger, FillBankDate
- Dropdowns/lists: Financial, ConsiderDateBV, ViewType

### Budget Entry
- URL: `Accounts/Budget Entry`
- Actions: Search, Save, Copy, X, Confirm Copy
- Input fields: CaseCSS, Amount
- Dropdowns/lists: Financial, MCPH_ACCPH_ddlAccType, MCPH_ACCPH_ddlGroupName, TrnsFinance

### CashFlow
- URL: `Accounts/CashFlow`
- Actions: Search, Print, X
- Input fields: CaseCSS, DFrom, DTo, GroupName
- Dropdowns/lists: Financial, PrntID

### Cheque Book Master
- URL: `Accounts/Cheque Book Master`
- Actions: Activate, New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, BankName, ChqStartNo, ChqEndNo, ChequeNo, MCPH_ACCPH_grdCheqBookDet_txtRemark_0, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_0, MCPH_ACCPH_grdCheqBookDet_txtRemark_1, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_1, MCPH_ACCPH_grdCheqBookDet_txtRemark_2, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_2, MCPH_ACCPH_grdCheqBookDet_txtRemark_3, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_3, MCPH_ACCPH_grdCheqBookDet_txtRemark_4, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_4, MCPH_ACCPH_grdCheqBookDet_txtRemark_5, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_5, MCPH_ACCPH_grdCheqBookDet_txtRemark_6, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_6, MCPH_ACCPH_grdCheqBookDet_txtRemark_7, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_7, MCPH_ACCPH_grdCheqBookDet_txtRemark_8, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_8, MCPH_ACCPH_grdCheqBookDet_txtRemark_9, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_9, MCPH_ACCPH_grdCheqBookDet_txtRemark_10, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_10, MCPH_ACCPH_grdCheqBookDet_txtRemark_11, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_11, MCPH_ACCPH_grdCheqBookDet_txtRemark_12, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_12, MCPH_ACCPH_grdCheqBookDet_txtRemark_13, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_13, MCPH_ACCPH_grdCheqBookDet_txtRemark_14, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_14, MCPH_ACCPH_grdCheqBookDet_txtRemark_15, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_15, MCPH_ACCPH_grdCheqBookDet_txtRemark_16, MCPH_ACCPH_grdCheqBookDet_txtIssueToAuth_16, MCPH_ACCPH_grdCheqBookDet_txtRemark_17
- Dropdowns/lists: MCPH_ACCPH_grdCheqBookDet_ddlStatus_0, MCPH_ACCPH_grdCheqBookDet_ddlStatus_1, MCPH_ACCPH_grdCheqBookDet_ddlStatus_2, MCPH_ACCPH_grdCheqBookDet_ddlStatus_3, MCPH_ACCPH_grdCheqBookDet_ddlStatus_4, MCPH_ACCPH_grdCheqBookDet_ddlStatus_5, MCPH_ACCPH_grdCheqBookDet_ddlStatus_6, MCPH_ACCPH_grdCheqBookDet_ddlStatus_7, MCPH_ACCPH_grdCheqBookDet_ddlStatus_8, MCPH_ACCPH_grdCheqBookDet_ddlStatus_9, MCPH_ACCPH_grdCheqBookDet_ddlStatus_10, MCPH_ACCPH_grdCheqBookDet_ddlStatus_11, MCPH_ACCPH_grdCheqBookDet_ddlStatus_12, MCPH_ACCPH_grdCheqBookDet_ddlStatus_13, MCPH_ACCPH_grdCheqBookDet_ddlStatus_14, MCPH_ACCPH_grdCheqBookDet_ddlStatus_15, MCPH_ACCPH_grdCheqBookDet_ddlStatus_16, MCPH_ACCPH_grdCheqBookDet_ddlStatus_17, MCPH_ACCPH_grdCheqBookDet_ddlStatus_18, MCPH_ACCPH_grdCheqBookDet_ddlStatus_19, AndOr, FieldName, Condition, FirstDdl, FileNames

### Daybook Detail
- URL: `Accounts/Daybook Detail`
- Actions: Search, Print, Define Name, X, OK
- Input fields: CaseCSS, Ref, Nar, Grpname, Ledger, DFrom, DTo
- Dropdowns/lists: Financial, VoucherType, Category, PrntID

### Fee Plan Setup
- URL: `Accounts/Fee Plan Setup`
- Actions: X, Bank Wise User Rights, Show, OK, Save
- Input fields: CaseCSS, PanAmt, CashAmt, PayVLimit, PenaltyAmt, UnderHead, RetainLedger, Depart, MultiSelectSearchBase, MCPH_ACCPH_gvNoDay_txtND_0, MCPH_ACCPH_gvNoDay_txtNDF_0, MCPH_ACCPH_gvNoDay_txtND_1, MCPH_ACCPH_gvNoDay_txtNDF_1, MCPH_ACCPH_gvNoDay_txtND_2, MCPH_ACCPH_gvNoDay_txtNDF_2, MCPH_ACCPH_gvNoDay_txtND_3, MCPH_ACCPH_gvNoDay_txtNDF_3, MCPH_ACCPH_gvNoDay_txtND_4, MCPH_ACCPH_gvNoDay_txtNDF_4, MCPH_ACCPH_gvNoDay_txtND_5, MCPH_ACCPH_gvNoDay_txtNDF_5, MCPH_ACCPH_gvNoDay_txtND_6, MCPH_ACCPH_gvNoDay_txtNDF_6, MCPH_ACCPH_gvNoDay_txtND_7, MCPH_ACCPH_gvNoDay_txtNDF_7, MCPH_ACCPH_gvNoDay_txtND_8, MCPH_ACCPH_gvNoDay_txtNDF_8, MCPH_ACCPH_gvNoDay_txtND_9, MCPH_ACCPH_gvNoDay_txtNDF_9, MCPH_ACCPH_gvNoDay_txtND_10, MCPH_ACCPH_gvNoDay_txtNDF_10, MCPH_ACCPH_gvNoDay_txtND_11, MCPH_ACCPH_gvNoDay_txtNDF_11, MCPH_ACCPH_gvNoDay_txtND_12, MCPH_ACCPH_gvNoDay_txtNDF_12, MCPH_ACCPH_gvNoDay_txtND_13, MCPH_ACCPH_gvNoDay_txtNDF_13, MCPH_ACCPH_gvNoDay_txtND_14, MCPH_ACCPH_gvNoDay_txtNDF_14, MCPH_ACCPH_gvNoDay_txtND_15
- Dropdowns/lists: drpFy, MCPH_ACCPH_gvRefund_ddlmainBook_0, MCPH_ACCPH_gvRefund_ddlCentralBook_0, MCPH_ACCPH_gvRefund_ddlCentralBookDr_0, MCPH_ACCPH_gvRefund_ddlCentralBookCr_0, MCPH_ACCPH_gvReceipt_ddlmainBook_0, MCPH_ACCPH_gvReceipt_ddlCentralBook_0, MCPH_ACCPH_gvReceipt_ddlCentralBookDr_0, MCPH_ACCPH_gvReceipt_ddlCentralBookCr_0, MCPH_ACCPH_gvEmployee_ddlmainBook_0, MCPH_ACCPH_gvEmployee_ddlCentralBook_0, MCPH_ACCPH_gvEmployee_ddlCentralBookDr_0, MCPH_ACCPH_gvEmployee_ddlCentralBookCr_0

### Financial Year
- URL: `Accounts/Financial Year`
- Actions: Create, X
- Input fields: CaseCSS

### Group Master
- URL: `Accounts/Group Master`
- Actions: New Entry, Edit, Delete, Print, btnHandlePostback, X
- Input fields: CaseCSS, MCPH_ACCPH_txtName, GroupSearch
- Dropdowns/lists: MasterGroup, GroupNature, MCPH_ACCPH_PrntID, NatureOfGroup

### Income Expense
- URL: `Accounts/Income Expense`
- Actions: Search, Print, X, OK
- Input fields: CaseCSS, DFrom, DTo
- Dropdowns/lists: MCPH_ACCPH_ddlFinancial, PrntID

### Ledger Creation
- URL: `Accounts/Ledger Creation`
- Actions: Copy, Activate, Deactivate, Upload, New Entry, Edit, Delete, BindSelectedDetail, Lock, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Name, OpBal, ClosBal, PName, MobileNo, BankName, Email, TINNo, IFSCCode, ITNo, STNo, AccountNo, MCPH_ACCPH_grdContractDoc_fu1_0, MCPH_ACCPH_gvLockLedger_txtLedgerName_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Financial, MasterGroup, CD1, CD2, College, MCPH_ACCPH_ddlFY, FYear, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Ledger Detail
- URL: `Accounts/Ledger Detail`
- Actions: |<<, <<, Show, Check in Other Book, Print, Graph, Interest Calculation, Refresh, Search, X
- Input fields: CaseCSS, Ledger
- Dropdowns/lists: Financial

### LoanEMI
- URL: `Accounts/LoanEMI`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Ledger, DateFrom, DateTo, Days, EMIAmount, MCPH_ACCPH_gvLoanEMIContactDetails_txtMobileNo_0, MCPH_ACCPH_gvLoanEMIContactDetails_txtemailid_0, MCPH_ACCPH_gvLoanEMIContactDetails_txtContactName_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Enabled, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### New Budget Entry
- URL: `Accounts/New Budget Entry`
- Actions: Search, Save, Copy, X, Confirm Copy
- Input fields: CaseCSS, Amount
- Dropdowns/lists: Financial, MCPH_ACCPH_ddlAccType, GroupName, TrnsFinance

### TDSSetup
- URL: `Accounts/TDSSetup`
- Actions: Show, Save, X
- Input fields: CaseCSS, GroupName, Ledger
- Dropdowns/lists: MCPH_ACCPH_ddlFY, MCPH_ACCPH_ddlGroupType

### Teller System
- URL: `Accounts/Teller System`
- Actions: Show, Save, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, CollectionDate, DepositDate, CollectByUser, ChequeNo, TotalAmount, ReceivedbyTeller, BalanceAmount, DipositedInBank, Remark, TotalCash, AlreadyDeposit, TodayDeposit, Balanced, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Deposit, DepoStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Trial Balance
- URL: `Accounts/Trial Balance`
- Actions: Search, Print, X, OK
- Input fields: CaseCSS, DFrom, DTo
- Dropdowns/lists: Financial, PrntID

### Voucher Creation
- URL: `Accounts/Voucher Creation`
- Actions: Print1, Printfront, X
- Input fields: CaseCSS

### Voucher Detail
- URL: `Accounts/Voucher Detail`
- Actions: Print, Show, text, <<, X, OK
- Input fields: CaseCSS, Ledger, DFrom, DTo, GroupName, ToLegder, Narration
- Dropdowns/lists: Financial, TrnsType, Report, SortItem, SortOrder, VoucherType, VchrStatus

### Voucher TDS Setup
- URL: `Accounts/Voucher TDS Setup`
- Actions: Show, Save, X
- Input fields: CaseCSS, Ledger, GroupName
- Dropdowns/lists: Financial

### VoucherCreationNew
- URL: `Accounts/VoucherCreationNew`
- Actions: test, X, Contra F4, Payment F2(F5), Receipt F9(F6), Jounral F7, Memorandum F8, New Entry, Edit, Audit, Print, Save, Voucher Cancel, Transfer, Divide Voucher, Transfer Voucher, Upload, Insert Row, Search, Clear
- Input fields: CaseCSS, billdate, PrintChqbk, WithNarr, SelectAll, Select{{$index}}, files{{$index}}, dtpVoucherDateFrom, dtpVoucherDateTo, dtpChequeDateFrom, dtpChequeDateTo, dtpCreationDateFrom, dtpCreationDateTo, dtpAlterDateFrom, dtpAlterDateTo, dtpBillDate, AuditedVchr, UnAdtVchr, CancelAdtVchr, dtpAuditDateFrom, dtpAuditDateTo, RWithNarr, Account{{$index}}, Fee{{$index}}
- Dropdowns/lists: cmbBooktemp, cmbFY, cmbBook, cmbLedgerBook, cmbCrDrdivide, cmbFYSearch, cmbBookSearch, cmbVoucherType, cmbStatus, cmbTransferVoucherType, cmbTransferVoucherStatus, cmbFYVoucherLock, cmbBookSearchLockAudit
