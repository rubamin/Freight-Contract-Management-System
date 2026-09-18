const sequelize = require("../config/database");
const contractRepository = require("../repositories/contract.repository");
const xlsx = require("xlsx");
const { CONTRACT_STATUS } = require("../constants/contractStatus");

const REQUIRED_MESSAGES = {
  VendorID: "Vendor selection is required.",
  ContractNo: "Contract Number is required.",
  ContractStartDate: "Valid From is required.",
  ContractEndDate: "Valid To is required.",
  RateMatrixFileName: "Excel rate matrix file is required."
};

const normalizeContractData = (data, file = null, existingContract = null) => {
  const current = existingContract || {};

  return {
    VendorID: data.VendorID || data.VendorId || current.VendorID,
    VendorPAN: data.VendorPAN || data.vendorPan || current.VendorPAN || "",
    ContractNo: data.ContractNumber || data.ContractNo || data.contractNumber || current.ContractNo,
    ContractStartDate: data.ValidFrom || data.ContractStartDate || current.ContractStartDate,
    ContractEndDate: data.ValidTo || data.ContractEndDate || current.ContractEndDate,
    Remarks: data.Remarks || current.Remarks || null,
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
      excludeContractId
    });
    if (activeContract) {
      errors.push("Only one ACTIVE contract is allowed per vendor concurrently.");
    }
  }
};

const validateContract = async (contractData, excludeContractId = null) => {
  const errors = validateRequiredFields(contractData);
  validateDateRange(contractData, errors);
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

const processRateMatrixExcel = async (fileBuffer, contractId, startDate, endDate, transaction) => {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });

  await contractRepository.clearRateMatrixByContractId(contractId, transaction);

  // 1. PROCESS SHEET 1: DOMESTIC DESTINATIONS
  const sheet1Name = "DOMESTIC DESTINATIONS";
  if (workbook.SheetNames.includes(sheet1Name)) {
    const worksheet = workbook.Sheets[sheet1Name];
    const rangeData = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

    let headerRow = null;
    let headerRowIndex = -1;

    for (let i = 0; i < Math.min(rangeData.length, 5); i++) {
      const row = rangeData[i] || [];
      const hasDestinationColumn = row.some(cell => 
        String(cell || "").trim().toUpperCase() === "DESTINATION"
      );
      if (hasDestinationColumn) {
        headerRow = row;
        headerRowIndex = i;
        break;
      }
    }

    if (headerRow) {
      const destColIdx = headerRow.findIndex(cell => String(cell || "").trim().toUpperCase() === "DESTINATION");

      // The "KM" column (distance) sits right after DESTINATION and before
      // the weight-slab columns (5 MT, 7 MT, ...). It must be excluded from
      // weightColumns below - it is not a rate column - and its value read
      // separately per row and stored as DistanceKM on every rate entry
      // created for that destination.
      const kmColIdx = headerRow.findIndex(cell => String(cell || "").trim().toUpperCase() === "KM");

      const weightColumns = [];
      for (let c = destColIdx + 1; c < headerRow.length; c++) {
        if (c === kmColIdx) continue;
        const cellValue = String(headerRow[c] || "").trim();
        if (cellValue) {
          const numericWeight = parseFloat(cellValue.replace(/[^0-9.]/g, "")) || 0;
          let weightRecord = await contractRepository.findOrCreateWeight({
            Weight: numericWeight,
            WeightUnit: "MT"
          }, transaction);

          weightColumns[c] = weightRecord.WeightID;
        }
      }

      for (let r = headerRowIndex + 1; r < rangeData.length; r++) {
        const row = rangeData[r];
        if (!row || row.length === 0) continue;

        const destinationName = String(row[destColIdx] || "").trim();
        if (!destinationName || destinationName.startsWith("Ref:") || destinationName.toUpperCase() === "DETENTION") {
          continue;
        }

        const destination = await contractRepository.findOrCreateDestination({
          City: destinationName,
          // State intentionally omitted - DestinationMaster.beforeValidate hook
          // resolves District/State from the nationwide lookup when City
          // maps to exactly one district; ambiguous/unknown cities are left
          // blank rather than hardcoded to Gujarat.
        }, transaction);

        const rowDistanceKm = kmColIdx !== -1 ? parseFloat(row[kmColIdx]) : NaN;
        const distanceKm = !isNaN(rowDistanceKm) ? rowDistanceKm : null;

        for (let colIdx = destColIdx + 1; colIdx < row.length; colIdx++) {
          if (colIdx === kmColIdx) continue;
          const weightId = weightColumns[colIdx];
          const rateValue = parseFloat(row[colIdx]);

          if (weightId && !isNaN(rateValue) && rateValue > 0) {
            await contractRepository.createRateMatrixEntry({
              ContractID: contractId,
              DestinationID: destination.DestinationID,
              WeightID: weightId,
              VehicleTypeID: null,
              BaseRate: rateValue,
              DistanceKM: distanceKm,
              EffectiveFrom: startDate,
              EffectiveTo: endDate
            }, transaction);
          }
        }
      }
    }
  }

  // 2. PROCESS SHEET 2: ADDITIONAL DESTINATIONS
  const sheet2Name = "ADDITIONAL DESTINATIONS";
  if (workbook.SheetNames.includes(sheet2Name)) {
    const worksheet2 = workbook.Sheets[sheet2Name];
    const rangeData2 = xlsx.utils.sheet_to_json(worksheet2, { header: 1, blankrows: false });

    let headerRow2Index = -1;
    let destCol2 = -1;
    let vehicleCol2 = -1;
    let freightCol2 = -1;

    for (let i = 0; i < Math.min(rangeData2.length, 5); i++) {
      const row = rangeData2[i] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim().toUpperCase();
        if (val.includes("DESTINATION")) destCol2 = c;
        if (val.includes("VEHICLE TYPE")) vehicleCol2 = c;
        if (val.includes("FREIGHT")) freightCol2 = c;
      }
      if (destCol2 !== -1 && vehicleCol2 !== -1 && freightCol2 !== -1) {
        headerRow2Index = i;
        break;
      }
    }

    if (headerRow2Index !== -1) {
      for (let r = headerRow2Index + 1; r < rangeData2.length; r++) {
        const row = rangeData2[r];
        if (!row || row.length === 0) continue;

        const destinationName = String(row[destCol2] || "").trim();
        const vehicleTypeName = String(row[vehicleCol2] || "").trim();
        const freightAmount = parseFloat(row[freightCol2]);

        if (destinationName && vehicleTypeName && !isNaN(freightAmount) && freightAmount > 0) {
          const destination = await contractRepository.findOrCreateDestination({
            City: destinationName,
            // State intentionally omitted - DestinationMaster.beforeValidate hook
            // resolves District/State from the nationwide lookup when City
            // maps to exactly one district; ambiguous/unknown cities are left
            // blank rather than hardcoded to Gujarat.
          }, transaction);

          const parsedCapacity = parseFloat(vehicleTypeName.replace(/[^0-9.]/g, "")) || 0;
          const vehicleType = await contractRepository.findOrCreateVehicleType({
            VehicleName: vehicleTypeName,
            Capacity: parsedCapacity,
            Unit: "MT"
          }, transaction);

          await contractRepository.createRateMatrixEntry({
            ContractID: contractId,
            DestinationID: destination.DestinationID,
            WeightID: null,
            VehicleTypeID: vehicleType.VehicleTypeID,
            BaseRate: freightAmount,
            EffectiveFrom: startDate,
            EffectiveTo: endDate
          }, transaction);
        }
      }
    }
  }
};

const createContract = async ({ data, file, user }) => {
  const transaction = await sequelize.transaction();
  try {
    const contractData = normalizeContractData(data, file);
    await validateContract(contractData);

    const contract = await contractRepository.createContract(
      {
        ...contractData,
        CreatedBy: user?.UserID || null,
        CreatedAt: sequelize.literal("GETDATE()"),
      },
      transaction
    );

    if (file) {
      await processRateMatrixExcel(file.buffer, contract.ContractID, contractData.ContractStartDate, contractData.ContractEndDate, transaction);
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
        UpdatedBy: user?.UserID || null,
        UpdatedAt: sequelize.literal("GETDATE()"),
      },
      transaction
    );

    if (file) {
      // New file uploaded, re-process excel sheets
      await processRateMatrixExcel(file.buffer, contractId, contractData.ContractStartDate, contractData.ContractEndDate, transaction);
    } else if (data.editedRates) {
      // Bulk update/sync edited rates and newly added destinations from table/grid
      const parsedRates = typeof data.editedRates === "string" ? JSON.parse(data.editedRates) : data.editedRates;
      
      for (const rateRow of parsedRates) {
        const rateId = rateRow.RateID || rateRow.RateId || rateRow.contractRateMatrixID;
        const baseRateVal = parseFloat(rateRow.BaseRate !== undefined ? rateRow.BaseRate : rateRow.baseRate);

        if (String(rateId).startsWith("temp_")) {
          // Handle newly added destination from frontend modal
          const destName = rateRow.destination?.City || rateRow.Destination?.City;
          if (destName) {
            const destination = await contractRepository.findOrCreateDestination({
              City: destName,
              // State intentionally omitted - DestinationMaster.beforeValidate hook
              // resolves District/State from the nationwide lookup when City
              // maps to exactly one district; ambiguous/unknown cities are left
              // blank rather than hardcoded to Gujarat.
            }, transaction);

            let weightId = null;
            let vehicleTypeId = null;

            // Sheet 1 (domestic destinations by weight slab): the frontend
            // sends a `weight` display object ({ Weight, WeightUnit }) for
            // each slab of a newly added destination, but never a
            // pre-existing WeightID (there isn't one yet). Resolve/create
            // the real WeightMaster record from that object instead of
            // gating on WeightID already being set - otherwise every
            // weight slab for the same new destination resolves to the
            // same NULL WeightID and collides under the
            // (ContractID, DestinationID, VehicleTypeID, WeightID) unique
            // constraint as soon as a second slab is inserted.
            if (rateRow.weight && (rateRow.weight.Weight !== undefined || rateRow.weight.weight !== undefined)) {
              const numWeight = parseFloat(rateRow.weight.Weight ?? rateRow.weight.weight ?? 0);
              const weightUnit = rateRow.weight.WeightUnit || rateRow.weight.weightUnit || "MT";
              const weightRecord = await contractRepository.findOrCreateWeight({
                Weight: numWeight,
                WeightUnit: weightUnit
              }, transaction);
              weightId = weightRecord.WeightID;
            } else if (rateRow.VehicleTypeID !== undefined && rateRow.VehicleTypeID !== null) {
              // Sheet 2 (additional destinations by vehicle type): the
              // frontend already sends a real VehicleTypeID selected from
              // Vehicle Type Master, so use it directly.
              vehicleTypeId = rateRow.VehicleTypeID;
            } else if (rateRow.vehicleType) {
              const vName = rateRow.vehicleType.VehicleName || rateRow.vehicleType.vehicleName;
              const parsedCap = parseFloat(vName.replace(/[^0-9.]/g, "")) || 0;
              const vehicleRecord = await contractRepository.findOrCreateVehicleType({
                VehicleName: vName,
                Capacity: parsedCap,
                Unit: "MT"
              }, transaction);
              vehicleTypeId = vehicleRecord.VehicleTypeID;
            }

            await contractRepository.createRateMatrixEntry({
              ContractID: contractId,
              DestinationID: destination.DestinationID,
              WeightID: weightId,
              VehicleTypeID: vehicleTypeId,
              BaseRate: isNaN(baseRateVal) ? 0 : baseRateVal,
              EffectiveFrom: contractData.ContractStartDate,
              EffectiveTo: contractData.ContractEndDate
            }, transaction);
          }
        } else if (rateId && !isNaN(baseRateVal)) {
          // Update existing rate entry
          await contractRepository.updateRateMatrixEntry(rateId, baseRateVal, transaction);
        }
      }
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
    vendorId: query.vendorId || query.VendorID || query.VendorId
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
