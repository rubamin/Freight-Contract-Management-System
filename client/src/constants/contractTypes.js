// Contract types - keep in sync with server/constants/contractTypes.js.
// Every contract and invoice belongs to one type; the type decides the
// Excel template of the contract and the columns of the invoice grid.

export const CONTRACT_TYPES = {
  FTL_OUTBOUND: "FTL_OUTBOUND",
  FTL_INBOUND: "FTL_INBOUND",
  PTL_OUTBOUND: "PTL_OUTBOUND",
  PART_LOAD: "PART_LOAD",
};

export const DEFAULT_CONTRACT_TYPE = CONTRACT_TYPES.FTL_OUTBOUND;

// Invoice types without a contract - offered on Add Invoice only.
export const INVOICE_ONLY_TYPES = {
  AD_HOC: "AD_HOC",
};

export const isAdHocInvoiceType = (value) => value === INVOICE_ONLY_TYPES.AD_HOC;

const templateUrl = (fileName) => `${import.meta.env.BASE_URL}templates/${fileName}`;

export const CONTRACT_TYPE_OPTIONS = [
  {
    value: CONTRACT_TYPES.FTL_OUTBOUND,
    label: "FTL Outbound (Per Trip)",
    description: "Plant to destination, freight per trip by vehicle size.",
    example: "ARC Logistics, NRAB, Premier Road Carrier, Ekta FTL",
    templateFileName: "Contract_RateMatrix_Import_Template.xlsx",
  },
  {
    value: CONTRACT_TYPES.FTL_INBOUND,
    label: "FTL Inbound (Per MT)",
    description: "Pick-up location to plant, freight per MT by vehicle size.",
    example: "Sai Waste, Maharashtra Gujarat Transport, SS Tank",
    templateFileName: "Contract_FTL_Inbound_Template.xlsx",
  },
  {
    value: CONTRACT_TYPES.PTL_OUTBOUND,
    label: "PTL Outbound (Per KG)",
    description: "Freight per KG by destination, with docket slab and ODA charges.",
    example: "Lalji Mulji Transport",
    templateFileName: "Contract_PTL_Outbound_Template.xlsx",
  },
  {
    value: CONTRACT_TYPES.PART_LOAD,
    label: "Part Load (Zone-wise Per KG)",
    description: "Freight per KG by delivery zone and weight band, with ODA matrix, docket and FOV charges.",
    example: "Ekta Express Part Load",
    templateFileName: "Contract_Part_Load_Template.xlsx",
  },
];

// Add Invoice offers the contract types plus Ad-Hoc.
export const INVOICE_TYPE_OPTIONS = [
  ...CONTRACT_TYPE_OPTIONS,
  {
    value: INVOICE_ONLY_TYPES.AD_HOC,
    label: "Ad-Hoc",
    description: "One-off freight without a contract. Always goes for approval and needs at least one attachment.",
    example: "Spot hire, emergency dispatch",
  },
];

export const getContractTypeOption = (value) =>
  INVOICE_TYPE_OPTIONS.find((option) => option.value === value)
  || INVOICE_TYPE_OPTIONS.find((option) => option.value === DEFAULT_CONTRACT_TYPE);

export const getContractTypeLabel = (value) => getContractTypeOption(value).label;

export const getContractTemplate = (value) => {
  const { templateFileName } = getContractTypeOption(value);
  return { url: templateUrl(templateFileName), fileName: templateFileName };
};

export const ODA_CATEGORY_OPTIONS = ["A", "B", "C", "D"];

// --- Add Invoice grid per contract type ---
// extraFields are rendered after "Extra Chg" in this order. FTL Outbound
// has none, so its grid stays exactly as before.
//   kind:      "number" (default) | "integer" | "select"
//   isCharge:  added to the row total
//   role:      "rate" / "chargedWeight" - drive the freight auto-calculation
const field = (key, label, extra = {}) => ({ field: key, label, kind: "number", ...extra });

const PACKAGES = field("packages", "Pkg / ART", { kind: "integer", minWidth: 90 });
const CHARGED_WEIGHT = field("chargedWeight", "Charged Wt (KG)", { role: "chargedWeight" });
const RATE_PER_KG = field("billedRate", "Rate / KG", { role: "rate" });
const DOCKET = field("docketCharge", "Docket Chg", { isCharge: true });
const ODA = field("odaCharge", "ODA Chg", { isCharge: true });

export const INVOICE_TYPE_CONFIG = {
  [CONTRACT_TYPES.FTL_OUTBOUND]: {
    showVehicleType: true,
    cityLabel: "To *",
    citySelectOnly: true,
    weightLabel: "Actual Wt (MT/KG, optional)",
    weightRequired: false,
    weightInKg: false,
    extraFields: [],
  },
  [CONTRACT_TYPES.FTL_INBOUND]: {
    showVehicleType: true,
    cityLabel: "Pick Up From *",
    citySelectOnly: true,
    weightLabel: "Qty (MT) *",
    weightRequired: true,
    weightInKg: false,
    extraFields: [
      field("billedRate", "Rate (PMT)", { role: "rate" }),
      field("loadingCharge", "Loading Chg", { isCharge: true }),
    ],
  },
  [CONTRACT_TYPES.PTL_OUTBOUND]: {
    showVehicleType: false,
    cityLabel: "Destination City *",
    citySelectOnly: true,
    weightLabel: "Actual Wt (KG) *",
    weightRequired: true,
    weightInKg: true,
    extraFields: [
      PACKAGES,
      CHARGED_WEIGHT,
      RATE_PER_KG,
      field("docketCharge", "Docket / Bilty Chg", { isCharge: true }),
      ODA,
      field("loadingCharge", "Hamali / Varai", { isCharge: true }),
      field("otherCharge", "Other Chg", { isCharge: true }),
    ],
  },
  [CONTRACT_TYPES.PART_LOAD]: {
    showVehicleType: false,
    cityLabel: "Delivery City *",
    // Zones cover whole states, so a delivery city does not have to exist
    // in the Destination Master yet.
    citySelectOnly: false,
    weightLabel: "Actual Wt (KG) *",
    weightRequired: true,
    weightInKg: true,
    extraFields: [
      PACKAGES,
      CHARGED_WEIGHT,
      RATE_PER_KG,
      field("odaCategory", "ODA Category", { kind: "select", options: ODA_CATEGORY_OPTIONS, minWidth: 110 }),
      ODA,
      field("fovCharge", "FOV Chg", { isCharge: true }),
      DOCKET,
    ],
  },
  // Ad-Hoc: only the fields common to every type. No contract, so the city
  // is free text and vehicle type / weight are optional.
  [INVOICE_ONLY_TYPES.AD_HOC]: {
    showVehicleType: true,
    vehicleTypeRequired: false,
    usesContract: false,
    cityLabel: "To *",
    citySelectOnly: false,
    weightLabel: "Actual Wt (MT/KG, optional)",
    weightRequired: false,
    weightInKg: false,
    extraFields: [],
  },
};

export const getInvoiceTypeConfig = (value) =>
  INVOICE_TYPE_CONFIG[value] || INVOICE_TYPE_CONFIG[DEFAULT_CONTRACT_TYPE];

// Server column -> grid field of every charge a typed invoice can carry.
export const INVOICE_TYPE_CHARGE_COLUMNS = {
  DocketCharges: "docketCharge",
  ODACharges: "odaCharge",
  FOVCharges: "fovCharge",
  LoadingCharges: "loadingCharge",
  OtherCharges: "otherCharge",
};

// Sum of the typed charges stored on an invoice record (0 for FTL Outbound).
export const getInvoiceTypeChargesTotal = (invoice) =>
  Object.keys(INVOICE_TYPE_CHARGE_COLUMNS).reduce((sum, column) => sum + (parseFloat(invoice?.[column]) || 0), 0);
