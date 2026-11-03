// controllers/masterSearchController.js
const {
  Vendor,
  VendorGST,
  DestinationMaster,
  CustomerMaster,
  ContractMaster,
  ContractRateMatrix,
  ContractZoneRate,
  sequelize,
} = require("../models");
const { CONTRACT_TYPES, normalizeContractType } = require("../constants/contractTypes");
const { CONTRACT_STATUS } = require("../constants/contractStatus");
const { PARTY_TYPES, normalizePartyType } = require("../constants/partyTypes");
const { buildCreatedRemark } = require("../utils/systemRemarks");

const namesOfPartyType = (records, partyType) =>
  records.filter((record) => record.PartyType === partyType).map((record) => record.CustomerName).filter(Boolean);

// Part Load zones list their cities / states in COVERAGE separated by "/".
const COVERAGE_SEPARATOR = /[/,]/;

const getInvoiceMasterSuggestions = async (req, res) => {
  try {
    // Active vendors only, so the AddInvoice "Vendor Name" dropdown never
    // offers a vendor that's been deactivated.
    const vendors = await Vendor.findAll({
      attributes: ['VendorID', 'VendorName'],
      where: { IsActive: true },
      order: [['VendorName', 'ASC']],
      raw: true
    });

    // IsDefault lets the frontend pick each vendor's active/default GST
    // number automatically when a vendor is selected.
    const vendorGsts = await VendorGST.findAll({
      attributes: ['VendorGSTID', 'GSTNumber', 'VendorID', 'IsDefault'],
      raw: true
    });

    // Party names come from the Customer / Supplier Master, split by type:
    // outbound invoices list customers, inbound invoices list suppliers.
    const partyRecords = await CustomerMaster.findAll({
      attributes: ['CustomerID', 'CustomerName', 'PartyType'],
      where: { IsActive: true },
      order: [['CustomerName', 'ASC']],
      raw: true
    });

    // Destination choices are not listed here: Add / Edit Invoice load
    // them per vendor contract from getContractDestinations below.

    return res.status(200).json({
      success: true,
      data: {
        vendors: vendors || [],
        vendorGsts: vendorGsts || [],
        customers: namesOfPartyType(partyRecords, PARTY_TYPES.CUSTOMER),
        suppliers: namesOfPartyType(partyRecords, PARTY_TYPES.SUPPLIER)
      }
    });
  } catch (error) {
    console.error("Error fetching master suggestions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Creates a Customer / Supplier Master record from a name typed on Add
// Invoice, so a new party never requires leaving the invoice form. The
// type comes from the invoice (inbound -> supplier, outbound -> customer).
// Silently no-ops (still returns success) if that name already exists for
// that type, since the frontend calls this on every new-looking name.
const createCustomerFromInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const customerName = (req.body?.customerName || "").trim();
    const partyType = normalizePartyType(req.body?.partyType) || PARTY_TYPES.CUSTOMER;

    if (!customerName) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Customer / Supplier name is required." });
    }

    let customer = await CustomerMaster.findOne({
      where: { CustomerName: customerName, PartyType: partyType },
      transaction,
    });

    let created = false;
    if (!customer) {
      // Omit CreatedAt here; model/database default will apply GETDATE() automatically
      customer = await CustomerMaster.create(
        {
          CustomerName: customerName,
          PartyType: partyType,
          Remarks: buildCreatedRemark(req.user, "Added from Add Invoice"),
        },
        { transaction }
      );
      created = true;
    }

    await transaction.commit();
    return res.status(created ? 201 : 200).json({
      success: true,
      created,
      data: customer,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback().catch(() => {});
    }
    console.error("Error creating customer from invoice form:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
const uniqueSortedNames = (names) => {
  const byKey = new Map();
  names.forEach((name) => {
    const trimmed = String(name || "").trim();
    if (trimmed && !byKey.has(trimmed.toUpperCase())) byKey.set(trimmed.toUpperCase(), trimmed);
  });
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
};

const coverageNames = (zoneRates) =>
  zoneRates.flatMap((zone) => String(zone.Coverage || "").split(COVERAGE_SEPARATOR));

// Destinations of the vendor's ACTIVE contract of the given type - the same
// contract the invoice audit checks against - so Add / Edit Invoice only
// offer cities that actually have a contract rate.
const getContractDestinations = async (req, res) => {
  try {
    const vendorId = Number(req.query.vendorId);
    const contractType = normalizeContractType(req.query.contractType);
    if (!Number.isInteger(vendorId) || vendorId <= 0 || !contractType) {
      return res.status(400).json({ success: false, message: "A valid vendorId and contractType are required." });
    }

    const contract = await ContractMaster.findOne({
      where: { VendorID: vendorId, ContractType: contractType, Status: CONTRACT_STATUS.ACTIVE },
      attributes: ["ContractID", "ContractNo"],
      include: [
        {
          model: ContractRateMatrix,
          as: "rateMatrix",
          attributes: ["RateID"],
          include: [{ model: DestinationMaster, as: "destination", attributes: ["City"] }],
        },
        { model: ContractZoneRate, as: "zoneRates", attributes: ["Coverage"] },
      ],
    });

    if (!contract) {
      return res.status(200).json({ success: true, data: { contractId: null, contractNo: null, destinations: [] } });
    }

    const names = contractType === CONTRACT_TYPES.PART_LOAD
      ? coverageNames(contract.zoneRates || [])
      : (contract.rateMatrix || []).map((rate) => rate.destination?.City);

    return res.status(200).json({
      success: true,
      data: {
        contractId: contract.ContractID,
        contractNo: contract.ContractNo,
        destinations: uniqueSortedNames(names),
      },
    });
  } catch (error) {
    console.error("Error fetching contract destinations:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getInvoiceMasterSuggestions, createCustomerFromInvoice, getContractDestinations };
