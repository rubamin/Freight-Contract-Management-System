// Mirrors server/constants/partyTypes.js - keep both in sync.
// Inbound invoices are billed against a supplier, outbound against a customer.
import { CONTRACT_TYPES } from "./contractTypes";

export const PARTY_TYPES = {
  CUSTOMER: "CUSTOMER",
  SUPPLIER: "SUPPLIER",
};

export const DEFAULT_PARTY_TYPE = PARTY_TYPES.CUSTOMER;

export const PARTY_TYPE_OPTIONS = [
  { value: PARTY_TYPES.CUSTOMER, label: "Customer" },
  { value: PARTY_TYPES.SUPPLIER, label: "Supplier" },
];

const INBOUND_CONTRACT_TYPES = [CONTRACT_TYPES.FTL_INBOUND];

export const getPartyTypeForContractType = (contractType) =>
  INBOUND_CONTRACT_TYPES.includes(contractType) ? PARTY_TYPES.SUPPLIER : PARTY_TYPES.CUSTOMER;

export const getPartyLabel = (partyType) =>
  PARTY_TYPE_OPTIONS.find((option) => option.value === partyType)?.label || "Customer";

// "Supplier" on inbound invoices, "Customer" on every outbound type.
export const getPartyLabelForContractType = (contractType) =>
  getPartyLabel(getPartyTypeForContractType(contractType));

// Key of the suggestions list (invoice-suggestions API) for a contract type.
export const getPartyListKey = (contractType) =>
  getPartyTypeForContractType(contractType) === PARTY_TYPES.SUPPLIER ? "suppliers" : "customers";
