const { CONTRACT_TYPES, CHARGE_CODES, ODA_CATEGORIES } = require("../constants/contractTypes");
const { HEADER_SEARCH_ROW_LIMIT, TABLE_END_PATTERN } = require("../constants/rateMatrixTemplate");
const {
  TYPE_TEMPLATE_SHEETS,
  REQUIRED_SHEETS_BY_TYPE,
  TYPE_TEMPLATE_HEADERS,
  UP_TO_KG_PATTERN,
  ABOVE_KG_PATTERN,
  RANGE_KG_PATTERN,
  ODA_RANGE_PATTERN,
  ODA_ABOVE_PATTERN,
  ODA_MINIMUM_ROW_KEYWORD,
  ODA_DISTANCE_ROW_KEYWORD,
  CHARGE_LABELS_BY_TYPE,
  RATE_DECIMALS,
  AMOUNT_DECIMALS,
} = require("../constants/contractTypeTemplates");
const { parseWeightSlab } = require("./weightSlab");
const {
  normalizeHeader,
  cellText,
  isBlank,
  parseAmountCell,
  readWorkbook,
  visibleSheetNames,
  findVisibleSheet,
  readVisibleRows,
  findRowIndex,
} = require("./excelSheetHelpers");

const TEMPLATE_HINT = "Please download the template for this contract type and copy your data into it.";

const isDistanceHeader = (header) => header.includes("DISTANCE") || header === "KM";

const isSerialHeader = (header) => /^SR\.?\s*NO\.?$/.test(header);

// Reads an amount cell and records an error when it is not a number.
const readAmount = (row, colIndex, decimals, sheet, rowIndex, sheetName, errors) => {
  if (colIndex === -1) return null;
  const { amount, invalid } = parseAmountCell(row[colIndex], decimals);
  if (invalid) {
    errors.push(`${sheetName} ${sheet.excelCol(colIndex)}${sheet.excelRow(rowIndex)}: '${cellText(row[colIndex])}' is not a valid number.`);
    return null;
  }
  return amount;
};

const getSheet = (workbook, sheetName) => readVisibleRows(workbook.Sheets[findVisibleSheet(workbook, sheetName)]);

const validateSheets = (workbook, contractType, errors) => {
  const required = REQUIRED_SHEETS_BY_TYPE[contractType];
  const allowed = [...required, TYPE_TEMPLATE_SHEETS.INSTRUCTIONS];
  const unexpected = visibleSheetNames(workbook).filter((name) => !allowed.includes(normalizeHeader(name)));
  if (unexpected.length) {
    errors.push(`Unexpected sheet(s): ${unexpected.join(", ")}. Only ${required.map((s) => `'${s}'`).join(", ")} are imported. ${TEMPLATE_HINT}`);
  }
  required.forEach((sheetName) => {
    if (!findVisibleSheet(workbook, sheetName)) errors.push(`Sheet '${sheetName}' is missing. ${TEMPLATE_HINT}`);
  });
};

// ---------------------------------------------------------------------
// CHARGES sheet (all three types) - fixed labels, one amount each
// ---------------------------------------------------------------------

const parseChargesSheet = (workbook, contractType, errors) => {
  const sheetName = TYPE_TEMPLATE_SHEETS.CHARGES;
  const sheet = getSheet(workbook, sheetName);
  const headerIndex = findRowIndex(sheet.rows, HEADER_SEARCH_ROW_LIMIT, (h) => h === TYPE_TEMPLATE_HEADERS.CHARGE);
  if (headerIndex === -1) {
    errors.push(`${sheetName}: header row with a 'CHARGE' column was not found. ${TEMPLATE_HINT}`);
    return [];
  }

  const header = sheet.rows[headerIndex].map(normalizeHeader);
  const chargeCol = header.indexOf(TYPE_TEMPLATE_HEADERS.CHARGE);
  const amountCol = header.findIndex((h) => h.includes(TYPE_TEMPLATE_HEADERS.AMOUNT_KEYWORD));
  const remarksCol = header.indexOf(TYPE_TEMPLATE_HEADERS.REMARKS);
  if (amountCol === -1) {
    errors.push(`${sheetName}: 'AMOUNT' column is missing.`);
    return [];
  }

  const labels = CHARGE_LABELS_BY_TYPE[contractType];
  const charges = [];
  for (let r = headerIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const label = normalizeHeader(row[chargeCol]);
    if (!label) continue;

    const code = labels[label];
    if (!code) {
      errors.push(`${sheetName} row ${sheet.excelRow(r)}: '${cellText(row[chargeCol])}' is not a recognised charge. Keep the labels from the template.`);
      continue;
    }
    // A blank amount means the charge is paid at actual - nothing to store.
    const amount = readAmount(row, amountCol, RATE_DECIMALS, sheet, r, sheetName, errors);
    if (amount === null) continue;
    charges.push({ ChargeCode: code, Amount: amount, Remarks: remarksCol === -1 ? null : cellText(row[remarksCol]) || null });
  }
  return charges;
};

// ---------------------------------------------------------------------
// RATE MATRIX - FTL Inbound (pick-up x vehicle slab, rate per MT)
// ---------------------------------------------------------------------

const mapInboundColumns = (headerRow, sheet, headerIndex, errors) => {
  const columns = { pickup: -1, delivery: -1, distance: -1, transitDays: -1, slabs: [] };
  headerRow.forEach((cell, colIndex) => {
    const header = normalizeHeader(cell);
    if (!header || isSerialHeader(header)) return;
    if (header === TYPE_TEMPLATE_HEADERS.PICK_UP_LOCATION) columns.pickup = colIndex;
    else if (header === TYPE_TEMPLATE_HEADERS.DELIVERY_LOCATION) columns.delivery = colIndex;
    else if (header.startsWith(TYPE_TEMPLATE_HEADERS.TRANSIT_DAYS_KEYWORD)) columns.transitDays = colIndex;
    else if (isDistanceHeader(header)) columns.distance = colIndex;
    else {
      const slab = parseWeightSlab(cell);
      if (slab) columns.slabs.push({ colIndex, ...slab });
      else errors.push(`${TYPE_TEMPLATE_SHEETS.RATE_MATRIX} ${sheet.excelCol(colIndex)}${sheet.excelRow(headerIndex)}: column '${cellText(cell)}' is not a vehicle size. Use headers like '25 MT'.`);
    }
  });
  if (!columns.slabs.length) errors.push(`${TYPE_TEMPLATE_SHEETS.RATE_MATRIX}: no vehicle size columns found (e.g. '25 MT').`);
  return columns;
};

const parseInboundRates = (workbook, errors) => {
  const sheetName = TYPE_TEMPLATE_SHEETS.RATE_MATRIX;
  const sheet = getSheet(workbook, sheetName);
  const headerIndex = findRowIndex(sheet.rows, HEADER_SEARCH_ROW_LIMIT, (h) => h === TYPE_TEMPLATE_HEADERS.PICK_UP_LOCATION);
  if (headerIndex === -1) {
    errors.push(`${sheetName}: header row with a 'PICK UP LOCATION' column was not found. ${TEMPLATE_HINT}`);
    return [];
  }
  const columns = mapInboundColumns(sheet.rows[headerIndex], sheet, headerIndex, errors);
  if (!columns.slabs.length) return [];

  const rateRows = [];
  const seen = new Map();
  for (let r = headerIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const pickup = cellText(row[columns.pickup]);
    if (!pickup) continue;
    if (TABLE_END_PATTERN.test(pickup)) break;

    const key = pickup.toUpperCase();
    if (seen.has(key)) {
      errors.push(`${sheetName} row ${sheet.excelRow(r)}: pick up location '${pickup}' is already listed in row ${seen.get(key)}.`);
      continue;
    }
    seen.set(key, sheet.excelRow(r));

    const common = {
      destination: pickup,
      deliveryLocation: columns.delivery === -1 ? null : cellText(row[columns.delivery]) || null,
      distanceKm: readAmount(row, columns.distance, AMOUNT_DECIMALS, sheet, r, sheetName, errors),
      transitDays: readAmount(row, columns.transitDays, 0, sheet, r, sheetName, errors),
    };
    columns.slabs.forEach((slab) => {
      const rate = readAmount(row, slab.colIndex, RATE_DECIMALS, sheet, r, sheetName, errors);
      if (rate !== null) rateRows.push({ ...common, slab, rate });
    });
  }
  return rateRows;
};

// ---------------------------------------------------------------------
// RATE MATRIX - PTL Outbound (destination, rate per KG)
// ---------------------------------------------------------------------

const parsePtlRates = (workbook, errors) => {
  const sheetName = TYPE_TEMPLATE_SHEETS.RATE_MATRIX;
  const sheet = getSheet(workbook, sheetName);
  const headerIndex = findRowIndex(sheet.rows, HEADER_SEARCH_ROW_LIMIT, (h) => h === TYPE_TEMPLATE_HEADERS.DESTINATION);
  if (headerIndex === -1) {
    errors.push(`${sheetName}: header row with a 'DESTINATION' column was not found. ${TEMPLATE_HINT}`);
    return [];
  }
  const header = sheet.rows[headerIndex].map(normalizeHeader);
  const destinationCol = header.indexOf(TYPE_TEMPLATE_HEADERS.DESTINATION);
  const rateCol = header.indexOf(TYPE_TEMPLATE_HEADERS.RATE_PER_KG);
  if (rateCol === -1) {
    errors.push(`${sheetName}: 'RATE PER KG' column is missing.`);
    return [];
  }

  const rateRows = [];
  const seen = new Map();
  for (let r = headerIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const destination = cellText(row[destinationCol]);
    if (!destination) continue;
    if (TABLE_END_PATTERN.test(destination)) break;

    const key = destination.toUpperCase();
    if (seen.has(key)) {
      errors.push(`${sheetName} row ${sheet.excelRow(r)}: destination '${destination}' is already listed in row ${seen.get(key)}.`);
      continue;
    }
    seen.set(key, sheet.excelRow(r));

    const rate = readAmount(row, rateCol, RATE_DECIMALS, sheet, r, sheetName, errors);
    if (rate !== null) rateRows.push({ destination, slab: null, rate, distanceKm: null, deliveryLocation: null, transitDays: null });
  }
  return rateRows;
};

// DOCKET SLABS sheet - FROM KG / TO KG / CHARGE. A blank TO KG means
// "and above"; a zero charge is a valid "free" slab.
const parseDocketSlabs = (workbook, errors) => {
  const sheetName = TYPE_TEMPLATE_SHEETS.DOCKET_SLABS;
  const sheet = getSheet(workbook, sheetName);
  const headerIndex = findRowIndex(sheet.rows, HEADER_SEARCH_ROW_LIMIT, (h) => h === TYPE_TEMPLATE_HEADERS.FROM_KG);
  if (headerIndex === -1) {
    errors.push(`${sheetName}: header row with a 'FROM KG' column was not found. ${TEMPLATE_HINT}`);
    return [];
  }
  const header = sheet.rows[headerIndex].map(normalizeHeader);
  const fromCol = header.indexOf(TYPE_TEMPLATE_HEADERS.FROM_KG);
  const toCol = header.indexOf(TYPE_TEMPLATE_HEADERS.TO_KG);
  const chargeCol = header.findIndex((h) => h.startsWith(TYPE_TEMPLATE_HEADERS.CHARGE));

  const slabs = [];
  for (let r = headerIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    if (isBlank(row[fromCol]) && isBlank(row[chargeCol])) continue;

    const from = Number(cellText(row[fromCol]).replace(/,/g, ""));
    const to = toCol === -1 || isBlank(row[toCol]) ? null : Number(cellText(row[toCol]).replace(/,/g, ""));
    const charge = isBlank(row[chargeCol]) ? NaN : Number(cellText(row[chargeCol]).replace(/[₹,\s]|\/-$/g, ""));
    if (!Number.isFinite(from) || (to !== null && (!Number.isFinite(to) || to < from)) || !Number.isFinite(charge) || charge < 0) {
      errors.push(`${sheetName} row ${sheet.excelRow(r)}: FROM KG, TO KG and CHARGE must be valid numbers (TO KG blank = and above).`);
      continue;
    }
    slabs.push({ ChargeCode: CHARGE_CODES.DOCKET_SLAB, WeightFromKG: from, WeightToKG: to, Amount: charge });
  }
  if (!slabs.length) errors.push(`${sheetName}: at least one docket slab is required.`);
  return slabs;
};

// ---------------------------------------------------------------------
// Part Load - ZONE RATES and ODA MATRIX
// ---------------------------------------------------------------------

const parseKgBandHeader = (value) => {
  const header = normalizeHeader(value);
  let match = header.match(UP_TO_KG_PATTERN);
  if (match) return { from: 0, to: Number(match[1]) };
  match = header.match(ABOVE_KG_PATTERN);
  if (match) return { from: Number(match[1]), to: null };
  match = header.match(RANGE_KG_PATTERN);
  if (match && Number(match[2]) > Number(match[1])) return { from: Number(match[1]), to: Number(match[2]) };
  return null;
};

const parseZoneRates = (workbook, errors) => {
  const sheetName = TYPE_TEMPLATE_SHEETS.ZONE_RATES;
  const sheet = getSheet(workbook, sheetName);
  const headerIndex = findRowIndex(sheet.rows, HEADER_SEARCH_ROW_LIMIT, (h) => h === TYPE_TEMPLATE_HEADERS.ZONE);
  if (headerIndex === -1) {
    errors.push(`${sheetName}: header row with a 'ZONE' column was not found. ${TEMPLATE_HINT}`);
    return [];
  }

  const columns = { zone: -1, coverage: -1, bands: [] };
  sheet.rows[headerIndex].forEach((cell, colIndex) => {
    const header = normalizeHeader(cell);
    if (!header || isSerialHeader(header)) return;
    if (header === TYPE_TEMPLATE_HEADERS.ZONE) columns.zone = colIndex;
    else if (header.startsWith(TYPE_TEMPLATE_HEADERS.COVERAGE_KEYWORD)) columns.coverage = colIndex;
    else {
      const band = parseKgBandHeader(cell);
      if (band) columns.bands.push({ colIndex, ...band });
      else errors.push(`${sheetName} ${sheet.excelCol(colIndex)}${sheet.excelRow(headerIndex)}: column '${cellText(cell)}' is not a weight band. Use 'UP TO 1000 KG' / 'ABOVE 1000 KG'.`);
    }
  });
  if (columns.coverage === -1) errors.push(`${sheetName}: 'COVERAGE' column is missing.`);
  if (!columns.bands.length) errors.push(`${sheetName}: no weight band columns found.`);
  if (columns.coverage === -1 || !columns.bands.length) return [];

  const zoneRates = [];
  const seen = new Set();
  for (let r = headerIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const zone = cellText(row[columns.zone]);
    if (!zone) continue;
    if (TABLE_END_PATTERN.test(zone)) break;

    if (seen.has(zone.toUpperCase())) {
      errors.push(`${sheetName} row ${sheet.excelRow(r)}: zone '${zone}' is listed twice.`);
      continue;
    }
    seen.add(zone.toUpperCase());

    const coverage = cellText(row[columns.coverage]);
    if (!coverage) {
      errors.push(`${sheetName} row ${sheet.excelRow(r)}: COVERAGE is empty for zone '${zone}'.`);
      continue;
    }
    columns.bands.forEach((band) => {
      const rate = readAmount(row, band.colIndex, RATE_DECIMALS, sheet, r, sheetName, errors);
      if (rate !== null) {
        zoneRates.push({ ZoneCode: zone, Coverage: coverage, WeightFromKG: band.from, WeightToKG: band.to, RatePerKG: rate });
      }
    });
  }
  if (!zoneRates.length) errors.push(`${sheetName}: no zone rates found.`);
  return zoneRates;
};

const parseOdaWeightRow = (label) => {
  let match = label.match(ODA_RANGE_PATTERN);
  if (match) return { from: Number(match[1]), to: Number(match[2]) };
  match = label.match(ODA_ABOVE_PATTERN);
  if (match) return { from: Number(match[1] ?? match[2]), to: null };
  return null;
};

const parseOdaMatrix = (workbook, errors) => {
  const sheetName = TYPE_TEMPLATE_SHEETS.ODA_MATRIX;
  const sheet = getSheet(workbook, sheetName);
  const headerIndex = findRowIndex(sheet.rows, HEADER_SEARCH_ROW_LIMIT, (h) => h.startsWith(TYPE_TEMPLATE_HEADERS.WEIGHT_KEYWORD));
  if (headerIndex === -1) {
    errors.push(`${sheetName}: header row starting with 'WEIGHT (KG)' was not found. ${TEMPLATE_HINT}`);
    return [];
  }

  const header = sheet.rows[headerIndex].map(normalizeHeader);
  const labelCol = header.findIndex((h) => h.startsWith(TYPE_TEMPLATE_HEADERS.WEIGHT_KEYWORD));
  const categoryCols = header
    .map((h, colIndex) => ({ category: h, colIndex }))
    .filter(({ category }) => ODA_CATEGORIES.includes(category));
  if (!categoryCols.length) {
    errors.push(`${sheetName}: category columns 'A', 'B', 'C', 'D' are missing.`);
    return [];
  }

  const charges = [];
  const distanceByCategory = {};
  for (let r = headerIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const label = normalizeHeader(row[labelCol]);
    if (!label) continue;

    if (label.startsWith(ODA_DISTANCE_ROW_KEYWORD)) {
      categoryCols.forEach(({ category, colIndex }) => {
        distanceByCategory[category] = cellText(row[colIndex]) || null;
      });
      continue;
    }

    const isMinimumRow = label.startsWith(ODA_MINIMUM_ROW_KEYWORD);
    const band = isMinimumRow ? null : parseOdaWeightRow(label);
    if (!isMinimumRow && !band) {
      errors.push(`${sheetName} row ${sheet.excelRow(r)}: '${cellText(row[labelCol])}' is not a weight range (e.g. '0-350' or '1501 ABOVE').`);
      continue;
    }

    categoryCols.forEach(({ category, colIndex }) => {
      const amount = readAmount(row, colIndex, RATE_DECIMALS, sheet, r, sheetName, errors);
      if (amount === null) return;
      charges.push(isMinimumRow
        ? { ChargeCode: CHARGE_CODES.ODA_MINIMUM, Category: category, Amount: amount }
        : { ChargeCode: CHARGE_CODES.ODA_MATRIX, Category: category, WeightFromKG: band.from, WeightToKG: band.to, Amount: amount });
    });
  }

  // The distance row is informational - kept as the remark of each category
  // and as its own ODA_DISTANCE row.
  charges.forEach((charge) => {
    charge.Remarks = distanceByCategory[charge.Category] ? `${distanceByCategory[charge.Category]} KM` : null;
  });
  Object.entries(distanceByCategory)
    .filter(([, distance]) => distance)
    .forEach(([category, distance]) => {
      charges.push({ ChargeCode: CHARGE_CODES.ODA_DISTANCE, Category: category, Amount: 0, Remarks: `${distance} KM` });
    });
  return charges;
};

// ---------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------

const TYPE_PARSERS = {
  [CONTRACT_TYPES.FTL_INBOUND]: (workbook, errors) => ({
    rateRows: parseInboundRates(workbook, errors),
    charges: parseChargesSheet(workbook, CONTRACT_TYPES.FTL_INBOUND, errors),
    zoneRates: [],
  }),
  [CONTRACT_TYPES.PTL_OUTBOUND]: (workbook, errors) => ({
    rateRows: parsePtlRates(workbook, errors),
    charges: [
      ...parseChargesSheet(workbook, CONTRACT_TYPES.PTL_OUTBOUND, errors),
      ...parseDocketSlabs(workbook, errors),
    ],
    zoneRates: [],
  }),
  [CONTRACT_TYPES.PART_LOAD]: (workbook, errors) => ({
    rateRows: [],
    charges: [
      ...parseChargesSheet(workbook, CONTRACT_TYPES.PART_LOAD, errors),
      ...parseOdaMatrix(workbook, errors),
    ],
    zoneRates: parseZoneRates(workbook, errors),
  }),
};

const EMPTY_RESULT = { rateRows: [], charges: [], zoneRates: [] };

// Parses and validates a contract workbook of the given (non FTL Outbound)
// type without touching the database.
const parseContractTypeWorkbook = (fileBuffer, contractType) => {
  const errors = [];
  let workbook;
  try {
    workbook = readWorkbook(fileBuffer);
  } catch {
    return { ...EMPTY_RESULT, errors: ["The uploaded file could not be read as an Excel workbook."] };
  }

  validateSheets(workbook, contractType, errors);
  if (errors.length) return { ...EMPTY_RESULT, errors };

  const result = TYPE_PARSERS[contractType](workbook, errors);
  if (contractType !== CONTRACT_TYPES.PART_LOAD && !errors.length && !result.rateRows.length) {
    errors.push("The RATE MATRIX sheet contains no rates.");
  }
  return { ...result, errors };
};

module.exports = { parseContractTypeWorkbook };
