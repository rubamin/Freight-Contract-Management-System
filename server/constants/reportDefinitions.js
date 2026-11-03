const { MODULE_KEYS } = require("./modules");

// On-screen reports (Reports page). Every column gets a filter on the
// client by its type, and the summary cards are recalculated from the
// filtered rows. Keep keys in sync with the row objects built in
// services/reports.service.js.

// text: "contains" filter. enum: pick one or more values. number / money:
// min - max. date / datetime: from - to.
const REPORT_COLUMN_TYPES = {
  TEXT: "text",
  ENUM: "enum",
  NUMBER: "number",
  MONEY: "money",
  DATE: "date",
  DATETIME: "datetime",
};

// count: filtered rows. sum: total of a number / money column.
// countWhere: rows whose column equals value. distinct: different values.
const REPORT_CARD_TYPES = {
  COUNT: "count",
  SUM: "sum",
  COUNT_WHERE: "countWhere",
  DISTINCT: "distinct",
};

const REPORT_KEYS = {
  INVOICES: "invoices",
  CONTRACTS: "contracts",
  VENDORS: "vendors",
  DESTINATIONS: "destinations",
  WEIGHTS: "weights",
  VEHICLE_TYPES: "vehicle-types",
  CUSTOMERS: "customers",
  USERS: "users",
  MASTER_REQUESTS: "master-requests",
};

// Rows sent per report; the client is told when a report was cut off.
const MAX_REPORT_ROWS = 20000;

const STATUS_LABELS = { ACTIVE: "Active", INACTIVE: "Inactive" };

const { TEXT, ENUM, NUMBER, MONEY, DATE, DATETIME } = REPORT_COLUMN_TYPES;
const { COUNT, SUM, COUNT_WHERE, DISTINCT } = REPORT_CARD_TYPES;

const column = (key, header, type = TEXT) => ({ key, header, type });

const REMARK_COLUMNS = [column("userRemarks", "Remark by User"), column("systemRemarks", "System Remarks")];

const REPORT_DEFINITIONS = [
  {
    key: REPORT_KEYS.INVOICES,
    label: "Invoices",
    description: "Every invoice of your locations with amounts, audit and approval details.",
    moduleKey: MODULE_KEYS.INVOICES,
    columns: [
      column("invoiceNumber", "Invoice No"),
      column("invoiceDate", "Invoice Date", DATE),
      column("contractType", "Contract Type", ENUM),
      column("vendorName", "Vendor", ENUM),
      column("locationName", "Location", ENUM),
      column("customerName", "Customer / Supplier", ENUM),
      column("lrNumber", "LR No"),
      column("lrDate", "LR Date", DATE),
      column("soNumber", "SO No"),
      column("fromStation", "From", ENUM),
      column("toStation", "To", ENUM),
      column("vehicleType", "Vehicle Type", ENUM),
      column("weight", "Weight", NUMBER),
      column("basicFreight", "Basic Freight", MONEY),
      column("detainCharges", "Detention", MONEY),
      column("extraCharges", "Extra Charges", MONEY),
      column("totalAmount", "Billed Amount", MONEY),
      column("expectedAmount", "Contract Price", MONEY),
      column("differenceAmount", "Difference", MONEY),
      column("auditStatus", "Audit", ENUM),
      column("statusName", "Status", ENUM),
      column("approvalStatus", "Approval Status", ENUM),
      column("preApproved", "Pre-Approved", ENUM),
      column("enteredBy", "Entered By", ENUM),
      column("enteredOn", "Entered On", DATETIME),
      column("submittedForApprovalAt", "Sent for Approval On", DATETIME),
      column("approvedBy", "Approved By", ENUM),
      column("approvedAt", "Approved On", DATETIME),
      ...REMARK_COLUMNS,
    ],
    cards: [
      { label: "Invoices", type: COUNT, color: "primary" },
      { label: "Billed Amount", type: SUM, column: "totalAmount", format: MONEY, color: "info" },
      { label: "Contract Price", type: SUM, column: "expectedAmount", format: MONEY, color: "secondary" },
      { label: "Difference", type: SUM, column: "differenceAmount", format: MONEY, color: "error" },
      { label: "Approved", type: COUNT_WHERE, column: "approvalStatus", value: "Approved", color: "success" },
      { label: "Pending for Approval", type: COUNT_WHERE, column: "approvalStatus", value: "Pending for Approval", color: "warning" },
    ],
  },
  {
    key: REPORT_KEYS.CONTRACTS,
    label: "Contracts",
    description: "Contract Master with validity and status.",
    moduleKey: MODULE_KEYS.CONTRACT_MASTER,
    columns: [
      column("contractNo", "Contract No"),
      column("vendorName", "Vendor", ENUM),
      column("contractType", "Contract Type", ENUM),
      column("contactPerson", "Contact Person"),
      column("validFrom", "Valid From", DATE),
      column("validTo", "Valid To", DATE),
      column("daysToExpiry", "Days to Expiry", NUMBER),
      column("status", "Status", ENUM),
      column("rateMatrixFile", "Rate Matrix File"),
      column("createdBy", "Created By", ENUM),
      column("createdAt", "Created On", DATETIME),
      column("updatedAt", "Updated On", DATETIME),
      ...REMARK_COLUMNS,
    ],
    cards: [
      { label: "Contracts", type: COUNT, color: "primary" },
      { label: "Active", type: COUNT_WHERE, column: "status", value: "Active", color: "success" },
      { label: "Draft", type: COUNT_WHERE, column: "status", value: "Draft", color: "warning" },
      { label: "Expired", type: COUNT_WHERE, column: "status", value: "Expired", color: "error" },
      { label: "Vendors", type: DISTINCT, column: "vendorName", color: "info" },
    ],
  },
  {
    key: REPORT_KEYS.VENDORS,
    label: "Vendors",
    description: "Vendor Master with GST registrations and contracts.",
    moduleKey: MODULE_KEYS.VENDOR_MASTER,
    columns: [
      column("vendorCode", "Vendor Code"),
      column("vendorName", "Vendor Name"),
      column("panNo", "PAN"),
      column("contactPerson", "Contact Person"),
      column("email", "Email"),
      column("mobileNo", "Mobile"),
      column("address", "Address"),
      column("gstNumbers", "GST Numbers"),
      column("gstCount", "GST Count", NUMBER),
      column("contractCount", "Contracts", NUMBER),
      column("activeContractCount", "Active Contracts", NUMBER),
      column("status", "Status", ENUM),
      ...REMARK_COLUMNS,
    ],
    cards: [
      { label: "Vendors", type: COUNT, color: "primary" },
      { label: "Active", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.ACTIVE, color: "success" },
      { label: "Inactive", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.INACTIVE, color: "error" },
      { label: "GST Registrations", type: SUM, column: "gstCount", format: NUMBER, color: "info" },
      { label: "Active Contracts", type: SUM, column: "activeContractCount", format: NUMBER, color: "secondary" },
    ],
  },
  {
    key: REPORT_KEYS.DESTINATIONS,
    label: "Destinations",
    description: "Destination Master cities.",
    moduleKey: MODULE_KEYS.DESTINATION_MASTER,
    columns: [
      column("city", "City"),
      column("district", "District", ENUM),
      column("state", "State", ENUM),
      column("status", "Status", ENUM),
      ...REMARK_COLUMNS,
    ],
    cards: [
      { label: "Destinations", type: COUNT, color: "primary" },
      { label: "Active", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.ACTIVE, color: "success" },
      { label: "Districts", type: DISTINCT, column: "district", color: "info" },
      { label: "States", type: DISTINCT, column: "state", color: "secondary" },
    ],
  },
  {
    key: REPORT_KEYS.WEIGHTS,
    label: "Weights",
    description: "Weight Master slabs.",
    moduleKey: MODULE_KEYS.WEIGHT_MASTER,
    columns: [
      column("weight", "Weight", NUMBER),
      column("unit", "Unit", ENUM),
      column("status", "Status", ENUM),
      ...REMARK_COLUMNS,
    ],
    cards: [
      { label: "Weights", type: COUNT, color: "primary" },
      { label: "Active", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.ACTIVE, color: "success" },
      { label: "Inactive", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.INACTIVE, color: "error" },
      { label: "Units", type: DISTINCT, column: "unit", color: "info" },
    ],
  },
  {
    key: REPORT_KEYS.VEHICLE_TYPES,
    label: "Vehicle Types",
    description: "Vehicle Type Master with capacity.",
    moduleKey: MODULE_KEYS.VEHICLE_TYPE_MASTER,
    columns: [
      column("vehicleName", "Vehicle Name"),
      column("capacity", "Capacity", NUMBER),
      column("unit", "Unit", ENUM),
      column("status", "Status", ENUM),
      ...REMARK_COLUMNS,
    ],
    cards: [
      { label: "Vehicle Types", type: COUNT, color: "primary" },
      { label: "Active", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.ACTIVE, color: "success" },
      { label: "Inactive", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.INACTIVE, color: "error" },
      { label: "Total Capacity", type: SUM, column: "capacity", format: NUMBER, color: "info" },
    ],
  },
  {
    key: REPORT_KEYS.CUSTOMERS,
    label: "Customers / Suppliers",
    description: "Customer / Supplier Master.",
    moduleKey: MODULE_KEYS.CUSTOMER_MASTER,
    columns: [
      column("customerName", "Name"),
      column("partyType", "Type", ENUM),
      column("contactPerson", "Contact Person"),
      column("email", "Email"),
      column("phone", "Phone"),
      column("address", "Address"),
      column("status", "Status", ENUM),
      column("createdAt", "Created On", DATETIME),
      ...REMARK_COLUMNS,
    ],
    cards: [
      { label: "Parties", type: COUNT, color: "primary" },
      { label: "Customers", type: COUNT_WHERE, column: "partyType", value: "Customer", color: "info" },
      { label: "Suppliers", type: COUNT_WHERE, column: "partyType", value: "Supplier", color: "secondary" },
      { label: "Active", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.ACTIVE, color: "success" },
    ],
  },
  {
    key: REPORT_KEYS.USERS,
    label: "Users",
    description: "User Master with roles and location access.",
    moduleKey: MODULE_KEYS.USER_MASTER,
    columns: [
      column("fullName", "Name"),
      column("email", "Email"),
      column("mobileNo", "Mobile"),
      column("roleName", "Role", ENUM),
      column("status", "Status", ENUM),
      column("viewLocations", "Locations (View)", NUMBER),
      column("addLocations", "Locations (Add)", NUMBER),
      column("editLocations", "Locations (Edit)", NUMBER),
      column("lastLogin", "Last Login", DATETIME),
      column("createdAt", "Created On", DATETIME),
    ],
    cards: [
      { label: "Users", type: COUNT, color: "primary" },
      { label: "Active", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.ACTIVE, color: "success" },
      { label: "Inactive", type: COUNT_WHERE, column: "status", value: STATUS_LABELS.INACTIVE, color: "error" },
      { label: "Roles", type: DISTINCT, column: "roleName", color: "info" },
    ],
  },
  {
    key: REPORT_KEYS.MASTER_REQUESTS,
    label: "Master Approval Requests",
    description: "Master Add / Edit requests held for approval and their outcome.",
    moduleKey: null,
    columns: [
      column("requestId", "Request #", NUMBER),
      column("master", "Master", ENUM),
      column("action", "Action", ENUM),
      column("operation", "Type", ENUM),
      column("record", "Record"),
      column("status", "Status", ENUM),
      column("requestedBy", "Requested By", ENUM),
      column("requestedAt", "Requested On", DATETIME),
      column("actedBy", "Decided By", ENUM),
      column("actedAt", "Decided On", DATETIME),
      column("remarks", "Remarks / Reason"),
      column("result", "Result"),
    ],
    cards: [
      { label: "Requests", type: COUNT, color: "primary" },
      { label: "Pending", type: COUNT_WHERE, column: "status", value: "Pending", color: "warning" },
      { label: "Approved", type: COUNT_WHERE, column: "status", value: "Approved", color: "success" },
      { label: "Rejected", type: COUNT_WHERE, column: "status", value: "Rejected", color: "error" },
    ],
  },
];

const findReportDefinition = (key) => REPORT_DEFINITIONS.find((report) => report.key === key) || null;

module.exports = {
  REPORT_COLUMN_TYPES,
  REPORT_CARD_TYPES,
  REPORT_KEYS,
  REPORT_DEFINITIONS,
  MAX_REPORT_ROWS,
  STATUS_LABELS,
  findReportDefinition,
};
