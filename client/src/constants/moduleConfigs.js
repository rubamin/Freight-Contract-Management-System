import { WEIGHT_UNIT_OPTIONS, VEHICLE_TYPE_UNIT_OPTIONS, DEFAULT_WEIGHT_UNIT } from "./units";
import { PARTY_TYPE_OPTIONS, DEFAULT_PARTY_TYPE } from "./partyTypes";
import { REMARK_MAX_LENGTH, USER_REMARKS_LABEL, SYSTEM_REMARKS_LABEL } from "./remarks";

// Remark fields shared by every master (see constants/remarks.js).
//   multiline   - rendered as a full-width text area
//   systemField - shown read-only on Edit only and never sent to the API
const USER_REMARKS_FORM_FIELD = {
  name: "UserRemarks",
  label: USER_REMARKS_LABEL,
  multiline: true,
  maxLength: REMARK_MAX_LENGTH,
};
const SYSTEM_REMARKS_FORM_FIELD = { name: "Remarks", label: SYSTEM_REMARKS_LABEL, multiline: true, systemField: true };
const REMARK_FORM_FIELDS = [USER_REMARKS_FORM_FIELD, SYSTEM_REMARKS_FORM_FIELD];
const REMARK_COLUMNS = ["UserRemarks", "Remarks"];
const REMARK_COLUMN_LABELS = { UserRemarks: USER_REMARKS_LABEL, Remarks: SYSTEM_REMARKS_LABEL };

export const moduleConfigs = {
  destinations: {
    title: "Destination Master",
    path: "/masters/destinations",
    apiGroup: "masters",
    moduleName: "destinations",
    stateKey: "destinations",
    idField: "DestinationID",
    addPath: "/masters/destinations/add",
    editPath: "/masters/destinations/edit",
    addButtonText: "Add Destination",
    softDeleteOnly: true,
    allowHardDelete: true,
    // District/State are auto-filled server-side from City (task item 7) -
    // still shown as read-only columns in the list, but no longer editable
    // form fields or part of the bulk-upload template.
    columns: ["City", "District", "State", "IsActive", ...REMARK_COLUMNS],
    columnLabels: REMARK_COLUMN_LABELS,
    bulkUploadFields: ["City", "UserRemarks"],
    formFields: [
      { name: "City", label: "City", required: true, autoFillsDistrictState: true },
      { name: "District", label: "District (auto-filled)", readOnly: true, autoFillDependent: true },
      { name: "State", label: "State (auto-filled)", readOnly: true, autoFillDependent: true },
      ...REMARK_FORM_FIELDS,
    ],
    // A destination is considered a duplicate purely by City (District/
    // State are derived from it, not independently meaningful for this
    // check).
    duplicateCheckFields: ["City"],
    // Multi-row add support (task item 11).
    multiRowEntry: true,
    maxRows: 10,
  },
  vehicleTypes: {
    title: "Vehicle Type Master",
    path: "/masters/vehicle-types",
    apiGroup: "masters",
    moduleName: "vehicle-types",
    stateKey: "vehicleTypes",
    idField: "VehicleTypeID",
    addPath: "/masters/vehicle-types/add",
    editPath: "/masters/vehicle-types/edit",
    addButtonText: "Add Vehicle Type",
    softDeleteOnly: true,
    allowHardDelete: true,
    columns: ["VehicleName", "Capacity", "Unit", "IsActive", ...REMARK_COLUMNS],
    columnLabels: REMARK_COLUMN_LABELS,
    bulkUploadFields: ["VehicleName", "Capacity", "Unit", "UserRemarks"],
    formFields: [
      { name: "VehicleName", label: "Vehicle Name", required: true },
      { name: "Capacity", label: "Capacity", type: "number" },
      // Unit is a dropdown (task item 10), not free text.
      {
        name: "Unit",
        label: "Unit",
        type: "select",
        options: VEHICLE_TYPE_UNIT_OPTIONS,
        defaultValue: DEFAULT_WEIGHT_UNIT,
      },
      ...REMARK_FORM_FIELDS,
    ],
    // A vehicle type is considered a duplicate by name alone.
    duplicateCheckFields: ["VehicleName"],
    // Multi-row add support (task item 11).
    multiRowEntry: true,
    maxRows: 10,
  },
  weights: {
    title: "Weight Master",
    path: "/masters/weights",
    apiGroup: "masters",
    moduleName: "weights",
    stateKey: "weights",
    idField: "WeightID",
    addPath: "/masters/weights/add",
    editPath: "/masters/weights/edit",
    addButtonText: "Add Weight",
    softDeleteOnly: true,
    allowHardDelete: true,
    // Simplified to a single Weight value + Weight Unit dropdown (task
    // item 9) - no more From/To range.
    columns: ["Weight", "WeightUnit", "IsActive", ...REMARK_COLUMNS],
    columnLabels: REMARK_COLUMN_LABELS,
    bulkUploadFields: ["Weight", "WeightUnit", "UserRemarks"],
    formFields: [
      { name: "Weight", label: "Weight", type: "number", required: true },
      {
        name: "WeightUnit",
        label: "Weight Unit",
        type: "select",
        options: WEIGHT_UNIT_OPTIONS,
        defaultValue: DEFAULT_WEIGHT_UNIT,
      },
      ...REMARK_FORM_FIELDS,
    ],
    // A weight is a duplicate only if both the value and its unit match
    // (5 MT and 5 KG are different slabs).
    duplicateCheckFields: ["Weight", "WeightUnit"],
    // Multi-row add support (task item 11).
    multiRowEntry: true,
    maxRows: 10,
  },
  // One master for both parties: PartyType decides whether a record is
  // offered on outbound invoices (Customer) or inbound invoices (Supplier).
  customers: {
    title: "Customer / Supplier Master",
    path: "/masters/customers",
    apiGroup: "masters",
    moduleName: "customers",
    stateKey: "customers",
    idField: "CustomerID",
    addPath: "/masters/customers/add",
    editPath: "/masters/customers/edit",
    addButtonText: "Add Customer / Supplier",
    softDeleteOnly: true,
    allowHardDelete: true,
    columns: ["CustomerName", "PartyType", "ContactPerson", "Email", "Phone", "IsActive", ...REMARK_COLUMNS],
    columnLabels: { CustomerName: "Name", PartyType: "Type", ...REMARK_COLUMN_LABELS },
    // PartyType accepts Customer / Supplier in the uploaded sheet.
    bulkUploadFields: ["CustomerName", "PartyType", "ContactPerson", "Email", "Phone", "Address", "UserRemarks"],
    formFields: [
      {
        name: "PartyType",
        label: "Customer / Supplier",
        type: "select",
        required: true,
        options: PARTY_TYPE_OPTIONS,
        defaultValue: DEFAULT_PARTY_TYPE,
        // Offers "set all rows" on the multi-row Add page.
        bulkApply: true,
      },
      { name: "CustomerName", label: "Customer / Supplier Name", required: true },
      { name: "ContactPerson", label: "Contact Person" },
      { name: "Email", label: "Email", type: "email" },
      { name: "Phone", label: "Phone" },
      { name: "Address", label: "Address" },
      ...REMARK_FORM_FIELDS,
    ],
    // The same name may exist once as a customer and once as a supplier.
    duplicateCheckFields: ["CustomerName", "PartyType"],
    // Multi-row add support (task item 11).
    multiRowEntry: true,
    maxRows: 10,
  },
  // statuses is intentionally left out of the sidebar/CRUD UI: StatusMaster
  // is workflow-internal reference data (approval-status labels), not a
  // module an admin edits day to day.
  contracts: {
    title: "Contract Master",
    path: "/contracts",
    apiGroup: "contracts",
    moduleName: "",
    stateKey: "contracts",
    idField: "ContractID",
    addPath: "/contracts/add",
    addButtonText: "Add Contract",
    columns: [
      "ContractNo",
      "VendorID",
      "PlantID",
      "ContractStartDate",
      "ContractEndDate",
      "Status",
    ],
  },
  invoices: {
    title: "Invoices",
    path: "/invoices",
    apiGroup: "invoices",
    moduleName: "invoices",
    idField: "InvoiceID",
    columns: [
      "InvoiceNumber",
      "InvoiceDate",
      "VendorID",
      "PlantID",
      "TotalInvoiceAmount",
      "InvoiceStatusID",
    ],
  },
  // Added Settings Module configuration for Admin
  settings: {
    title: "Settings & Hierarchy",
    path: "/admin/settings",
    apiGroup: "settings",
    moduleName: "settings",
    idField: "ConfigID",
    columns: [
      "CompanyID",
      "SBUID",
      "PlantHierarchyID",
      "LocationID",
      "PrimaryUserID",
    ],
  },
};