# Library module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 36 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| Accession Register | Partial / check |
| Binder | Gap |
| Book Binding | Partial / check |
| Book Entry | Likely covered |
| Book Reservation | Likely covered |
| CD-DVD Entry | Review |
| College Album | Gap |
| College Publication | Gap |
| Cupboard Shelf Master | Gap |
| Fine Master | Gap |
| Fine Receipt | Partial / check |
| Fine Waived | Gap |
| frmFineReceipt(Other) | Partial / check |
| Issue-Return | Likely covered |
| Item Type | Likely covered |
| Library Attendance | Likely covered |
| Library Member Other | Likely covered |
| Library Setup | Likely covered |
| List Of Holiday | Likely covered |
| Magazine Letter Entry Daily | Gap |
| Magazine Letter Master | Gap |
| Mapping RFID | Gap |
| Member Grouping | Partial / check |
| News Paper Daily Entry | Gap |
| News Paper Master | Gap |
| OPAC | Gap |
| Periodicity Master | Gap |
| Project Report | Gap |
| Publisher | Gap |
| Purchase Register | Likely covered |
| Registration | Likely covered |
| Reset Library Due Date | Partial / check |
| Stock Verification | Likely covered |
| Subject | Likely covered |
| Supplier | Likely covered |
| Verifylibrary | Gap |

## Page details

### Accession Register
- URL: `Library/Accession Register`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Select, Add To Cart, Remove From Cart, View My Cart, Show Selected, Update, Delete
- Input fields: CaseCSS, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, Label, FromAccNo, ToAccNo
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID, AccPrefix

### Binder
- URL: `Library/Binder`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, BinderName, ItemBinderID, City, Phone, Mobile, Fax, EMail, Website, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Book Binding
- URL: `Library/Book Binding`
- Actions: Send, Receive, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, CollegeID, AccessionNO, Title, Type, Author, Edition, Volume, Rate, Binder, BinderID, Mobile, Email, BindingRate, BindingType, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Book Entry
- URL: `Library/Book Entry`
- Actions: New Entry, Edit, Delete, Allot Accession, Content Location, Remark Entry, Copy Title, BindSelectedDetail, Show, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, BookSearch, Title, TitleID, SubTitle, SubTitleID, ParallelTitle, ParallelTitleID, LibSubject, LibSubjectID, Language, LanguageID, ISBN, ClassificationNo, BookNo, ItemSerialNo, ItemKey, RemarkID, Author1, Author1ID, Author2, Author2ID, Author3, Author3ID, Author4Name, Author4NameID, PublisherName, PublisherNameID, PlaceOfPublication, PlaceOfPublicationID, KeyWord, KeyWordID, CourseSubCode, CourseSubCodeID, CourseSubName, MinLimitOfItem, BookID, BookSearchCopy, Search, FistCond
- Dropdowns/lists: drpTypePerson, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Book Reservation
- URL: `Library/Book Reservation`
- Actions: Search, Save Booking, Cancel Booking, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Print
- Input fields: CaseCSS, MemberCode, ProgDesg, MemDate, Name, SessDept, AlreadyIssued, Category, SemStatus, Group, Title, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### CD-DVD Entry
- URL: `Library/CD-DVD Entry`
- Actions: New Entry, Edit, Delete, Allot Accession, Content Location, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Type, TypeID, MultiMediaName, CourseTitle, CourseTitleID, AccPrefix, MfgAuth, MfgAuthID, Catogary, CatogaryID, Title, Language, LanguageID, KeyWords, KeyWordsID, Subject, SubjectID, CourseSubCode, CourseSubID, CDDuration, Author, AuthorID, CourseSubName, IDCode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### College Album
- URL: `Library/College Album`
- Actions: Upload, Prev. 10 Record(s), Next 10 Record(s), New Entry, Edit, Delete, Allot Accession, Content Location, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Type, AccPrefix, FunctionName, TypeID, FunctionDate, RealNo, SelectAll, FileUpload1, SelectAllALB, IDCode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### College Publication
- URL: `Library/College Publication`
- Actions: New Entry, Edit, Delete, Allot Accession, Content Location, BindSelectedDetail, MemberCodeChange, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Type, TypeID, AccPrefix, Title, SubTitle, Language, LanguageID, PrallelTitle, EmpStuCode, PublicationDetails_txtPublishedOn_0, PublicationDetails_txtNoOfCopy_0, ID, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Cupboard Shelf Master
- URL: `Library/Cupboard Shelf Master`
- Actions: Print, New Entry, Edit, Delete, X
- Input fields: CaseCSS, CupNo, CupAlias, Cupboard_txtSelfNo_0, Cupboard_txtAlias_0, Cupboard_txtRemark_0, IDCode
- Dropdowns/lists: PrntID, CupboardNo

### Fine Master
- URL: `Library/Fine Master`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, FineDescription, DefaultFine, GVFine_txtItemType_0, GVFine_txtItemTypeID_0, GVFine_TxtDayFrom_0, GVFine_TxtDayTo_0, GVFine_TxtAmount_0, GVFine_TxtIncrementDay_0, GVFine_txtItemType_1, GVFine_txtItemTypeID_1, GVFine_TxtDayFrom_1, GVFine_TxtDayTo_1, GVFine_TxtAmount_1, GVFine_TxtIncrementDay_1, GVFine_txtItemType_2, GVFine_txtItemTypeID_2, GVFine_TxtDayFrom_2, GVFine_TxtDayTo_2, GVFine_TxtAmount_2, GVFine_TxtIncrementDay_2, GVFine_txtItemType_3, GVFine_txtItemTypeID_3, GVFine_TxtDayFrom_3, GVFine_TxtDayTo_3, GVFine_TxtAmount_3, GVFine_TxtIncrementDay_3, GVFine_txtItemType_4, GVFine_txtItemTypeID_4, GVFine_TxtDayFrom_4, GVFine_TxtDayTo_4, GVFine_TxtAmount_4, GVFine_TxtIncrementDay_4, GVFine_txtItemType_5, GVFine_txtItemTypeID_5, GVFine_TxtDayFrom_5, GVFine_TxtDayTo_5, GVFine_TxtAmount_5, GVFine_TxtIncrementDay_5, GVFine_txtItemType_6
- Dropdowns/lists: FineDescription

### Fine Receipt
- URL: `Library/Fine Receipt`
- Actions: New Entry, Edit, Print, BindSelectedDetail, FillReciept, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, MemberCode, Program, Session, MemberGroup, MemName, Sem, Category, Date, Mode, College, ReceiptNo, CashAmt, fyRefNo, FineReceipt_txtTotalAmt_0, FineReceipt_txtRecAmt_0, FineReceipt_txtBalAmt_0, FineReceipt_txtTotalAmt_1, FineReceipt_txtRecAmt_1, FineReceipt_txtBalAmt_1, FineReceipt_txtTotalAmt_2, FineReceipt_txtRecAmt_2, FineReceipt_txtBalAmt_2, FineReceipt_txtTotalAmt_3, FineReceipt_txtRecAmt_3, FineReceipt_txtBalAmt_3, TotalAmt, TotalRecAmt, TotalBalAmt, IDCode, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Fine Waived
- URL: `Library/Fine Waived`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Save
- Input fields: CaseCSS, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, PageFine, PagePaid, PageWave, PageBal, PageToBeWave, PageNetBal, TotalFine, TotalPaid, TotalWaived, TotalBalance, TotalToBeWaived, TotalNetBal
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID, Print

### frmFineReceipt(Other)
- URL: `Library/frmFineReceipt(Other)`
- Actions: New Entry, BindSelectedDetail, Edit, Print, FillReciept, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, MemberCode, Program, MemberGroup, MemName, Sem, Category, Date, College, ReceiptNo, fyRefNo, OnAccount, CashAmt, IDCode, CollegeID, SrchRcptNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Mode, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Issue-Return
- URL: `Library/Issue-Return`
- Actions: Re-Issue, Issue, Return, Print Issue Slip, Return Slip, Go to Receipt, BindSelectedDetail, Show, Print Ledger, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Cancel Booking, Fine Pay, Print Receipt
- Input fields: CaseCSS, Type, Books, AccNo, MemberCode, Remark, Cost, RecAmt, Code, Program, RegDate, Name, Sem, ExpDate, Group, College, ItemIssuedUpto, Issue, TotalFine, Waived, Rec, Bal, LibCollege, AcceccionNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName, Title, Date, Nos, Itemtype, AMontDue, Paid, ReceiptNo, fyRefNo
- Dropdowns/lists: drpStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, drpAsdDsc, PrntID

### Item Type
- URL: `Library/Item Type`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, AccPrefix, TypeName
- Dropdowns/lists: TypeName

### Library Attendance
- URL: `Library/Library Attendance`
- Actions: Refresh, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MemberCode, Name, Code, NameL, Category, College, LibraryGroup, LibraryStatus, Program, Semster, AllotDate, ExpDate, Status, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Library Member Other
- URL: `Library/Library Member Other`
- Actions: New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, ColgName, code, Name, Department, Desgination, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Category, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Library Setup
- URL: `Library/Library Setup`
- Actions: Apply above SetUp to Return, Apply above SetUp to Issue, Save User Rights, New Entry, Save, X
- Input fields: CaseCSS, NoOfTimesFine, Issue_txtIssueFrom_0, Issue_txtIssueTo_0, Issue_txtIssueFrom_1, Issue_txtIssueTo_1, Issue_txtIssueFrom_2, Issue_txtIssueTo_2, Issue_txtIssueFrom_3, Issue_txtIssueTo_3, Issue_txtIssueFrom_4, Issue_txtIssueTo_4, Issue_txtIssueFrom_5, Issue_txtIssueTo_5, Issue_txtIssueFrom_6, Issue_txtIssueTo_6, Return_txtReturnFrom_0, Return_txtReturnTo_0, Return_txtReturnFrom_1, Return_txtReturnTo_1, Return_txtReturnFrom_2, Return_txtReturnTo_2, Return_txtReturnFrom_3, Return_txtReturnTo_3, Return_txtReturnFrom_4, Return_txtReturnTo_4, Return_txtReturnFrom_5, Return_txtReturnTo_5, Return_txtReturnFrom_6, Return_txtReturnTo_6
- Dropdowns/lists: Issue_drpIssue_0, Issue_drpIssue_1, Issue_drpIssue_2, Issue_drpIssue_3, Issue_drpIssue_4, Issue_drpIssue_5, Issue_drpIssue_6, Return_drpReturn_0, Return_drpReturn_1, Return_drpReturn_2, Return_drpReturn_3, Return_drpReturn_4, Return_drpReturn_5, Return_drpReturn_6, drpUserName

### List Of Holiday
- URL: `Library/List Of Holiday`
- Actions: New Entry, Edit, Delete, Print, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, Holiday, StartDate, EndDate, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Magazine Letter Entry Daily
- URL: `Library/Magazine Letter Entry Daily`
- Actions: Show, New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MagSearch, Title, SubsDate, Type, TypeID, ExpiryDate, TotalNo, SubsNo, College, Supplier, Amount, GridViewMagzineDailyEntry_txtRecievingData_0, GridViewMagzineDailyEntry_txtMagAmount_0, GridViewMagzineDailyEntry_txtVolume_0, GridViewMagzineDailyEntry_txtIssueNo_0, GridViewMagzineDailyEntry_txtIssueDate_0, GridViewMagzineDailyEntry_txtComplementaryCopy_0, GridViewMagzineDailyEntry_txtIncludedWith_0, GridViewMagzineDailyEntry_txtRemark_0, GridViewMagzineDailyEntry_txtMonthName_0, GridViewMagzineDailyEntry_txtYearNo_0, GridViewMagzineDailyEntry_txtRecievingData_1, GridViewMagzineDailyEntry_txtMagAmount_1, GridViewMagzineDailyEntry_txtVolume_1, GridViewMagzineDailyEntry_txtIssueNo_1, GridViewMagzineDailyEntry_txtIssueDate_1, GridViewMagzineDailyEntry_txtComplementaryCopy_1, GridViewMagzineDailyEntry_txtIncludedWith_1, GridViewMagzineDailyEntry_txtRemark_1, GridViewMagzineDailyEntry_txtMonthName_1, GridViewMagzineDailyEntry_txtYearNo_1, GridViewMagzineDailyEntry_txtRecievingData_2, GridViewMagzineDailyEntry_txtMagAmount_2, GridViewMagzineDailyEntry_txtVolume_2, GridViewMagzineDailyEntry_txtIssueNo_2, GridViewMagzineDailyEntry_txtIssueDate_2, GridViewMagzineDailyEntry_txtComplementaryCopy_2, GridViewMagzineDailyEntry_txtIncludedWith_2, GridViewMagzineDailyEntry_txtRemark_2
- Dropdowns/lists: drpCategory, drpPaymntMode, GridViewMagzineDailyEntry_drpStatus_0, GridViewMagzineDailyEntry_drpStatus_1, GridViewMagzineDailyEntry_drpStatus_2, GridViewMagzineDailyEntry_drpStatus_3, GridViewMagzineDailyEntry_drpStatus_4, GridViewMagzineDailyEntry_drpStatus_5, GridViewMagzineDailyEntry_drpStatus_6, GridViewMagzineDailyEntry_drpStatus_7, GridViewMagzineDailyEntry_drpStatus_8, GridViewMagzineDailyEntry_drpStatus_9, GridViewMagzineDailyEntry_drpStatus_10, GridViewMagzineDailyEntry_drpStatus_11, GridViewMagzineDailyEntry_drpStatus_12, GridViewMagzineDailyEntry_drpStatus_13, GridViewMagzineDailyEntry_drpStatus_14, GridViewMagzineDailyEntry_drpStatus_15, GridViewMagzineDailyEntry_drpStatus_16, GridViewMagzineDailyEntry_drpStatus_17, GridViewMagzineDailyEntry_drpStatus_18, GridViewMagzineDailyEntry_drpStatus_19, GridViewMagzineDailyEntry_drpStatus_20, GridViewMagzineDailyEntry_drpStatus_21, GridViewMagzineDailyEntry_drpStatus_22

### Magazine Letter Master
- URL: `Library/Magazine Letter Master`
- Actions: New Entry, Edit, Delete, Allot Accession, Content Location, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Type, TypeID, Accprefix, Language, LanguageID, ISBN, Title, Publisher, PublisherID, SubTitle, Editor, EditorID, Phone, Email, Website, Fax, IDCode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: TypesMagazine, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Mapping RFID
- URL: `Library/Mapping RFID`
- Actions: Save, X
- Input fields: CaseCSS, AccNo, RFID, Title, Authur, Publisher, subject

### Member Grouping
- URL: `Library/Member Grouping`
- Actions: Show Fine, Add, New Entry, Edit, Delete, X
- Input fields: CaseCSS, College, GroupName, TotalLimits, ItemFine, NoofBooking, NoofDays, LateFinePloicy, LateFineID, fineFreeBooks, LibGrpType, GridLibGpMaster_txtLimit_0, GridLibGpMaster_txtMaxDays_0, GridLibGpMaster_txtTimeUpto_0, GridLibGpMaster_txtMaxFineAmt_0, GridLibGpMaster_txtLimit_1, GridLibGpMaster_txtMaxDays_1, GridLibGpMaster_txtTimeUpto_1, GridLibGpMaster_txtMaxFineAmt_1, GridLibGpMaster_txtLimit_2, GridLibGpMaster_txtMaxDays_2, GridLibGpMaster_txtTimeUpto_2, GridLibGpMaster_txtMaxFineAmt_2, GridLibGpMaster_txtLimit_3, GridLibGpMaster_txtMaxDays_3, GridLibGpMaster_txtTimeUpto_3, GridLibGpMaster_txtMaxFineAmt_3, GridLibGpMaster_txtLimit_4, GridLibGpMaster_txtMaxDays_4, GridLibGpMaster_txtTimeUpto_4, GridLibGpMaster_txtMaxFineAmt_4, GridLibGpMaster_txtLimit_5, GridLibGpMaster_txtMaxDays_5, GridLibGpMaster_txtTimeUpto_5, GridLibGpMaster_txtMaxFineAmt_5, GridLibGpMaster_txtLimit_6, GridLibGpMaster_txtMaxDays_6, GridLibGpMaster_txtTimeUpto_6, GridLibGpMaster_txtMaxFineAmt_6, GridLibGpMaster_txtLimit_7
- Dropdowns/lists: GroupName

### News Paper Daily Entry
- URL: `Library/News Paper Daily Entry`
- Actions: Show, New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, CurrentDate, Supplier, College, EntryDate, EntryDay, Date, GridViewNewsPaperDailyEntry_txtCost_0, GridViewNewsPaperDailyEntry_txtQty_0, GridViewNewsPaperDailyEntry_txtAmt_0, GridViewNewsPaperDailyEntry_txtPages_0, GridViewNewsPaperDailyEntry_txtEdition_0, GridViewNewsPaperDailyEntry_txtNoOfMagzine_0, GridViewNewsPaperDailyEntry_txtDescriptionOfPage_0, GridViewNewsPaperDailyEntry_txtKeyWord_0, GridViewNewsPaperDailyEntry_txtKeyWordID_0, GridViewNewsPaperDailyEntry_txtVolume_0, GridViewNewsPaperDailyEntry_txtIssueNo_0, GridViewNewsPaperDailyEntry_txtRemark_0, GridViewNewsPaperDailyEntry_txtCost_1, GridViewNewsPaperDailyEntry_txtQty_1, GridViewNewsPaperDailyEntry_txtAmt_1, GridViewNewsPaperDailyEntry_txtPages_1, GridViewNewsPaperDailyEntry_txtEdition_1, GridViewNewsPaperDailyEntry_txtNoOfMagzine_1, GridViewNewsPaperDailyEntry_txtDescriptionOfPage_1, GridViewNewsPaperDailyEntry_txtKeyWord_1, GridViewNewsPaperDailyEntry_txtKeyWordID_1, GridViewNewsPaperDailyEntry_txtVolume_1, GridViewNewsPaperDailyEntry_txtIssueNo_1, GridViewNewsPaperDailyEntry_txtRemark_1, GridViewNewsPaperDailyEntry_txtCost_2, GridViewNewsPaperDailyEntry_txtQty_2, GridViewNewsPaperDailyEntry_txtAmt_2, GridViewNewsPaperDailyEntry_txtPages_2, GridViewNewsPaperDailyEntry_txtEdition_2, GridViewNewsPaperDailyEntry_txtNoOfMagzine_2, GridViewNewsPaperDailyEntry_txtDescriptionOfPage_2, GridViewNewsPaperDailyEntry_txtKeyWord_2, GridViewNewsPaperDailyEntry_txtKeyWordID_2
- Dropdowns/lists: GridViewNewsPaperDailyEntry_drpPA_0, GridViewNewsPaperDailyEntry_drpPA_1, GridViewNewsPaperDailyEntry_drpPA_2, GridViewNewsPaperDailyEntry_drpPA_3, GridViewNewsPaperDailyEntry_drpPA_4, GridViewNewsPaperDailyEntry_drpPA_5, GridViewNewsPaperDailyEntry_drpPA_6, GridViewNewsPaperDailyEntry_drpPA_7, GridViewNewsPaperDailyEntry_drpPA_8, GridViewNewsPaperDailyEntry_drpPA_9, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### News Paper Master
- URL: `Library/News Paper Master`
- Actions: New Entry, Edit, Delete, Allot Accession, Content Location, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, ItemType, ItemTypeID, AccPrefix, Language, LanguageID, Name, SubTitle, Phone, Email, Wesite, RemarkID, GridViewStatusDetails_txtAmount_0, GridViewStatusDetails_txtAmount_1, GridViewStatusDetails_txtAmount_2, GridViewStatusDetails_txtAmount_3, GridViewStatusDetails_txtAmount_4, GridViewStatusDetails_txtAmount_5, GridViewStatusDetails_txtAmount_6, IDCode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Name, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### OPAC
- URL: `Library/OPAC`
- Actions: Show, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, SearchFor, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Periodicity Master
- URL: `Library/Periodicity Master`
- Actions: New Entry, Edit, Delete, X
- Input fields: CaseCSS, Name, Calculateunder
- Dropdowns/lists: drpMeasurement, StatusList

### Project Report
- URL: `Library/Project Report`
- Actions: New Entry, Edit, Delete, Allot Accession, Content Location, BindSelectedDetail, Do PostBack, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Type, subdate, guidename, TypeAccPrefix, desg, teamsize, projecttopic, guidequal, guidequalID, subto, mobile, Email, projectcompletedat, projectrepot_txtadmno_0, projectrepot_txtrollno_0, projectrepot_txtname_0, projectrepot_txtCollege_0, projectrepot_txtsession_0, projectrepot_txtProgram_0, projectrepot_txtSem_0, Idcode, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: projectrepot_ddlProject_0, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Publisher
- URL: `Library/Publisher`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, PublisherName, PublisherID, City, Phone, Mobile, Fax, EMail, Website, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Purchase Register
- URL: `Library/Purchase Register`
- Actions: Allot Accession, New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, BillNo, BillDate, Supplier, College, CollegeId, PurchaseRegister_txtTitle_0, PurchaseRegister_txtItemID_0, PurchaseRegister_txttabID_0, PurchaseRegister_txtType_0, PurchaseRegister_txtTypeID_0, PurchaseRegister_txtProgram_0, PurchaseRegister_txtYear_0, PurchaseRegister_txtEdition_0, PurchaseRegister_txtVolume_0, PurchaseRegister_txtPages_0, PurchaseRegister_txtIsbn_0, PurchaseRegister_txtQty_0, PurchaseRegister_txtRate_0, PurchaseRegister_txtAmount_0, PurchaseRegister_txtDisc_0, PurchaseRegister_txtDiscAmt_0, PurchaseRegister_txtNetAmt_0, PurchaseRegister_txtWithCD_0, TotalAmount, TotalTaxPer, TotalTaxAmt, TotalDiscountPer, TotalDisAmt, TotalNetAmt, IDCode, PurBillNo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpDataFrom, PurchaseRegister_drpWithCD_0, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Registration
- URL: `Library/Registration`
- Actions: Show, Reset, Allot Library, Cancel Library, Extend Library, Convert To Be UnRegistered to Active, Card Lost, Card Disable, Card Enable, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, Session, Department, DesgSem, SessionId, Program, Designation, DeptProg, ProgramId, Sem, SemId, Quota, QuotaId, MemberCode, EmpCode, OthCode, MemName, EmpName, OthName, LibGpName, RegisterDate, ExpiryDate, ExtMon, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpCategary, drpStatus, drpReg, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Reset Library Due Date
- URL: `Library/Reset Library Due Date`
- Actions: Show, clear, X, OK, Save
- Input fields: CaseCSS, DueDateFrom, DueDateTo, Item, AccNoFrom, AccNoTo, MemberGroup, AccPriFix, College, Session, Program, Semester, MemberCode, Name, SCollege, SDepart, SDesign, SEmpcode, SEmpname, MultiSelectSearchBase, IC
- Dropdowns/lists: Category

### Stock Verification
- URL: `Library/Stock Verification`
- Actions: Start Verification, Print, Refresh, X
- Input fields: CaseCSS, flUploadVerify, College, Type, LibSubject

### Subject
- URL: `Library/Subject`
- Actions: New Entry, Edit, Delete, Print, X
- Input fields: CaseCSS, SubCode, SubName, SubID, PaperID, SearchType
- Dropdowns/lists: Subject

### Supplier
- URL: `Library/Supplier`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, SupplierName, SupplierID, City, Phone, Mobile, Fax, EMail, Website, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Verifylibrary
- URL: `Library/Verifylibrary`
- Input fields: AccessionNo
- Labels on screen: Accession No.; Book Type; Issue To; Member Name; Member Code; Issued On; Returned On
