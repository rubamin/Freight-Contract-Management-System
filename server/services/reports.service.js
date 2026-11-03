const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  InvoiceHeader,
  InvoiceVerification,
  Vendor,
  Plant,
  StatusMaster,
  User,
  VehicleType,
} = require("../models");
const { APPROVAL_STATUS_LABELS } = require("../constants/approvalWorkflow");
const { CONTRACT_TYPE_LABELS } = require("../constants/contractTypes");
const { MASTER_ACTION_LABELS, MASTER_REQUEST_OPERATIONS, getMasterLabel } = require("../constants/masterApproval");
const { isAdminRole } = require("../constants/roles");
const {
  REPORT_KEYS,
  REPORT_DEFINITIONS,
  MAX_REPORT_ROWS,
  STATUS_LABELS,
  findReportDefinition,
} = require("../constants/reportDefinitions");
const { buildInvoiceFilterWhere } = require("../utils/invoiceFilters");
const { getInvoiceAccessWhere } = require("../utils/invoiceAccess");
const permissionService = require("./permission.service");

const AUDIT_LABELS = { PRE_APPROVED: "Pre-Approved", APPROVED: "Approved", DISCREPANCY: "Discrepancy" };
const PARTY_TYPE_LABELS = { CUSTOMER: "Customer", SUPPLIER: "Supplier" };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const select = (sql, replacements = {}) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNumber = (value) => (value === null || value === undefined || value === "" ? null : Number(value));

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/(^|[\s_])([a-z])/g, (match, separator, letter) => `${separator === "_" ? " " : separator}${letter.toUpperCase()}`);

const activeLabel = (isActive) => (isActive ? STATUS_LABELS.ACTIVE : STATUS_LABELS.INACTIVE);

// Fetches InvoiceHeader rows (joined with Vendor, Plant, StatusMaster) for
// the given filters and shapes them into flat rows ready for the Excel
// export. Uses the same buildInvoiceFilterWhere shared with the Invoice
// List endpoint, so filter behavior stays identical between the two.
const getInvoiceReportRows = async (filters, user) => {
  const filtersWhere = buildInvoiceFilterWhere(filters);
  const accessWhere = await getInvoiceAccessWhere(user);
  const invoices = await InvoiceHeader.findAll({
    where: accessWhere
      ? { [Op.and]: [filtersWhere, accessWhere] }
      : filtersWhere,
    include: [
      { model: Vendor, as: "vendor", attributes: ["VendorName"] },
      { model: Plant, as: "plant", attributes: ["PlantName", "City"] },
      { model: StatusMaster, as: "invoiceStatus", attributes: ["StatusName"] },
      { model: User, as: "uploader", attributes: ["FullName"] },
      { model: User, as: "finalApprover", attributes: ["FullName"] },
    ],
    order: [["InvoiceDate", "DESC"]],
  });

  return invoices.map((invoice) => ({
    invoiceNumber: invoice.InvoiceNumber,
    invoiceDate: invoice.InvoiceDate,
    vendorName: invoice.vendor?.VendorName || "-",
    locationName: invoice.LocationName || invoice.plant?.PlantName || "-",
    customerName: invoice.CustomerName || "-",
    lrNumber: invoice.LRNumber || "-",
    soNumber: invoice.SONumber || "-",
    fromStation: invoice.FromStation || "-",
    toStation: invoice.ToStation || "-",
    totalAmount: Number(invoice.TotalInvoiceAmount || 0),
    statusName: invoice.invoiceStatus?.StatusName || "-",
    approvalStatus: APPROVAL_STATUS_LABELS[invoice.ApprovalStatus] || "-",
    enteredBy: invoice.uploader?.FullName || "-",
    enteredOn: invoice.UploadedDate || null,
    draftCreatedAt: invoice.DraftCreatedAt || null,
    submittedForApprovalAt: invoice.SubmittedForApprovalAt || null,
    approvedBy: invoice.finalApprover?.FullName || "-",
    approvedAt: invoice.FinalApprovedAt || null,
    userRemarks: invoice.UserRemarks || "-",
    systemRemarks: invoice.Remarks || "-",
  }));
};

// =====================================================================
//  On-screen reports (Reports page)
// =====================================================================

const loadInvoices = async (user) => {
  const accessWhere = await getInvoiceAccessWhere(user);
  const invoices = await InvoiceHeader.findAll({
    where: accessWhere || {},
    include: [
      { model: Vendor, as: "vendor", attributes: ["VendorName"] },
      { model: Plant, as: "plant", attributes: ["PlantName"] },
      { model: StatusMaster, as: "invoiceStatus", attributes: ["StatusName"] },
      { model: VehicleType, as: "vehicleType", attributes: ["VehicleName"] },
      { model: InvoiceVerification, as: "verification", attributes: ["ExpectedAmount", "DifferenceAmount", "VerificationStatus"] },
      { model: User, as: "uploader", attributes: ["FullName"] },
      { model: User, as: "finalApprover", attributes: ["FullName"] },
    ],
    order: [["InvoiceDate", "DESC"], ["InvoiceID", "DESC"]],
    limit: MAX_REPORT_ROWS + 1,
  });

  return invoices.map((invoice) => ({
    id: invoice.InvoiceID,
    invoiceNumber: invoice.InvoiceNumber,
    invoiceDate: invoice.InvoiceDate,
    contractType: CONTRACT_TYPE_LABELS[invoice.ContractType] || invoice.ContractType || null,
    vendorName: invoice.vendor?.VendorName || null,
    locationName: invoice.LocationName || invoice.plant?.PlantName || null,
    customerName: invoice.CustomerName || null,
    lrNumber: invoice.LRNumber || null,
    lrDate: invoice.LRDate || null,
    soNumber: invoice.SONumber || null,
    fromStation: invoice.FromStation || null,
    toStation: invoice.ToStation || null,
    vehicleType: invoice.vehicleType?.VehicleName || null,
    weight: toNumber(invoice.TotalWeight),
    basicFreight: toNumber(invoice.BasicFreight),
    detainCharges: toNumber(invoice.DetainCharges),
    extraCharges: toNumber(invoice.ExtraCharges),
    totalAmount: toNumber(invoice.TotalInvoiceAmount),
    expectedAmount: toNumber(invoice.verification?.ExpectedAmount),
    differenceAmount: toNumber(invoice.verification?.DifferenceAmount),
    auditStatus: AUDIT_LABELS[invoice.verification?.VerificationStatus] || invoice.verification?.VerificationStatus || null,
    statusName: invoice.invoiceStatus?.StatusName || null,
    approvalStatus: APPROVAL_STATUS_LABELS[invoice.ApprovalStatus] || null,
    preApproved: invoice.IsPreApproved ? "Yes" : "No",
    enteredBy: invoice.uploader?.FullName || null,
    enteredOn: invoice.UploadedDate || null,
    submittedForApprovalAt: invoice.SubmittedForApprovalAt || null,
    approvedBy: invoice.finalApprover?.FullName || null,
    approvedAt: invoice.FinalApprovedAt || null,
    userRemarks: invoice.UserRemarks || null,
    systemRemarks: invoice.Remarks || null,
  }));
};

const daysUntil = (date) => {
  if (!date) return null;
  const end = new Date(date);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);
};

const loadContracts = async () => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1}
       c.ContractID, c.ContractNo, v.VendorName, c.ContractType, c.ContactPerson, c.ContractStartDate,
       c.ContractEndDate, c.Status, c.RateMatrixFileName, u.FullName AS CreatedByName, c.CreatedAt, c.UpdatedAt,
       c.UserRemarks, c.Remarks
     FROM ContractMaster c
     LEFT JOIN Vendors v ON v.VendorID = c.VendorID
     LEFT JOIN Users u ON u.UserID = c.CreatedBy
     ORDER BY c.ContractID DESC`
  );
  return rows.map((row) => ({
    id: row.ContractID,
    contractNo: row.ContractNo,
    vendorName: row.VendorName,
    contractType: CONTRACT_TYPE_LABELS[row.ContractType] || row.ContractType,
    contactPerson: row.ContactPerson,
    validFrom: row.ContractStartDate,
    validTo: row.ContractEndDate,
    daysToExpiry: daysUntil(row.ContractEndDate),
    status: titleCase(row.Status),
    rateMatrixFile: row.RateMatrixFileName,
    createdBy: row.CreatedByName,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
    userRemarks: row.UserRemarks,
    systemRemarks: row.Remarks,
  }));
};

const loadVendors = async () => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1}
       v.VendorID, v.VendorCode, v.VendorName, v.PANNo, v.ContactPerson, v.Email, v.MobileNo, v.Address,
       v.IsActive, v.UserRemarks, v.Remarks,
       (SELECT COUNT(*) FROM VendorGST g WHERE g.VendorID = v.VendorID) AS GstCount,
       STUFF((SELECT ', ' + g.GSTNumber FROM VendorGST g WHERE g.VendorID = v.VendorID ORDER BY g.GSTNumber FOR XML PATH('')), 1, 2, '') AS GstNumbers,
       (SELECT COUNT(*) FROM ContractMaster c WHERE c.VendorID = v.VendorID) AS ContractCount,
       (SELECT COUNT(*) FROM ContractMaster c WHERE c.VendorID = v.VendorID AND c.Status = 'ACTIVE') AS ActiveContractCount
     FROM Vendors v
     ORDER BY v.VendorName`
  );
  return rows.map((row) => ({
    id: row.VendorID,
    vendorCode: row.VendorCode,
    vendorName: row.VendorName,
    panNo: row.PANNo,
    contactPerson: row.ContactPerson,
    email: row.Email,
    mobileNo: row.MobileNo,
    address: row.Address,
    gstNumbers: row.GstNumbers,
    gstCount: toNumber(row.GstCount),
    contractCount: toNumber(row.ContractCount),
    activeContractCount: toNumber(row.ActiveContractCount),
    status: activeLabel(row.IsActive),
    userRemarks: row.UserRemarks,
    systemRemarks: row.Remarks,
  }));
};

const loadDestinations = async () => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1} DestinationID, City, District, State, IsActive, UserRemarks, Remarks
     FROM DestinationMaster ORDER BY City`
  );
  return rows.map((row) => ({
    id: row.DestinationID,
    city: row.City,
    district: row.District,
    state: row.State,
    status: activeLabel(row.IsActive),
    userRemarks: row.UserRemarks,
    systemRemarks: row.Remarks,
  }));
};

const loadWeights = async () => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1} WeightID, Weight, WeightUnit, IsActive, UserRemarks, Remarks
     FROM WeightMaster ORDER BY Weight`
  );
  return rows.map((row) => ({
    id: row.WeightID,
    weight: toNumber(row.Weight),
    unit: row.WeightUnit,
    status: activeLabel(row.IsActive),
    userRemarks: row.UserRemarks,
    systemRemarks: row.Remarks,
  }));
};

const loadVehicleTypes = async () => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1} VehicleTypeID, VehicleName, Capacity, Unit, IsActive, UserRemarks, Remarks
     FROM VehicleTypes ORDER BY VehicleName`
  );
  return rows.map((row) => ({
    id: row.VehicleTypeID,
    vehicleName: row.VehicleName,
    capacity: toNumber(row.Capacity),
    unit: row.Unit,
    status: activeLabel(row.IsActive),
    userRemarks: row.UserRemarks,
    systemRemarks: row.Remarks,
  }));
};

const loadCustomers = async () => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1} CustomerID, CustomerName, PartyType, ContactPerson, Email, Phone, Address,
       IsActive, CreatedAt, UserRemarks, Remarks
     FROM CustomerMaster ORDER BY CustomerName`
  );
  return rows.map((row) => ({
    id: row.CustomerID,
    customerName: row.CustomerName,
    partyType: PARTY_TYPE_LABELS[row.PartyType] || row.PartyType,
    contactPerson: row.ContactPerson,
    email: row.Email,
    phone: row.Phone,
    address: row.Address,
    status: activeLabel(row.IsActive),
    createdAt: row.CreatedAt,
    userRemarks: row.UserRemarks,
    systemRemarks: row.Remarks,
  }));
};

const loadUsers = async () => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1} u.UserID, u.FullName, u.Email, u.MobileNo, r.RoleName, u.IsActive, u.LastLogin, u.CreatedAt,
       (SELECT COUNT(*) FROM UserLocationPermission p WHERE p.UserID = u.UserID AND p.LocationID IS NOT NULL AND p.CanView = 1) AS ViewLocations,
       (SELECT COUNT(*) FROM UserLocationPermission p WHERE p.UserID = u.UserID AND p.LocationID IS NOT NULL AND p.CanAdd = 1) AS AddLocations,
       (SELECT COUNT(*) FROM UserLocationPermission p WHERE p.UserID = u.UserID AND p.LocationID IS NOT NULL AND p.CanEdit = 1) AS EditLocations
     FROM Users u
     LEFT JOIN Roles r ON r.RoleID = u.RoleID
     ORDER BY u.FullName`
  );
  return rows.map((row) => ({
    id: row.UserID,
    fullName: row.FullName,
    email: row.Email,
    mobileNo: row.MobileNo,
    roleName: row.RoleName,
    status: activeLabel(row.IsActive),
    viewLocations: toNumber(row.ViewLocations),
    addLocations: toNumber(row.AddLocations),
    editLocations: toNumber(row.EditLocations),
    lastLogin: row.LastLogin,
    createdAt: row.CreatedAt,
  }));
};

// Admins see every request; other users their own and the ones of the
// masters / actions they approve.
const loadMasterRequests = async (user) => {
  const rows = await select(
    `SELECT TOP ${MAX_REPORT_ROWS + 1}
       r.RequestID, r.ModuleKey, r.ActionType, r.Operation, r.RecordLabel, r.Status, r.RequestedAt, r.ActedAt,
       r.ActionRemarks, r.ResultMessage, rq.FullName AS RequestedByName, ac.FullName AS ActedByName
     FROM MasterChangeRequests r
     JOIN Users rq ON rq.UserID = r.RequestedBy
     LEFT JOIN Users ac ON ac.UserID = r.ActedBy
     WHERE :isAdmin = 1 OR r.RequestedBy = :userId
        OR EXISTS (SELECT 1 FROM MasterApprovalApprovers a
                   WHERE a.UserID = :userId AND a.ModuleKey = r.ModuleKey AND a.ActionType = r.ActionType)
     ORDER BY r.RequestID DESC`,
    { isAdmin: isAdminRole(user.RoleName) ? 1 : 0, userId: user.UserID }
  );
  return rows.map((row) => ({
    id: row.RequestID,
    requestId: row.RequestID,
    master: getMasterLabel(row.ModuleKey),
    action: MASTER_ACTION_LABELS[row.ActionType] || row.ActionType,
    operation: row.Operation === MASTER_REQUEST_OPERATIONS.BULK ? "Bulk upload" : "Single record",
    record: row.RecordLabel,
    status: titleCase(row.Status),
    requestedBy: row.RequestedByName,
    requestedAt: row.RequestedAt,
    actedBy: row.ActedByName,
    actedAt: row.ActedAt,
    remarks: row.ActionRemarks,
    result: row.ResultMessage,
  }));
};

const REPORT_LOADERS = {
  [REPORT_KEYS.INVOICES]: loadInvoices,
  [REPORT_KEYS.CONTRACTS]: loadContracts,
  [REPORT_KEYS.VENDORS]: loadVendors,
  [REPORT_KEYS.DESTINATIONS]: loadDestinations,
  [REPORT_KEYS.WEIGHTS]: loadWeights,
  [REPORT_KEYS.VEHICLE_TYPES]: loadVehicleTypes,
  [REPORT_KEYS.CUSTOMERS]: loadCustomers,
  [REPORT_KEYS.USERS]: loadUsers,
  [REPORT_KEYS.MASTER_REQUESTS]: loadMasterRequests,
};

// A report needs View on its module; reports without a module (master
// requests) are open to every Reports user and scoped by the loader.
const canOpenReport = (report, permissions) =>
  !report.moduleKey || permissions.isAdmin || Boolean(permissions.modulePermissions?.[report.moduleKey]?.CanView);

const describeReport = ({ key, label, description, columns, cards }) => ({ key, label, description, columns, cards });

const getReportCatalog = async (user) => {
  const permissions = await permissionService.getUserPermissions(user.UserID);
  return REPORT_DEFINITIONS
    .filter((report) => canOpenReport(report, permissions))
    .map(({ key, label, description }) => ({ key, label, description }));
};

const getReport = async (reportKey, user) => {
  const report = findReportDefinition(reportKey);
  if (!report) throw httpError("Report not found.", 404);
  const permissions = await permissionService.getUserPermissions(user.UserID);
  if (!canOpenReport(report, permissions)) throw httpError("You do not have access to this report.", 403);

  const rows = await REPORT_LOADERS[report.key](user);
  return {
    ...describeReport(report),
    rows: rows.slice(0, MAX_REPORT_ROWS),
    truncated: rows.length > MAX_REPORT_ROWS,
    maxRows: MAX_REPORT_ROWS,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = { getInvoiceReportRows, getReportCatalog, getReport };
