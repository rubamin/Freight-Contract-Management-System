const sequelize = require("../config/database");

// Importing Base Master Data Models
const Vendor = require("./Vendor");
const VendorGST = require("./VendorGST");
const User = require("./User");
const Role = require("./Role");
const UserPreference = require("./UserPreference");
const Notification = require("./Notification");
const Plant = require("./Plant");
const PlantLocation = require("./PlantLocation");
const VehicleType = require("./VehicleType");
const WeightMaster = require("./WeightMaster");
const DestinationMaster = require("./DestinationMaster");
const StatusMaster = require("./StatusMaster");
const CustomerMaster = require("./CustomerMaster");
const AuditLog = require("./Auditlog");

// Importing Cleaned Contract Subsystem Models
const ContractMaster = require("./ContractMaster");
const ContractRateMatrix = require("./ContractRateMatrix");
const ContractCharge = require("./ContractCharge");
const ContractZoneRate = require("./ContractZoneRate");

// Importing Invoice Subsystem Models
const InvoiceHeader = require("./InvoiceHeader");
const InvoiceItem = require("./InvoiceItem");
const InvoiceApprovalHistory = require("./InvoiceApprovalHistory");
const InvoiceVerification = require("./InvoiceVerification"); // <-- Added InvoiceVerification
const InvoiceDraft = require("./InvoiceDraft");
const UserModulePermission = require("./UserModulePermission");
const UserLocationPermission = require("./UserLocationPermission");
const AccessRequest = require("./AccessRequest");
const PasswordHistory = require("./PasswordHistory");
const PasswordOtp = require("./PasswordOtp");


// ==========================================
//  VENDOR & GST ASSOCIATIONS
// ==========================================
Vendor.hasMany(VendorGST, {
  foreignKey: "VendorID",
  as: "gstNumbers",
});

VendorGST.belongsTo(Vendor, {
  foreignKey: "VendorID",
  as: "vendor",
});

// ==========================================
//  USER & ROLE/PERMISSION ASSOCIATIONS
// ==========================================
Role.hasMany(User, {
  foreignKey: "RoleID",
  as: "users",
});

User.belongsTo(Role, {
  foreignKey: "RoleID",
  as: "role",
});

// ==========================================
//  USER PREFERENCES ASSOCIATIONS
// ==========================================
User.hasOne(UserPreference, {
  foreignKey: "UserID",
  as: "preferences",
});

UserPreference.belongsTo(User, {
  foreignKey: "UserID",
  as: "user",
});

UserPreference.belongsTo(Plant, {
  foreignKey: "DefaultPlantID",
  as: "defaultPlant",
});

// ==========================================
//  CLEANED CONTRACT MASTER ASSOCIATIONS
// ==========================================
Vendor.hasMany(ContractMaster, {
  foreignKey: "VendorID",
  as: "contracts",
});

ContractMaster.belongsTo(Vendor, {
  foreignKey: "VendorID",
  as: "vendor",
});

User.hasMany(ContractMaster, {
  foreignKey: "CreatedBy",
  as: "createdContracts",
});

ContractMaster.belongsTo(User, {
  foreignKey: "CreatedBy",
  as: "creator",
});

User.hasMany(ContractMaster, {
  foreignKey: "UpdatedBy",
  as: "updatedContracts",
});

ContractMaster.belongsTo(User, {
  foreignKey: "UpdatedBy",
  as: "updater",
});

// ==========================================
//  CONTRACT RATE MATRIX REFACTORED ASSOCIATIONS
// ==========================================
ContractMaster.hasMany(ContractRateMatrix, {
  foreignKey: "ContractID",
  as: "rateMatrix",
});

ContractRateMatrix.belongsTo(ContractMaster, {
  foreignKey: "ContractID",
  as: "contract",
});

DestinationMaster.hasMany(ContractRateMatrix, {
  foreignKey: "DestinationID",
  as: "rates",
});

ContractRateMatrix.belongsTo(DestinationMaster, {
  foreignKey: "DestinationID",
  as: "destination",
});

VehicleType.hasMany(ContractRateMatrix, {
  foreignKey: "VehicleTypeID",
  as: "rates",
});

ContractRateMatrix.belongsTo(VehicleType, {
  foreignKey: "VehicleTypeID",
  as: "vehicleType",
});

WeightMaster.hasMany(ContractRateMatrix, {
  foreignKey: "WeightID",
  as: "rates",
});

ContractRateMatrix.belongsTo(WeightMaster, {
  foreignKey: "WeightID",
  as: "weight",
});

// Contract type charges and Part Load zone rates (migration_v11)
ContractMaster.hasMany(ContractCharge, {
  foreignKey: "ContractID",
  as: "charges",
});

ContractCharge.belongsTo(ContractMaster, {
  foreignKey: "ContractID",
  as: "contract",
});

ContractMaster.hasMany(ContractZoneRate, {
  foreignKey: "ContractID",
  as: "zoneRates",
});

ContractZoneRate.belongsTo(ContractMaster, {
  foreignKey: "ContractID",
  as: "contract",
});

// ==========================================
//  INVOICE STRUCTURE ARCHITECTURE
// ==========================================
InvoiceHeader.hasMany(InvoiceItem, {
  foreignKey: "InvoiceID",
  as: "items",
});

InvoiceItem.belongsTo(InvoiceHeader, {
  foreignKey: "InvoiceID",
  as: "invoice",
});

Vendor.hasMany(InvoiceHeader, {
  foreignKey: "VendorID",
  as: "invoices",
});

InvoiceHeader.belongsTo(Vendor, {
  foreignKey: "VendorID",
  as: "vendor",
});

VendorGST.hasMany(InvoiceHeader, {
  foreignKey: "VendorGSTID",
  as: "invoices",
});

InvoiceHeader.belongsTo(VendorGST, {
  foreignKey: "VendorGSTID",
  as: "vendorGST",
});

Plant.hasMany(InvoiceHeader, {
  foreignKey: "PlantID",
  as: "invoices",
});

InvoiceHeader.belongsTo(Plant, {
  foreignKey: "PlantID",
  as: "plant",
});

// Links Plant to the Company -> SBU -> PlantsHierarchy -> PlantLocations
// hierarchy managed from Settings, so the plants API can return the real
// LocationName instead of the two tables having no relationship at all.
Plant.belongsTo(PlantLocation, {
  foreignKey: "LocationID",
  as: "location",
});

PlantLocation.hasMany(Plant, {
  foreignKey: "LocationID",
  as: "plants",
});

// Links InvoiceHeader directly to the real hierarchy Location the user
// selected on Add Invoice - independent of whichever Plants row PlantID
// resolves to, so the invoice's Location no longer depends on a Plants row
// happening to be linked to that Location.
PlantLocation.hasMany(InvoiceHeader, {
  foreignKey: "LocationID",
  as: "invoicesByLocation",
});

InvoiceHeader.belongsTo(PlantLocation, {
  foreignKey: "LocationID",
  as: "location",
});

ContractMaster.hasMany(InvoiceHeader, {
  foreignKey: "ContractID",
  as: "invoices",
});

InvoiceHeader.belongsTo(ContractMaster, {
  foreignKey: "ContractID",
  as: "contract",
});

VehicleType.hasMany(InvoiceHeader, {
  foreignKey: "VehicleTypeID",
  as: "invoices",
});

InvoiceHeader.belongsTo(VehicleType, {
  foreignKey: "VehicleTypeID",
  as: "vehicleType",
});

StatusMaster.hasMany(InvoiceHeader, {
  foreignKey: "InvoiceStatusID",
  as: "invoices",
});

InvoiceHeader.belongsTo(StatusMaster, {
  foreignKey: "InvoiceStatusID",
  as: "invoiceStatus",
});

// ==========================================
//  INVOICE VERIFICATION & LOGGING SUBSYSTEM
// ==========================================
InvoiceHeader.hasMany(InvoiceApprovalHistory, {
  foreignKey: "InvoiceID",
  as: "approvalHistory",
});

InvoiceApprovalHistory.belongsTo(InvoiceHeader, {
  foreignKey: "InvoiceID",
  as: "invoice",
});

// Added InvoiceVerification Associations
InvoiceHeader.hasOne(InvoiceVerification, {
  foreignKey: "InvoiceID",
  as: "verification",
});

InvoiceVerification.belongsTo(InvoiceHeader, {
  foreignKey: "InvoiceID",
  as: "invoice",
});

// Users behind an invoice's approval tracking columns (migration_v14).
InvoiceHeader.belongsTo(User, {
  foreignKey: "UploadedBy",
  as: "uploader",
});

InvoiceHeader.belongsTo(User, {
  foreignKey: "SelectedApproverUserID",
  as: "selectedApprover",
});

InvoiceHeader.belongsTo(User, {
  foreignKey: "FinalApprovedBy",
  as: "finalApprover",
});

// ==========================================
//  PER-USER MODULE & LOCATION PERMISSIONS
// ==========================================
User.hasMany(UserModulePermission, {
  foreignKey: "UserID",
  as: "modulePermissions",
});

UserModulePermission.belongsTo(User, {
  foreignKey: "UserID",
  as: "user",
});

User.hasMany(UserLocationPermission, {
  foreignKey: "UserID",
  as: "locationPermissions",
});

UserLocationPermission.belongsTo(User, {
  foreignKey: "UserID",
  as: "user",
});

Plant.hasMany(UserLocationPermission, {
  foreignKey: "PlantID",
  as: "userPermissions",
});

UserLocationPermission.belongsTo(Plant, {
  foreignKey: "PlantID",
  as: "plant",
});

UserLocationPermission.belongsTo(PlantLocation, {
  foreignKey: "LocationID",
  as: "location",
});

User.hasMany(Notification, {
  foreignKey: "UserID",
  as: "notifications",
});

Notification.belongsTo(User, {
  foreignKey: "UserID",
  as: "recipient",
});

// ==========================================
//  GENERALIZED ACCESS REQUESTS
// ==========================================
User.hasMany(AccessRequest, {
  foreignKey: "UserID",
  as: "accessRequests",
});

AccessRequest.belongsTo(User, {
  foreignKey: "UserID",
  as: "user",
});

AccessRequest.belongsTo(Plant, {
  foreignKey: "PlantID",
  as: "plant",
});

AccessRequest.belongsTo(PlantLocation, {
  foreignKey: "LocationID",
  as: "location",
});

module.exports = {
  sequelize,
  AccessRequest,
  CustomerMaster,
  UserModulePermission,
  UserLocationPermission,
  Vendor,
  VendorGST,
  User,
  Role,
  UserPreference,
  Notification,
  Plant,
  PlantLocation,
  VehicleType,
  WeightMaster,
  DestinationMaster,
  StatusMaster,
  AuditLog,
  ContractMaster,
  ContractRateMatrix,
  ContractCharge,
  ContractZoneRate,
  InvoiceHeader,
  InvoiceItem,
  InvoiceApprovalHistory,
  InvoiceVerification, // <-- Added to exports
  InvoiceDraft,
  PasswordHistory,
  PasswordOtp,
};