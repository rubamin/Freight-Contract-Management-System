const { Op } = require("sequelize");
const { Vendor, VendorGST } = require("../models");

const createVendor = async (vendorData, transaction = null) => {
  return Vendor.create(vendorData, { transaction });
};

const createVendorGST = async (gstList, transaction = null) => {
  return VendorGST.bulkCreate(gstList, { transaction });
};

const findVendorByPAN = async (panNo, transaction = null) => {
  return Vendor.findOne({
    where: {
      PANNo: panNo,
    },
    transaction,
  });
};

const findVendorByCode = async (vendorCode, transaction = null) => {
  return Vendor.findOne({
    where: {
      VendorCode: vendorCode,
    },
    transaction,
  });
};

const findGST = async (gstNumber, transaction = null) => {
  return VendorGST.findOne({
    where: {
      GSTNumber: gstNumber,
    },
    transaction,
  });
};

const getVendorById = async (vendorId, transaction = null) => {
  return Vendor.findOne({
    where: {
      VendorID: vendorId,
    },
    include: [
      {
        model: VendorGST,
        as: "gstNumbers",
        required: false,
      },
    ],
    transaction,
  });
};

const getAllVendors = async ({
  page = 1,
  pageSize = 10,
  search = "",
  sortField = "VendorID",
  sortOrder = "DESC",
}) => {
  const offset = (Number(page) - 1) * Number(pageSize);

  const allowedSortFields = [
    "VendorID",
    "VendorCode",
    "VendorName",
    "PANNo",
    "Email",
    "MobileNo",
    "CreatedAt",
    "IsActive",
  ];

  if (!allowedSortFields.includes(sortField)) {
    sortField = "VendorID";
  }

  sortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const where = {};

  if (search) {
    where[Op.or] = [
      {
        VendorName: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        VendorCode: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        PANNo: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        MobileNo: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        Email: {
          [Op.like]: `%${search}%`,
        },
      },
    ];
  }

  const { count, rows } = await Vendor.findAndCountAll({
    where,
    include: [
      {
        model: VendorGST,
        as: "gstNumbers",
        required: false,
      },
    ],
    order: [[sortField, sortOrder]],
    offset,
    limit: Number(pageSize),
    distinct: true,
    subQuery: false,
  });

  return {
    totalRecords: count,
    page: Number(page),
    pageSize: Number(pageSize),
    data: rows,
  };
};

const updateVendor = async (vendorId, data, transaction = null) => {
  return Vendor.update(data, {
    where: {
      VendorID: vendorId,
    },
    transaction,
  });
};

const deleteVendorGST = async (vendorId, transaction = null) => {
  return VendorGST.destroy({
    where: {
      VendorID: vendorId,
    },
    transaction,
  });
};

const deleteVendor = async (vendorId, transaction = null) => {
  return Vendor.destroy({
    where: {
      VendorID: vendorId,
    },
    transaction,
  });
};

module.exports = {
  createVendor,
  createVendorGST,
  findVendorByPAN,
  findVendorByCode,
  findGST,
  getVendorById,
  getAllVendors,
  updateVendor,
  deleteVendorGST,
  deleteVendor,
};