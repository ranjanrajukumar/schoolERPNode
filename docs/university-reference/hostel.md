# Hostel module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 14 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| Assign BedNo | Partial / check |
| Canteen Attendance | Partial / check |
| Hostel Att Roll Call | Partial / check |
| Hostel Change | Likely covered |
| Hostel Fee Structure | Likely covered |
| Hostel Leave Approval | Likely covered |
| Hostel Master | Likely covered |
| Hostel Registration | Likely covered |
| Hostel Setup | Likely covered |
| Mess Attendance | Likely covered |
| Mess Menu | Likely covered |
| Room Status | Partial / check |
| Verify Hostel | Partial / check |
| VH | Review |

## Page details

### Assign BedNo
- URL: `Hostel/Assign BedNo`
- Actions: Show, Clear, New Entry, Edit, X
- Input fields: CaseCSS, Hostel
- Dropdowns/lists: MCPH_HCPH_drpHostelType

### Canteen Attendance
- URL: `Hostel/Canteen Attendance`
- Actions: Refresh, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MemberCode, Name, Code, NameL, Category, College, Program, Semster, Status, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Hostel Att Roll Call
- URL: `Hostel/Hostel Att Roll Call`
- Actions: Transfer Hostel Attendance, Details , Summary, Show , Save , X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Studentid, AddmissionNo, Att_From, Att_To, TimeFrom, TimeTo, AttDate, Hostel, Round, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Hostel Change
- URL: `Hostel/Hostel Change`
- Actions: Search, Clear, Save, X
- Input fields: CaseCSS, Session, Dept, Date, To, College, Hostel, Program, Desg, FeeStructure, Sem
- Dropdowns/lists: drpStdEmp, MCPH_HCPH_drpGender, MCPH_HCPH_drpStatus, MCPH_HCPH_drpAdmSubStatus

### Hostel Fee Structure
- URL: `Hostel/Hostel Fee Structure`
- Actions: Refresh Fee Head, New Entry, Edit, Delete, Activate, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, HostelFeeStructID, FeeStructName, Idcode, Status, MCPH_HCPH_GridView1_txtHead_Name_0, Amount, MCPH_HCPH_GridView1_txtHead_Name_1, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_HCPH_GridView1_drpStructure_0, MCPH_HCPH_GridView1_drpStructure_1, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Hostel Leave Approval
- URL: `Hostel/Hostel Leave Approval`
- Actions: Show, Approve, Reject, Out Pass, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Hostel, LeaveBetween, LeaveBetweenTo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Hostel Master
- URL: `Hostel/Hostel Master`
- Actions: New Entry, Edit, Delete, Print, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, HostelName, TotalRoom, Chief, Warderncode, Warden1, WardonCode1, Warden2, WardonCode2, MCPH_HCPH_GVHosteMaster_txtFloor_0, MCPH_HCPH_GVHosteMaster_txtRoomNo_0, MCPH_HCPH_GVHosteMaster_txtBedding_0, MCPH_HCPH_GVHosteMaster_txtCapacity_0, MCPH_HCPH_GVHosteMaster_txtRemark_0, MCPH_HCPH_GVHosteMaster_txtFloor_1, MCPH_HCPH_GVHosteMaster_txtRoomNo_1, MCPH_HCPH_GVHosteMaster_txtBedding_1, MCPH_HCPH_GVHosteMaster_txtCapacity_1, MCPH_HCPH_GVHosteMaster_txtRemark_1, MCPH_HCPH_GVHosteMaster_txtFloor_2, MCPH_HCPH_GVHosteMaster_txtRoomNo_2, MCPH_HCPH_GVHosteMaster_txtBedding_2, MCPH_HCPH_GVHosteMaster_txtCapacity_2, MCPH_HCPH_GVHosteMaster_txtRemark_2, MCPH_HCPH_GVHosteMaster_txtFloor_3, MCPH_HCPH_GVHosteMaster_txtRoomNo_3, MCPH_HCPH_GVHosteMaster_txtBedding_3, MCPH_HCPH_GVHosteMaster_txtCapacity_3, MCPH_HCPH_GVHosteMaster_txtRemark_3, MCPH_HCPH_GVHosteMaster_txtFloor_4, MCPH_HCPH_GVHosteMaster_txtRoomNo_4, MCPH_HCPH_GVHosteMaster_txtBedding_4, MCPH_HCPH_GVHosteMaster_txtCapacity_4, MCPH_HCPH_GVHosteMaster_txtRemark_4, MCPH_HCPH_GVHosteMaster_txtFloor_5, MCPH_HCPH_GVHosteMaster_txtRoomNo_5, MCPH_HCPH_GVHosteMaster_txtBedding_5, MCPH_HCPH_GVHosteMaster_txtCapacity_5, MCPH_HCPH_GVHosteMaster_txtRemark_5, MCPH_HCPH_GVHosteMaster_txtFloor_6
- Dropdowns/lists: MCPH_HCPH_drpHostelType, MCPH_HCPH_GVHosteMaster_drpType_0, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_0, MCPH_HCPH_GVHosteMaster_drpType_1, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_1, MCPH_HCPH_GVHosteMaster_drpType_2, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_2, MCPH_HCPH_GVHosteMaster_drpType_3, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_3, MCPH_HCPH_GVHosteMaster_drpType_4, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_4, MCPH_HCPH_GVHosteMaster_drpType_5, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_5, MCPH_HCPH_GVHosteMaster_drpType_6, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_6, MCPH_HCPH_GVHosteMaster_drpType_7, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_7, MCPH_HCPH_GVHosteMaster_drpType_8, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_8, MCPH_HCPH_GVHosteMaster_drpType_9, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_9, MCPH_HCPH_GVHosteMaster_drpType_10, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_10, MCPH_HCPH_GVHosteMaster_drpType_11, MCPH_HCPH_GVHosteMaster_drpHostelTypeDtl_11

### Hostel Registration
- URL: `Hostel/Hostel Registration`
- Actions: Refresh, Create Dues Without Allottment, Make A/c Entry, Make Blank Dues, New Entry, Show Data, Allot Room, Cancel Room, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Dues
- Input fields: CaseCSS, College, Session, Dept, Program, Desg, Sem, StdName, EmpName, Admission, EmpCode, Hostel, Floor, RoomNo, FeeStruct, PeriodCat, RegDate, To, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpGender, drpStdEmp, drpRegUnReg, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Hostel Setup
- URL: `Hostel/Hostel Setup`
- Actions: New Entry, Edit, Delete, Map Setup, X, Save, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, Session, Course, MCPH_HCPH_gvSetup_txtHostelType_0, MCPH_HCPH_gvSetup_txtHostel_0, MCPH_HCPH_gvSetup_txtFloor_0, MCPH_HCPH_gvSetup_txtBedding_0, MCPH_HCPH_gvSetup_txtStructure_0, MapCollege, MapSession, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Mess Attendance
- URL: `Hostel/Mess Attendance`
- Actions: Show Summary, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, Search, Date, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Mess Menu
- URL: `Hostel/Mess Menu`
- Actions: Show, New Entry, Edit, Print, X
- Input fields: CaseCSS, EffectFrom, MCPH_HCPH_grdMessMenu_txtParticulars_0, MCPH_HCPH_grdMessMenu_txtQuantity_0, MCPH_HCPH_grdMessMenu_txtParticulars_1, MCPH_HCPH_grdMessMenu_txtQuantity_1, MCPH_HCPH_grdMessMenu_txtParticulars_2, MCPH_HCPH_grdMessMenu_txtQuantity_2
- Dropdowns/lists: MCPH_HCPH_ddlDayName, MCPH_HCPH_ddlMealType, MCPH_HCPH_grdMessMenu_ddlFoodType_0, MCPH_HCPH_grdMessMenu_ddlFoodType_1, MCPH_HCPH_grdMessMenu_ddlFoodType_2

### Room Status
- URL: `Hostel/Room Status`
- Actions: Show, Clear, Temp Allot, X, BindSelectedDetail
- Input fields: CaseCSS, Hostel, Floor, Capacity

### Verify Hostel
- URL: `Hostel/Verify Hostel`
- Actions: Scan QR Code, Mark Attendance
- Input fields: AdmissionNo, EmpCode
- Labels on screen: Hostel; Fees Balance; Adm. No.; Hostel Status; Hostel Name; Room No.; Attendence; Session; Semester; Scan; Code; Campus; DOJ; Desg.

### VH
- URL: `Hostel/VH`
- Actions: Scan QR Code, Mark Attendance
- Input fields: AdmissionNo, EmpCode
- Labels on screen: Hostel; Fees Balance; Adm. No.; Hostel Status; Hostel Name; Room No.; Attendence; Session; Semester; Scan; Code; Campus; DOJ; Desg.
