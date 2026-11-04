import { CONTRACT_TYPES, ODA_CATEGORY_OPTIONS } from "./contractTypes";

// Editable sheets of the FTL Inbound, PTL Outbound and Part Load contract
// types on the Edit Contract page. They mirror the sheets of each type's
// Excel template - keep in sync with server/constants/contractTypeTemplates.js.

export const SHEET_IDS = {
  RATE_MATRIX: "rateMatrix",
  DOCKET_SLABS: "docketSlabs",
  ZONE_RATES: "zoneRates",
  ODA_MATRIX: "odaMatrix",
  CHARGES: "charges",
};

export const CHARGE_CODES = {
  DOCKET_SLAB: "DOCKET_SLAB",
  ODA_MATRIX: "ODA_MATRIX",
  ODA_MINIMUM: "ODA_MINIMUM",
  ODA_DISTANCE: "ODA_DISTANCE",
};

// Fixed charges of the CHARGES sheet per contract type, in template order.
export const CHARGE_DEFINITIONS_BY_TYPE = {
  [CONTRACT_TYPES.FTL_INBOUND]: [
    { code: "DETENTION_PER_DAY", label: "Detention per day" },
    { code: "LOADING_UNLOADING", label: "Loading / Unloading" },
  ],
  [CONTRACT_TYPES.PTL_OUTBOUND]: [
    { code: "MIN_CHARGEABLE_WEIGHT_KG", label: "Minimum chargeable weight (KG)" },
    { code: "MAX_WEIGHT_PER_LR_KG", label: "Maximum weight per LR (KG)" },
    { code: "ODA_FLAT", label: "ODA door delivery per location" },
    { code: "GODOWN_DELIVERY_PER_KG", label: "Godown delivery hamali per KG" },
    { code: "CASH_RECEIPT_PER_GC", label: "Cash receipt per GC" },
    { code: "OTHER_CHARGES_PER_GC", label: "Other charges per GC" },
    { code: "DEMURRAGE_PER_KG", label: "Demurrage per KG" },
    { code: "HAMALI_VARAI", label: "Hamali / Varai" },
    { code: "DETENTION_PER_DAY", label: "Detention per day" },
  ],
  [CONTRACT_TYPES.PART_LOAD]: [
    { code: "DOCKET_CHARGE", label: "Docket charge per docket" },
    { code: "FOV_CHARGE", label: "FOV charge per docket" },
    { code: "MIN_CHARGEABLE_WEIGHT_KG", label: "Minimum chargeable weight (KG)" },
    { code: "DETENTION_PER_DAY", label: "Detention per day" },
  ],
};

// Special rows of the ODA MATRIX sheet (the rest are weight ranges),
// labelled exactly as in the Part Load template.
export const ODA_DISTANCE_ROW = "DISTANCE (KM)";
export const ODA_MINIMUM_ROW = "MINIMUM (INR)";

// ODA category that is "on approval" in the contract - normally no rates.
export const ODA_APPROVAL_CATEGORY = "D";

// Cell input kinds of a sheet column.
export const CELL_INPUTS = {
  TEXT: "text",
  NUMBER: "number",
  DESTINATION: "destination",
  READ_ONLY: "readOnly",
};

const column = (key, label, input = CELL_INPUTS.TEXT, extra = {}) => ({ key, label, input, ...extra });

const CHARGES_SHEET = {
  id: SHEET_IDS.CHARGES,
  title: "Charges",
  hint: "Blank amount = paid at actual.",
  fixedColumns: [column("label", "Charge", CELL_INPUTS.READ_ONLY, { minWidth: 240 })],
  valueColumns: [column("amount", "Amount (INR)")],
  endColumns: [column("remarks", "Remarks", CELL_INPUTS.TEXT, { minWidth: 200 })],
  canAddRows: false,
};

const ODA_VALUE_COLUMNS = ODA_CATEGORY_OPTIONS.map((category) =>
  column(category, category === ODA_APPROVAL_CATEGORY ? `${category} (On approval)` : category));

// Sheets shown per contract type, in tab order. valueColumns listed here
// are fixed; the others are built from the contract's data (and can be
// extended with addColumn).
export const SHEET_CONFIGS_BY_TYPE = {
  [CONTRACT_TYPES.FTL_INBOUND]: [
    {
      id: SHEET_IDS.RATE_MATRIX,
      title: "Rate Matrix",
      hint: "Freight per MT by pick up location and vehicle size.",
      fixedColumns: [
        column("destination", "Pick Up Location", CELL_INPUTS.DESTINATION, { minWidth: 200, required: true }),
        column("deliveryLocation", "Delivery Location", CELL_INPUTS.TEXT, { minWidth: 160 }),
        column("distanceKm", "Distance KM", CELL_INPUTS.NUMBER),
        column("transitDays", "TT Days", CELL_INPUTS.NUMBER),
      ],
      endColumns: [],
      canAddRows: true,
      addRowLabel: "Add Pick Up Location",
      addColumn: { label: "Add Vehicle Size", placeholder: "e.g. 25 MT or 20-21 MT", kind: "vehicleSlab" },
    },
    CHARGES_SHEET,
  ],
  [CONTRACT_TYPES.PTL_OUTBOUND]: [
    {
      id: SHEET_IDS.RATE_MATRIX,
      title: "Rate Matrix",
      hint: "Freight per KG by destination.",
      fixedColumns: [column("destination", "Destination", CELL_INPUTS.DESTINATION, { minWidth: 220, required: true })],
      valueColumns: [column("rate", "Rate / KG")],
      endColumns: [],
      canAddRows: true,
      addRowLabel: "Add Destination",
    },
    {
      id: SHEET_IDS.DOCKET_SLABS,
      title: "Docket Slabs",
      hint: "Blank TO KG = and above.",
      fixedColumns: [column("fromKg", "From KG", CELL_INPUTS.NUMBER), column("toKg", "To KG", CELL_INPUTS.NUMBER)],
      valueColumns: [column("charge", "Charge (INR)")],
      endColumns: [],
      canAddRows: true,
      addRowLabel: "Add Slab",
    },
    CHARGES_SHEET,
  ],
  [CONTRACT_TYPES.PART_LOAD]: [
    {
      id: SHEET_IDS.ZONE_RATES,
      title: "Zone Rates",
      hint: "Freight per KG by zone and weight band. Coverage lists cities / states separated by '/'.",
      fixedColumns: [
        column("zone", "Zone", CELL_INPUTS.TEXT, { minWidth: 110, required: true }),
        column("coverage", "Coverage", CELL_INPUTS.TEXT, { minWidth: 260, required: true }),
      ],
      endColumns: [],
      canAddRows: true,
      addRowLabel: "Add Zone",
      addColumn: { label: "Add Weight Band", placeholder: "e.g. UP TO 1000 KG, 1001-5003 KG, ABOVE 5003 KG", kind: "kgBand" },
    },
    {
      id: SHEET_IDS.ODA_MATRIX,
      title: "ODA Matrix",
      hint: `ODA in addition to freight (INR / KG). Weight rows like '0-350' or '1501 ABOVE'. Category ${ODA_APPROVAL_CATEGORY} is 'on approval' - such invoices always need approval.`,
      fixedColumns: [column("weight", "Weight (KG)", CELL_INPUTS.TEXT, { minWidth: 160, required: true })],
      valueColumns: ODA_VALUE_COLUMNS,
      endColumns: [],
      canAddRows: true,
      addRowLabel: "Add Weight Row",
    },
    CHARGES_SHEET,
  ],
};

export const getSheetConfigs = (contractType) => SHEET_CONFIGS_BY_TYPE[contractType] || [];
