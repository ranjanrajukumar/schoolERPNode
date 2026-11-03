# Inventory module - university reference (SIM demo)

Source: reverse-engineered from the SIM web demo (ASP.NET WebForms). 24 pages. "SchoolErp status" is an automatic keyword match against the client menu and routes, so confirm each row by hand.

## Page index

| Page | SchoolErp status |
|---|---|
| Approval | Likely covered |
| Cupboard | Gap |
| Gate Pass(In) | Likely covered |
| Gate Pass(Out) | Likely covered |
| Indent | Gap |
| Inventory Bill Pass | Partial / check |
| Inventory Location | Likely covered |
| Inventory Setup | Likely covered |
| Issue Return | Likely covered |
| Item Category | Partial / check |
| Item Maker | Partial / check |
| Item Master | Likely covered |
| Item Model | Partial / check |
| Purchase Order | Likely covered |
| Purchase Return | Likely covered |
| Service Contract | Gap |
| SRV | Review |
| Stock Change | Likely covered |
| Stock Register | Likely covered |
| Stock Transfer | Partial / check |
| UnitMaster | Gap |
| Vendor | Gap |
| Vendor Quotation | Gap |
| Work Order | Likely covered |

## Page details

### Approval
- URL: `Inventory/Approval`
- Actions: Reject, Return, Forward, Approve, Refresh, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_ICPH_ddlModuleType, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Cupboard
- URL: `Inventory/Cupboard`
- Actions: Print, New Entry, Edit, Delete, X
- Input fields: CaseCSS, CupNo, CupAlias, MCPH_ICPH_grdCupboard_txtSelfNo_0, MCPH_ICPH_grdCupboard_txtAlias_0, MCPH_ICPH_grdCupboard_txtRemark_0, MCPH_ICPH_grdCupboard_txtSelfNo_1, MCPH_ICPH_grdCupboard_txtAlias_1, MCPH_ICPH_grdCupboard_txtRemark_1, MCPH_ICPH_grdCupboard_txtSelfNo_2, MCPH_ICPH_grdCupboard_txtAlias_2, MCPH_ICPH_grdCupboard_txtRemark_2, IDCode
- Dropdowns/lists: PrntID, CupboardNo

### Gate Pass(In)
- URL: `Inventory/Gate Pass(In)`
- Actions: New Entry, Edit, Delete, New Item Entry, Print, Search, X, Add, Clear, rbSearchFor, OK, Remove
- Input fields: CaseCSS, CurrentDate, SearchOnGatePassOutDealer, GPDate, College, SRV, GtPassNo, ChNo, ChDate, BillNo, BillDate, VndName, Address, City, Phone, Mobile, DisName, EmpName, EmpCode, EmpVenderCode, Dept, Desg, VehType, VehNo, Gpo, DbsnNo, DbsnDate, Cst, MCPH_ICPH_gvItemDetails_txtItemID_0, MCPH_ICPH_gvItemDetails_txtItemCode_0, MCPH_ICPH_gvItemDetails_txtItemName_0, MCPH_ICPH_gvItemDetails_txtItemType_0, MCPH_ICPH_gvItemDetails_txtSerialNo_0, MCPH_ICPH_gvItemDetails_txtItemCategory_0, MCPH_ICPH_gvItemDetails_txtSubCategory_0, MCPH_ICPH_gvItemDetails_txtItemModel_0, MCPH_ICPH_gvItemDetails_txtItemMfg_0, MCPH_ICPH_gvItemDetails_txtItemSpec_0, MCPH_ICPH_gvItemDetails_txtUnitGroup_0, MCPH_ICPH_gvItemDetails_txtItemUnit_0
- Dropdowns/lists: Through, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Gate Pass(Out)
- URL: `Inventory/Gate Pass(Out)`
- Actions: New Entry, Edit, BindSelectedDetail, Print Gatepass, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, Ok, Select
- Input fields: CaseCSS, College, GPDate, GPOutNo, VehType, VehNo, VndName, Address, City, Phone, Mobile, DisName, EmpName, EmpCode, EmpVenderCode, Dept, Desg, Cancel, MCPH_ICPH_GridIssue_txtSerialNo_0, MCPH_ICPH_GridIssue_txtItemCode_0, MCPH_ICPH_GridIssue_txtstockID_0, MCPH_ICPH_GridIssue_txtItemID_0, MCPH_ICPH_GridIssue_txtItemType_0, MCPH_ICPH_GridIssue_txtIdcode_0, MCPH_ICPH_GridIssue_txtItemName_0, MCPH_ICPH_GridIssue_txtMFGSerialNo_0, MCPH_ICPH_GridIssue_txtStatus_0, MCPH_ICPH_GridIssue_txtSubStatus_0, MCPH_ICPH_GridIssue_txtGPSubStatus_0, MCPH_ICPH_GridIssue_txtGIRemark_0, MCPH_ICPH_GridIssue_txtQty_0, MCPH_ICPH_GridIssue_txtUnit_0, MCPH_ICPH_GridIssue_txtCategory_0, MCPH_ICPH_GridIssue_txtSubCategory_0, MCPH_ICPH_GridIssue_txtModel_0, MCPH_ICPH_GridIssue_txtMfg_0, MCPH_ICPH_GridIssue_txtSpecification_0, MCPH_ICPH_GridIssue_txtSerialNo_1, MCPH_ICPH_GridIssue_txtItemCode_1, MCPH_ICPH_GridIssue_txtstockID_1
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Indent
- URL: `Inventory/Indent`
- Actions: New Entry, Edit, Delete, Print, Refresh, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, IndentNo, RefNo, IndentDate, RefDate, MCPH_ICPH_txtEmpname, MCPH_ICPH_txtCollege, MCPH_ICPH_txtDept, MCPH_ICPH_txtEmpCode, MCPH_ICPH_txtDesg, MCPH_ICPH_txtEmpStatus, MCPH_ICPH_gvIndentDesc_txtItemCategoryID_0, MCPH_ICPH_gvIndentDesc_txtItem_0, MCPH_ICPH_gvIndentDesc_txtItemDesc_0, MCPH_ICPH_gvIndentDesc_txtQty_0, MCPH_ICPH_gvIndentDesc_txtUnit_0, MCPH_ICPH_gvIndentDesc_txtPurpose_0, MCPH_ICPH_gvIndentDesc_txtSugCompany_0, MCPH_ICPH_gvIndentDesc_txtPersonName_0, MCPH_ICPH_gvIndentDesc_txtPersonNo_0, MCPH_ICPH_gvIndentDesc_txtAmount_0, MCPH_ICPH_gvIndentDesc_txtItemCategoryID_1, MCPH_ICPH_gvIndentDesc_txtItem_1, MCPH_ICPH_gvIndentDesc_txtItemDesc_1, MCPH_ICPH_gvIndentDesc_txtQty_1, MCPH_ICPH_gvIndentDesc_txtUnit_1, MCPH_ICPH_gvIndentDesc_txtPurpose_1, MCPH_ICPH_gvIndentDesc_txtSugCompany_1, MCPH_ICPH_gvIndentDesc_txtPersonName_1, MCPH_ICPH_gvIndentDesc_txtPersonNo_1, MCPH_ICPH_gvIndentDesc_txtAmount_1, IndentBetween, IndentBetweenTo, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated
- Dropdowns/lists: MCPH_ICPH_drpPriority, drpIndentStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Inventory Bill Pass
- URL: `Inventory/Inventory Bill Pass`
- Actions: Show, Pass, Hold, Forward, Reject, DownLoad, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, From, To, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: Status, drpSRVBasedOn, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Inventory Location
- URL: `Inventory/Inventory Location`
- Actions: New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, College, BuildingName, Floor, MCPH_ICPH_GVBuildingInfo_txtBlockNo_0, MCPH_ICPH_GVBuildingInfo_txtBlockName_0, MCPH_ICPH_GVBuildingInfo_txtPurpose_0, MCPH_ICPH_GVBuildingInfo_txtRemark_0, MCPH_ICPH_GVBuildingInfo_txtBlockNo_1, MCPH_ICPH_GVBuildingInfo_txtBlockName_1, MCPH_ICPH_GVBuildingInfo_txtPurpose_1, MCPH_ICPH_GVBuildingInfo_txtRemark_1, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Inventory Setup
- URL: `Inventory/Inventory Setup`
- Actions: Show, Save, Save Rights, X
- Input fields: CaseCSS, hdnTabIndex, College, ApproveType, MCPH_ICPH_GridPurchaseOrder_txtIVLabel_0, MCPH_ICPH_GridPurchaseOrder_txtName_0, MCPH_ICPH_GridPurchaseOrder_txtCode_0, MCPH_ICPH_GridPurchaseOrder_txtminAmt_0, MCPH_ICPH_GridPurchaseOrder_txtmaxAmt_0, MCPH_ICPH_GridPurchaseOrder_txtIVLabel_1, MCPH_ICPH_GridPurchaseOrder_txtName_1, MCPH_ICPH_GridPurchaseOrder_txtCode_1, MCPH_ICPH_GridPurchaseOrder_txtminAmt_1, MCPH_ICPH_GridPurchaseOrder_txtmaxAmt_1, MCPH_ICPH_GridPurchaseOrder_txtIVLabel_2, MCPH_ICPH_GridPurchaseOrder_txtName_2, MCPH_ICPH_GridPurchaseOrder_txtCode_2, MCPH_ICPH_GridPurchaseOrder_txtminAmt_2, MCPH_ICPH_GridPurchaseOrder_txtmaxAmt_2
- Dropdowns/lists: MCPH_ICPH_GridPurchaseOrder_ddlReportingM_0, MCPH_ICPH_GridPurchaseOrder_ddlFrequency_0, MCPH_ICPH_GridPurchaseOrder_ddlReportingM_1, MCPH_ICPH_GridPurchaseOrder_ddlFrequency_1, MCPH_ICPH_GridPurchaseOrder_ddlReportingM_2, MCPH_ICPH_GridPurchaseOrder_ddlFrequency_2, drpUserName

### Issue Return
- URL: `Inventory/Issue Return`
- Actions: Search, New Entry, BindSelectedDetail, Issue Slip, Show, Clear, Return Slip, Transfer Slip, X, Add, rbSearchFor, OK, Remove, Print, Ok, Select
- Input fields: CaseCSS, EmpCodeFor, EmpOthCodeFor, EmpnameFor, EmpOthnameFor, DeptFor, DeptOthFor, DesignationFor, DesignationOthFor, ContactNoFor, ContactNoOthFor, UseAtCollege, UseAtBuilding, BuildingID, UseAtFloor, UseAtBlockRoom, IndentNo, IndentNoID, IntentDate, SlipNo, IssueToDept, EmpCodeBy, EmpOthCodeBy, EmpnameBy, EmpOthnameBy, DeptBy, DesignationBy, ContactNoBy, SRVNoSearch, MCPH_ICPH_GridIssue_txtSerialNo_0, MCPH_ICPH_GridIssue_txtItemCode_0, MCPH_ICPH_GridIssue_txtstockID_0, MCPH_ICPH_GridIssue_txtItemID_0, MCPH_ICPH_GridIssue_txtItemType_0, MCPH_ICPH_GridIssue_txtIdcode_0, MCPH_ICPH_GridIssue_txtItemName_0, MCPH_ICPH_GridIssue_txtSpecification_0, MCPH_ICPH_GridIssue_txtMFGSerialNo_0, MCPH_ICPH_GridIssue_txtManualSerialNo_0, MCPH_ICPH_GridIssue_txtQty_0
- Dropdowns/lists: drpItemTypeReturn, drpDamageInfo, drpSubStatus, drpItemType, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Item Category
- URL: `Inventory/Item Category`
- Actions: New Entry, Edit, Delete, Print, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, MCPH_ICPH_txtCategoryName, MCPH_ICPH_txtShortName, MCPH_ICPH_GVSubCategory_txtCatFullname_0, MCPH_ICPH_GVSubCategory_txtSubCatShort_0, MCPH_ICPH_GVSubCategory_txtSubCatID_0, MCPH_ICPH_GVSubCategory_txtCatID_0, MCPH_ICPH_GVItemCatgory_txtCategoryID_0, MCPH_ICPH_GVItemCatgory_txtCatGroupId_0, MCPH_ICPH_GVItemCatgory_txtCategoryID_1, MCPH_ICPH_GVItemCatgory_txtCatGroupId_1, MCPH_ICPH_GVItemCatgory_txtCategoryID_2, MCPH_ICPH_GVItemCatgory_txtCatGroupId_2, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_ICPH_drpCategoryGroup, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Item Maker
- URL: `Inventory/Item Maker`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MCPH_ICPH_txtMakerShortName, MCPH_ICPH_txtMakerName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Item Master
- URL: `Inventory/Item Master`
- Actions: New Entry, Edit, Delete, Print, Generate SR No , BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Close
- Input fields: CaseCSS, ItemCodeSearch, ItemNameSearch, IdCode, ItemCode, ItemName, UnitGroup, UnitGroupID, Category, CategoryID, CurUnit, CurUnitId, CatSubCat, CatSubCatID, LFNO, ItemSortName, VAT, Model, ModelID, OTH, MfgBy, MfgByID, Specific, MCPH_ICPH_grdUnitDetails_txtUnitDetailID_0, UnitValue1, MCPH_ICPH_grdUnitDetails_txtUnitId1_0, MCPH_ICPH_grdUnitDetails_txtUnitName1_0, MCPH_ICPH_grdUnitDetails_txtUnitValue2_0, MCPH_ICPH_grdUnitDetails_txtUnitId2_0, MCPH_ICPH_grdUnitDetails_txtUnitName2_0, MCPH_ICPH_GridItemMaster_txtDate_0, MCPH_ICPH_GridItemMaster_txtQty_0, MCPH_ICPH_GridItemMaster_txtAddQty_0, MCPH_ICPH_GridItemMaster_txtUnit_0, MCPH_ICPH_GridItemMaster_txtUnitID_0, MCPH_ICPH_GridItemMaster_txtSRNoGenerated_0, MCPH_ICPH_GridItemMaster_txtopeningQtyId_0, MCPH_ICPH_GridItemMaster_txtmasterID_0, MCPH_ICPH_GridItemMaster_txtUnitRate_0, MCPH_ICPH_GridItemMaster_txtCurrency_0
- Dropdowns/lists: drpItemType, drpNewEntry, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Item Model
- URL: `Inventory/Item Model`
- Actions: New Entry, Edit, Delete, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, MCPH_ICPH_txtModelShortName, MCPH_ICPH_txtModelName, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Purchase Order
- URL: `Inventory/Purchase Order`
- Actions: Search, X, Add, Clear, rbSearchFor, OK, Remove, Print, New Entry, Edit, Delete, BindSelectedDetail, Print Order, New Item Entry, Refresh
- Input fields: CaseCSS, PONo, VenderName, VenderID, College, CollegeId, WorkLocation, QuotNo, CntPerson, Mobile, ShipAddress, IndentNo, IndentNoID, TinNo, Address, ShipCntPerson, OrderDate, ValidUpTo, ExpiryDate, ReleaseOn, MCPH_ICPH_GridPurchaseOrder_txtCode_0, MCPH_ICPH_GridPurchaseOrder_txtIndentIdDetId_0, MCPH_ICPH_GridPurchaseOrder_txtItemID_0, MCPH_ICPH_GridPurchaseOrder_txtModified_0, MCPH_ICPH_GridPurchaseOrder_txtName_0, MCPH_ICPH_GridPurchaseOrder_txtCategory_0, MCPH_ICPH_GridPurchaseOrder_txtModel_0, MCPH_ICPH_GridPurchaseOrder_txtMfg_0, MCPH_ICPH_GridPurchaseOrder_txtSpecification_0, MCPH_ICPH_GridPurchaseOrder_txtLastSRVRate_0, MCPH_ICPH_GridPurchaseOrder_txtGPStatus_0, MCPH_ICPH_GridPurchaseOrder_txtGpDetId_0, MCPH_ICPH_GridPurchaseOrder_txtStock_0, MCPH_ICPH_GridPurchaseOrder_txtUnit_0, MCPH_ICPH_GridPurchaseOrder_txtUnitGroupId_0, MCPH_ICPH_GridPurchaseOrder_txtUnitID_0, MCPH_ICPH_GridPurchaseOrder_hfMaxOrderVal_0, MCPH_ICPH_GridPurchaseOrder_hfAvailableItem_0, MCPH_ICPH_GridPurchaseOrder_txtOrderedQty_0, MCPH_ICPH_GridPurchaseOrder_txtRate_0
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID, drpPOStatus

### Purchase Return
- URL: `Inventory/Purchase Return`
- Actions: New Entry, Edit, Delete, Print, Search, X, Add, Clear, rbSearchFor, OK, Remove
- Input fields: CaseCSS, SRVNo, GPDate, College, GtPassNo, VehType, VehNo, VndName, Address, City, Phone, Mobile, DisName, EmpName, EmpCode, EmpVenderCode, Dept, Desg, MCPH_ICPH_gvItemDetails_txtItemID_0, MCPH_ICPH_gvItemDetails_txtItemCode_0, MCPH_ICPH_gvItemDetails_txtItemName_0, MCPH_ICPH_gvItemDetails_txtItemType_0, MCPH_ICPH_gvItemDetails_txtItemCategory_0, MCPH_ICPH_gvItemDetails_txtSubCategory_0, MCPH_ICPH_gvItemDetails_txtItemModel_0, MCPH_ICPH_gvItemDetails_txtItemMfg_0, MCPH_ICPH_gvItemDetails_txtItemSpec_0, MCPH_ICPH_gvItemDetails_txtUnitGroup_0, MCPH_ICPH_gvItemDetails_txtItemUnit_0, MCPH_ICPH_gvItemDetails_txtItemQty_0, MCPH_ICPH_gvItemDetails_txtRejectedRemark_0, MCPH_ICPH_gvItemDetails_txtExpiryDate_0, MCPH_ICPH_gvItemDetails_txtRemark_0, MCPH_ICPH_gvItemDetails_txtItemStatus_0, MCPH_ICPH_gvItemDetails_txtSrvIdDetId_0, MCPH_ICPH_gvItemDetails_txtunitGroupId_0, GatePassSearch, FistCond, Date1, SecondCond
- Dropdowns/lists: MCPH_ICPH_gvItemDetails_ddlType_0, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Service Contract
- URL: `Inventory/Service Contract`
- Actions: Upload, New Entry, Edit, Print Contract, Authenticate, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, StartDate, VenderName, Mobile, CntrNo, CntrDuration, Address, Person, Date, EndDate, City, MCPH_ICPH_grdContractDoc_fu1_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: MCPH_ICPH_ddlCntrType, MCPH_ICPH_ddlPymtCycle, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### SRV
- URL: `Inventory/SRV`
- Actions: X, Stock Update, Auto Generate Row, Upload, New Entry, Edit, Delete, Stock Data, New Item Entry, Print, Search, Refresh, Add, Clear, rbSearchFor, OK, Remove
- Input fields: CaseCSS, CurrentDate, GPDate, College, GtPassNo, ChNo, ChDate, BillNo, BillDate, VenderName, Address, City, Phone, Mobile, MCPH_ICPH_grdSrvDoc_fu1_0, MCPH_ICPH_gvItemDetails_txtItemID_0, MCPH_ICPH_gvItemDetails_txtItemCode_0, MCPH_ICPH_gvItemDetails_txtItemName_0, MCPH_ICPH_gvItemDetails_txtItemType_0, MCPH_ICPH_gvItemDetails_txtItemCategory_0, MCPH_ICPH_gvItemDetails_txtSubCategory_0, MCPH_ICPH_gvItemDetails_txtItemModel_0, MCPH_ICPH_gvItemDetails_txtItemMfg_0, MCPH_ICPH_gvItemDetails_txtItemSpec_0, MCPH_ICPH_gvItemDetails_txtUnitGroup_0, MCPH_ICPH_gvItemDetails_txtItemUnit_0, MCPH_ICPH_gvItemDetails_txtmfgBarCodeNo_0, MCPH_ICPH_gvItemDetails_txtPOGPOQty_0, MCPH_ICPH_gvItemDetails_txtOrderedQty_0, MCPH_ICPH_gvItemDetails_txtOrderRate_0, MCPH_ICPH_gvItemDetails_txtBillQty_0, MCPH_ICPH_gvItemDetails_txtBillRate_0, MCPH_ICPH_gvItemDetails_txtChallanQty_0, MCPH_ICPH_gvItemDetails_txtChallanRate_0, MCPH_ICPH_gvItemDetails_txtActualQty_0, MCPH_ICPH_gvItemDetails_txtAlreadyReceived_0, MCPH_ICPH_gvItemDetails_txtRemainingQty_0, MCPH_ICPH_gvItemDetails_txtAcceptedQty_0, MCPH_ICPH_gvItemDetails_txtRejectedQty_0, MCPH_ICPH_gvItemDetails_txtRejectedRemark_0
- Dropdowns/lists: Through, drpSRVStatus, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Stock Change
- URL: `Inventory/Stock Change`
- Actions: Show, Clear, New Entry, Save, X, OK
- Input fields: CaseCSS, ItemName, ItemCode, College, CategoryGroup, Category, SubCat, Model, Maker, Unit, Spec, AccPrefix, SerialNo, SNFrom, SNTo, DamageSince, ReturnRemark, MultiSelectSearchBase
- Dropdowns/lists: drpItemType, drpItemStatus, drpSubStatusFrom, drpDamageInfo, drpSubStatus

### Stock Register
- URL: `Inventory/Stock Register`
- Actions: Show, Clear, Print, X, OK
- Input fields: CaseCSS, College, ItemName, ItemCode, OrderRateFrom, OrderRateTo, ChallanRateFrom, ChallanRateTo, CategoryGroup, Category, SubCat, SRVDateTo, BillRateFrom, BillRateTo, Model, Maker, Unit, SRVDateFrom, Spec, AccPrefix, SerialNo, SNFrom, SNTo, DateFrom, DateTo, MultiSelectSearchBase
- Dropdowns/lists: PrntID

### Stock Transfer
- URL: `Inventory/Stock Transfer`
- Actions: Show, Clear, New Entry, Transfer, X, OK, Add, rbSearchFor, Remove, Search, Print
- Input fields: CaseCSS, College, ItemName, ItemCode, CategoryGroup, Category, SubCat, Spec, Model, Maker, Unit, AccPrefix, SerialNo, SNFrom, SNTo, EmpCodeBy, EmpCodeByOth, EmpnameBy, EmpnameByOth, DeptBy, DesignationBy, CollegeTransferTo, TrnfNo, Remark, References, MultiSelectSearchBase, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: drpItemType, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### UnitMaster
- URL: `Inventory/UnitMaster`
- Actions: New Entry, Edit, Delete, Print, BindSelectedDetail, X, Add, Clear, rbSearchFor, OK, Remove, Search
- Input fields: CaseCSS, MCPH_ICPH_grdUnitMaster_txtUnitId_0, MCPH_ICPH_grdUnitMaster_txtUnitName_0, MCPH_ICPH_grdUnitMaster_txtShortName_0, MCPH_ICPH_grdUnitMaster_txtUnitId_1, MCPH_ICPH_grdUnitMaster_txtUnitName_1, MCPH_ICPH_grdUnitMaster_txtShortName_1, MCPH_ICPH_grdUnitDetails_txtUnitDetailID_0, UnitValue1, MCPH_ICPH_grdUnitDetails_txtUnitId1_0, MCPH_ICPH_grdUnitDetails_txtUnitName1_0, MCPH_ICPH_grdUnitDetails_txtUnitValue2_0, MCPH_ICPH_grdUnitDetails_txtUnitId2_0, MCPH_ICPH_grdUnitDetails_txtUnitName2_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: GroupName, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Vendor
- URL: `Inventory/Vendor`
- Actions: New Entry, Edit, BindSelectedDetail, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Search, Print
- Input fields: CaseCSS, VendorName, VendorIdnew, City, State, District, Country, PhoneNo, faxNo, PinCode, WebSite, TinNo, VatNo, PANno, TANNo, GSTNo, BankName, AccountNo, IfscCode, MCPH_ICPH_gvPersonalInfo_txtName_0, MCPH_ICPH_gvPersonalInfo_txtDesignation_0, MCPH_ICPH_gvPersonalInfo_txtMobile_0, MCPH_ICPH_gvPersonalInfo_txtEMail_0, MCPH_ICPH_gvVendorDeals_txtCategoryName_0, MCPH_ICPH_gvVendorDeals_txtcatShrt_0, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: VendorStatus, DealsIn, AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Vendor Quotation
- URL: `Inventory/Vendor Quotation`
- Actions: Search, New Entry, Edit, Delete, X, Add, Clear, rbSearchFor, OK, Remove, Print
- Input fields: CaseCSS, IndentNo, VenderName, QuotationNo, City, QuotDate, Email, ValidFrom, ValidTo, VMobile, ModifyDate, MCPH_ICPH_FileUpload1, FistCond, Date1, SecondCond, Date2, UCSCTypeSearch, SearchBase, ConditionCreated, FileName
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID

### Work Order
- URL: `Inventory/Work Order`
- Actions: X, Add, Clear, rbSearchFor, OK, Remove, Search, Print, New Entry, Edit, Delete, BindSelectedDetail, Authenticate, Print Order, Save Status
- Input fields: CaseCSS, WONo, VenderName, VenderID, College, CollegeId, WorkLocation, QuotNo, CntPerson, Mobile, ShipAddress, IndentNo, TinNo, Address, ShipCntPerson, OrderDate, ValidUpTo, ExpiryDate, StartDate, TotalCGST, TotalSGST, TotalUGST, TotalIGST, GrandTotal, AddDisc, DiscAmount, GrossTotal, Tax, TaxAmount, AfterOthTax, SaleTaxVat, SaleTaxVatAmount, Cartage, Labour, NetAmt, Payment, ModeOfPayment, Others, MCPH_ICPH_GridWorkTrack_txtStatusAsOn_0, MCPH_ICPH_GridWorkTrack_txtWorkOrderId_0
- Dropdowns/lists: AndOr, FieldName, Condition, FirstDdl, FileNames, PrntID
