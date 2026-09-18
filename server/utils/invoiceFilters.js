const { Op } = require("sequelize");

/**
 * Builds a Sequelize `where` clause for InvoiceHeader from structured query
 * params (date range, vendor, plant/location, status). Shared by the
 * Invoice List endpoint and the Reports export endpoint so this filtering
 * logic exists in exactly one place.
 *
 * @param {object} query - Raw request query params.
 * @param {string} [query.from] - Start date (YYYY-MM-DD), inclusive.
 * @param {string} [query.to] - End date (YYYY-MM-DD), inclusive.
 * @param {string|number} [query.vendorId] - Filter to a single VendorID.
 * @param {string|number} [query.plantId] - Filter to a single PlantID.
 * @param {string|number} [query.statusId] - Filter to a single InvoiceStatusID.
 * @returns {object} A Sequelize-compatible `where` object (possibly empty).
 */
const buildInvoiceFilterWhere = (query = {}) => {
  const { from, to, vendorId, plantId, statusId } = query;
  const clauses = [];

  if (from || to) {
    const dateRange = {};
    if (from) dateRange[Op.gte] = from;
    if (to) dateRange[Op.lte] = to;
    clauses.push({ InvoiceDate: dateRange });
  }

  if (vendorId) {
    clauses.push({ VendorID: vendorId });
  }

  if (plantId) {
    clauses.push({ PlantID: plantId });
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
