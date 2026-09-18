<<<<<<< HEAD
import { WEIGHT_UNIT_OPTIONS, VEHICLE_TYPE_UNIT_OPTIONS, DEFAULT_WEIGHT_UNIT } from "./units";

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
    // District/State are auto-filled server-side from City (task item 7) -
    // still shown as read-only columns in the list, but no longer editable
    // form fields or part of the bulk-upload template.
    columns: ["City", "District", "State", "IsActive"],
    bulkUploadFields: ["City"],
    formFields: [
      { name: "City", label: "City", required: true, autoFillsDistrictState: true },
      { name: "District", label: "District (auto-filled)", readOnly: true, autoFillDependent: true },
      { name: "State", label: "State (auto-filled)", readOnly: true, autoFillDependent: true },
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
    columns: ["VehicleName", "Capacity", "Unit", "IsActive"],
    bulkUploadFields: ["VehicleName", "Capacity", "Unit"],
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
    // Simplified to a single Weight value + Weight Unit dropdown (task
    // item 9) - no more From/To range.
    columns: ["Weight", "WeightUnit", "IsActive"],
    bulkUploadFields: ["Weight", "WeightUnit"],
    formFields: [
      { name: "Weight", label: "Weight", type: "number", required: true },
      {
        name: "WeightUnit",
        label: "Weight Unit",
        type: "select",
        options: WEIGHT_UNIT_OPTIONS,
        defaultValue: DEFAULT_WEIGHT_UNIT,
      },
    ],
    // A weight is a duplicate only if both the value and its unit match
    // (5 MT and 5 KG are different slabs).
    duplicateCheckFields: ["Weight", "WeightUnit"],
    // Multi-row add support (task item 11).
    multiRowEntry: true,
    maxRows: 10,
  },
  customers: {
    title: "Customer Master",
    path: "/masters/customers",
    apiGroup: "masters",
    moduleName: "customers",
    stateKey: "customers",
    idField: "CustomerID",
    addPath: "/masters/customers/add",
    editPath: "/masters/customers/edit",
    addButtonText: "Add Customer",
    softDeleteOnly: true,
    columns: ["CustomerName", "ContactPerson", "Email", "Phone", "IsActive"],
    bulkUploadFields: ["CustomerName", "ContactPerson", "Email", "Phone", "Address"],
    formFields: [
      { name: "CustomerName", label: "Customer Name", required: true },
      { name: "ContactPerson", label: "Contact Person" },
      { name: "Email", label: "Email", type: "email" },
      { name: "Phone", label: "Phone" },
      { name: "Address", label: "Address" },
    ],
    // A customer is considered a duplicate by name alone.
    duplicateCheckFields: ["CustomerName"],
    // Multi-row add support (task item 11).
    multiRowEntry: true,
    maxRows: 10,
  },
  // statuses is intentionally left out of the sidebar/CRUD UI: StatusMaster
  // is workflow-internal reference data (approval-status labels), not a
  // module an admin edits day to day.
=======
export const moduleConfigs = {
  // plants: {
  //   title: "Plant Master",
  //   path: "/masters/plants",
  //   apiGroup: "masters",
  //   moduleName: "plants",
  //   idField: "PlantID",
  //   columns: ["PlantCode", "PlantName", "City", "State", "IsActive"],
  // },
  // vehicleTypes: {
  //   title: "Vehicle Types",
  //   path: "/masters/vehicle-types",
  //   apiGroup: "masters",
  //   moduleName: "vehicle-types",
  //   idField: "VehicleTypeID",
  //   columns: ["VehicleName", "Capacity", "Unit"],
  // },
  // weights: {
  //   title: "Weight Master",
  //   path: "/masters/weights",
  //   apiGroup: "masters",
  //   moduleName: "weights",
  //   idField: "WeightID",
  //   columns: ["FromWeight", "ToWeight", "WeightUnit"],
  // },
  // destinations: {
  //   title: "Destination Master",
  //   path: "/masters/destinations",
  //   apiGroup: "masters",
  //   moduleName: "destinations",
  //   idField: "DestinationID",
  //   columns: ["City", "District", "State", "Pincode"],
  // },
  // statuses: {
  //   title: "Status Master",
  //   path: "/masters/statuses",
  //   apiGroup: "masters",
  //   moduleName: "statuses",
  //   idField: "StatusID",
  //   columns: ["StatusName", "ModuleName"],
  // },
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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
<<<<<<< HEAD
=======
  // verifications: {
  //   title: "Invoice Verification",
  //   path: "/workflows/verifications",
  //   apiGroup: "workflows",
  //   moduleName: "verifications",
  //   idField: "VerificationID",
  //   columns: [
  //     "InvoiceID",
  //     "ContractID",
  //     "ExpectedAmount",
  //     "InvoiceAmount",
  //     "DifferenceAmount",
  //     "VerificationStatus",
  //   ],
  // },
  // approvals: {
  //   title: "Invoice Approvals",
  //   path: "/workflows/approvals",
  //   apiGroup: "workflows",
  //   moduleName: "approvals",
  //   idField: "ApprovalID",
  //   columns: ["InvoiceID", "ApprovedBy", "StatusID", "ApprovedDate", "Remarks"],
  // },
  // audits: {
  //   title: "Audit Logs",
  //   path: "/workflows/audits",
  //   apiGroup: "workflows",
  //   moduleName: "audits",
  //   idField: "AuditID",
  //   columns: ["UserID", "TableName", "RecordID", "ActionType", "ActionDate"],
  // },
  // emails: {
  //   title: "Email Logs",
  //   path: "/workflows/emails",
  //   apiGroup: "workflows",
  //   moduleName: "emails",
  //   idField: "EmailLogID",
  //   columns: ["RecipientEmail", "Subject", "Status", "SentAt"],
  // },
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
};

export const moduleNavigation = [
  moduleConfigs.contracts,
  moduleConfigs.invoices,
  moduleConfigs.settings, // Added here to reflect in navigation/sidebar
];