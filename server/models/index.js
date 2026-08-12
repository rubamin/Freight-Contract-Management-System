const sequelize = require("../config/database");

// Importing Base Master Data Models
const Vendor = require("./Vendor");
const VendorGST = require("./VendorGST");
const User = require("./User");
const Role = require("./Role");
const RolePermission = require("./RolePermission");
const Plant = require("./Plant");
const VehicleType = require("./VehicleType");
const WeightMaster = require("./WeightMaster");
const DestinationMaster = require("./DestinationMaster");
const StatusMaster = require("./StatusMaster");

// Importing Cleaned Contract Subsystem Models
const ContractMaster = require("./ContractMaster");
const ContractRateMatrix = require("./ContractRateMatrix");

// Importing Invoice Subsystem Models
const InvoiceHeader = require("./InvoiceHeader");
const InvoiceItem = require("./InvoiceItem");
const InvoiceApprovalHistory = require("./InvoiceApprovalHistory");
const InvoiceVerification = require("./InvoiceVerification"); // <-- Added InvoiceVerification


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

RolePermission.belongsTo(Role, {
  foreignKey: "RoleID",
  as: "role",
});

Role.hasMany(RolePermission, {
  foreignKey: "RoleID",
  as: "rolePermissions",
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

module.exports = {
  sequelize,
  Vendor,
  VendorGST,
  User,
  Role,
  RolePermission,
  Plant,
  VehicleType,
  WeightMaster,
  DestinationMaster,
  StatusMaster,
  ContractMaster,
  ContractRateMatrix,
  InvoiceHeader,
  InvoiceItem,
  InvoiceApprovalHistory,
  InvoiceVerification, // <-- Added to exports
};