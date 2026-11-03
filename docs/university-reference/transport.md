# Transport module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 6 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| Fee Structure | Likely covered |
| Fuel Consumption | Gap |
| Registration | Likely covered |
| Transport Registration | Likely covered |
| Transport Requisition | Partial / check |
| Transport Tracking | Likely covered |

## Page details

### Fee Structure
- URL: `Transport/Fee Structure`
- Actions: Refresh Fee Head, New Entry, Edit, Delete, Activate, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FeeStr, MCPH_TCPH_txtFeeStructName, Idcode, Status, FeeStructID, MCPH_TCPH_GridView1_txtHead_Name_0, MCPH_TCPH_GridView1_txtAmount_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_TCPH_GridView1_drpStructure_0, MCPH_TCPH_GridView1_drpCategoryWise_0, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Fuel Consumption
- URL: `Transport/Fuel Consumption`
- Actions: New Entry, Edit, Delete, Print, Fuel Slip, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, RouteName, FillCapacity, VehicleNo, VehiclesType, FillDTFrom, FillDTTo, Totalexpenditure, Average, Netamount, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Registration
- URL: `Transport/Registration`
- Actions: Refresh, New Entry, Show Data, Allot Transport, Cancel Transport, Create Dues Without Allottment, Dues, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, Session, Dept, Program, Desg, Sem, StdName, EmpName, Admission, EmpCode, RouteNO, Stop, FeeStruct, PeriodCat, RegDate, To, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpGender, drpStdEmp, drpregUnreg, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Transport Registration
- URL: `Transport/Transport Registration`
- Actions: .:., Save, New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, RouteNo, VehicleType, Mobileno, VehicleNo, Seat, Driver, DriverCont, Helper, HelperCont, Amount, MCPH_TCPH_GVStopName_txtStopname_0, MCPH_TCPH_GVStopName_txtMorning_0, MCPH_TCPH_GVStopName_txtEvening_0, MCPH_TCPH_GVStopName_txtAmount_0, MCPH_TCPH_GVStopName_txtStopname_1, MCPH_TCPH_GVStopName_txtMorning_1, MCPH_TCPH_GVStopName_txtEvening_1, MCPH_TCPH_GVStopName_txtAmount_1, MCPH_TCPH_GVStopName_txtStopname_2, MCPH_TCPH_GVStopName_txtMorning_2, MCPH_TCPH_GVStopName_txtEvening_2, MCPH_TCPH_GVStopName_txtAmount_2, MCPH_TCPH_GVStopName_txtStopname_3, MCPH_TCPH_GVStopName_txtMorning_3, MCPH_TCPH_GVStopName_txtEvening_3, MCPH_TCPH_GVStopName_txtAmount_3, MCPH_TCPH_GVStopName_txtStopname_4, MCPH_TCPH_GVStopName_txtMorning_4, MCPH_TCPH_GVStopName_txtEvening_4, MCPH_TCPH_GVStopName_txtAmount_4, MCPH_TCPH_GVStopName_txtStopname_5, MCPH_TCPH_GVStopName_txtMorning_5, MCPH_TCPH_GVStopName_txtEvening_5, MCPH_TCPH_GVStopName_txtAmount_5, MCPH_TCPH_GVStopName_txtStopname_6, MCPH_TCPH_GVStopName_txtMorning_6, MCPH_TCPH_GVStopName_txtEvening_6, MCPH_TCPH_GVStopName_txtAmount_6, MCPH_TCPH_GVStopName_txtStopname_7
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Transport Requisition
- URL: `Transport/Transport Requisition`
- Actions: Cancel Booking, New Entry, Edit, Search, X, Add, Clear, rbSearchFor, OK, Remove, Print
- Input fields: CaseCSS, EmpCode, Dept, College, EmpName, Desg, Joining, StratP, Destination, ExpDate, ExpTime, Reason, RetrunDate, InTime, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: WorkType, StatusPA, AndOr, FieldName, Condition, FirstDdl, FileNames, Print

### Transport Tracking
- URL: `Transport/Transport Tracking`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, Print
