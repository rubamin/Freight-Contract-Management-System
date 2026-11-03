const sequelize = require("../config/database");
const contractRepository = require("../repositories/contract.repository");
const { CONTRACT_STATUS } = require("../constants/contractStatus");
const { DEFAULT_WEIGHT_UNIT, MAX_REPORTED_IMPORT_ERRORS } = require("../constants/rateMatrixTemplate");
const { parseRateMatrixWorkbook } = require("../utils/rateMatrixExcel");
const { parseWeightSlab, parseVehicleCapacity } = require("../utils/weightSlab");
const { parseContractTypeWorkbook } = require("../utils/contractTypeExcel");
const { parseContractSheets } = require("../utils/contractSheetPayload");
const {
  CONTRACT_TYPES,
  DEFAULT_CONTRACT_TYPE,
  CONTRACT_TYPE_LABELS,
  normalizeContractType,
} = require("../constants/contractTypes");
const { buildCreatedRemark, buildUpdatedRemark, normalizeUserRemark } = require("../utils/systemRemarks");

// Imported / manually added destinations are created under this state,
// matching the existing Destination Master behaviour.
const DEFAULT_DESTINATION_STATE = "Gujarat";

// Contract Number is no longer entered on the form, so a unique internal
// number is generated once when a contract is created.
const AUTO_CONTRACT_NO_PREFIX = "CT";

const generateContractNo = () => `${AUTO_CONTRACT_NO_PREFIX}-${Date.now()}`;

const REQUIRED_MESSAGES = {
  VendorID: "Vendor selection is required.",
  ContractStartDate: "Valid From is required.",
  ContractEndDate: "Valid To is required.",
  RateMatrixFileName: "Excel rate matrix file is required."
};

const normalizeContractData = (data, file = null, existingContract = null) => {
  const current = existingContract || {};

  // The contract type is chosen once when the contract is created and
  // cannot change afterwards - its rate matrix layout depends on it.
  const requestedType = data.ContractType || data.contractType;
  const ContractType = current.ContractType
    || (requestedType ? normalizeContractType(requestedType) : DEFAULT_CONTRACT_TYPE);

  return {
    ContractType,
    VendorID: data.VendorID || data.VendorId || current.VendorID,
    VendorPAN: data.VendorPAN || data.vendorPan || current.VendorPAN || "",
    ContractNo: current.ContractNo || data.ContractNo || generateContractNo(),
    ContactPerson: String(data.ContactPerson ?? current.ContactPerson ?? "").trim(),
    ContractStartDate: data.ValidFrom || data.ContractStartDate || current.ContractStartDate,
    ContractEndDate: data.ValidTo || data.ContractEndDate || current.ContractEndDate,
    UserRemarks: data.UserRemarks !== undefined ? normalizeUserRemark(data.UserRemarks) : (current.UserRemarks || null),
    Status: String(data.Status || current.Status || CONTRACT_STATUS.DRAFT).toUpperCase(),
    RateMatrixFileName: file ? file.originalname : (current.RateMatrixFileName || null)
  };
};

const validateRequiredFields = (contractData) => {
  const errors = [];
  Object.keys(REQUIRED_MESSAGES).forEach((field) => {
    if (!contractData[field]) {
      errors.push(REQUIRED_MESSAGES[field]);
    }
  });
  return errors;
};

const validateDateRange = (contractData, errors) => {
  const validFrom = new Date(contractData.ContractStartDate);
  const validTo = new Date(contractData.ContractEndDate);

  if (contractData.ContractStartDate && Number.isNaN(validFrom.getTime())) {
    errors.push("Valid From must be a valid date.");
  }
  if (contractData.ContractEndDate && Number.isNaN(validTo.getTime())) {
    errors.push("Valid To must be a valid date.");
  }
  if (!Number.isNaN(validFrom.getTime()) && !Number.isNaN(validTo.getTime()) && validFrom > validTo) {
    errors.push("Valid To cannot be earlier than Valid From.");
  }
};

const validateContractType = (contractData, errors) => {
  if (!contractData.ContractType) {
    errors.push("Invalid contract type chosen.");
  }
};

const validateStatus = (contractData, errors) => {
  const allowedStatuses = Object.values(CONTRACT_STATUS);
  if (!allowedStatuses.includes(contractData.Status)) {
    errors.push("Invalid contract status chosen.");
  }
};

const validateMasterReferences = async (contractData, errors) => {
  const vendor = await contractRepository.getVendorById(contractData.VendorID);
  if (!vendor) {
    errors.push("Selected Vendor record does not exist.");
  } else {
    contractData.VendorPAN = vendor.PANNo || vendor.PANNumber || vendor.VendorPAN || contractData.VendorPAN;
    contractData.ContactPerson = contractData.ContactPerson || vendor.ContactPerson || vendor.VendorName || "";
  }
};

const validateDuplicateContract = async (contractData, errors, excludeContractId = null) => {
  const existingContract = await contractRepository.getContractByNumber(
    contractData.ContractNo,
    contractData.VendorID,
    excludeContractId
  );
  if (existingContract) {
    errors.push("This vendor already has a contract with this Contract Number.");
  }

  if (contractData.Status === CONTRACT_STATUS.ACTIVE) {
    const activeContract = await contractRepository.getActiveContract({
      vendorId: contractData.VendorID,
      contractType: contractData.ContractType,
      excludeContractId
    });
    if (activeContract) {
      errors.push(`This vendor already has an ACTIVE ${CONTRACT_TYPE_LABELS[contractData.ContractType]} contract.`);
    }
  }
};

const validateContract = async (contractData, excludeContractId = null) => {
  const errors = validateRequiredFields(contractData);
  validateDateRange(contractData, errors);
  validateContractType(contractData, errors);
  validateStatus(contractData, errors);

  if (!errors.length) {
    await validateMasterReferences(contractData, errors);
  }
  if (!errors.length) {
    await validateDuplicateContract(contractData, errors, excludeContractId);
  }

  if (errors.length) {
    const error = new Error("Contract validation failed.");
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
};

const buildImportError = (errors, message = "Rate Matrix Excel validation failed.") => {
  const reported = errors.slice(0, MAX_REPORTED_IMPORT_ERRORS);
  if (errors.length > reported.length) {
    reported.push(`...and ${errors.length - reported.length} more issue(s).`);
  }
  const error = new Error(message);
  error.statusCode = 400;
  error.errors = reported;
  return error;
};

// Per-upload caches so each destination / slab / vehicle type is looked up once.
const createMasterResolver = (transaction) => {
  const destinations = new Map();
  const slabs = new Map();
  const vehicleTypes = new Map();

  const cached = async (cache, key, loader) => {
    if (!cache.has(key)) cache.set(key, await loader());
    return cache.get(key);
  };

  return {
    destination: (city) =>
      cached(destinations, city.toUpperCase(), () =>
        contractRepository.findOrCreateDestination({ City: city, State: DEFAULT_DESTINATION_STATE }, transaction)
      ),

    // A Sheet 1 weight slab is stored with both its WeightMaster row and a
    // Vehicle Type of the same name (e.g. "20-21 MT"), so invoices can be
    // matched on Destination + Vehicle Type for both sheets.
    slab: (slab) =>
      cached(slabs, slab.label, async () => {
        const weight = await contractRepository.findOrCreateWeight(
          { Weight: slab.capacity, WeightUnit: DEFAULT_WEIGHT_UNIT },
          transaction
        );
        const vehicleType = await contractRepository.findOrCreateVehicleType(
          { VehicleName: slab.label, Capacity: slab.capacity, Unit: DEFAULT_WEIGHT_UNIT },
          transaction
        );
        return { WeightID: weight.WeightID, VehicleTypeID: vehicleType.VehicleTypeID };
      }),

    vehicleType: (name) =>
      cached(vehicleTypes, name.toUpperCase(), () =>
        contractRepository.findOrCreateVehicleType(
          { VehicleName: name, Capacity: parseVehicleCapacity(name), Unit: DEFAULT_WEIGHT_UNIT },
          transaction
        )
      ),
  };
};

const importDomesticRows = async (rows, baseEntry, resolver, transaction) => {
  for (const row of rows) {
    const destination = await resolver.destination(row.destination);
    for (const rate of row.rates) {
      const slabRefs = await resolver.slab(rate.slab);
      await contractRepository.createRateMatrixEntry({
        ...baseEntry,
        ...slabRefs,
        DestinationID: destination.DestinationID,
        DistanceKM: row.distanceKm,
        BaseRate: rate.amount,
      }, transaction);
    }
  }
};

const importAdditionalRows = async (rows, baseEntry, resolver, transaction) => {
  for (const row of rows) {
    const destination = await resolver.destination(row.destination);
    const vehicleType = await resolver.vehicleType(row.vehicleType);
    await contractRepository.createRateMatrixEntry({
      ...baseEntry,
      DestinationID: destination.DestinationID,
      WeightID: null,
      VehicleTypeID: vehicleType.VehicleTypeID,
      DistanceKM: row.distanceKm,
      BaseRate: row.freight,
    }, transaction);
  }
};

// FTL Inbound rows carry a vehicle slab (resolved like Sheet 1 slabs of
// FTL Outbound); PTL Outbound rows carry a destination only.
const importTypeRateRows = async (rows, baseEntry, resolver, transaction) => {
  for (const row of rows) {
    const destination = await resolver.destination(row.destination);
    const slabRefs = row.slab ? await resolver.slab(row.slab) : { WeightID: null, VehicleTypeID: null };
    await contractRepository.createRateMatrixEntry({
      ...baseEntry,
      ...slabRefs,
      DestinationID: destination.DestinationID,
      DistanceKM: row.distanceKm,
      DeliveryLocation: row.deliveryLocation,
      TransitDays: row.transitDays,
      BaseRate: row.rate,
    }, transaction);
  }
};

const importFtlOutboundWorkbook = async (fileBuffer, baseEntry, resolver, transaction) => {
  const { domesticRows, additionalRows, errors } = parseRateMatrixWorkbook(fileBuffer);
  if (errors.length) throw buildImportError(errors);

  await contractRepository.clearRateMatrixByContractId(baseEntry.ContractID, transaction);
  await importDomesticRows(domesticRows, baseEntry, resolver, transaction);
  await importAdditionalRows(additionalRows, baseEntry, resolver, transaction);
};

// Replaces the rate matrix, charges and zone rates of an FTL Inbound,
// PTL Outbound or Part Load contract with already validated data.
const replaceContractTypeData = async ({ rateRows, charges, zoneRates }, baseEntry, resolver, transaction) => {
  await contractRepository.clearRateMatrixByContractId(baseEntry.ContractID, transaction);
  await importTypeRateRows(rateRows, baseEntry, resolver, transaction);
  await contractRepository.replaceContractCharges(baseEntry.ContractID, charges, transaction);
  await contractRepository.replaceContractZoneRates(baseEntry.ContractID, zoneRates, transaction);
};

const importContractTypeWorkbook = async (fileBuffer, contractType, baseEntry, resolver, transaction) => {
  const parsed = parseContractTypeWorkbook(fileBuffer, contractType);
  if (parsed.errors.length) throw buildImportError(parsed.errors);
  await replaceContractTypeData(parsed, baseEntry, resolver, transaction);
};

// Saves the sheets edited on the Edit Contract page. The whole data set is
// sent and validated first, exactly like a re-uploaded Excel.
const applyEditedContractSheets = async (editedSheets, contractId, contractData, transaction) => {
  const parsed = parseContractSheets(editedSheets, contractData.ContractType);
  if (parsed.errors.length) throw buildImportError(parsed.errors, "Contract sheet validation failed.");

  const baseEntry = { ContractID: contractId, EffectiveFrom: contractData.ContractStartDate, EffectiveTo: contractData.ContractEndDate };
  await replaceContractTypeData(parsed, baseEntry, createMasterResolver(transaction), transaction);
};

// Validates the whole workbook first, and only then replaces the
// contract's rate matrix, so a bad file never leaves partial data behind.
const processRateMatrixExcel = async (fileBuffer, contractId, contractType, startDate, endDate, transaction) => {
  const baseEntry = { ContractID: contractId, EffectiveFrom: startDate, EffectiveTo: endDate };
  const resolver = createMasterResolver(transaction);

  if (contractType === CONTRACT_TYPES.FTL_OUTBOUND) {
    await importFtlOutboundWorkbook(fileBuffer, baseEntry, resolver, transaction);
  } else {
    await importContractTypeWorkbook(fileBuffer, contractType, baseEntry, resolver, transaction);
  }
};

// Resolves the Weight / Vehicle Type keys of a destination added manually
// on the Edit Contract grid. Sheet 1 rows send their slab label, Sheet 2
// rows send the selected VehicleTypeID.
const resolveManualRateKeys = async (rateRow, resolver) => {
  const weightObj = rateRow.weight;
  const slabText = rateRow.slabLabel
    || (weightObj ? `${weightObj.Weight ?? weightObj.weight} ${weightObj.WeightUnit || weightObj.weightUnit || DEFAULT_WEIGHT_UNIT}` : null);

  if (slabText) {
    const slab = parseWeightSlab(slabText);
    if (!slab) throw buildImportError([`'${slabText}' is not a valid weight slab.`]);
    return resolver.slab(slab);
  }
  if (rateRow.VehicleTypeID !== undefined && rateRow.VehicleTypeID !== null && rateRow.VehicleTypeID !== "") {
    return { WeightID: null, VehicleTypeID: rateRow.VehicleTypeID };
  }
  const vehicleName = rateRow.vehicleType?.VehicleName || rateRow.vehicleType?.vehicleName;
  if (vehicleName) {
    const vehicleType = await resolver.vehicleType(vehicleName);
    return { WeightID: null, VehicleTypeID: vehicleType.VehicleTypeID };
  }
  return { WeightID: null, VehicleTypeID: null };
};

const createContract = async ({ data, file, user }) => {
  const transaction = await sequelize.transaction();
  try {
    const contractData = normalizeContractData(data, file);
    await validateContract(contractData);

    const contract = await contractRepository.createContract(
      {
        ...contractData,
        Remarks: buildCreatedRemark(user, `${CONTRACT_TYPE_LABELS[contractData.ContractType] || contractData.ContractType} contract`),
        CreatedBy: user?.UserID || null,
        CreatedAt: sequelize.literal("GETDATE()"),
      },
      transaction
    );

    if (file) {
      await processRateMatrixExcel(file.buffer, contract.ContractID, contractData.ContractType, contractData.ContractStartDate, contractData.ContractEndDate, transaction);
    }

    await transaction.commit();
    return await contractRepository.getContractById(contract.ContractID);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("🚨 CRITICAL ENGINE CRASH ENCOUNTERED DURING CONTRACT CREATION:", error);
    throw error;
  }
};

const updateContract = async ({ contractId, data, file, user }) => {
  const transaction = await sequelize.transaction();
  try {
    const existingContract = await contractRepository.getContractById(contractId, transaction);
    if (!existingContract) {
      await transaction.commit();
      return null;
    }

    const contractData = normalizeContractData(data, file, existingContract);
    await validateContract(contractData, contractId);

    await contractRepository.updateContract(
      contractId,
      {
        ...contractData,
        Remarks: buildUpdatedRemark(existingContract.Remarks, user, file ? `Rate matrix re-uploaded (${file.originalname})` : ""),
        UpdatedBy: user?.UserID || null,
        UpdatedAt: sequelize.literal("GETDATE()"),
      },
      transaction
    );

    if (file) {
      // New file uploaded, re-process excel sheets
      await processRateMatrixExcel(file.buffer, contractId, contractData.ContractType, contractData.ContractStartDate, contractData.ContractEndDate, transaction);
    } else if (data.editedRates && contractData.ContractType === CONTRACT_TYPES.FTL_OUTBOUND) {
      // Bulk update/sync edited rates and newly added destinations from table/grid
      const parsedRates = typeof data.editedRates === "string" ? JSON.parse(data.editedRates) : data.editedRates;
      const resolver = createMasterResolver(transaction);

      for (const rateRow of parsedRates) {
        const rateId = rateRow.RateID || rateRow.RateId || rateRow.contractRateMatrixID;
        const baseRateVal = parseFloat(rateRow.BaseRate !== undefined ? rateRow.BaseRate : rateRow.baseRate);

        if (String(rateId).startsWith("temp_")) {
          // Newly added destination from the Edit Contract grid. Blank or
          // zero rates are skipped - a zero contract rate would approve
          // any billed freight during the invoice audit.
          const destName = rateRow.destination?.City || rateRow.Destination?.City;
          if (destName && baseRateVal > 0) {
            const destination = await resolver.destination(destName);
            const rateKeys = await resolveManualRateKeys(rateRow, resolver);

            await contractRepository.createRateMatrixEntry({
              ContractID: contractId,
              DestinationID: destination.DestinationID,
              ...rateKeys,
              BaseRate: baseRateVal,
              EffectiveFrom: contractData.ContractStartDate,
              EffectiveTo: contractData.ContractEndDate
            }, transaction);
          }
        } else if (rateId && !isNaN(baseRateVal)) {
          // Update existing rate entry
          await contractRepository.updateRateMatrixEntry(rateId, baseRateVal, transaction);
        }
      }
    } else if (data.editedSheets && contractData.ContractType !== CONTRACT_TYPES.FTL_OUTBOUND) {
      await applyEditedContractSheets(data.editedSheets, contractId, contractData, transaction);
    }

    await transaction.commit();
    return await contractRepository.getContractById(contractId);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("🚨 CRITICAL ENGINE CRASH ENCOUNTERED DURING CONTRACT UPDATE:", error);
    throw error;
  }
};

const deleteContract = async (contractId) => {
  const transaction = await sequelize.transaction();
  try {
    const existingContract = await contractRepository.getContractById(contractId, transaction);
    if (!existingContract) {
      await transaction.commit();
      return null;
    }
    await contractRepository.deleteContract(contractId, transaction);
    await transaction.commit();
    return existingContract;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};

const getContractById = async (contractId) => {
  return await contractRepository.getContractById(contractId);
};

const getAllContracts = async (query) => {
  return await contractRepository.getAllContracts({
    ...query,
    vendorId: query.vendorId || query.VendorID || query.VendorId,
    contractType: query.contractType || query.ContractType
  });
};

const getRateMatrixByContractId = async (contractId) => {
  return await contractRepository.getRateMatrixByContractId(contractId);
};

const bulkUpdateRateMatrix = async (ratesArray) => {
  const transaction = await sequelize.transaction();
  try {
    for (const rateRow of ratesArray) {
      const rateId = rateRow.RateID || rateRow.ContractRateMatrixID;
      if (rateId && rateRow.BaseRate !== undefined) {
        await contractRepository.updateRateMatrixEntry(rateId, parseFloat(rateRow.BaseRate), transaction);
      }
    }
    await transaction.commit();
    return true;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("🚨 Error inside bulkUpdateRateMatrix service layer:", error);
    throw error;
  }
};

module.exports = {
  createContract,
  updateContract,
  deleteContract,
  getContractById,
  getAllContracts,
  getRateMatrixByContractId,
  bulkUpdateRateMatrix,
};
