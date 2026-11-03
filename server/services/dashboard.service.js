const { Op, fn, col, literal } = require("sequelize");
const {
  InvoiceHeader,
  InvoiceVerification,
  Vendor,
  ContractMaster,
  CustomerMaster,
} = require("../models");
const {
  VERIFICATION_STATUS_DISCREPANCY,
} = require("../constants/invoiceStatus");
const { CONTRACT_STATUS } = require("../constants/contractStatus");
const { getInvoiceAccessWhere } = require("../utils/invoiceAccess");

const VENDOR_DISTRIBUTION_LIMIT = 10;

const buildDateRangeWhere = (from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return { InvoiceDate: range };
};

const combineWhere = (dateWhere, accessWhere) =>
  accessWhere ? { [Op.and]: [dateWhere, accessWhere] } : dateWhere;

const getSummaryTotals = async (dateWhere, accessWhere) => {
  const rows = await InvoiceHeader.findAll({
    attributes: [
      [fn("COUNT", col("InvoiceID")), "totalInvoices"],
    ],
    where: combineWhere(dateWhere, accessWhere),
    raw: true,
  });
  return { totalInvoices: Number(rows[0]?.totalInvoices || 0) };
};

const getTotalVendorCount = async () => await Vendor.count();
const getTotalCustomerCount = async () => await CustomerMaster.count();

const getActiveContractCount = async () => {
  return await ContractMaster.count({
    where: { Status: CONTRACT_STATUS.ACTIVE },
  });
};

const getDiscrepancyCount = async (dateWhere, accessWhere) => {
  return await InvoiceVerification.count({
    where: { VerificationStatus: VERIFICATION_STATUS_DISCREPANCY },
    include: [
      {
        model: InvoiceHeader,
        as: "invoice",
        attributes: [],
        where: combineWhere(dateWhere, accessWhere),
        required: true,
      },
    ],
  });
};

// 1. Month-wise Invoices Count
const getMonthlyTrend = async (dateWhere, accessWhere) => {
  const rows = await InvoiceHeader.findAll({
    attributes: [
      [fn("FORMAT", col("InvoiceDate"), "yyyy-MM"), "month"],
      [fn("COUNT", col("InvoiceID")), "count"],
    ],
    where: combineWhere(dateWhere, accessWhere),
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
const getMonthlyDiscrepancies = async (dateWhere, accessWhere) => {
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
        where: combineWhere(dateWhere, accessWhere),
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
const getCombinedTrend = async (dateWhere, accessWhere) => {
  const invoices = await getMonthlyTrend(dateWhere, accessWhere);
  const discrepancies = await getMonthlyDiscrepancies(dateWhere, accessWhere);

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
const getVendorDistribution = async (dateWhere, accessWhere) => {
  const rows = await InvoiceHeader.findAll({
    attributes: [
      [col("InvoiceHeader.VendorID"), "VendorID"],
      [fn("COUNT", col("InvoiceHeader.InvoiceID")), "count"],
    ],
    where: combineWhere(dateWhere, accessWhere),
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

const getDashboardSummary = async ({ from, to, user }) => {
  const dateWhere = buildDateRangeWhere(from, to);
  const accessWhere = await getInvoiceAccessWhere(user);

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
    getSummaryTotals(dateWhere, accessWhere),
    getTotalVendorCount(),
    getTotalCustomerCount(),
    getActiveContractCount(),
    getDiscrepancyCount(dateWhere, accessWhere),
    getMonthlyTrend(dateWhere, accessWhere),
    getMonthlyDiscrepancies(dateWhere, accessWhere),
    getCombinedTrend(dateWhere, accessWhere),
    getVendorDistribution(dateWhere, accessWhere),
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