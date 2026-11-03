// Contract types supported by the Contract Master and the Add Invoice flow.
// Every contract and every invoice belongs to exactly one type; the type
// decides which Excel template is imported and how an invoice is audited.

const CONTRACT_TYPES = {
  // Per-trip freight from the plant to a destination, by vehicle size.
  // This is the original contract layout (ARC, EKTA FTL, NRAB, PRC).
  FTL_OUTBOUND: "FTL_OUTBOUND",
  // Per-MT freight from a pick-up location to the plant, by vehicle size
  // (Sai Waste, Maharashtra Gujarat Transport, SS tank contracts).
  FTL_INBOUND: "FTL_INBOUND",
  // Per-KG freight to a destination with docket slab / ODA charges
  // (Lalji Mulji Transport).
  PTL_OUTBOUND: "PTL_OUTBOUND",
  // Per-KG freight by delivery zone and weight band, plus ODA matrix,
  // docket and FOV charges (Ekta Express part load).
  PART_LOAD: "PART_LOAD",
};

const DEFAULT_CONTRACT_TYPE = CONTRACT_TYPES.FTL_OUTBOUND;

// Invoice types that have no contract. An Ad-Hoc invoice is never audited
// against a contract rate and always needs a supporting document.
const INVOICE_ONLY_TYPES = {
  AD_HOC: "AD_HOC",
};

const CONTRACT_TYPE_LABELS = {
  [CONTRACT_TYPES.FTL_OUTBOUND]: "FTL Outbound (Per Trip)",
  [CONTRACT_TYPES.FTL_INBOUND]: "FTL Inbound (Per MT)",
  [CONTRACT_TYPES.PTL_OUTBOUND]: "PTL Outbound (Per KG)",
  [CONTRACT_TYPES.PART_LOAD]: "Part Load (Zone-wise Per KG)",
  [INVOICE_ONLY_TYPES.AD_HOC]: "Ad-Hoc",
};

// Contract types whose invoice weight is entered in KG instead of MT.
const KG_BASED_CONTRACT_TYPES = [CONTRACT_TYPES.PTL_OUTBOUND, CONTRACT_TYPES.PART_LOAD];

// Codes of the rows stored in ContractCharges. Charges with an audit role
// are compared with the invoice; the rest are kept for reference only.
const CHARGE_CODES = {
  DETENTION_PER_DAY: "DETENTION_PER_DAY",
  LOADING_UNLOADING: "LOADING_UNLOADING",
  MIN_CHARGEABLE_WEIGHT_KG: "MIN_CHARGEABLE_WEIGHT_KG",
  MAX_WEIGHT_PER_LR_KG: "MAX_WEIGHT_PER_LR_KG",
  DOCKET_SLAB: "DOCKET_SLAB",
  DOCKET_CHARGE: "DOCKET_CHARGE",
  FOV_CHARGE: "FOV_CHARGE",
  ODA_FLAT: "ODA_FLAT",
  ODA_MATRIX: "ODA_MATRIX",
  ODA_MINIMUM: "ODA_MINIMUM",
  // Distance (KM) of an ODA category from the ODA MATRIX sheet. Reference
  // only: Amount is always 0 and the distance text is kept in Remarks, so
  // a category without rates (D - on approval) still keeps its distance.
  ODA_DISTANCE: "ODA_DISTANCE",
  GODOWN_DELIVERY_PER_KG: "GODOWN_DELIVERY_PER_KG",
  CASH_RECEIPT_PER_GC: "CASH_RECEIPT_PER_GC",
  OTHER_CHARGES_PER_GC: "OTHER_CHARGES_PER_GC",
  DEMURRAGE_PER_KG: "DEMURRAGE_PER_KG",
  HAMALI_VARAI: "HAMALI_VARAI",
};

// ODA distance categories of the part load ODA matrix. Category D is
// "on approval" in the contract, so it never auto-approves.
const ODA_CATEGORIES = ["A", "B", "C", "D"];
const ODA_APPROVAL_CATEGORY = "D";

const isValidContractType = (value) => Object.values(CONTRACT_TYPES).includes(value);

const normalizeContractType = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return isValidContractType(normalized) ? normalized : null;
};

// Contract types plus the invoice-only types (InvoiceHeader.ContractType).
const normalizeInvoiceType = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return isValidContractType(normalized) || Object.values(INVOICE_ONLY_TYPES).includes(normalized) ? normalized : null;
};

const isAdHocInvoiceType = (value) => value === INVOICE_ONLY_TYPES.AD_HOC;

module.exports = {
  CONTRACT_TYPES,
  DEFAULT_CONTRACT_TYPE,
  INVOICE_ONLY_TYPES,
  CONTRACT_TYPE_LABELS,
  KG_BASED_CONTRACT_TYPES,
  CHARGE_CODES,
  ODA_CATEGORIES,
  ODA_APPROVAL_CATEGORY,
  isValidContractType,
  normalizeContractType,
  normalizeInvoiceType,
  isAdHocInvoiceType,
};
