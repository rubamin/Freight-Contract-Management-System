const { CONTRACT_TYPES, CHARGE_CODES, ODA_CATEGORIES } = require("../constants/contractTypes");
const { CHARGE_LABELS_BY_TYPE, RATE_DECIMALS, AMOUNT_DECIMALS } = require("../constants/contractTypeTemplates");
const { parseWeightSlab } = require("./weightSlab");

// Validates the rate sheets edited on the Edit Contract page of an
// FTL Inbound, PTL Outbound or Part Load contract. The result has the same
// shape as parseContractTypeWorkbook, so both paths are saved the same way.

const SHEET_NAMES = {
  RATE_MATRIX: "Rate Matrix",
  CHARGES: "Charges",
  ZONE_RATES: "Zone Rates",
};

// Charge codes stored as banded rows rather than one fixed amount.
const BANDED_CHARGE_CODES_BY_TYPE = {
  [CONTRACT_TYPES.FTL_INBOUND]: [],
  [CONTRACT_TYPES.PTL_OUTBOUND]: [CHARGE_CODES.DOCKET_SLAB],
  [CONTRACT_TYPES.PART_LOAD]: [CHARGE_CODES.ODA_MATRIX, CHARGE_CODES.ODA_MINIMUM, CHARGE_CODES.ODA_DISTANCE],
};

const ODA_CHARGE_CODES = [CHARGE_CODES.ODA_MATRIX, CHARGE_CODES.ODA_MINIMUM, CHARGE_CODES.ODA_DISTANCE];

const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";

const text = (value) => (isBlank(value) ? "" : String(value).trim());

// Returns null for a blank value, NaN for a value that is not a number.
const toDecimal = (value, decimals) => {
  if (isBlank(value)) return null;
  const number = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(number)) return NaN;
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
};

const isInvalidNumber = (value) => Number.isNaN(value);

const parseJson = (value, errors) => {
  if (typeof value !== "string") return value || {};
  try {
    return JSON.parse(value);
  } catch {
    errors.push("The edited contract sheets could not be read.");
    return {};
  }
};

const asArray = (value) => (Array.isArray(value) ? value : []);

// ---------------------------------------------------------------------
// Rate matrix (FTL Inbound / PTL Outbound)
// ---------------------------------------------------------------------

const parseRateRow = (row, contractType, errors) => {
  const destination = text(row.destination);
  const slabLabel = text(row.slabLabel);
  const where = `${SHEET_NAMES.RATE_MATRIX} '${destination || "(blank)"}'${slabLabel ? ` / '${slabLabel}'` : ""}`;

  if (!destination) {
    errors.push(`${SHEET_NAMES.RATE_MATRIX}: a row has rates but no destination.`);
    return null;
  }

  const slab = contractType === CONTRACT_TYPES.FTL_INBOUND ? parseWeightSlab(slabLabel) : null;
  if (contractType === CONTRACT_TYPES.FTL_INBOUND && !slab) {
    errors.push(`${where}: '${slabLabel}' is not a vehicle size. Use sizes like '25 MT'.`);
    return null;
  }

  const rate = toDecimal(row.rate, RATE_DECIMALS);
  const distanceKm = toDecimal(row.distanceKm, AMOUNT_DECIMALS);
  const transitDays = toDecimal(row.transitDays, 0);

  if (rate === null || isInvalidNumber(rate) || rate <= 0) {
    errors.push(`${where}: rate must be a number greater than 0.`);
    return null;
  }
  if (isInvalidNumber(distanceKm) || distanceKm < 0) {
    errors.push(`${where}: distance must be a positive number.`);
    return null;
  }
  if (isInvalidNumber(transitDays) || transitDays < 0) {
    errors.push(`${where}: transit days must be a positive whole number.`);
    return null;
  }

  return {
    destination,
    slab,
    rate,
    distanceKm,
    transitDays,
    deliveryLocation: text(row.deliveryLocation) || null,
  };
};

const parseRateRows = (rows, contractType, errors) => {
  const seen = new Set();
  const rateRows = [];
  rows.forEach((row) => {
    const parsed = parseRateRow(row, contractType, errors);
    if (!parsed) return;
    const key = `${parsed.destination.toUpperCase()}|${parsed.slab?.label || ""}`;
    if (seen.has(key)) {
      errors.push(`${SHEET_NAMES.RATE_MATRIX}: '${parsed.destination}' is listed more than once${parsed.slab ? ` for ${parsed.slab.label}` : ""}.`);
      return;
    }
    seen.add(key);
    rateRows.push(parsed);
  });
  if (!rateRows.length && !errors.length) errors.push(`${SHEET_NAMES.RATE_MATRIX}: at least one rate is required.`);
  return rateRows;
};

// ---------------------------------------------------------------------
// Charges (fixed charges, docket slabs, ODA matrix)
// ---------------------------------------------------------------------

const allowedChargeCodes = (contractType) => [
  ...Object.values(CHARGE_LABELS_BY_TYPE[contractType]),
  ...BANDED_CHARGE_CODES_BY_TYPE[contractType],
];

const parseCharge = (charge, contractType, errors) => {
  const code = text(charge.ChargeCode).toUpperCase();
  if (!allowedChargeCodes(contractType).includes(code)) {
    errors.push(`${SHEET_NAMES.CHARGES}: '${code || "(blank)"}' is not a charge of this contract type.`);
    return null;
  }

  const amount = toDecimal(charge.Amount, RATE_DECIMALS);
  const from = toDecimal(charge.WeightFromKG, AMOUNT_DECIMALS);
  const to = toDecimal(charge.WeightToKG, AMOUNT_DECIMALS);
  const category = text(charge.Category).toUpperCase() || null;

  if (amount === null || isInvalidNumber(amount) || amount < 0) {
    errors.push(`${SHEET_NAMES.CHARGES} '${code}': amount must be 0 or more.`);
    return null;
  }
  if (isInvalidNumber(from) || isInvalidNumber(to) || from < 0 || (from !== null && to !== null && to < from)) {
    errors.push(`${SHEET_NAMES.CHARGES} '${code}': FROM KG and TO KG must be numbers and TO KG cannot be below FROM KG.`);
    return null;
  }
  if (ODA_CHARGE_CODES.includes(code) && !ODA_CATEGORIES.includes(category)) {
    errors.push(`${SHEET_NAMES.CHARGES} '${code}': ODA category must be one of ${ODA_CATEGORIES.join(", ")}.`);
    return null;
  }
  if (code === CHARGE_CODES.DOCKET_SLAB && from === null) {
    errors.push(`${SHEET_NAMES.CHARGES}: every docket slab needs a FROM KG.`);
    return null;
  }

  return {
    ChargeCode: code,
    Category: category,
    WeightFromKG: from,
    WeightToKG: to,
    Amount: amount,
    Remarks: text(charge.Remarks) || null,
  };
};

const parseCharges = (rows, contractType, errors) => {
  const fixedCodes = Object.values(CHARGE_LABELS_BY_TYPE[contractType]);
  const seen = new Set();
  const charges = [];
  rows.forEach((row) => {
    const charge = parseCharge(row, contractType, errors);
    if (!charge) return;
    const key = [charge.ChargeCode, charge.Category, charge.WeightFromKG, charge.WeightToKG].join("|");
    if (seen.has(key) || (fixedCodes.includes(charge.ChargeCode) && seen.has(charge.ChargeCode))) {
      errors.push(`${SHEET_NAMES.CHARGES}: '${charge.ChargeCode}' is entered more than once.`);
      return;
    }
    seen.add(key);
    seen.add(charge.ChargeCode);
    charges.push(charge);
  });

  if (contractType === CONTRACT_TYPES.PTL_OUTBOUND && !charges.some((c) => c.ChargeCode === CHARGE_CODES.DOCKET_SLAB)) {
    errors.push("Docket Slabs: at least one docket slab is required.");
  }
  return charges;
};

// ---------------------------------------------------------------------
// Zone rates (Part Load)
// ---------------------------------------------------------------------

const parseZoneRate = (row, errors) => {
  const zone = text(row.ZoneCode);
  const coverage = text(row.Coverage);
  const where = `${SHEET_NAMES.ZONE_RATES} '${zone || "(blank)"}'`;
  if (!zone || !coverage) {
    errors.push(`${where}: ZONE and COVERAGE are both required.`);
    return null;
  }

  const from = toDecimal(row.WeightFromKG, AMOUNT_DECIMALS);
  const to = toDecimal(row.WeightToKG, AMOUNT_DECIMALS);
  const rate = toDecimal(row.RatePerKG, RATE_DECIMALS);
  if (from === null || isInvalidNumber(from) || from < 0 || isInvalidNumber(to) || (to !== null && to <= from)) {
    errors.push(`${where}: weight band is not valid.`);
    return null;
  }
  if (rate === null || isInvalidNumber(rate) || rate <= 0) {
    errors.push(`${where}: rate per KG must be a number greater than 0.`);
    return null;
  }
  return { ZoneCode: zone, Coverage: coverage, WeightFromKG: from, WeightToKG: to, RatePerKG: rate };
};

const parseZoneRates = (rows, errors) => {
  const seen = new Set();
  const zoneRates = [];
  rows.forEach((row) => {
    const zoneRate = parseZoneRate(row, errors);
    if (!zoneRate) return;
    const key = `${zoneRate.ZoneCode.toUpperCase()}|${zoneRate.WeightFromKG}`;
    if (seen.has(key)) {
      errors.push(`${SHEET_NAMES.ZONE_RATES}: zone '${zoneRate.ZoneCode}' has the same weight band twice.`);
      return;
    }
    seen.add(key);
    zoneRates.push(zoneRate);
  });
  if (!zoneRates.length && !errors.length) errors.push(`${SHEET_NAMES.ZONE_RATES}: at least one zone rate is required.`);
  return zoneRates;
};

// ---------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------

const parseContractSheets = (editedSheets, contractType) => {
  const errors = [];
  if (!CHARGE_LABELS_BY_TYPE[contractType]) {
    return { rateRows: [], charges: [], zoneRates: [], errors: ["This contract type cannot be edited as sheets."] };
  }

  const sheets = parseJson(editedSheets, errors);
  if (errors.length) return { rateRows: [], charges: [], zoneRates: [], errors };

  const isPartLoad = contractType === CONTRACT_TYPES.PART_LOAD;
  return {
    rateRows: isPartLoad ? [] : parseRateRows(asArray(sheets.rateRows), contractType, errors),
    zoneRates: isPartLoad ? parseZoneRates(asArray(sheets.zoneRates), errors) : [],
    charges: parseCharges(asArray(sheets.charges), contractType, errors),
    errors,
  };
};

module.exports = { parseContractSheets };
