const XLSX = require("xlsx");
const { Vendor, VendorGST, ContractMaster } = require("../models");
const crudService = require("./crud.service");
const vendorService = require("./vendor.services");
const contractService = require("./contract.service");
const masterModuleRegistry = require("../config/masterModuleRegistry");
const { MODULE_KEYS } = require("../constants/modules");
const { CONTRACT_TYPE_LABELS } = require("../constants/contractTypes");

// How each approval-enabled master is read, labelled and written. An
// approved request is applied through the exact service call its route
// would have made, with the requester as the acting user.

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toPlain = (record) => (record?.toJSON ? record.toJSON() : record || null);

const textOf = (...values) => values.map((value) => String(value ?? "").trim()).filter(Boolean).join(" ");

// First sheet of an uploaded Excel / CSV file as row objects keyed by header.
const readSheetRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return sheet ? XLSX.utils.sheet_to_json(sheet) : [];
};

const describeBulkResult = (result) => {
  const failed = result.errorCount ?? (result.errors || []).length;
  return `${result.successCount || 0} row(s) added, ${failed || 0} failed.`;
};

// Generic CRUD masters (Destination, Weight, Vehicle Type, Customer).
const crudExecutor = (moduleKey, buildLabel) => {
  const config = masterModuleRegistry[moduleKey];
  return {
    findRecord: async (id) => toPlain(await config.model.findByPk(id)),
    buildLabel,
    create: async (payload, context) => {
      const record = await crudService.create(config, payload, context.req);
      return { recordId: record[config.primaryKey], message: "Record created." };
    },
    update: async (id, payload, context) => {
      const record = await crudService.update(config, id, payload, context.req);
      if (!record) throw httpError("The record no longer exists.", 404);
      return { recordId: Number(id), message: "Record updated." };
    },
    bulk: async (rows, context) => {
      const result = await crudService.bulkUpload(config, rows, context.req);
      return { recordId: null, message: describeBulkResult(result) };
    },
  };
};

const vendorExecutor = {
  findRecord: async (id) =>
    toPlain(await Vendor.findByPk(id, { include: [{ model: VendorGST, as: "gstNumbers", required: false }] })),
  buildLabel: async (data) => textOf(data.VendorName, data.VendorCode ? `(${data.VendorCode})` : ""),
  create: async (payload, context) => {
    const vendor = await vendorService.createVendor(payload, null, context.user);
    return { recordId: vendor?.VendorID || null, message: "Vendor created." };
  },
  update: async (id, payload, context) => {
    await vendorService.updateVendor(id, payload, null, context.user);
    return { recordId: Number(id), message: "Vendor updated." };
  },
  bulk: async (rows, context) => {
    const result = await vendorService.bulkUploadVendors(rows, context.user);
    return { recordId: null, message: describeBulkResult(result) };
  },
};

const vendorNameOf = async (vendorId) => {
  if (!vendorId) return "";
  const vendor = await Vendor.findByPk(vendorId, { attributes: ["VendorName"] });
  return vendor?.VendorName || `Vendor #${vendorId}`;
};

const contractExecutor = {
  // Header only - the rate matrix is far too large to keep as a snapshot.
  findRecord: async (id) => toPlain(await ContractMaster.findByPk(id)),
  buildLabel: async (data) => {
    const typeLabel = CONTRACT_TYPE_LABELS[data.ContractType] || data.ContractType || "";
    return textOf(data.ContractNo, await vendorNameOf(data.VendorID || data.VendorId), typeLabel ? `- ${typeLabel}` : "");
  },
  create: async (payload, context) => {
    const contract = await contractService.createContract({ data: payload, file: context.file, user: context.user });
    return { recordId: contract?.ContractID || null, message: "Contract created." };
  },
  update: async (id, payload, context) => {
    const contract = await contractService.updateContract({
      contractId: id,
      data: payload,
      file: context.file,
      user: context.user,
    });
    if (!contract) throw httpError("The contract no longer exists.", 404);
    return { recordId: Number(id), message: "Contract updated." };
  },
};

const MASTER_CHANGE_EXECUTORS = {
  [MODULE_KEYS.VENDOR_MASTER]: vendorExecutor,
  [MODULE_KEYS.CONTRACT_MASTER]: contractExecutor,
  [MODULE_KEYS.DESTINATION_MASTER]: crudExecutor(MODULE_KEYS.DESTINATION_MASTER, async (data) => textOf(data.City, data.District ? `(${data.District})` : "")),
  [MODULE_KEYS.WEIGHT_MASTER]: crudExecutor(MODULE_KEYS.WEIGHT_MASTER, async (data) => textOf(data.Weight, data.WeightUnit)),
  [MODULE_KEYS.VEHICLE_TYPE_MASTER]: crudExecutor(MODULE_KEYS.VEHICLE_TYPE_MASTER, async (data) => textOf(data.VehicleName, data.Capacity ? `${data.Capacity} ${data.Unit || ""}` : "")),
  [MODULE_KEYS.CUSTOMER_MASTER]: crudExecutor(MODULE_KEYS.CUSTOMER_MASTER, async (data) => textOf(data.CustomerName, data.PartyType ? `(${data.PartyType})` : "")),
};

const getMasterChangeExecutor = (moduleKey) => {
  const executor = MASTER_CHANGE_EXECUTORS[moduleKey];
  if (!executor) throw httpError("This master does not support approval.", 404);
  return executor;
};

module.exports = { getMasterChangeExecutor, readSheetRows };
