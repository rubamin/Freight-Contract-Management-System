const { Op, fn, col, literal } = require("sequelize");
const {
  InvoiceHeader,
  InvoiceVerification,
  StatusMaster,
  Vendor,
  ContractMaster,
  Customer, // Make sure Customer model is imported correctly
} = require("../models");
const {
  VERIFICATION_STATUS_DISCREPANCY,
} = require("../constants/invoiceStatus");
const { CONTRACT_STATUS } = require("../constants/contractStatus");

const VENDOR_DISTRIBUTION_LIMIT = 10;

const buildDateRangeWhere = (from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return { InvoiceDate: range };
};

const getSummaryTotals = async (dateWhere) => {
  const rows = await InvoiceHeader.findAll({
    attributes: [
      [fn("COUNT", col("InvoiceID")), "totalInvoices"],
    ],
    where: dateWhere,
    raw: true,
  });
  return { totalInvoices: Number(rows[0]?.totalInvoices || 0) };
};

const getTotalVendorCount = async () => await Vendor.count();
const getTotalCustomerCount = async () => Customer ? await Customer.count() : 0;

const getActiveContractCount = async () => {
  return await ContractMaster.count({
    where: { Status: CONTRACT_STATUS.ACTIVE },
  });
};

const getDiscrepancyCount = async (dateWhere) => {
  return await InvoiceVerification.count({
    where: { VerificationStatus: VERIFICATION_STATUS_DISCREPANCY },
    include: [
      {
        model: InvoiceHeader,
        as: "invoice",
        attributes: [],
        where: dateWhere,
        required: true,
      },
    ],
  });
};

// 1. Month-wise Invoices Count
const getMonthlyTrend = async (dateWhere) => {
  const rows = await InvoiceHeader.findAll({
    attributes: [
      [fn("FORMAT", col("InvoiceDate"), "yyyy-MM"), "month"],
      [fn("COUNT", col("InvoiceID")), "count"],
    ],
    where: dateWhere,
    group: [literal("FORMAT([InvoiceDate], 'yyyy-MM')")],
    order: [[literal("FORMAT([InvoiceDate], 'yyyy-MM')"), "ASC"]],
    raw: true,
  });

  return rows.map((row) => ({
    month: row.month,
    count: Number(row.count || 0),
  }));
};

// 2. Month-wise Discrepancies Count
const getMonthlyDiscrepancies = async (dateWhere) => {
  const rows = await InvoiceVerification.findAll({
    attributes: [
      [fn("FORMAT", col("invoice.InvoiceDate"), "yyyy-MM"), "month"],
      [fn("COUNT", col("VerificationID")), "count"],
    ],
    where: { VerificationStatus: VERIFICATION_STATUS_DISCREPANCY },
    include: [
      {
        model: InvoiceHeader,
        as: "invoice",
        attributes: [],
        where: dateWhere,
        required: true,
      },
    ],
    group: [literal("FORMAT([invoice].[InvoiceDate], 'yyyy-MM')")],
    order: [[literal("FORMAT([invoice].[InvoiceDate], 'yyyy-MM')"), "ASC"]],
    raw: true,
    subQuery: false,
  });

  return rows.map((row) => ({
    month: row.month,
    count: Number(row.count || 0),
  }));
};

// 3. Combined Total Invoices and Total Discrepancies
const getCombinedTrend = async (dateWhere) => {
  const invoices = await getMonthlyTrend(dateWhere);
  const discrepancies = await getMonthlyDiscrepancies(dateWhere);

  const map = {};
  invoices.forEach(item => {
    map[item.month] = { month: item.month, invoices: item.count, discrepancies: 0 };
  });
  discrepancies.forEach(item => {
    if (!map[item.month]) {
      map[item.month] = { month: item.month, invoices: 0, discrepancies: item.count };
    } else {
      map[item.month].discrepancies = item.count;
    }
  });

  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
};

// 4. Top Vendors by Invoice Count
const getVendorDistribution = async (dateWhere) => {
  const rows = await InvoiceHeader.findAll({
    attributes: [
      [col("InvoiceHeader.VendorID"), "VendorID"],
      [fn("COUNT", col("InvoiceHeader.InvoiceID")), "count"],
    ],
    where: dateWhere,
    include: [
      {
        model: Vendor,
        as: "vendor",
        attributes: ["VendorName"],
      },
    ],
    group: ["InvoiceHeader.VendorID", "vendor.VendorID", "vendor.VendorName"],
    subQuery: false,
    order: [[literal("count"), "DESC"]],
    raw: true,
  });

  return rows
    .slice(0, VENDOR_DISTRIBUTION_LIMIT)
    .map((row) => ({
      vendorId: row.VendorID,
      vendorName: row["vendor.VendorName"] || "Unknown",
      count: Number(row.count || 0),
    }));
};

const getDashboardSummary = async ({ from, to }) => {
  const dateWhere = buildDateRangeWhere(from, to);

  const [
    { totalInvoices },
    totalVendors,
    totalCustomers,
    activeContractCount,
    discrepancyCount,
    monthlyTrend,
    monthlyDiscrepancies,
    combinedTrend,
    vendorDistribution,
  ] = await Promise.all([
    getSummaryTotals(dateWhere),
    getTotalVendorCount(),
    getTotalCustomerCount(),
    getActiveContractCount(),
    getDiscrepancyCount(dateWhere),
    getMonthlyTrend(dateWhere),
    getMonthlyDiscrepancies(dateWhere),
    getCombinedTrend(dateWhere),
    getVendorDistribution(dateWhere),
  ]);

  return {
    totalInvoices,
    totalVendors,
    totalCustomers,
    activeContractCount,
    discrepancyCount,
    monthlyTrend,
    monthlyDiscrepancies,
    combinedTrend,
    vendorDistribution,
  };
};

module.exports = { getDashboardSummary };