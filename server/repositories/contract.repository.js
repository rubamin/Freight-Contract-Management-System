const { Op } = require("sequelize");
const {
  ContractMaster,
  Vendor,
  User,
  ContractRateMatrix,
  DestinationMaster,
  VehicleType,
  WeightMaster
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

const getContractByNumber = async (contractNo, excludeContractId = null) => {
  const where = { ContractNo: contractNo };

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
  const [vehicleType] = await VehicleType.findOrCreate({
    where: { VehicleName },
    defaults: { Capacity, Unit },
    transaction
  });
  return vehicleType;
};

const findOrCreateDestination = async ({ City, District, State, Pincode }, transaction = null) => {
  const [destination] = await DestinationMaster.findOrCreate({
    where: { City, State: State || "Gujarat" },
    defaults: { District: District || "", Pincode: Pincode || "" },
    transaction
  });
  return destination;
};

const findOrCreateWeight = async ({ FromWeight, ToWeight, WeightUnit }, transaction = null) => {
  const [weight] = await WeightMaster.findOrCreate({
    where: { FromWeight, WeightUnit: WeightUnit || "MT" },
    defaults: { ToWeight: ToWeight || FromWeight },
    transaction
  });
  return weight;
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