// Mirrors REPORT_COLUMN_TYPES / REPORT_CARD_TYPES of
// server/constants/reportDefinitions.js.
export const REPORT_COLUMN_TYPES = {
  TEXT: "text",
  ENUM: "enum",
  NUMBER: "number",
  MONEY: "money",
  DATE: "date",
  DATETIME: "datetime",
};

export const REPORT_CARD_TYPES = {
  COUNT: "count",
  SUM: "sum",
  COUNT_WHERE: "countWhere",
  DISTINCT: "distinct",
};

export const NUMERIC_COLUMN_TYPES = [REPORT_COLUMN_TYPES.NUMBER, REPORT_COLUMN_TYPES.MONEY];
export const DATE_COLUMN_TYPES = [REPORT_COLUMN_TYPES.DATE, REPORT_COLUMN_TYPES.DATETIME];

export const SORT_DIRECTIONS = { ASC: "asc", DESC: "desc" };

export const REPORT_ROWS_PER_PAGE_OPTIONS = [25, 50, 100, 250];
export const DEFAULT_REPORT_ROWS_PER_PAGE = 50;

export const EMPTY_CELL = "-";
export const LOCALE = "en-IN";
export const CURRENCY_SYMBOL = "₹";
