// Party types of the Customer / Supplier Master - keep in sync with
// client/src/constants/partyTypes.js. Inbound invoices are billed against
// a supplier (goods come in), every outbound type against a customer.
const { CONTRACT_TYPES } = require("./contractTypes");

const PARTY_TYPES = {
  CUSTOMER: "CUSTOMER",
  SUPPLIER: "SUPPLIER",
};

const DEFAULT_PARTY_TYPE = PARTY_TYPES.CUSTOMER;

const PARTY_TYPE_LABELS = {
  [PARTY_TYPES.CUSTOMER]: "Customer",
  [PARTY_TYPES.SUPPLIER]: "Supplier",
};

const INBOUND_CONTRACT_TYPES = [CONTRACT_TYPES.FTL_INBOUND];

// Accepts "Supplier", "supplier", "SUPPLIER" (bulk upload, API); anything
// else is null so callers can reject or default it.
const normalizePartyType = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return Object.values(PARTY_TYPES).includes(normalized) ? normalized : null;
};

const getPartyTypeForContractType = (contractType) =>
  INBOUND_CONTRACT_TYPES.includes(contractType) ? PARTY_TYPES.SUPPLIER : PARTY_TYPES.CUSTOMER;

const getPartyLabelForContractType = (contractType) =>
  PARTY_TYPE_LABELS[getPartyTypeForContractType(contractType)];

module.exports = {
  PARTY_TYPES,
  DEFAULT_PARTY_TYPE,
  PARTY_TYPE_LABELS,
  normalizePartyType,
  getPartyTypeForContractType,
  getPartyLabelForContractType,
};
