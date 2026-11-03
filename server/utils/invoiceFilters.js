const { Op } = require("sequelize");
const sequelize = require("../config/database");

// Date the from / to range is applied to (?dateField=). CreatedDate is the
// UploadedDate column - the date the invoice was entered.
const DATE_FIELD_COLUMNS = {
  createdDate: "UploadedDate",
  invoiceDate: "InvoiceDate",
  lrDate: "LRDate",
};
const DEFAULT_DATE_FIELD = "invoiceDate";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Compares only the date part, so a datetime column (UploadedDate) still
// includes the whole "to" day.
const buildDateRangeClause = (dateField, from, to) => {
  const column = DATE_FIELD_COLUMNS[dateField] || DATE_FIELD_COLUMNS[DEFAULT_DATE_FIELD];
  const dateOf = sequelize.cast(sequelize.col(`InvoiceHeader.${column}`), "DATE");
  const clauses = [];
  if (from) clauses.push(sequelize.where(dateOf, Op.gte, from));
  if (to) clauses.push(sequelize.where(dateOf, Op.lte, to));
  return { [Op.and]: clauses };
};

const toDateOnly = (value) => (DATE_ONLY_PATTERN.test(String(value || "")) ? String(value) : null);

const toPositiveInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

// An invoice belongs to a location through its LocationID. Older invoices
// saved without a LocationID are matched through their PlantID instead,
// the same rule invoiceAccess.js uses for location permissions.
const buildLocationClause = (locationId) => ({
  [Op.or]: [
    { LocationID: locationId },
    {
      [Op.and]: [
        { LocationID: null },
        { PlantID: { [Op.in]: sequelize.literal(`(SELECT PlantID FROM Plants WHERE LocationID = ${locationId})`) } },
      ],
    },
  ],
});

/**
 * Builds a Sequelize `where` clause for InvoiceHeader from structured query
 * params (date range, vendor, plant/location, status). Shared by the
 * Invoice List endpoint and the Reports export endpoint so this filtering
 * logic exists in exactly one place.
 *
 * @param {object} query - Raw request query params.
 * @param {string} [query.from] - Start date (YYYY-MM-DD), inclusive.
 * @param {string} [query.to] - End date (YYYY-MM-DD), inclusive.
 * @param {string} [query.dateField] - createdDate | invoiceDate (default) | lrDate.
 * @param {string|number} [query.vendorId] - Filter to a single VendorID.
 * @param {string|number} [query.plantId] - Filter to a single PlantID.
 * @param {string|number} [query.locationId] - Filter to a single Location (PlantLocations).
 * @param {string|number} [query.statusId] - Filter to a single InvoiceStatusID.
 * @returns {object} A Sequelize-compatible `where` object (possibly empty).
 */
const buildInvoiceFilterWhere = (query = {}) => {
  const { vendorId, plantId, statusId } = query;
  const from = toDateOnly(query.from);
  const to = toDateOnly(query.to);
  const locationId = toPositiveInt(query.locationId);
  const clauses = [];

  if (from || to) {
    clauses.push(buildDateRangeClause(query.dateField, from, to));
  }

  if (vendorId) {
    clauses.push({ VendorID: vendorId });
  }

  if (plantId) {
    clauses.push({ PlantID: plantId });
  }

  if (locationId) {
    clauses.push(buildLocationClause(locationId));
  }

  if (statusId) {
    clauses.push({ InvoiceStatusID: statusId });
  }

  if (clauses.length === 0) {
    return {};
  }

  return { [Op.and]: clauses };
};

module.exports = { buildInvoiceFilterWhere };
