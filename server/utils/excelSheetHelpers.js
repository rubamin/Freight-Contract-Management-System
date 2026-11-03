const xlsx = require("xlsx");
const { collapseWhitespace } = require("./weightSlab");

// Shared helpers for every contract Excel import. Hidden sheets, rows and
// columns are ignored everywhere, because vendor workbooks usually keep
// older rates hidden next to the current ones.

const normalizeHeader = (value) => collapseWhitespace(value).toUpperCase();

const cellText = (value) => String(value ?? "").trim();

const isBlank = (value) => cellText(value) === "";

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// Reads a rate / amount cell. Accepts numbers and numeric text such as
// "8,150.50" or "8150/-". Blank and zero both mean "no value".
const parseAmountCell = (value, decimals = 2) => {
  if (isBlank(value)) return { amount: null };
  if (typeof value === "number") {
    return Number.isFinite(value) ? { amount: value > 0 ? roundTo(value, decimals) : null } : { invalid: true };
  }

  const cleaned = cellText(value).replace(/[₹,\s]/g, "").replace(/\/-$/, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { invalid: true };

  const amount = Number(cleaned);
  return { amount: amount > 0 ? roundTo(amount, decimals) : null };
};

const readWorkbook = (fileBuffer) => xlsx.read(fileBuffer, { type: "buffer", cellStyles: true });

const isSheetHidden = (workbook, sheetName) => {
  const sheetIndex = workbook.SheetNames.indexOf(sheetName);
  const sheetInfo = workbook.Workbook?.Sheets?.[sheetIndex];
  return Boolean(sheetInfo?.Hidden);
};

const visibleSheetNames = (workbook) => workbook.SheetNames.filter((name) => !isSheetHidden(workbook, name));

const findVisibleSheet = (workbook, expectedName) =>
  visibleSheetNames(workbook).find((name) => normalizeHeader(name) === expectedName);

const hiddenIndexes = (entries = []) =>
  new Set(entries.map((entry, index) => (entry?.hidden ? index : null)).filter((index) => index !== null));

// Returns the visible rows of a worksheet as arrays of visible cells, plus
// helpers that turn array positions back into real Excel cell references
// for error messages.
const readVisibleRows = (worksheet) => {
  const range = xlsx.utils.decode_range(worksheet["!ref"] || "A1:A1");
  const allRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: null, raw: true });
  const hiddenRows = hiddenIndexes(worksheet["!rows"]);
  const hiddenCols = hiddenIndexes(worksheet["!cols"]);

  const columnCount = Math.max(0, ...allRows.map((row) => (row || []).length));
  const visibleColumns = [];
  for (let c = 0; c < columnCount; c++) {
    if (!hiddenCols.has(range.s.c + c)) visibleColumns.push(c);
  }

  const visibleRowIndexes = [];
  const rows = [];
  allRows.forEach((row, r) => {
    if (hiddenRows.has(range.s.r + r)) return;
    visibleRowIndexes.push(r);
    rows.push(visibleColumns.map((c) => (row || [])[c] ?? null));
  });

  return {
    rows,
    excelRow: (rowIndex) => range.s.r + visibleRowIndexes[rowIndex] + 1,
    excelCol: (colIndex) => xlsx.utils.encode_col(range.s.c + visibleColumns[colIndex]),
  };
};

// Index of the first row (within `limit` rows) that has a cell matching
// the predicate, or -1.
const findRowIndex = (rows, limit, predicate) => {
  const max = Math.min(rows.length, limit);
  for (let i = 0; i < max; i++) {
    if ((rows[i] || []).some((cell) => predicate(normalizeHeader(cell)))) return i;
  }
  return -1;
};

module.exports = {
  normalizeHeader,
  cellText,
  isBlank,
  parseAmountCell,
  readWorkbook,
  visibleSheetNames,
  findVisibleSheet,
  readVisibleRows,
  findRowIndex,
};
