import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  CURRENCY_SYMBOL,
  DATE_COLUMN_TYPES,
  EMPTY_CELL,
  LOCALE,
  NUMERIC_COLUMN_TYPES,
  REPORT_CARD_TYPES,
  REPORT_COLUMN_TYPES,
  SORT_DIRECTIONS,
} from "../constants/reports";
import { formatDateDisplay, formatDateTimeDisplay } from "./dateFormat";

const isBlank = (value) => value === null || value === undefined || value === "";

const toNumber = (value) => (isBlank(value) ? null : Number(value));

const dateKey = (value) => {
  if (isBlank(value)) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

export const formatNumber = (value, decimals = 2) =>
  Number(value || 0).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: decimals });

export const formatMoney = (value) =>
  `${CURRENCY_SYMBOL}${Number(value || 0).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Display text of one report cell.
export const formatCell = (value, type) => {
  if (isBlank(value)) return EMPTY_CELL;
  switch (type) {
    case REPORT_COLUMN_TYPES.MONEY:
      return formatMoney(value);
    case REPORT_COLUMN_TYPES.NUMBER:
      return formatNumber(value);
    case REPORT_COLUMN_TYPES.DATE:
      return formatDateDisplay(value);
    case REPORT_COLUMN_TYPES.DATETIME:
      return formatDateTimeDisplay(value);
    default:
      return String(value);
  }
};

// =====================================================================
//  Column filters
// =====================================================================

// A filter value is "active" when it would remove rows.
export const isFilterActive = (filter) => {
  if (!filter) return false;
  if (Array.isArray(filter.values)) return filter.values.length > 0;
  return ["text", "min", "max", "from", "to"].some((key) => !isBlank(filter[key]));
};

const matchesText = (value, { text }) =>
  isBlank(text) || String(value ?? "").toLowerCase().includes(String(text).trim().toLowerCase());

const matchesValues = (value, { values }) =>
  !values?.length || values.includes(isBlank(value) ? EMPTY_CELL : String(value));

const matchesRange = (value, { min, max }) => {
  const number = toNumber(value);
  if (!isBlank(min) && (number === null || number < Number(min))) return false;
  if (!isBlank(max) && (number === null || number > Number(max))) return false;
  return true;
};

const matchesDateRange = (value, { from, to }) => {
  const key = dateKey(value);
  if (!isBlank(from) && (!key || key < from)) return false;
  if (!isBlank(to) && (!key || key > to)) return false;
  return true;
};

const matchesColumn = (row, column, filter) => {
  const value = row[column.key];
  if (column.type === REPORT_COLUMN_TYPES.ENUM) return matchesValues(value, filter);
  if (NUMERIC_COLUMN_TYPES.includes(column.type)) return matchesRange(value, filter);
  if (DATE_COLUMN_TYPES.includes(column.type)) return matchesDateRange(value, filter);
  return matchesText(value, filter);
};

const matchesSearch = (row, columns, search) => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return columns.some((column) => formatCell(row[column.key], column.type).toLowerCase().includes(needle));
};

// Rows that pass the global search and every active column filter.
export const filterRows = (rows, columns, filters, search) => {
  const activeColumns = columns.filter((column) => isFilterActive(filters[column.key]));
  const needle = String(search || "").trim();
  return rows.filter(
    (row) => activeColumns.every((column) => matchesColumn(row, column, filters[column.key])) && matchesSearch(row, columns, needle)
  );
};

// Distinct values of a column (enum filter options), blanks as "-".
export const getDistinctValues = (rows, key) =>
  [...new Set(rows.map((row) => (isBlank(row[key]) ? EMPTY_CELL : String(row[key]))))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

// Short text of an active filter for the filter chips.
export const describeFilter = (column, filter) => {
  if (Array.isArray(filter.values)) {
    return filter.values.length > 2 ? `${filter.values.slice(0, 2).join(", ")} +${filter.values.length - 2}` : filter.values.join(", ");
  }
  if (NUMERIC_COLUMN_TYPES.includes(column.type)) {
    return [!isBlank(filter.min) && `≥ ${filter.min}`, !isBlank(filter.max) && `≤ ${filter.max}`].filter(Boolean).join(" and ");
  }
  if (DATE_COLUMN_TYPES.includes(column.type)) {
    return [!isBlank(filter.from) && `from ${formatDateDisplay(filter.from)}`, !isBlank(filter.to) && `to ${formatDateDisplay(filter.to)}`].filter(Boolean).join(" ");
  }
  return `contains "${filter.text}"`;
};

// =====================================================================
//  Sorting, totals and summary cards
// =====================================================================

const compareValues = (a, b, type) => {
  if (NUMERIC_COLUMN_TYPES.includes(type)) return Number(a) - Number(b);
  if (DATE_COLUMN_TYPES.includes(type)) return dayjs(a).valueOf() - dayjs(b).valueOf();
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

// Blank cells always go last, in both directions.
const compareRows = (a, b, type, factor) => {
  if (isBlank(a) && isBlank(b)) return 0;
  if (isBlank(a)) return 1;
  if (isBlank(b)) return -1;
  return compareValues(a, b, type) * factor;
};

export const sortRows = (rows, column, direction) => {
  if (!column) return rows;
  const factor = direction === SORT_DIRECTIONS.DESC ? -1 : 1;
  return [...rows].sort((a, b) => compareRows(a[column.key], b[column.key], column.type, factor));
};

export const sumColumn = (rows, key) => rows.reduce((total, row) => total + (toNumber(row[key]) || 0), 0);

// Value of one summary card over the filtered rows, formatted for display.
export const computeCardValue = (card, rows) => {
  switch (card.type) {
    case REPORT_CARD_TYPES.SUM: {
      const total = sumColumn(rows, card.column);
      return card.format === REPORT_COLUMN_TYPES.MONEY ? formatMoney(total) : formatNumber(total);
    }
    case REPORT_CARD_TYPES.COUNT_WHERE:
      return formatNumber(rows.filter((row) => String(row[card.column] ?? "") === String(card.value)).length, 0);
    case REPORT_CARD_TYPES.DISTINCT:
      return formatNumber(new Set(rows.map((row) => row[card.column]).filter((value) => !isBlank(value))).size, 0);
    default:
      return formatNumber(rows.length, 0);
  }
};

// =====================================================================
//  Excel export
// =====================================================================

const exportCell = (value, type) => {
  if (isBlank(value)) return "";
  if (NUMERIC_COLUMN_TYPES.includes(type)) return Number(value);
  if (DATE_COLUMN_TYPES.includes(type)) return formatCell(value, type);
  return String(value);
};

const COLUMN_WIDTH_CHARS = { min: 10, max: 45 };

// Downloads the given rows and columns as an .xlsx file.
export const exportRowsToExcel = ({ fileName, sheetName, columns, rows }) => {
  const header = columns.map((column) => column.header);
  const body = rows.map((row) => columns.map((column) => exportCell(row[column.key], column.type)));
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet["!cols"] = columns.map((column) => ({
    wch: Math.min(COLUMN_WIDTH_CHARS.max, Math.max(COLUMN_WIDTH_CHARS.min, column.header.length + 2)),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName);
};
