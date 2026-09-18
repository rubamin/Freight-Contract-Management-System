// Shared ContractMaster.Status value constants, so the same literal strings
// aren't duplicated across the contract CRUD flow and the dashboard
// aggregations that count contracts by status.
const CONTRACT_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
};

module.exports = { CONTRACT_STATUS };
