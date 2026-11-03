const {
  RATE_MATRIX_SHEETS,
  RATE_MATRIX_HEADERS,
  HEADER_SEARCH_ROW_LIMIT,
  TABLE_END_PATTERN,
} = require("../constants/rateMatrixTemplate");
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
} = require("./excelSheetHelpers");

const TEMPLATE_HINT = "Please download the Rate Matrix template and copy your data into it.";

const isDistanceHeader = (header) =>
  RATE_MATRIX_HEADERS.DISTANCE_KEYWORDS.some((keyword) => header.includes(keyword));

const findHeaderRowIndex = (rows) => {
  const limit = Math.min(rows.length, HEADER_SEARCH_ROW_LIMIT);
  for (let i = 0; i < limit; i++) {
    if ((rows[i] || []).some((cell) => normalizeHeader(cell) === RATE_MATRIX_HEADERS.DESTINATION)) return i;
  }
  return -1;
};

const validateWorkbookSheets = (workbook, errors) => {
  // Hidden sheets (usually older rates kept by the vendor) are ignored.
  const allowed = Object.values(RATE_MATRIX_SHEETS);
  const unexpected = visibleSheetNames(workbook).filter((name) => !allowed.includes(normalizeHeader(name)));
  if (unexpected.length) {
    errors.push(`Unexpected sheet(s): ${unexpected.join(", ")}. Only '${RATE_MATRIX_SHEETS.DOMESTIC}' and '${RATE_MATRIX_SHEETS.ADDITIONAL}' are imported. ${TEMPLATE_HINT}`);
  }

  [RATE_MATRIX_SHEETS.DOMESTIC, RATE_MATRIX_SHEETS.ADDITIONAL].forEach((sheetName) => {
    if (!findVisibleSheet(workbook, sheetName)) {
      errors.push(`Sheet '${sheetName}' is missing. ${TEMPLATE_HINT}`);
    }
  });
};

// ---------------------------------------------------------------------
// Sheet 1 - DOMESTIC DESTINATIONS (rate per weight slab)
// ---------------------------------------------------------------------

const mapDomesticColumns = (headerRow, sheet, headerRowIndex, errors) => {
  const columns = { destination: -1, distance: -1, slabs: [] };
  const seenSlabs = new Set();

  headerRow.forEach((cell, colIndex) => {
    const header = normalizeHeader(cell);
    if (!header || RATE_MATRIX_HEADERS.SERIAL_NUMBER_PATTERN.test(header)) return;

    if (header === RATE_MATRIX_HEADERS.DESTINATION) {
      columns.destination = colIndex;
      return;
    }
    if (isDistanceHeader(header)) {
      columns.distance = colIndex;
      return;
    }

    const cellRef = `${sheet.excelCol(colIndex)}${sheet.excelRow(headerRowIndex)}`;
    const slab = parseWeightSlab(cell);
    if (!slab) {
      errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC} ${cellRef}: column '${cellText(cell)}' is not a weight slab. Use headers like '10 MT' or '20-21 MT'.`);
    } else if (seenSlabs.has(slab.label)) {
      errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC} ${cellRef}: weight slab '${slab.label}' appears more than once.`);
    } else {
      seenSlabs.add(slab.label);
      columns.slabs.push({ colIndex, ...slab });
    }
  });

  if (!columns.slabs.length) {
    errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC}: no weight slab columns found (e.g. '5 MT', '10 MT').`);
  }
  return columns;
};

const parseDomesticRow = (row, rowNumber, columns, sheet, errors) => {
  const rates = [];
  columns.slabs.forEach((slab) => {
    const { amount, invalid } = parseAmountCell(row[slab.colIndex]);
    if (invalid) {
      errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC} ${sheet.excelCol(slab.colIndex)}${rowNumber}: '${cellText(row[slab.colIndex])}' is not a valid amount.`);
    } else if (amount !== null) {
      rates.push({ slab, amount });
    }
  });

  let distanceKm = null;
  if (columns.distance !== -1) {
    const distance = parseAmountCell(row[columns.distance]);
    if (distance.invalid) {
      errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC} ${sheet.excelCol(columns.distance)}${rowNumber}: '${cellText(row[columns.distance])}' is not a valid distance.`);
    }
    distanceKm = distance.amount ?? null;
  }
  return { rates, distanceKm };
};

const parseDomesticSheet = (worksheet, errors) => {
  const sheet = readVisibleRows(worksheet);
  const headerRowIndex = findHeaderRowIndex(sheet.rows);
  if (headerRowIndex === -1) {
    errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC}: header row with a 'DESTINATION' column was not found. ${TEMPLATE_HINT}`);
    return [];
  }

  const columns = mapDomesticColumns(sheet.rows[headerRowIndex], sheet, headerRowIndex, errors);
  if (columns.destination === -1 || !columns.slabs.length) return [];

  const result = [];
  const seenDestinations = new Map();

  for (let r = headerRowIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const rowNumber = sheet.excelRow(r);
    const destination = cellText(row[columns.destination]);

    if (!destination) {
      if (columns.slabs.some((slab) => !isBlank(row[slab.colIndex]))) {
        errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC} row ${rowNumber}: rates are filled but DESTINATION is empty.`);
      }
      continue;
    }
    if (TABLE_END_PATTERN.test(destination)) break;

    const { rates, distanceKm } = parseDomesticRow(row, rowNumber, columns, sheet, errors);
    if (!rates.length) continue;

    const key = destination.toUpperCase();
    if (seenDestinations.has(key)) {
      errors.push(`${RATE_MATRIX_SHEETS.DOMESTIC} row ${rowNumber}: destination '${destination}' is already listed in row ${seenDestinations.get(key)}.`);
      continue;
    }
    seenDestinations.set(key, rowNumber);
    result.push({ rowNumber, destination, distanceKm, rates });
  }
  return result;
};

// ---------------------------------------------------------------------
// Sheet 2 - ADDITIONAL DESTINATIONS (rate per vehicle type)
// ---------------------------------------------------------------------

const mapAdditionalColumns = (headerRow, errors) => {
  const columns = { destination: -1, vehicleType: -1, distance: -1, freight: -1 };

  headerRow.forEach((cell, colIndex) => {
    const header = normalizeHeader(cell);
    if (!header || RATE_MATRIX_HEADERS.SERIAL_NUMBER_PATTERN.test(header)) return;

    if (header === RATE_MATRIX_HEADERS.DESTINATION) columns.destination = colIndex;
    else if (header === RATE_MATRIX_HEADERS.VEHICLE_TYPE) columns.vehicleType = colIndex;
    else if (header.includes(RATE_MATRIX_HEADERS.FREIGHT_KEYWORD)) columns.freight = colIndex;
    else if (isDistanceHeader(header)) columns.distance = colIndex;
    else errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL}: unrecognised column '${cellText(cell)}'. ${TEMPLATE_HINT}`);
  });

  if (columns.vehicleType === -1) errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL}: 'VEHICLE TYPE' column is missing.`);
  if (columns.freight === -1) errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL}: 'FREIGHT (INR) PER TRIP' column is missing.`);
  return columns;
};

const parseAdditionalRow = (row, rowNumber, columns, sheet, errors) => {
  const destination = cellText(row[columns.destination]);
  const vehicleType = cellText(row[columns.vehicleType]);
  const freight = parseAmountCell(row[columns.freight]);
  const distance = columns.distance !== -1 ? parseAmountCell(row[columns.distance]) : { amount: null };
  const prefix = `${RATE_MATRIX_SHEETS.ADDITIONAL} row ${rowNumber}`;

  if (!destination) {
    errors.push(`${prefix}: DESTINATION is empty.`);
    return null;
  }
  if (!vehicleType) {
    errors.push(`${prefix}: VEHICLE TYPE is empty for '${destination}'.`);
    return null;
  }
  if (freight.invalid) {
    errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL} ${sheet.excelCol(columns.freight)}${rowNumber}: '${cellText(row[columns.freight])}' is not a valid amount. Put each vehicle type / weight range on its own row.`);
    return null;
  }
  if (distance.invalid) {
    errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL} ${sheet.excelCol(columns.distance)}${rowNumber}: '${cellText(row[columns.distance])}' is not a valid distance.`);
    return null;
  }
  if (freight.amount === null) return null;

  return { rowNumber, destination, vehicleType, distanceKm: distance.amount, freight: freight.amount };
};

const parseAdditionalSheet = (worksheet, errors) => {
  const sheet = readVisibleRows(worksheet);
  const headerRowIndex = findHeaderRowIndex(sheet.rows);
  if (headerRowIndex === -1) {
    errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL}: header row with a 'DESTINATION' column was not found. ${TEMPLATE_HINT}`);
    return [];
  }

  const columns = mapAdditionalColumns(sheet.rows[headerRowIndex], errors);
  if (columns.vehicleType === -1 || columns.freight === -1) return [];

  const dataColumns = [columns.destination, columns.vehicleType, columns.freight, columns.distance].filter((c) => c !== -1);
  const result = [];
  const seenKeys = new Map();

  for (let r = headerRowIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] || [];
    const rowNumber = sheet.excelRow(r);
    if (TABLE_END_PATTERN.test(cellText(row[columns.destination]))) break;
    if (dataColumns.every((c) => isBlank(row[c]))) continue;

    const entry = parseAdditionalRow(row, rowNumber, columns, sheet, errors);
    if (!entry) continue;

    const key = `${entry.destination.toUpperCase()}|${entry.vehicleType.toUpperCase()}`;
    if (seenKeys.has(key)) {
      errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL} row ${rowNumber}: '${entry.destination}' with vehicle type '${entry.vehicleType}' is already listed in row ${seenKeys.get(key)}.`);
      continue;
    }
    seenKeys.set(key, rowNumber);
    result.push(entry);
  }
  return result;
};

// A Sheet 2 vehicle type that is a plain slab (e.g. "10 MT") must not repeat
// a slab already priced for the same destination on Sheet 1, otherwise the
// invoice audit would find two different contract rates.
const validateCrossSheetDuplicates = (domesticRows, additionalRows, errors) => {
  const domesticSlabs = new Map(
    domesticRows.map((row) => [row.destination.toUpperCase(), new Set(row.rates.map((rate) => rate.slab.label))])
  );

  additionalRows.forEach((row) => {
    const slab = parseWeightSlab(row.vehicleType);
    const slabsForDestination = domesticSlabs.get(row.destination.toUpperCase());
    if (slab && slabsForDestination?.has(slab.label)) {
      errors.push(`${RATE_MATRIX_SHEETS.ADDITIONAL} row ${row.rowNumber}: '${row.destination}' / '${slab.label}' is already priced on ${RATE_MATRIX_SHEETS.DOMESTIC}.`);
    }
  });
};

// Parses and validates a Rate Matrix workbook without touching the
// database. Returns the rows to import plus every validation error found.
const parseRateMatrixWorkbook = (fileBuffer) => {
  const errors = [];
  let workbook;
  try {
    workbook = readWorkbook(fileBuffer);
  } catch {
    return { domesticRows: [], additionalRows: [], errors: ["The uploaded file could not be read as an Excel workbook."] };
  }

  validateWorkbookSheets(workbook, errors);
  if (errors.length) return { domesticRows: [], additionalRows: [], errors };

  const domesticRows = parseDomesticSheet(workbook.Sheets[findVisibleSheet(workbook, RATE_MATRIX_SHEETS.DOMESTIC)], errors);
  const additionalRows = parseAdditionalSheet(workbook.Sheets[findVisibleSheet(workbook, RATE_MATRIX_SHEETS.ADDITIONAL)], errors);
  validateCrossSheetDuplicates(domesticRows, additionalRows, errors);

  if (!errors.length && !domesticRows.length && !additionalRows.length) {
    errors.push("The Rate Matrix contains no rates. Fill at least one row in either sheet.");
  }
  return { domesticRows, additionalRows, errors };
};

module.exports = { parseRateMatrixWorkbook };
