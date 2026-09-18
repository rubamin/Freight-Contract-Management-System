const ExcelJS = require("exceljs");

/**
 * Builds a single-sheet ExcelJS workbook from column definitions and row
 * data, with a bold header row. Kept generic so other export endpoints can
 * reuse it instead of duplicating workbook-building code.
 *
 * @param {object} options
 * @param {string} options.sheetName - Name of the worksheet tab.
 * @param {Array<{header: string, key: string, width?: number}>} options.columns
 * @param {Array<object>} options.rows - Row objects keyed by each column's `key`.
 * @returns {import("exceljs").Workbook}
 */
const buildWorkbookFromRows = ({ sheetName, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns;
  rows.forEach((row) => sheet.addRow(row));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };

  return workbook;
};

module.exports = { buildWorkbookFromRows };
