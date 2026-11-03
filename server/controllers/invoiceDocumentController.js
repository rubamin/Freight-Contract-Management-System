const { 
  InvoiceHeader, 
  InvoiceItem, 
  InvoiceVerification, 
  Vendor, 
  VendorGST, 
  ContractRateMatrix, 
  DestinationMaster, 
  VehicleType,
  WeightMaster,
  Plant,
  PlantLocation,
  StatusMaster
} = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize"); 
const fs = require('fs');
const path = require('path');
const { resolveValidPlant } = require("../utils/plantHelper");
const { isForeignKeyViolationForTable } = require("../utils/dbErrorHelper");
const { normalizeDateForDb } = require("../utils/dateFormatter");
const { getInvoiceAccessWhere } = require("../utils/invoiceAccess");
const { getLocationAccess, assertCanAddInvoice, assertCanEditInvoice } = require("../utils/locationAccess");
const { INVALID_PLANT_LOCATION_MESSAGE } = require("../constants/messages");
const { MIN_FREIGHT_CHARGE, MIN_FREIGHT_CHARGE_MESSAGE, MAX_SO_NUMBER_LENGTH } = require("../constants/invoiceRules");
const { PENDING_VERIFICATION_STATUS_NAME, VERIFICATION_STATUS_APPROVED, VERIFICATION_STATUS_DISCREPANCY, VERIFICATION_STATUS_PRE_APPROVED } = require("../constants/invoiceStatus");
const notificationService = require("../services/notification.service");
const { findContractForInvoice, findRateForVehicleType, computeTypedContractAudit } = require("../services/invoiceAudit.service");
const approvalWorkflowService = require("../services/approvalWorkflow.service");
const { deliverNotices, withMailWarnings } = require("../services/approvalMail.service");
const { ROUTING_OUTCOMES } = require("../constants/approvalWorkflow");
const { INVOICE_DOCUMENT_RULE, findUploadRuleViolation, findTotalSizeViolation } = require("../constants/uploadRules");
const {
  CONTRACT_TYPES,
  DEFAULT_CONTRACT_TYPE,
  KG_BASED_CONTRACT_TYPES,
  normalizeInvoiceType,
  isAdHocInvoiceType,
} = require("../constants/contractTypes");
const {
  NOTIFICATION_TYPE_INVOICE_CREATED,
  NOTIFICATION_TYPE_DISCREPANCY_DETECTED,
} = require("../constants/notificationTypes");
const { getPartyLabelForContractType } = require("../constants/partyTypes");
const { normalizeUserRemark } = require("../utils/systemRemarks");

// State mapping dictionary based on GST number prefix
const GST_STATE_MAP = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

// Helper function to extract state name from GST number
const getStateFromGST = (gstNumber) => {
  if (!gstNumber || typeof gstNumber !== "string" || gstNumber.length < 2) return "Gujarat";
  const stateCode = gstNumber.substring(0, 2);
  return GST_STATE_MAP[stateCode] || "Gujarat";
};

const normalizeRequiredDateForDb = (value, fieldName) => {
  const normalized = normalizeDateForDb(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required and must be a valid date.`);
  }
  return normalized;
};

const normalizeOptionalDateForDb = (value) => normalizeDateForDb(value) || null;

const parseOptionalNumber = (value, fieldName) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }
  return parsed;
};

const safeNotify = async (payload, transaction) => {
  try {
    await notificationService.notify(payload, transaction);
  } catch (error) {
    console.error("Notification write failed but the main transaction will continue:", error);
  }
};

// "Send Selected Mail" on the Invoice List. Each selected invoice goes to
// whoever it is waiting for (reminder), older pending invoices start their
// approval workflow, and the rest go as a summary to the first approvers
// of their location - see approvalWorkflow.service.js.
const sendSelectedInvoicesMail = async (req, res) => {
  try {
    const body = req.body || {};
    const requestedIds = Array.isArray(body.invoiceIds)
      ? body.invoiceIds
      : Array.isArray(body.invoices)
        ? body.invoices.map((invoice) => invoice?.InvoiceID ?? invoice?.id)
        : [];
    const invoiceIds = [...new Set(requestedIds.map((id) => String(id ?? "").trim()))];

    if (!invoiceIds.length || invoiceIds.some((id) => !/^\d+$/.test(id) || Number(id) <= 0)) {
      return res.status(400).json({ message: "No valid invoice IDs were provided." });
    }

    const accessWhere = await getInvoiceAccessWhere(req.user);
    const accessibleCount = await InvoiceHeader.count({
      where: {
        [Op.and]: [
          { InvoiceID: { [Op.in]: invoiceIds } },
          ...(accessWhere ? [accessWhere] : []),
        ],
      },
    });

    if (accessibleCount !== invoiceIds.length) {
      return res.status(403).json({
        success: false,
        message: "One or more selected invoices are unavailable or outside your assigned approval location.",
      });
    }

    const notices = await approvalWorkflowService.prepareSelectedInvoiceNotices({ invoiceIds, user: req.user });
    const { failures } = await deliverNotices(notices);
    if (failures.length === notices.length) {
      return res.status(500).json({ success: false, message: withMailWarnings("No email was sent.", failures) });
    }

    return res.status(200).json({
      success: true,
      message: withMailWarnings(`Mail sent for ${invoiceIds.length} invoice(s).`, failures),
    });
  } catch (error) {
    console.error("Error sending selected invoices mail:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to send email." });
  }
};

// Finds (or creates) the Vendor + VendorGST pair for a given GST number.
// Shared by uploadDocument (create) and updateInvoices (edit) so both flows
// resolve vendor/GST identically.
const resolveVendorAndGst = async (gstNumber, customerNameFallback, transaction) => {
  const extractedPAN = gstNumber.substring(2, 12);

  let vendor = await Vendor.findOne({ where: { PANNo: extractedPAN }, transaction });
  if (!vendor) {
    vendor = await Vendor.create({
      VendorCode: `VND-${Date.now().toString().slice(-6)}`,
      VendorName: customerNameFallback || `Auto Synchronized Vendor (${extractedPAN})`,
      PANNo: extractedPAN,
      IsActive: true
    }, { transaction });
  }

  const derivedStateName = getStateFromGST(gstNumber);
  let vendorGst = await VendorGST.findOne({ where: { GSTNumber: gstNumber, VendorID: vendor.VendorID }, transaction });
  if (!vendorGst) {
    vendorGst = await VendorGST.create({
      VendorID: vendor.VendorID,
      GSTNumber: gstNumber,
      StateName: derivedStateName,
      IsDefault: false
    }, { transaction });
  }

  return { vendor, vendorGst, extractedPAN };
};

// Writes a newly uploaded attachment to disk with a unique filename and
// returns its relative path. Shared by uploadDocument and updateInvoices.
const writeUploadedInvoiceFile = (file, idPart, slotLabel, uploadsDir) => {
  const originalName = file.originalname || `${slotLabel}.pdf`;
  const fileExt = path.extname(originalName);
  const safeIdPart = String(idPart).replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueFileName = `inv_${safeIdPart}_${slotLabel}_${Date.now()}${fileExt}`;
  const fullPath = path.join(uploadsDir, uniqueFileName);
  fs.writeFileSync(fullPath, file.buffer);
  return `uploads/${uniqueFileName}`;
};

const DOCUMENT_SLOTS = ["doc1", "doc2", "doc3"];

// Attachments of one Add Invoice row. Trip lines of the same invoice share
// a docGroup, so their files arrive once (doc1_<docGroup>, ...) and are
// written once; every line of that invoice then points at the same paths.
const resolveRowDocuments = ({ filesMap, docGroup, invoiceNo, uploadsDir, writtenDocs }) =>
  DOCUMENT_SLOTS.map((slot) => {
    const fieldName = `${slot}_${docGroup}`;
    const file = filesMap[fieldName];
    if (!file) return null;
    if (!writtenDocs.has(fieldName)) {
      writtenDocs.set(fieldName, {
        filePath: writeUploadedInvoiceFile(file, invoiceNo, slot, uploadsDir),
        originalName: file.originalname || `${slot}.pdf`,
      });
    }
    return writtenDocs.get(fieldName);
  });

const rejectRow = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

// A pre-approved invoice skips the contract audit and an Ad-Hoc invoice
// has no contract, so both must carry at least one supporting document.
const assertRequiredDocument = (typeFields, isPreApproved, documentPaths, invoiceNo) => {
  if (documentPaths.some(Boolean)) return;
  if (typeFields.isAdHoc) {
    rejectRow(`Ad-Hoc invoice '${invoiceNo || "-"}' needs at least one supporting document.`);
  }
  if (isPreApproved) {
    rejectRow(`Pre-Approved invoice '${invoiceNo || "-"}' needs at least one supporting document.`);
  }
};

const getStoredFileSize = (relativePath) => {
  try {
    return fs.statSync(path.join(__dirname, "..", relativePath)).size;
  } catch (error) {
    return 0;
  }
};

// The documents of one invoice (new uploads plus files it already has)
// must stay within the per-invoice total. Checked only when a file is
// added, so invoices saved under the older, larger limit stay editable.
const assertDocumentsTotal = ({ newFiles, existingPaths = [], invoiceNo }) => {
  if (!newFiles.length) return;
  const sizes = [...newFiles.map((file) => file.size), ...existingPaths.filter(Boolean).map(getStoredFileSize)];
  const violation = findTotalSizeViolation(sizes, INVOICE_DOCUMENT_RULE, `Invoice '${invoiceNo || "-"}'`);
  if (violation) rejectRow(violation);
};

// Files written by a request that then failed are removed, so a rolled
// back save never leaves unused documents on disk.
const removeWrittenFiles = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    fs.rmSync(path.join(__dirname, "..", relativePath), { force: true });
  });
};

const normalizeSoNumber = (value) => String(value ?? "").trim().slice(0, MAX_SO_NUMBER_LENGTH) || null;

// Every attachment of the request must match the invoice document rule.
const assertDocumentRules = (filesMap) => {
  Object.entries(filesMap).forEach(([fieldName, file]) => {
    const violation = findUploadRuleViolation(file, INVOICE_DOCUMENT_RULE, `Attachment ${fieldName}`);
    if (violation) rejectRow(violation);
  });
};

// Vehicle based contract types (FTL) find the contract rate by vehicle
// type, so it is mandatory for them; KG based and Ad-Hoc types do not use it.
const assertVehicleTypeProvided = (typeFields, inputVehicleType, invoiceNo) => {
  if (!typeFields.isKgBased && !typeFields.isAdHoc && !String(inputVehicleType || "").trim()) {
    rejectRow(`Vehicle Type is required for invoice '${invoiceNo || "-"}'.`);
  }
};

const assertPartyForCharges = (typeFields, partyName, detainCharge, extraCharge) => {
  if ((detainCharge > 0 || extraCharge > 0) && !partyName) {
    rejectRow(`${getPartyLabelForContractType(typeFields.contractType)} Name is required when Detain Charge or Extra Charge is entered.`);
  }
};

// Resolves a VehicleType record from either a VehicleTypeID or a free-text
// vehicle name. Shared by uploadDocument and updateInvoices.
const resolveVehicleTypeFromInput = async (inputVehicleType, transaction) => {  let resolvedVehicleTypeId = null;
  let hasVehicleTypeNotFound = false;

  if (inputVehicleType) {
    const isIdQuery = !isNaN(inputVehicleType);
    const vehicleTypeRecord = await VehicleType.findOne({
      where: isIdQuery ? { VehicleTypeID: inputVehicleType } : { VehicleName: { [Op.like]: String(inputVehicleType).trim() } },
      transaction
    });

    if (!vehicleTypeRecord) {
      hasVehicleTypeNotFound = true;
    } else {
      resolvedVehicleTypeId = vehicleTypeRecord.VehicleTypeID;
    }
  } else {
    hasVehicleTypeNotFound = true;
  }

  return { resolvedVehicleTypeId, hasVehicleTypeNotFound };
};

// Runs the contract-rate-matching audit for one invoice row and returns the
// computed outcome. This is the single source of truth for "does the
// contract rate match" logic, shared by uploadDocument (create) and
// updateInvoices (edit) so both flows compute the matching status
// identically. The contract rate is found on Destination + Vehicle Type
// and compared with the invoice's Freight Charge.
const computeContractAudit = async ({
  vendorId, extractedPAN, toStation, resolvedVehicleTypeId,
  hasVehicleTypeNotFound, freightCharge, contractId
}, transaction) => {
  // If the uploader explicitly selected a Contract No on the Add Invoice
  // grid (task item 9), audit against that specific contract instead of
  // whichever contract happens to be the vendor's current ACTIVE one -
  // the two usually agree, but an explicit selection should win.
  const activeContract = await findContractForInvoice(
    { contractId, vendorId, contractType: CONTRACT_TYPES.FTL_OUTBOUND },
    transaction
  );

  let calculatedExpectedFreight = 0;
  let targetContractId = null;
  let auditRemarks = "";
  let finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
  let matchedDestinationFound = false;
  let hasVehicleTypeMismatch = false;
  let vehicleTypeName = "";

  const destination = await DestinationMaster.findOne({
    where: { City: { [Op.like]: toStation.trim() } },
    transaction
  });

  if (activeContract) {
    targetContractId = activeContract.ContractID;

    if (destination && !hasVehicleTypeNotFound) {
      const destinationMatrixEntries = await ContractRateMatrix.findAll({
        where: {
          ContractID: activeContract.ContractID,
          DestinationID: destination.DestinationID
        },
        include: [{ model: WeightMaster, as: "weight" }],
        transaction
      });

      if (destinationMatrixEntries.length > 0) {
        matchedDestinationFound = true;
        const vehicleTypeRecord = await VehicleType.findByPk(resolvedVehicleTypeId, { transaction });
        vehicleTypeName = vehicleTypeRecord?.VehicleName || "";
        const selectedMatrix = vehicleTypeRecord ? findRateForVehicleType(destinationMatrixEntries, vehicleTypeRecord) : null;

        if (selectedMatrix) {
          calculatedExpectedFreight = parseFloat(selectedMatrix.BaseRate || 0);
        } else {
          hasVehicleTypeMismatch = true;
        }
      }
    }
  }

  let variance = 0;
  let hasContractMatchFailure = false;
  let hasDestinationMismatch = false;

  // Audit decision evaluation tree
  if (!activeContract) {
    hasContractMatchFailure = true;
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `No active contract found for vendor with PAN '${extractedPAN}'.`;
  } else if (hasVehicleTypeNotFound) {
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `Vehicle type is not available in master.`;
  } else if (!destination || !matchedDestinationFound) {
    hasDestinationMismatch = true;
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `Destination '${toStation}' is not available in the contract rate matrix.`;
  } else if (hasVehicleTypeMismatch) {
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `Vehicle type '${vehicleTypeName}' has no rate in the contract for destination '${toStation}'.`;
  } else {
    variance = freightCharge - calculatedExpectedFreight;
    if (freightCharge <= calculatedExpectedFreight + 1.0) {
      finalAuditDecision = VERIFICATION_STATUS_APPROVED;
      auditRemarks = `Verification passed against contract rate of Rs ${calculatedExpectedFreight.toFixed(2)} (Destination: '${toStation}', Vehicle Type: '${vehicleTypeName}').`;
    } else {
      finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
      auditRemarks = `Discrepancy detected! Expected rate: Rs ${calculatedExpectedFreight.toFixed(2)}, Billed: Rs ${freightCharge.toFixed(2)}, Variance: Rs ${variance.toFixed(2)}.`;
    }
  }

  return {
    destination, activeContract, targetContractId, calculatedExpectedFreight,
    finalAuditDecision, auditRemarks, variance,
    hasContractMatchFailure, hasDestinationMismatch, hasVehicleTypeMismatch
  };
};

const parseChargeValue = (value, fallback) =>
  value !== undefined ? parseFloat(value || 0) || 0 : parseFloat(fallback || 0) || 0;

// Reads the per contract type fields of an Add / Edit Invoice row. On edit,
// fields the page does not send keep the invoice's stored values.
const readContractTypeFields = (row, existingInvoice = null) => {
  const current = existingInvoice || {};
  const contractType = normalizeInvoiceType(row.contractType)
    || normalizeInvoiceType(current.ContractType)
    || DEFAULT_CONTRACT_TYPE;
  const packages = row.packages !== undefined ? parseInt(row.packages, 10) : current.Packages;
  const chargedWeight = row.chargedWeight !== undefined ? parseFloat(row.chargedWeight) : current.ChargedWeight;
  const billedRate = row.billedRate !== undefined ? parseFloat(row.billedRate) : current.BilledRate;
  const odaCategory = row.odaCategory !== undefined ? row.odaCategory : current.ODACategory;

  return {
    contractType,
    isKgBased: KG_BASED_CONTRACT_TYPES.includes(contractType),
    isAdHoc: isAdHocInvoiceType(contractType),
    packages: Number.isFinite(packages) ? packages : null,
    chargedWeight: Number.isFinite(parseFloat(chargedWeight)) ? parseFloat(chargedWeight) : null,
    billedRate: Number.isFinite(parseFloat(billedRate)) ? parseFloat(billedRate) : null,
    odaCategory: String(odaCategory || "").trim().toUpperCase() || null,
    docketCharge: parseChargeValue(row.docketCharge, current.DocketCharges),
    odaCharge: parseChargeValue(row.odaCharge, current.ODACharges),
    fovCharge: parseChargeValue(row.fovCharge, current.FOVCharges),
    loadingCharge: parseChargeValue(row.loadingCharge, current.LoadingCharges),
    otherCharge: parseChargeValue(row.otherCharge, current.OtherCharges),
  };
};

// Runs the audit that matches the invoice's contract type. FTL Outbound
// keeps the original per-trip audit; the other types use invoiceAudit.service.
// Rejects a freight charge below the contract minimum (blank / 0 included).
const assertMinimumFreightCharge = (freightCharge, invoiceNumber) => {
  if (freightCharge >= MIN_FREIGHT_CHARGE) return;
  const error = new Error(`${MIN_FREIGHT_CHARGE_MESSAGE} Invoice '${invoiceNumber || "-"}' has ₹${freightCharge || 0}.`);
  error.statusCode = 400;
  throw error;
};

// An Ad-Hoc invoice has no contract: the billed freight is taken as the
// expected value and the invoice always goes to the approvers.
const buildAdHocAudit = (freightCharge) => ({
  destination: null,
  activeContract: null,
  targetContractId: null,
  calculatedExpectedFreight: freightCharge,
  expectedCharges: 0,
  finalAuditDecision: VERIFICATION_STATUS_DISCREPANCY,
  auditRemarks: "Ad-Hoc invoice - no contract rate to verify, approval required.",
  variance: 0,
  hasContractMatchFailure: false,
  hasDestinationMismatch: false,
  hasVehicleTypeMismatch: false,
});

const runContractAudit = async ({ typeFields, city, actualWeight, freightCharge, ...auditInput }, transaction) => {
  if (typeFields.isAdHoc) {
    return buildAdHocAudit(freightCharge);
  }
  if (typeFields.contractType === CONTRACT_TYPES.FTL_OUTBOUND) {
    const result = await computeContractAudit({ ...auditInput, toStation: city, freightCharge }, transaction);
    return { ...result, expectedCharges: 0 };
  }
  return computeTypedContractAudit({
    ...auditInput,
    ...typeFields,
    city,
    actualWeight,
    freightCharge,
    hasVehicleTypeNotFound: typeFields.isKgBased ? false : auditInput.hasVehicleTypeNotFound,
  }, transaction);
};

// Contract value of everything the invoice bills: contract freight and
// contract charges plus the charges that are always paid at actual.
const getTotalExpectedPrice = (audit, typeFields, detainCharge, extraCharge) =>
  audit.calculatedExpectedFreight + audit.expectedCharges + detainCharge + extraCharge
  + typeFields.loadingCharge + typeFields.otherCharge;

// FTL Inbound invoices travel from the pick-up city (the grid's city
// field) to the selected plant location; every other type goes from the
// plant location to the grid's city.
const getRouteStations = (typeFields, city, plantStation) =>
  typeFields.contractType === CONTRACT_TYPES.FTL_INBOUND
    ? { fromStation: city, toStation: plantStation }
    : { fromStation: plantStation, toStation: city };

const buildTypeColumnValues = (typeFields) => ({
  ContractType: typeFields.contractType,
  Packages: typeFields.packages,
  ChargedWeight: typeFields.chargedWeight,
  BilledRate: typeFields.billedRate,
  DocketCharges: typeFields.docketCharge,
  ODACategory: typeFields.odaCategory,
  ODACharges: typeFields.odaCharge,
  FOVCharges: typeFields.fovCharge,
  LoadingCharges: typeFields.loadingCharge,
  OtherCharges: typeFields.otherCharge,
});

// Applies the Pre-Approved override on top of a computed audit outcome.
// A pre-approved invoice always displays and stores as Pre-Approved,
// regardless of what the automated contract-rate audit found — this is the
// fix for "invoices with a 'pre-approved' selection correctly display the
// status as Pre-Approved." When NOT pre-approved, the genuine audit outcome
// (Approved/Discrepancy) passes through untouched, which is what keeps
// "invoices where contract rates successfully match" accurate.
const applyPreApprovedOverride = (isPreApproved, auditResult) => {
  if (!isPreApproved) return auditResult;

  return {
    ...auditResult,
    finalAuditDecision: VERIFICATION_STATUS_PRE_APPROVED,
    auditRemarks: `Marked as Pre-Approved by uploader. ${auditResult.auditRemarks}`.trim(),
  };
};

// Audit outcome -> workflow routing outcome.
const getRoutingOutcome = (finalAuditDecision) => {
  if (finalAuditDecision === VERIFICATION_STATUS_PRE_APPROVED) return ROUTING_OUTCOMES.PRE_APPROVED;
  if (finalAuditDecision === VERIFICATION_STATUS_APPROVED) return ROUTING_OUTCOMES.SYSTEM_APPROVED;
  return ROUTING_OUTCOMES.DISCREPANCY;
};

// The approver the uploader picked (e.g. HOD). Required whenever the
// location's workflow has a step the uploader selects for.
const resolveSelectedApprover = async (approverUserId, locationId, invoiceNo) => {
  const selectable = locationId ? await approvalWorkflowService.getSelectableApprovers(locationId) : null;
  if (!selectable) return null;
  if (!approverUserId) {
    rejectRow(`Select the ${selectable.stepName} approver for invoice '${invoiceNo || "-"}'.`);
  }
  if (!selectable.users.some((user) => Number(user.UserID) === Number(approverUserId))) {
    rejectRow(`The selected approver of invoice '${invoiceNo || "-"}' is not an approver of this location.`);
  }
  return Number(approverUserId);
};

// Main controller to process and upload invoices, validate rules, and execute database transactions
const uploadDocument = async (req, res) => {
  const transaction = await sequelize.transaction();
  const writtenDocs = new Map();
  try {
    let invoicesPayload = req.body.invoices;
    if (typeof invoicesPayload === 'string') {
      try {
        invoicesPayload = JSON.parse(invoicesPayload);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid JSON format in invoices payload." });
      }
    }
    const invoiceRows = Array.isArray(invoicesPayload) ? invoicesPayload : [invoicesPayload];

    if (!invoiceRows || invoiceRows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "No invoice records provided." });
    }

    // Fetch default plant fallback if location is not provided
    let defaultPlant = await Plant.findOne({ transaction });
    if (!defaultPlant) {
      defaultPlant = await Plant.create({ PlantCode: "PLT001", PlantName: "N1", IsActive: true }, { transaction });
    }

    // Fetch default status for invoice module
    let defaultStatus = await StatusMaster.findOne({ where: { ModuleName: "INVOICE" }, transaction });
    if (!defaultStatus) {
      defaultStatus = await StatusMaster.findOne({ transaction });
      if (!defaultStatus) {
        defaultStatus = await StatusMaster.create({ StatusName: PENDING_VERIFICATION_STATUS_NAME, ModuleName: "INVOICE" }, { transaction });
      }
    }
    const statusIdToUse = defaultStatus.StatusID;

    // Map incoming files by fieldname
    const filesMap = {};
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        filesMap[file.fieldname] = file;
      });
    } else if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key][0]) {
          filesMap[key] = req.files[key][0];
        }
      });
    }

    assertDocumentRules(filesMap);

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const workflowNotices = [];
    // Locations the user may add invoices for (User Master > Settings &
    // Hierarchy Access).
    const locationAccess = await getLocationAccess(req.user.UserID, transaction);

    // Loop through each invoice row in the payload
    for (let i = 0; i < invoiceRows.length; i++) {
      const row = invoiceRows[i];
      const gstNumber = String(row.gstNo || "").trim();
      const invoiceNo = String(row.invoiceNo || "").trim();
      // Bug fix: the Add Invoice grid sends this field as `customerName`
      // (see AddInvoice.jsx payloadRows) - reading `row.CustomerName` here
      // always read undefined, so Customer Name was silently saved as
      // empty on every newly created invoice (updateInvoices already read
      // the correct casing, which is why editing appeared to work).
      const CustomerName = String(row.customerName || "").trim();
      const invoiceDateFormatted = normalizeRequiredDateForDb(row.invoiceDate, "Invoice date");
      const lrDateFormatted = normalizeOptionalDateForDb(row.lrDate);
      const lrNo = String(row.lrNo || "").trim();
      const soNumber = normalizeSoNumber(row.soNumber);
      const inputVehicleType = row.vehicleTypeId || row.vehicleType || null;
      // "Remark by User" - stored in its own column, never mixed with the
      // system generated audit remarks.
      const userRemarks = normalizeUserRemark(row.userRemarks);

      // Resolve the actual Plants master record for this row up front so
      // PlantID and FromStation can reuse the same single lookup instead of
      // querying the Plants table more than once. Kept separate from the
      // Location resolution below - `row.locationId` is a PlantLocations ID
      // (the Add Invoice Step 1 hierarchy), not a Plants ID, so it should
      // only be used as a last-resort Plants candidate, never as the
      // source of the invoice's actual Location.
      const plantCandidate = row.plantId || row.locationId || defaultPlant.PlantID;
      const resolvedPlant = await resolveValidPlant(plantCandidate, defaultPlant, transaction);
      const resolvedPlantId = resolvedPlant.PlantID;
      const plantStation = resolvedPlant.LocationName || resolvedPlant.PlantName || "";

      // Resolve the real hierarchy Location (PlantLocations) directly by
      // the ID the Add Invoice page actually selected, independent of
      // whichever Plants row resolveValidPlant found. Falls back to the
      // display name the frontend already sent (row.locationName) if the
      // ID doesn't resolve, so the user's on-screen selection is never
      // silently discarded, and only to null if neither is available.
      let resolvedLocationId = null;
      let resolvedLocationName = row.locationName || null;
      if (row.locationId) {
        const locationRecord = await PlantLocation.findByPk(row.locationId, { transaction });
        if (locationRecord) {
          resolvedLocationId = locationRecord.LocationID;
          resolvedLocationName = locationRecord.LocationName;
        }
      }

      const typeFields = readContractTypeFields(row);
      const city = String(row.toStation || "").trim();
      const { fromStation, toStation } = getRouteStations(typeFields, city, resolvedLocationName || plantStation);
      const actualWeight = parseOptionalNumber(row.actualWeight, "Actual Weight");
      const freightCharge = parseFloat(row.freightCharge || 0);
      const detainCharge = parseFloat(row.detainCharge || 0);
      const extraCharge = parseFloat(row.extraCharge || 0);
      const totalBilledAmount = parseFloat(row.total || 0);
      if (!gstNumber || !invoiceNo) continue;

      assertMinimumFreightCharge(freightCharge, invoiceNo);
      assertPartyForCharges(typeFields, CustomerName, detainCharge, extraCharge);
      assertVehicleTypeProvided(typeFields, inputVehicleType, invoiceNo);
      await assertCanAddInvoice({
        user: req.user,
        access: locationAccess,
        locationId: resolvedLocationId,
        locationName: resolvedLocationName,
        invoiceNo,
      });

      const preApproval = String(row.preAppr || "No").trim();
      const isPreApproved = preApproval.toLowerCase() === "yes" || preApproval === "1" || preApproval === true;

      const docGroup = row.docGroup ?? i;
      assertDocumentsTotal({ newFiles: DOCUMENT_SLOTS.map((slot) => filesMap[`${slot}_${docGroup}`]).filter(Boolean), invoiceNo });
      const rowDocuments = resolveRowDocuments({ filesMap, docGroup, invoiceNo, uploadsDir, writtenDocs });
      const [doc1Path, doc2Path, doc3Path] = rowDocuments.map((doc) => doc?.filePath || null);
      assertRequiredDocument(typeFields, isPreApproved, [doc1Path, doc2Path, doc3Path], invoiceNo);
      const selectedApproverUserId = await resolveSelectedApprover(row.approverUserId, resolvedLocationId, invoiceNo);

      // --- VENDOR & GST RESOLUTION (shared helper) ---
      const { vendor, vendorGst, extractedPAN } = await resolveVendorAndGst(gstNumber, CustomerName, transaction);

      // --- VEHICLE TYPE VALIDATION LOGIC (shared helper) ---
      const vehicleTypeResult = await resolveVehicleTypeFromInput(inputVehicleType, transaction);
      const resolvedVehicleTypeId = vehicleTypeResult.resolvedVehicleTypeId;
      const hasVehicleTypeNotFound = typeFields.isKgBased || typeFields.isAdHoc ? false : vehicleTypeResult.hasVehicleTypeNotFound;

      const evaluatedDistanceKM = 0;

      // --- CONTRACT-RATE AUDIT (shared helper) ---
      const rawAuditResult = await runContractAudit({
        typeFields,
        city,
        actualWeight,
        freightCharge,
        vendorId: vendor.VendorID,
        extractedPAN,
        resolvedVehicleTypeId,
        vehicleTypeId: resolvedVehicleTypeId,
        hasVehicleTypeNotFound,
        contractId: row.contractId || null
      }, transaction);

      const { destination, targetContractId, calculatedExpectedFreight } = rawAuditResult;
      const { finalAuditDecision, auditRemarks, variance } = applyPreApprovedOverride(isPreApproved, rawAuditResult);

      if (finalAuditDecision === VERIFICATION_STATUS_DISCREPANCY) {
        await safeNotify({
          type: NOTIFICATION_TYPE_DISCREPANCY_DETECTED,
          userIds: [req.user?.UserID],
          message: `Discrepancy detected on invoice ${invoiceNo}: ${auditRemarks}`,
        }, transaction);
      }

      const totalExpectedPrice = getTotalExpectedPrice(rawAuditResult, typeFields, detainCharge, extraCharge);

      // --- INSERT INTO INVOICE HEADER TABLE ---
      let insertedHeader;
      try {
        [insertedHeader] = await sequelize.query(`
          INSERT INTO [InvoiceHeader] (
            [InvoiceNumber], [CustomerName], [InvoiceDate], [LRDate], [VendorID], [VendorGSTID], 
            [PlantID], [LocationID], [LocationName], [ContractID], [LRNumber], [SONumber], [VehicleTypeID],
            [TotalWeight], [DistanceKM], [BasicFreight], [DetainCharges], 
            [ExtraCharges], [TotalInvoiceAmount], [InvoiceStatusID], [UploadedDate],
            [FromStation], [ToStation], [Remarks], [UserRemarks], [IsPreApproved], [Doc1Path], [Doc2Path], [Doc3Path],
            [ContractType], [Packages], [ChargedWeight], [BilledRate], [DocketCharges], [ODACategory],
            [ODACharges], [FOVCharges], [LoadingCharges], [OtherCharges],
            [UploadedBy], [SelectedApproverUserID]
          )
          OUTPUT INSERTED.[InvoiceID]
          VALUES (
            :invoiceNo, :CustomerName, :invoiceDate, :lrDate, :vendorId, :vendorGstId,
            :plantId, :locationId, :locationName, :contractId, :lrNo, :soNumber, :vehicleTypeId,
            :actualWeight, :distanceKm, :basicFreight, :detainCharges,
            :extraCharges, :totalAmount, :statusId, GETDATE(),
            :fromStation, :toStation, :remarks, :userRemarks, :isPreApproved, :doc1, :doc2, :doc3,
            :ContractType, :Packages, :ChargedWeight, :BilledRate, :DocketCharges, :ODACategory,
            :ODACharges, :FOVCharges, :LoadingCharges, :OtherCharges,
            :uploadedBy, :selectedApproverUserId
          );
        `, {
          replacements: {
            invoiceNo, CustomerName, invoiceDate: invoiceDateFormatted, lrDate: lrDateFormatted, 
            vendorId: vendor.VendorID, vendorGstId: vendorGst.VendorGSTID,
            plantId: resolvedPlantId, locationId: resolvedLocationId, locationName: resolvedLocationName, contractId: targetContractId, lrNo, soNumber, 
            vehicleTypeId: resolvedVehicleTypeId, actualWeight, distanceKm: evaluatedDistanceKM, 
            basicFreight: freightCharge, detainCharges: detainCharge, extraCharges: extraCharge, 
            totalAmount: totalBilledAmount, statusId: statusIdToUse, fromStation, toStation, 
            remarks: auditRemarks, userRemarks, isPreApproved: isPreApproved ? 1 : 0, doc1: doc1Path, doc2: doc2Path, doc3: doc3Path,
            uploadedBy: req.user.UserID, selectedApproverUserId,
            ...buildTypeColumnValues(typeFields)
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        });
      } catch (insertError) {
        if (isForeignKeyViolationForTable(insertError, "Plants")) {
          throw new Error(INVALID_PLANT_LOCATION_MESSAGE);
        }
        throw insertError;
      }

      const newInvoiceID = insertedHeader[0].InvoiceID;

      await safeNotify({
        type: NOTIFICATION_TYPE_INVOICE_CREATED,
        userIds: [req.user?.UserID],
        message: `New invoice ${invoiceNo} uploaded for ${CustomerName || vendor.VendorName}.`,
        relatedInvoiceId: newInvoiceID,
      }, transaction);

      // Create invoice item record
      await InvoiceItem.create({
        InvoiceID: newInvoiceID,
        DestinationID: destination ? destination.DestinationID : null,
        ActualWeight: actualWeight,
        DistanceKM: evaluatedDistanceKM, 
        Rate: actualWeight > 0 ? (calculatedExpectedFreight / actualWeight) : 0, 
        FreightAmount: freightCharge
      }, { transaction });

      // Create invoice verification audit record
      await sequelize.query(`
        INSERT INTO [InvoiceVerification] (
          [InvoiceID], [ContractID], [ExpectedAmount], 
          [InvoiceAmount], [DifferenceAmount], [VerificationStatus], [VerifiedDate]
        )
        VALUES (:invoiceId, :contractId, :expected, :actual, :variance, :status, GETDATE());
      `, {
        replacements: {
          invoiceId: newInvoiceID, contractId: targetContractId,
          expected: totalExpectedPrice, actual: totalBilledAmount,
          variance, status: finalAuditDecision
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
      });

      // --- APPROVAL WORKFLOW: history + routing by audit outcome ---
      await approvalWorkflowService.recordInvoiceCreated({ invoiceId: newInvoiceID, actorUserId: req.user.UserID, draftId: req.body.draftId }, transaction);
      const workflow = await approvalWorkflowService.startWorkflow({
        invoiceId: newInvoiceID,
        outcome: getRoutingOutcome(finalAuditDecision),
        actorUserId: req.user.UserID,
      }, transaction);
      workflowNotices.push(...workflow.notices);
    }

    await transaction.commit();
    const { failures } = await deliverNotices(workflowNotices);
    return res.status(201).json({
      success: true,
      message: withMailWarnings("Invoices saved and sent through the approval workflow.", failures),
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      try { await transaction.rollback(); } catch(e) { console.error("Rollback error", e); }
    }
    removeWrittenFiles([...writtenDocs.values()].map((doc) => doc.filePath));
    console.error("CRITICAL UPLOAD ERROR:", error.original || error);
    const isClientError = error.statusCode === 400 || /required and must be a valid date|Invalid JSON format in invoices payload|No invoice records provided/i.test(
      error.message || ""
    );
    const statusCode = error.statusCode === 403 ? 403 : isClientError ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Fatal server error during processing.",
      errorDetails: error.original?.message || error.sqlMessage || error.toString()
    });
  }
};

// Bulk-edit endpoint powering the Edit Invoice page. Accepts the same row
// shape the Add Invoice grid sends (plus a required `invoiceId` per row),
// and lets the user update one or many invoices' fields in a single request
// — mirroring the Add Invoice layout, adapted for editing. Each row's
// contract-rate audit is recomputed via the exact same shared helpers
// uploadDocument uses, so the "matching status" stays accurate after an
// edit too (e.g. changing the destination or freight charge on an existing
// invoice correctly re-evaluates Approved/Discrepancy/Pre-Approved).
const updateInvoices = async (req, res) => {
  const transaction = await sequelize.transaction();
  const writtenPaths = [];
  try {
    const accessWhere = await getInvoiceAccessWhere(req.user);
    let invoicesPayload = req.body.invoices;
    if (typeof invoicesPayload === 'string') {
      try {
        invoicesPayload = JSON.parse(invoicesPayload);
      } catch (parseError) {
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid JSON format in invoices payload." });
      }
    }
    const invoiceRows = Array.isArray(invoicesPayload) ? invoicesPayload : [invoicesPayload];

    if (!invoiceRows || invoiceRows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "No invoice records provided." });
    }

    let defaultPlant = await Plant.findOne({ transaction });
    if (!defaultPlant) {
      defaultPlant = await Plant.create({ PlantCode: "PLT001", PlantName: "N1", IsActive: true }, { transaction });
    }

    // Map incoming files by fieldname (mirrors uploadDocument). Only
    // present when the request is multipart - i.e. when at least one row
    // has a new attachment to upload via the Edit Invoice page's "+ Upload"
    // control (see EditInvoice.jsx). Existing Doc1/2/3Path values are never
    // touched by this - see the per-row write-only-if-empty checks below.
    const filesMap = {};
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        filesMap[file.fieldname] = file;
      });
    } else if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key][0]) {
          filesMap[key] = req.files[key][0];
        }
      });
    }

    assertDocumentRules(filesMap);

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const updatedIds = [];
    const workflowNotices = [];
    // Locations the user may edit invoices of (User Master > Settings &
    // Hierarchy Access).
    const locationAccess = await getLocationAccess(req.user.UserID, transaction);

    for (let i = 0; i < invoiceRows.length; i++) {
      const row = invoiceRows[i];
      const invoiceId = row.invoiceId || row.InvoiceID;
      if (!invoiceId) {
        throw new Error("Every row being edited must include its invoiceId.");
      }

      const existingInvoice = await InvoiceHeader.findOne({
        where: accessWhere
          ? { [Op.and]: [{ InvoiceID: invoiceId }, accessWhere] }
          : { InvoiceID: invoiceId },
        transaction,
      });
      if (!existingInvoice) {
        const error = new Error(`Invoice #${invoiceId} was not found or is outside your assigned approval location.`);
        error.statusCode = 403;
        throw error;
      }

      // New attachment uploads: a slot is only ever written if it doesn't
      // already have a file - an existing Doc1/2/3Path is locked and can
      // never be replaced or cleared from this endpoint (the frontend only
      // ever targets an already-empty slot with a new file; this check is
      // just defense in depth against stale client state).
      const newFileFor = (slot, storedPath) => (!storedPath && filesMap[`${slot}_${i}`]) || null;
      const newFiles = [
        newFileFor("doc1", existingInvoice.Doc1Path),
        newFileFor("doc2", existingInvoice.Doc2Path),
        newFileFor("doc3", existingInvoice.Doc3Path),
      ];
      assertDocumentsTotal({
        newFiles: newFiles.filter(Boolean),
        existingPaths: [existingInvoice.Doc1Path, existingInvoice.Doc2Path, existingInvoice.Doc3Path],
        invoiceNo: existingInvoice.InvoiceNumber,
      });
      const [newDoc1Path, newDoc2Path, newDoc3Path] = newFiles.map((file, slotIndex) => {
        if (!file) return null;
        const filePath = writeUploadedInvoiceFile(file, invoiceId, DOCUMENT_SLOTS[slotIndex], uploadsDir);
        writtenPaths.push(filePath);
        return filePath;
      });

      const gstNumber = String(row.gstNo || "").trim().toUpperCase();
      const CustomerName = String(
        row.customerName === undefined ? existingInvoice.CustomerName || "" : row.customerName || ""
      ).trim();
      const invoiceDateFormatted = normalizeOptionalDateForDb(row.invoiceDate) || existingInvoice.InvoiceDate;
      const lrDateFormatted = normalizeOptionalDateForDb(row.lrDate);
      const lrNo = String(row.lrNo || existingInvoice.LRNumber || "").trim();
      const soNumber = row.soNumber !== undefined ? normalizeSoNumber(row.soNumber) : existingInvoice.SONumber;
      const inputVehicleType = row.vehicleTypeId || row.vehicleType || existingInvoice.VehicleTypeID || null;
      const typeFields = readContractTypeFields(row, existingInvoice);
      const storedCity = typeFields.contractType === CONTRACT_TYPES.FTL_INBOUND ? existingInvoice.FromStation : existingInvoice.ToStation;
      const city = String(row.toStation || storedCity || "").trim();
      const actualWeight = row.actualWeight === undefined
        ? parseOptionalNumber(existingInvoice.TotalWeight, "Actual Weight")
        : parseOptionalNumber(row.actualWeight, "Actual Weight");
      const freightCharge = row.freightCharge !== undefined ? parseFloat(row.freightCharge || 0) : parseFloat(existingInvoice.BasicFreight || 0);
      const detainCharge = row.detainCharge !== undefined ? parseFloat(row.detainCharge || 0) : parseFloat(existingInvoice.DetainCharges || 0);
      const extraCharge = row.extraCharge !== undefined ? parseFloat(row.extraCharge || 0) : parseFloat(existingInvoice.ExtraCharges || 0);
      const totalBilledAmount = row.total !== undefined ? parseFloat(row.total || 0) : parseFloat(existingInvoice.TotalInvoiceAmount || 0);
      assertMinimumFreightCharge(freightCharge, row.invoiceNo || existingInvoice.InvoiceNumber);
      assertPartyForCharges(typeFields, CustomerName, detainCharge, extraCharge);
      assertVehicleTypeProvided(typeFields, inputVehicleType, existingInvoice.InvoiceNumber);
      const userRemarks = row.userRemarks !== undefined ? normalizeUserRemark(row.userRemarks) : existingInvoice.UserRemarks;
      const preApproval = String(row.preAppr !== undefined ? row.preAppr : (existingInvoice.IsPreApproved ? "Yes" : "No")).trim();
      const isPreApproved = preApproval.toLowerCase() === "yes" || preApproval === "1" || preApproval === true;
      assertRequiredDocument(
        typeFields,
        isPreApproved,
        [existingInvoice.Doc1Path, existingInvoice.Doc2Path, existingInvoice.Doc3Path, newDoc1Path, newDoc2Path, newDoc3Path],
        existingInvoice.InvoiceNumber
      );

      // Vendor/GST: only re-resolve if a GST number was actually provided
      // for this row; otherwise keep the invoice's existing vendor linkage.
      let vendor = { VendorID: existingInvoice.VendorID, VendorName: null };
      let vendorGst = { VendorGSTID: existingInvoice.VendorGSTID };
      let extractedPAN = "";
      if (gstNumber) {
        const resolved = await resolveVendorAndGst(gstNumber, CustomerName, transaction);
        vendor = resolved.vendor;
        vendorGst = resolved.vendorGst;
        extractedPAN = resolved.extractedPAN;
      }

      const vehicleTypeResult = await resolveVehicleTypeFromInput(inputVehicleType, transaction);
      const resolvedVehicleTypeId = vehicleTypeResult.resolvedVehicleTypeId;
      const hasVehicleTypeNotFound = typeFields.isKgBased || typeFields.isAdHoc ? false : vehicleTypeResult.hasVehicleTypeNotFound;

      // Resolve the Plants row (for FromStation) - mirrors uploadDocument:
      // row.plantId here is a genuine Plants.PlantID (the Edit Invoice
      // page's Location dropdown picks a real Plants row directly), kept
      // separate from Location resolution below.
      const plantCandidate = row.plantId || row.locationId || existingInvoice.PlantID;
      const resolvedPlant = await resolveValidPlant(plantCandidate, defaultPlant, transaction);
      const resolvedPlantId = resolvedPlant.PlantID;
      const plantStation = resolvedPlant.LocationName || resolvedPlant.PlantName || existingInvoice.FromStation || "";

      // Resolve the real hierarchy Location (PlantLocations): prefer an
      // explicit locationId on the request (matches Add Invoice's payload
      // shape), otherwise use whichever Location the selected Plant is
      // itself linked to (Plants.LocationID - what the Edit Invoice page's
      // Plants-master Location dropdown actually drives). Falls back to
      // the invoice's existing Location if neither resolves, so a save
      // that doesn't touch Location never clears it.
      const locationIdCandidate = row.locationId || resolvedPlant.LocationID || null;
      let resolvedLocationId = existingInvoice.LocationID || null;
      let resolvedLocationName = row.locationName || existingInvoice.LocationName || null;
      if (locationIdCandidate) {
        const locationRecord = await PlantLocation.findByPk(locationIdCandidate, { transaction });
        if (locationRecord) {
          resolvedLocationId = locationRecord.LocationID;
          resolvedLocationName = locationRecord.LocationName;
        }
      }
      await assertCanEditInvoice({
        user: req.user,
        access: locationAccess,
        invoice: existingInvoice,
        newLocationId: resolvedLocationId,
        newLocationName: resolvedLocationName,
        transaction,
      });

      const { fromStation, toStation } = getRouteStations(typeFields, city, plantStation);

      const rawAuditResult = await runContractAudit({
        typeFields,
        city,
        actualWeight,
        freightCharge,
        vendorId: vendor.VendorID,
        extractedPAN,
        resolvedVehicleTypeId,
        vehicleTypeId: resolvedVehicleTypeId,
        hasVehicleTypeNotFound,
        contractId: row.contractId || null
      }, transaction);

      const { targetContractId } = rawAuditResult;
      const { finalAuditDecision, auditRemarks, variance } = applyPreApprovedOverride(isPreApproved, rawAuditResult);
      const selectedApproverUserId = row.approverUserId
        ? await resolveSelectedApprover(row.approverUserId, resolvedLocationId, existingInvoice.InvoiceNumber)
        : existingInvoice.SelectedApproverUserID;

      if (finalAuditDecision === VERIFICATION_STATUS_DISCREPANCY) {
        await safeNotify({
          type: NOTIFICATION_TYPE_DISCREPANCY_DETECTED,
          userIds: [req.user?.UserID],
          message: `Discrepancy detected on invoice ${existingInvoice.InvoiceNumber}: ${auditRemarks}`,
        }, transaction);
      }

      const totalExpectedPrice = getTotalExpectedPrice(rawAuditResult, typeFields, detainCharge, extraCharge);

      await existingInvoice.update({
        CustomerName: CustomerName || null,
        InvoiceDate: invoiceDateFormatted,
        LRDate: lrDateFormatted,
        LRNumber: lrNo,
        SONumber: soNumber,
        VendorID: vendor.VendorID,
        VendorGSTID: vendorGst.VendorGSTID,
        PlantID: resolvedPlantId,
        LocationID: resolvedLocationId,
        LocationName: resolvedLocationName,
        ContractID: targetContractId,
        VehicleTypeID: resolvedVehicleTypeId,
        TotalWeight: actualWeight,
        BasicFreight: freightCharge,
        DetainCharges: detainCharge,
        ExtraCharges: extraCharge,
        TotalInvoiceAmount: totalBilledAmount,
        FromStation: fromStation,
        ToStation: toStation,
        Remarks: auditRemarks || existingInvoice.Remarks,
        UserRemarks: userRemarks,
        IsPreApproved: isPreApproved,
        SelectedApproverUserID: selectedApproverUserId,
        ...buildTypeColumnValues(typeFields),
        // Only ever set when that slot was previously empty (see the
        // write-only-if-empty checks above) - an existing attachment is
        // never included here, so it can never be replaced or cleared.
        ...(newDoc1Path ? { Doc1Path: newDoc1Path } : {}),
        ...(newDoc2Path ? { Doc2Path: newDoc2Path } : {}),
        ...(newDoc3Path ? { Doc3Path: newDoc3Path } : {}),
      }, { transaction });

      // Keep InvoiceVerification in sync with the freshly recomputed audit
      // outcome — update the existing row if one exists, otherwise create it.
      const existingVerification = await InvoiceVerification.findOne({ where: { InvoiceID: invoiceId }, transaction });
      if (existingVerification) {
        await existingVerification.update({
          ContractID: targetContractId,
          ExpectedAmount: totalExpectedPrice,
          InvoiceAmount: totalBilledAmount,
          DifferenceAmount: variance,
          VerificationStatus: finalAuditDecision,
          VerifiedDate: sequelize.literal("GETDATE()"),
        }, { transaction });
      } else {
        await InvoiceVerification.create({
          InvoiceID: invoiceId,
          ContractID: targetContractId,
          ExpectedAmount: totalExpectedPrice,
          InvoiceAmount: totalBilledAmount,
          DifferenceAmount: variance,
          VerificationStatus: finalAuditDecision,
          VerifiedDate: sequelize.literal("GETDATE()"),
        }, { transaction });
      }

      // An edit re-runs the audit, so the approval workflow starts over.
      const workflow = await approvalWorkflowService.restartWorkflow({
        invoiceId,
        outcome: getRoutingOutcome(finalAuditDecision),
        actorUserId: req.user.UserID,
      }, transaction);
      workflowNotices.push(...workflow.notices);

      updatedIds.push(invoiceId);
    }

    await transaction.commit();
    const { failures } = await deliverNotices(workflowNotices);
    return res.status(200).json({
      success: true,
      message: withMailWarnings(`${updatedIds.length} invoice(s) updated and sent through the approval workflow.`, failures),
      updatedIds
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      try { await transaction.rollback(); } catch (e) { console.error("Rollback error", e); }
    }
    removeWrittenFiles(writtenPaths);
    console.error("INVOICE UPDATE ERROR:", error.original || error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update invoice(s).",
    });
  }
};

module.exports = { uploadDocument, sendSelectedInvoicesMail, updateInvoices };