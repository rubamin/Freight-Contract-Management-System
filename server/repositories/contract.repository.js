const { Op } = require("sequelize");
const {
  ContractMaster,
  Vendor,
  User,
  ContractRateMatrix,
  DestinationMaster,
  VehicleType,
  WeightMaster,
  sequelize
} = require("../models");

// Updated contractInclude with nested rateMatrix associations
const contractInclude = [
  { model: Vendor, as: "vendor" },
  { model: User, as: "creator" },
  { model: User, as: "updater" },
  { 
    model: ContractRateMatrix, 
    as: "rateMatrix",
    include: [
      { model: DestinationMaster, as: "destination" },
      { model: VehicleType, as: "vehicleType" },
      { model: WeightMaster, as: "weight" }
    ]
  }
];

const buildWhere = ({
  search = "",
  status = "",
  vendorId = "",
}) => {
  const where = {};

  if (search) {
    where[Op.or] = [
      { ContractNo: { [Op.like]: `%${search}%` } },
      { VendorPAN: { [Op.like]: `%${search}%` } },
      { Remarks: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status) {
    where.Status = String(status).toUpperCase();
  }

  if (vendorId) {
    where.VendorID = vendorId;
  }

  return where;
};

// 1. Core CRUD Methods for Contracts
const createContract = async (contractData, transaction = null) => {
  return await ContractMaster.create(contractData, { transaction });
};

const updateContract = async (contractId, contractData, transaction = null) => {
  return await ContractMaster.update(contractData, {
    where: { ContractID: contractId },
    transaction,
  });
};

const deleteContract = async (contractId, transaction = null) => {
  return await ContractMaster.destroy({
    where: { ContractID: contractId },
    transaction,
  });
};

const getContractById = async (contractId, transaction = null) => {
  return await ContractMaster.findByPk(contractId, {
    include: contractInclude,
    transaction,
  });
};

// Bug fix (task item 4): ContractNo only needs to be unique per vendor, not
// globally, so this now always scopes the lookup by VendorID too - matching
// the composite unique index on ContractMaster (VendorID, ContractNo).
const getContractByNumber = async (contractNo, vendorId, excludeContractId = null) => {
  const where = { ContractNo: contractNo, VendorID: vendorId };

  if (excludeContractId) {
    where.ContractID = { [Op.ne]: excludeContractId };
  }

  return await ContractMaster.findOne({ where });
};

const getActiveContract = async ({ vendorId, excludeContractId = null }) => {
  const where = {
    VendorID: vendorId,
    Status: "ACTIVE",
  };

  if (excludeContractId) {
    where.ContractID = { [Op.ne]: excludeContractId };
  }

  return await ContractMaster.findOne({ where });
};

const getAllContracts = async ({
  page = 1,
  pageSize = 10,
  search = "",
  status = "",
  vendorId = "",
  sortField = "ContractID",
  sortOrder = "DESC",
}) => {
  const offset = (Number(page) - 1) * Number(pageSize);
  const allowedSortFields = [
    "ContractID",
    "ContractNo",
    "VendorID",
    "ContractStartDate",
    "ContractEndDate",
    "Status",
    "CreatedAt",
    "UpdatedAt",
  ];

  if (!allowedSortFields.includes(sortField)) {
    sortField = "ContractID";
  }

  sortOrder = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { count, rows } = await ContractMaster.findAndCountAll({
    where: buildWhere({ search, status, vendorId }),
    include: contractInclude,
    order: [[sortField, sortOrder]],
    offset,
    limit: Number(pageSize),
    distinct: true,
  });

  return {
    totalRecords: count,
    page: Number(page),
    pageSize: Number(pageSize),
    data: rows,
  };
};

// 2. Base Master Models Select Methods
const getVendorById = async (vendorId) => {
  return await Vendor.findByPk(vendorId);
};

// 3. Automated Check-or-Create Methods for Excel Import Processing Flow
const findOrCreateVehicleType = async ({ VehicleName, Capacity, Unit }, transaction = null) => {
  const execute = async (t) => {
    const existing = await VehicleType.findOne({ where: { VehicleName }, transaction: t });
    if (existing) return existing;

    return await VehicleType.create(
      { VehicleName, Capacity, Unit },
      { transaction: t }
    );
  };

  if (transaction) {
    return execute(transaction);
  }

  return await sequelize.transaction(execute);
};

// Used by the Excel rate-matrix import path (task item 7: Pincode removed
// entirely; District auto-fills via DestinationMaster's beforeValidate
// hook, so it isn't set here directly).
const findOrCreateDestination = async ({ City, State }, transaction = null) => {
  const execute = async (t) => {
    const normalizedState = State || "Gujarat";
    const existing = await DestinationMaster.findOne({
      where: { City, State: normalizedState },
      transaction: t,
    });
    if (existing) return existing;

    return await DestinationMaster.create(
      { City, State: normalizedState },
      { transaction: t }
    );
  };

  if (transaction) {
    return execute(transaction);
  }

  return await sequelize.transaction(execute);
};

// Simplified from a FromWeight/ToWeight range to a single Weight value
// (task item 9).
const findOrCreateWeight = async ({ Weight, WeightUnit }, transaction = null) => {
  const execute = async (t) => {
    const normalizedUnit = WeightUnit || "MT";
    const existing = await WeightMaster.findOne({
      where: { Weight, WeightUnit: normalizedUnit },
      transaction: t,
    });
    if (existing) return existing;

    return await WeightMaster.create(
      { Weight, WeightUnit: normalizedUnit },
      { transaction: t }
    );
  };

  if (transaction) {
    return execute(transaction);
  }

  return await sequelize.transaction(execute);
};

// 4. Rate Matrix Insertion and Cleanup Methods
const clearRateMatrixByContractId = async (contractId, transaction = null) => {
  return await ContractRateMatrix.destroy({
    where: { ContractID: contractId },
    transaction
  });
};

const createRateMatrixEntry = async (matrixEntryData, transaction = null) => {
  return await ContractRateMatrix.create(matrixEntryData, { transaction });
};

// 5. Additional Contract Calculation Rules Handling Methods

const getRateMatrixByContractId = async (contractId, transaction = null) => {
  return await ContractRateMatrix.findAll({
    where: { ContractID: contractId },
    include: [
      { model: DestinationMaster, as: "destination" }, 
      { model: VehicleType, as: "vehicleType" },
      { model: WeightMaster, as: "weight" }
    ],
    transaction
  });
};

const updateRateMatrixEntry = async (contractRateMatrixId, baseRate, transaction = null) => {
  return await ContractRateMatrix.update(
    { BaseRate: baseRate },
    {
      where: { RateID: contractRateMatrixId },
      transaction,
    }
  );
};

module.exports = {
  createContract,
  updateContract,
  deleteContract,
  getContractById,
  getContractByNumber,
  getActiveContract,
  getAllContracts,
  getVendorById,
  
  findOrCreateVehicleType,
  findOrCreateDestination,
  findOrCreateWeight,
  clearRateMatrixByContractId,
  createRateMatrixEntry,

  getRateMatrixByContractId,
  updateRateMatrixEntry,
};
